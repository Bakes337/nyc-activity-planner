import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseActivityUrl } from "./activities.functions";

// ---------- helpers ----------

// Mirrors the cache key shape in activities.functions.ts. We delete the cache
// row before a monitor refresh so the parser always fetches fresh data.
const PARSER_VERSION = "v4-fh-3months";
function cacheKeyFor(url: string, hint: string) {
  return hint
    ? `${url}\n#hint:${hint}\n#v:${PARSER_VERSION}`
    : `${url}\n#v:${PARSER_VERSION}`;
}

async function freshParse(url: string, hint: string) {
  await supabaseAdmin.from("scrape_cache").delete().eq("url", cacheKeyFor(url, hint));
  return parseActivityUrl({ data: { url, hint: hint || undefined } });
}

function normalizeDates(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<string>();
  for (const v of input) {
    if (typeof v === "string") {
      out.add(v);
    } else if (v && typeof v === "object" && "startsAt" in v) {
      const s = (v as { startsAt?: unknown }).startsAt;
      if (typeof s === "string") out.add(s);
    }
  }
  return Array.from(out);
}

// ---------- server functions ----------

export const addMonitoredUrl = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      url: z.string().url().max(2000),
      hint: z.string().max(300).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const url = data.url.trim();
    const hint = (data.hint ?? "").trim();

    const { data: inserted, error } = await supabaseAdmin
      .from("monitored_urls")
      .upsert(
        { url, hint, title: "", last_seen_dates: [] },
        { onConflict: "url,hint" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Seed the baseline so the first cron run doesn't flood the inbox.
    try {
      const parsed = await freshParse(url, hint);
      const startsList = parsed.dates.map((d) => d.startsAt);
      await supabaseAdmin
        .from("monitored_urls")
        .update({
          title: parsed.title || "",
          last_seen_dates: startsList,
          last_checked_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", inserted.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin
        .from("monitored_urls")
        .update({
          last_checked_at: new Date().toISOString(),
          last_error: msg.slice(0, 500),
        })
        .eq("id", inserted.id);
    }

    return inserted;
  });

export const listMonitoredUrls = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("monitored_urls")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const removeMonitoredUrl = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("monitored_urls")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function refreshOneMonitor(row: {
  id: string;
  url: string;
  hint: string;
  title: string;
  last_seen_dates: unknown;
}): Promise<{ id: string; added: number; error: string | null }> {
  try {
    const parsed = await freshParse(row.url, row.hint);
    const currentStarts = parsed.dates.map((d) => d.startsAt);
    const previous = new Set(normalizeDates(row.last_seen_dates));
    const nowMs = Date.now();

    const newOnes = parsed.dates.filter((d) => {
      if (previous.has(d.startsAt)) return false;
      const t = Date.parse(d.startsAt);
      return !Number.isNaN(t) && t >= nowMs;
    });

    let added = 0;
    if (newOnes.length > 0) {
      const rows = newOnes.map((d) => ({
        monitored_url_id: row.id,
        starts_at: d.startsAt,
        ends_at: d.endsAt,
        price_note: null,
        status: "new" as const,
      }));
      const { error } = await supabaseAdmin
        .from("monitor_suggestions")
        .upsert(rows, { onConflict: "monitored_url_id,starts_at", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
      added = rows.length;
    }

    await supabaseAdmin
      .from("monitored_urls")
      .update({
        title: parsed.title || row.title || "",
        last_seen_dates: currentStarts,
        last_checked_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", row.id);

    return { id: row.id, added, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("monitored_urls")
      .update({
        last_checked_at: new Date().toISOString(),
        last_error: msg.slice(0, 500),
      })
      .eq("id", row.id);
    return { id: row.id, added: 0, error: msg };
  }
}

export const refreshMonitoredUrl = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("monitored_urls")
      .select("id, url, hint, title, last_seen_dates")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Monitored URL not found");
    return refreshOneMonitor(row);
  });

// Internal impl — callable from trusted server-side code (e.g. the cron route)
// WITHOUT going through the auth-protected serverFn RPC layer.
export async function refreshAllMonitoredUrlsImpl() {
  const { data: rows, error } = await supabaseAdmin
    .from("monitored_urls")
    .select("id, url, hint, title, last_seen_dates");
  if (error) throw new Error(error.message);
  const results: { id: string; added: number; error: string | null }[] = [];
  for (const r of rows ?? []) {
    // sequential to be gentle on Firecrawl
    // eslint-disable-next-line no-await-in-loop
    results.push(await refreshOneMonitor(r));
  }
  return { count: results.length, results };
}

export const refreshAllMonitoredUrls = createServerFn({ method: "POST" }).handler(
  async () => refreshAllMonitoredUrlsImpl(),
);

export const listMonitorSuggestions = createServerFn({ method: "GET" }).handler(async () => {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("monitor_suggestions")
    .select("*, monitored_urls(url, hint, title)")
    .eq("status", "new")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const dismissMonitorSuggestion = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      reason: z.enum(["not_interested", "not_available"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("monitor_suggestions")
      .update({ status: "dismissed", dismiss_reason: data.reason ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acceptMonitorSuggestion = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: s, error } = await supabaseAdmin
      .from("monitor_suggestions")
      .select("*, monitored_urls(url, hint, title)")
      .eq("id", data.id)
      .single();
    if (error || !s) throw new Error(error?.message ?? "Suggestion not found");

    const mon = s.monitored_urls as { url: string; hint: string; title: string } | null;
    const title = mon?.title || mon?.hint || mon?.url || "Watched activity";

    const { error: insErr } = await supabaseAdmin.from("activities").insert({
      title,
      venue: "",
      neighborhood: "",
      borough: "Manhattan",
      category: "crafts",
      price_tier: "$$",
      price_note: s.price_note ?? null,
      status: "idea",
      kind: "one_time",
      source_url: mon?.url ?? null,
      image_seed: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
      tags: [],
      dates: [
        {
          id: `d0-${Math.random().toString(36).slice(2, 8)}`,
          startsAt: s.starts_at,
          endsAt: s.ends_at ?? undefined,
          isSoldOut: false,
        },
      ],
    });
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin
      .from("monitor_suggestions")
      .update({ status: "accepted" })
      .eq("id", data.id);

    return { ok: true };
  });