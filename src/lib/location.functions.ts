import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!mapsKey) throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
  } as const;
}

async function geocode(address: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  const url = `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: gatewayHeaders() });
  if (!res.ok) throw new Error(`Geocode ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };
  if (data.status !== "OK" || !data.results?.length) return null;
  const r = data.results[0];
  return { lat: r.geometry.location.lat, lng: r.geometry.location.lng, formatted: r.formatted_address };
}

// ---------- Profile ----------

export const getHomeProfile = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("user_profile")
    .select("id, home_address, home_lat, home_lng")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
});

export const saveHomeAddress = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ address: z.string().trim().min(3).max(300) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const geo = await geocode(data.address);
    if (!geo) throw new Error("Couldn't find that address. Try a more specific street + city.");

    const { data: existing } = await supabaseAdmin
      .from("user_profile")
      .select("id")
      .limit(1)
      .maybeSingle();

    const payload = {
      home_address: geo.formatted,
      home_lat: geo.lat,
      home_lng: geo.lng,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from("user_profile")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_profile").insert(payload);
      if (error) throw new Error(error.message);
    }

    // Invalidate cached travel times since the origin changed.
    await supabaseAdmin
      .from("activities")
      .update({ travel_from_home: null })
      .not("travel_from_home", "is", null);

    return { address: geo.formatted, lat: geo.lat, lng: geo.lng };
  });

// ---------- Travel times ----------

type Mode = "drive" | "transit" | "walk";
const MODE_TO_API: Record<Mode, string> = {
  drive: "DRIVE",
  transit: "TRANSIT",
  walk: "WALK",
};

interface TravelLeg {
  durationSeconds: number | null;
  distanceMeters: number | null;
}

interface TravelCache {
  origin: { lat: number; lng: number };
  computedAt: string;
  drive: TravelLeg | null;
  transit: TravelLeg | null;
  walk: TravelLeg | null;
}

async function computeRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  mode: Mode,
): Promise<TravelLeg | null> {
  const body: Record<string, unknown> = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
    travelMode: MODE_TO_API[mode],
  };
  if (mode === "drive") body.routingPreference = "TRAFFIC_AWARE";

  const res = await fetch(`${GATEWAY}/routes/directions/v2:computeRoutes`, {
    method: "POST",
    headers: {
      ...gatewayHeaders(),
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Routes ${mode} ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = (await res.json()) as { routes?: Array<{ duration?: string; distanceMeters?: number }> };
  const r = data.routes?.[0];
  if (!r) return null;
  const secs = r.duration ? Number(r.duration.replace(/s$/, "")) : null;
  return { durationSeconds: Number.isFinite(secs) ? secs : null, distanceMeters: r.distanceMeters ?? null };
}

export const getActivityTravel = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ activityId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: profile } = await supabaseAdmin
      .from("user_profile")
      .select("home_address, home_lat, home_lng")
      .limit(1)
      .maybeSingle();
    if (!profile?.home_lat || !profile?.home_lng) {
      return { status: "no_home" as const };
    }

    const { data: act, error: actErr } = await supabaseAdmin
      .from("activities")
      .select("id, title, venue, neighborhood, borough, venue_lat, venue_lng, travel_from_home")
      .eq("id", data.activityId)
      .maybeSingle();
    if (actErr) throw new Error(actErr.message);
    if (!act) return { status: "no_activity" as const };

    const cached = act.travel_from_home as TravelCache | null;
    if (
      cached &&
      cached.origin?.lat === profile.home_lat &&
      cached.origin?.lng === profile.home_lng
    ) {
      return { status: "ok" as const, travel: cached };
    }

    // Resolve venue coords (cache on activity row).
    let lat = act.venue_lat;
    let lng = act.venue_lng;
    if (lat == null || lng == null) {
      const venueQuery = [act.venue, act.neighborhood, act.borough, "New York, NY"]
        .filter(Boolean)
        .join(", ");
      const geo = await geocode(venueQuery);
      if (!geo) return { status: "no_venue" as const };
      lat = geo.lat;
      lng = geo.lng;
      await supabaseAdmin
        .from("activities")
        .update({ venue_lat: lat, venue_lng: lng })
        .eq("id", act.id);
    }

    const origin = { lat: profile.home_lat, lng: profile.home_lng };
    const dest = { lat, lng };
    const [drive, transit, walk] = await Promise.all([
      computeRoute(origin, dest, "drive"),
      computeRoute(origin, dest, "transit"),
      computeRoute(origin, dest, "walk"),
    ]);

    const travel: TravelCache = {
      origin,
      computedAt: new Date().toISOString(),
      drive,
      transit,
      walk,
    };

    await supabaseAdmin
      .from("activities")
      .update({ travel_from_home: travel as unknown as Record<string, unknown> })
      .eq("id", act.id);

    return { status: "ok" as const, travel };
  });