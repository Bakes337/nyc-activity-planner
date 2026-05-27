import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------- Helpers ----------

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;

const FilterSchema = z.object({
  boroughs: z.array(z.enum(BOROUGHS)).default([]),
  hideSoldOut: z.boolean().default(true),
});
export type OrganizerFilters = z.infer<typeof FilterSchema>;

function parseEventbriteOrganizerId(url: string): string | null {
  // https://www.eventbrite.com/o/<slug-or-id>  — slug usually ends with -<id>
  const m = url.match(/eventbrite\.com\/o\/([^/?#]+)/i);
  if (!m) return null;
  const tail = m[1];
  const idMatch = tail.match(/(\d{6,})$/);
  return idMatch ? idMatch[1] : tail;
}

function safeIso(s: unknown): string | null {
  if (typeof s !== "string" || !s) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

// ---------- Firecrawl (organizer page) ----------

interface ScrapedEvent {
  externalId: string;
  title: string;
  url: string;
  startsAt: string | null;
  endsAt: string | null;
  venue: string;
  neighborhood: string;
  borough: string;
  isSoldOut: boolean;
  imageUrl: string | null;
}

interface ScrapedOrganizer {
  name: string;
  events: ScrapedEvent[];
}

async function scrapeEventbriteOrganizer(
  apiKey: string,
  url: string,
): Promise<ScrapedOrganizer> {
  const schema = {
    type: "object",
    properties: {
      organizerName: { type: "string" },
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            url: { type: "string", description: "Absolute eventbrite.com event URL" },
            externalId: { type: "string", description: "Numeric event id from the URL (last path segment of /e/...-<id>)" },
            startLocal: { type: ["string", "null"], description: "ISO-8601 in America/New_York" },
            endLocal: { type: ["string", "null"] },
            venue: { type: ["string", "null"] },
            neighborhood: { type: ["string", "null"] },
            borough: { type: ["string", "null"], description: "One of Manhattan, Brooklyn, Queens, Bronx, Staten Island, or null" },
            soldOut: { type: "boolean" },
            imageUrl: { type: ["string", "null"] },
          },
          required: ["title", "url", "soldOut"],
        },
      },
    },
    required: ["events"],
  };

  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: [
        "markdown",
        {
          type: "json",
          schema,
          prompt:
            "Extract the organizer's display name and every UPCOMING event listed on the page. " +
            "For each event, pull the title, absolute event URL, the numeric id from the URL, " +
            "start (and end if shown) datetime in America/New_York, venue, NYC borough if inferable, " +
            "and whether it is sold out / unavailable. If the page shows no upcoming events, return events: [].",
        },
      ],
      onlyMainContent: false,
      waitFor: 3000,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${txt.slice(0, 200)}`);
  }
  const body = (await res.json()) as { data?: Record<string, unknown> };
  const d = (body.data ?? body) as { json?: unknown };
  const j = (d.json ?? {}) as { organizerName?: unknown; events?: unknown };
  const events = Array.isArray(j.events) ? (j.events as unknown[]) : [];

  const out: ScrapedEvent[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    const o = e as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url : "";
    if (!url) continue;
    const idGuess =
      typeof o.externalId === "string" && o.externalId.trim()
        ? o.externalId.trim()
        : (url.match(/(\d{6,})(?:[/?#]|$)/)?.[1] ?? url);
    if (seen.has(idGuess)) continue;
    seen.add(idGuess);
    out.push({
      externalId: idGuess,
      title: typeof o.title === "string" ? o.title.trim() : "",
      url,
      startsAt: safeIso(o.startLocal),
      endsAt: safeIso(o.endLocal),
      venue: typeof o.venue === "string" ? o.venue : "",
      neighborhood: typeof o.neighborhood === "string" ? o.neighborhood : "",
      borough: typeof o.borough === "string" ? o.borough : "",
      isSoldOut: o.soldOut === true,
      imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : null,
    });
  }

  return {
    name: typeof j.organizerName === "string" ? j.organizerName.trim() : "",
    events: out,
  };
}

function applyFilters(events: ScrapedEvent[], filters: OrganizerFilters): ScrapedEvent[] {
  return events.filter((e) => {
    if (filters.hideSoldOut && e.isSoldOut) return false;
    if (filters.boroughs.length > 0) {
      const b = e.borough.trim();
      if (!filters.boroughs.includes(b as (typeof BOROUGHS)[number])) return false;
    }
    return true;
  });
}

// ---------- Server functions ----------

export const followOrganizer = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      url: z.string().url(),
      filters: FilterSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const url = data.url.trim();
    if (!/eventbrite\.com\/o\//i.test(url)) {
      throw new Error("Only Eventbrite organizer URLs are supported right now (https://www.eventbrite.com/o/…)");
    }
    const organizerId = parseEventbriteOrganizerId(url);
    if (!organizerId) throw new Error("Couldn't parse organizer id from that URL");
    const filters = FilterSchema.parse(data.filters ?? {});

    const { data: inserted, error } = await supabaseAdmin
      .from("followed_organizers")
      .upsert(
        {
          source: "eventbrite",
          organizer_id: organizerId,
          url,
          filters,
          name: "",
        },
        { onConflict: "source,organizer_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const unfollowOrganizer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("followed_organizers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateOrganizerFilters = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), filters: FilterSchema }))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("followed_organizers")
      .update({ filters: data.filters })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listFollowedOrganizers = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("followed_organizers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

async function refreshOne(orgRow: {
  id: string;
  url: string;
  filters: unknown;
  name: string;
}): Promise<{ id: string; added: number; error: string | null }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured");
  const filters = FilterSchema.parse((orgRow.filters as object) ?? {});

  try {
    const scraped = await scrapeEventbriteOrganizer(apiKey, orgRow.url);
    const matches = applyFilters(scraped.events, filters);

    let added = 0;
    if (matches.length > 0) {
      const rows = matches.map((e) => ({
        organizer_id: orgRow.id,
        external_id: e.externalId,
        title: e.title,
        url: e.url,
        starts_at: e.startsAt,
        ends_at: e.endsAt,
        venue: e.venue,
        neighborhood: e.neighborhood,
        borough: e.borough,
        is_sold_out: e.isSoldOut,
        image_url: e.imageUrl,
        status: "new" as const,
      }));
      // Upsert by (organizer_id, external_id); ignore conflicts so we don't
      // revive dismissed/accepted suggestions.
      const { error } = await supabaseAdmin
        .from("organizer_suggestions")
        .upsert(rows, { onConflict: "organizer_id,external_id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
      added = rows.length;
    }

    const updates: {
      last_checked_at: string;
      last_error: string | null;
      name?: string;
    } = {
      last_checked_at: new Date().toISOString(),
      last_error: null,
    };
    if (scraped.name && !orgRow.name) updates.name = scraped.name;
    await supabaseAdmin.from("followed_organizers").update(updates).eq("id", orgRow.id);

    return { id: orgRow.id, added, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("followed_organizers")
      .update({ last_checked_at: new Date().toISOString(), last_error: msg.slice(0, 500) })
      .eq("id", orgRow.id);
    return { id: orgRow.id, added: 0, error: msg };
  }
}

export const refreshOrganizer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("followed_organizers")
      .select("id, url, filters, name")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Organizer not found");
    return refreshOne(row);
  });

export const refreshAllOrganizers = createServerFn({ method: "POST" }).handler(async () => {
  const { data: rows, error } = await supabaseAdmin
    .from("followed_organizers")
    .select("id, url, filters, name");
  if (error) throw new Error(error.message);
  const results: { id: string; added: number; error: string | null }[] = [];
  for (const r of rows ?? []) {
    // sequential to be gentle on Firecrawl
    // eslint-disable-next-line no-await-in-loop
    results.push(await refreshOne(r));
  }
  return { count: results.length, results };
});

export const listSuggestions = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("organizer_suggestions")
    .select("*, followed_organizers(name, url)")
    .eq("status", "new")
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const dismissSuggestion = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("organizer_suggestions")
      .update({ status: "dismissed" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acceptSuggestion = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: s, error } = await supabaseAdmin
      .from("organizer_suggestions")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !s) throw new Error(error?.message ?? "Suggestion not found");

    const borough = (BOROUGHS as readonly string[]).includes(s.borough)
      ? (s.borough as (typeof BOROUGHS)[number])
      : "Manhattan";

    const seed =
      s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "activity";

    const row = {
      title: s.title,
      venue: s.venue ?? "",
      neighborhood: s.neighborhood ?? "",
      borough,
      category: "music" as const,
      price_tier: "$$" as const,
      status: "idea" as const,
      kind: s.starts_at ? ("one_time" as const) : ("timeless" as const),
      source_url: s.url,
      image_seed: seed,
      tags: [] as string[],
      dates: s.starts_at
        ? [
            {
              id: `d0-${Math.random().toString(36).slice(2, 8)}`,
              startsAt: s.starts_at,
              endsAt: s.ends_at ?? undefined,
              isSoldOut: s.is_sold_out ?? false,
            },
          ]
        : [],
    };
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("activities")
      .insert(row)
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin
      .from("organizer_suggestions")
      .update({ status: "accepted" })
      .eq("id", s.id);

    return inserted;
  });