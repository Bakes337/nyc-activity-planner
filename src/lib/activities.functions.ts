import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------- Firecrawl helpers ----------

interface FirecrawlScrapeResult {
  markdown: string;
  html: string;
  links: string[];
  title: string;
  description: string;
  json: unknown;
}

type FirecrawlFormat =
  | "markdown"
  | "html"
  | "links"
  | { type: "json"; schema?: unknown; prompt?: string };

interface FirecrawlOpts {
  formats: FirecrawlFormat[];
  onlyMainContent?: boolean;
  waitFor?: number;
  actions?: Array<
    | { type: "wait"; milliseconds: number }
    | { type: "scroll"; direction?: "up" | "down" }
    | { type: "click"; selector: string }
    | { type: "screenshot" }
  >;
}

async function firecrawlScrape(
  apiKey: string,
  url: string,
  opts: FirecrawlOpts,
): Promise<FirecrawlScrapeResult> {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, ...opts }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${txt.slice(0, 200)}`);
  }
  const body = (await res.json()) as {
    data?: Record<string, unknown>;
    markdown?: unknown;
    html?: unknown;
    links?: unknown;
    json?: unknown;
    metadata?: { title?: unknown; description?: unknown };
  };
  const d = (body.data ?? body) as Record<string, unknown> & {
    metadata?: { title?: unknown; description?: unknown };
  };
  return {
    markdown: typeof d.markdown === "string" ? d.markdown : "",
    html: typeof d.html === "string" ? d.html : "",
    links: Array.isArray(d.links) ? (d.links as unknown[]).filter((x): x is string => typeof x === "string") : [],
    title: typeof d.metadata?.title === "string" ? d.metadata.title : "",
    description: typeof d.metadata?.description === "string" ? d.metadata.description : "",
    json: d.json ?? null,
  };
}

// ---------- Peek adapter ----------

interface PeekExtraction {
  title: string | null;
  dates: { startsAt: string; endsAt: string | null; priceNote: string | null; soldOut: boolean }[];
}

const PEEK_HOST_RE = /https?:\/\/(?:book|www)\.peek\.com\/[^\s"'<>)]+/gi;

function detectPeekUrl(sourceUrl: string, links: string[], html: string, markdown: string): string | null {
  if (/(?:book|www)\.peek\.com\//i.test(sourceUrl)) return sourceUrl;
  const fromLinks = links.find((l) => /(?:book|www)\.peek\.com\//i.test(l));
  if (fromLinks) return fromLinks;
  const hay = `${html}\n${markdown}`;
  const m = hay.match(PEEK_HOST_RE);
  return m?.[0] ?? null;
}

const FAREHARBOR_RE = /https?:\/\/fareharbor\.com\/(?:embeds\/book|book)\/[a-z0-9-]+\/items\/\d+\/?[^\s"'<>)]*/gi;
const FH_ITEM_RE = /fareharbor\.com\/(?:embeds\/book|book)\/[a-z0-9-]+\/items\/\d+/i;

// Pick the FareHarbor URL most likely to be the main class booking widget
// (not the gift-card widget or "related class" CTA).
function detectFareHarborUrl(
  sourceUrl: string,
  links: string[],
  html: string,
  markdown: string,
  hint?: string,
): string | null {
  if (FH_ITEM_RE.test(sourceUrl)) return sourceUrl;

  const hay = `${html}\n${markdown}`;
  const candidates = Array.from(
    new Set([
      ...links.filter((l) => FH_ITEM_RE.test(l)),
      ...(hay.match(FAREHARBOR_RE) ?? []),
    ]),
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const scoreFor = (url: string) => {
    let score = 0;
    let idx = 0;
    while ((idx = markdown.indexOf(url, idx)) !== -1) {
      const ctx = markdown.slice(Math.max(0, idx - 200), idx + 200).toLowerCase();
      if (/gift\s*card|buy\s*gift|gift\s*this/.test(ctx)) score -= 5;
      if (/book\s*(?:this|now|class)|check\s*availability/.test(ctx)) score += 5;
      if (hint && ctx.includes(hint.toLowerCase())) score += 8;
      idx += url.length;
    }
    return score;
  };

  return candidates
    .map((u) => ({ u, s: scoreFor(u) }))
    .sort((a, b) => b.s - a.s)[0].u;
}

async function scrapePeekWidget(apiKey: string, peekUrl: string): Promise<PeekExtraction> {
  const peekSchema = {
    type: "object",
    properties: {
      title: { type: "string", description: "Activity / class name (the H1 inside the booking widget)" },
      availableDates: {
        type: "array",
        description: "Every bookable date visible in the calendar, including future months if shown.",
        items: {
          type: "object",
          properties: {
            startLocal: {
              type: "string",
              description: "Local start datetime in ISO-8601 (America/New_York). Use the date plus the session start time if shown, otherwise 10:00 local.",
            },
            endLocal: { type: ["string", "null"], description: "Local end datetime in ISO-8601 if known, else null" },
            priceUsd: { type: ["number", "null"] },
            soldOut: { type: "boolean" },
          },
          required: ["startLocal", "soldOut"],
        },
      },
    },
    required: ["title", "availableDates"],
  };

  const res = await firecrawlScrape(apiKey, peekUrl, {
    formats: [
      "markdown",
      {
        type: "json",
        schema: peekSchema,
        prompt:
          "Extract the activity title (the booking widget's H1) and every bookable date shown in the calendar. Include sold-out dates with soldOut=true. If a price is shown on a date tile (e.g. $265), put it in priceUsd.",
      },
    ],
    waitFor: 4500,
    onlyMainContent: false,
  });

  const j = (res.json ?? {}) as {
    title?: unknown;
    availableDates?: unknown;
  };
  const datesRaw = Array.isArray(j.availableDates) ? (j.availableDates as unknown[]) : [];
  const dates = datesRaw
    .map((d) => {
      const o = d as { startLocal?: unknown; endLocal?: unknown; priceUsd?: unknown; soldOut?: unknown };
      const startsAt = safeIso(o.startLocal);
      if (!startsAt) return null;
      const price = typeof o.priceUsd === "number" ? `$${o.priceUsd}` : null;
      return {
        startsAt,
        endsAt: safeIso(o.endLocal),
        priceNote: price,
        soldOut: o.soldOut === true,
      };
    })
    .filter((x): x is PeekExtraction["dates"][number] => x !== null);

  return {
    title: typeof j.title === "string" && j.title.trim() ? j.title.trim() : null,
    dates,
  };
}

async function scrapeFareHarborWidget(apiKey: string, fhUrl: string): Promise<PeekExtraction> {
  const fhSchema = {
    type: "object",
    properties: {
      title: { type: "string", description: "Activity / class name shown in the booking widget header" },
      availableDates: {
        type: "array",
        description: "Every UPCOMING bookable date+time visible on the calendar — open ALL future months shown. Do NOT include past dates.",
        items: {
          type: "object",
          properties: {
            startLocal: {
              type: "string",
              description: "Local start datetime in ISO-8601 (America/New_York). Combine the date with the session start time shown on that tile (e.g. '8:00 AM', '6:00 PM').",
            },
            endLocal: { type: ["string", "null"] },
            priceUsd: { type: ["number", "null"] },
            soldOut: { type: "boolean" },
          },
          required: ["startLocal", "soldOut"],
        },
      },
    },
    required: ["title", "availableDates"],
  };

  const today = new Date().toISOString().slice(0, 10);
  // FareHarbor calendar shows ~1 month at a time. We scrape the current view,
  // then click the "next month" button N times to advance and re-scrape, so we
  // collect availability across roughly the next 3 months.
  const NEXT_MONTH_SELECTORS = [
    'button[aria-label*="Next" i]',
    'a[aria-label*="Next" i]',
    'button[title*="Next" i]',
    ".fh-button-next-month",
    ".fh-calendar-next",
    ".next-month",
  ];
  const clickNext = NEXT_MONTH_SELECTORS.map((selector) => ({
    type: "click" as const,
    selector,
  }));

  const scrapeMonth = async (monthsAhead: number) => {
    const actions: FirecrawlOpts["actions"] = [
      { type: "wait", milliseconds: 4000 },
      { type: "scroll", direction: "down" },
      { type: "wait", milliseconds: 1500 },
    ];
    for (let i = 0; i < monthsAhead; i++) {
      // Try several common selectors — Firecrawl click actions silently skip
      // selectors that don't match, so listing alternatives is safe.
      actions.push(...clickNext, { type: "wait", milliseconds: 1500 });
    }
    return firecrawlScrape(apiKey, fhUrl, {
      formats: [
        "markdown",
        {
          type: "json",
          schema: fhSchema,
          prompt: `Today is ${today}. Extract the activity title and EVERY upcoming bookable session currently visible on the FareHarbor calendar. Each tile shows a date with one or more start times like "8:00 AM" or "6:00 PM"; emit one entry per start time. Ignore any date before today. Mark soldOut=true for greyed-out / unavailable tiles. If no time tiles are visible, return availableDates: [].`,
        },
      ],
      waitFor: 8000,
      onlyMainContent: false,
      actions,
    });
  };

  // Scrape current month + next 2 months in parallel
  const results = await Promise.allSettled([
    scrapeMonth(0),
    scrapeMonth(1),
    scrapeMonth(2),
  ]);

  const now = Date.now();
  const seen = new Set<string>();
  const dates: PeekExtraction["dates"] = [];
  let title: string | null = null;

  for (const r of results) {
    if (r.status !== "fulfilled") {
      console.error("FareHarbor month scrape failed:", r.reason);
      continue;
    }
    const j = (r.value.json ?? {}) as { title?: unknown; availableDates?: unknown };
    if (!title && typeof j.title === "string" && j.title.trim()) {
      title = j.title.trim();
    }
    const datesRaw = Array.isArray(j.availableDates) ? (j.availableDates as unknown[]) : [];
    for (const d of datesRaw) {
      const o = d as { startLocal?: unknown; endLocal?: unknown; priceUsd?: unknown; soldOut?: unknown };
      const startsAt = safeIso(o.startLocal);
      if (!startsAt) continue;
      if (new Date(startsAt).getTime() < now - 12 * 3600 * 1000) continue;
      if (seen.has(startsAt)) continue;
      seen.add(startsAt);
      const price = typeof o.priceUsd === "number" ? `$${o.priceUsd}` : null;
      dates.push({
        startsAt,
        endsAt: safeIso(o.endLocal),
        priceNote: price,
        soldOut: o.soldOut === true,
      });
    }
  }

  dates.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return { title, dates };
}

const CATEGORIES = ["music", "food", "comedy", "art", "outdoors", "theater", "film"] as const;
const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;
const PRICE_TIERS = ["free", "$", "$$", "$$$"] as const;
const KINDS = ["one_time", "recurring", "timeless"] as const;
const STATUSES = ["idea", "planned", "booked", "visited", "passed"] as const;

export interface ParsedActivity {
  title: string;
  venue: string;
  neighborhood: string;
  borough: (typeof BOROUGHS)[number];
  category: (typeof CATEGORIES)[number];
  priceTier: (typeof PRICE_TIERS)[number];
  priceNote: string | null;
  kind: (typeof KINDS)[number];
  tags: string[];
  notes: string | null;
  dates: { startsAt: string; endsAt: string | null }[];
  sourceUrl: string;
  durationMinutes: number | null;
}

function coerce<T extends readonly string[]>(allowed: T, v: unknown, fallback: T[number]): T[number] {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T[number])
    : fallback;
}

function safeIso(s: unknown): string | null {
  if (typeof s !== "string" || !s) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

export const parseActivityUrl = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      url: z.string().url(),
      hint: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }): Promise<ParsedActivity> => {
    const url = data.url.trim();
    const hint = (data.hint ?? "").trim();
    // bump this when extraction logic changes to invalidate old cached parses
    const PARSER_VERSION = "v4-fh-3months";
    const cacheKey = hint
      ? `${url}\n#hint:${hint}\n#v:${PARSER_VERSION}`
      : `${url}\n#v:${PARSER_VERSION}`;

    // Cache lookup
    const cached = await supabaseAdmin
      .from("scrape_cache")
      .select("payload")
      .eq("url", cacheKey)
      .maybeSingle();
    if (cached.data?.payload) {
      return cached.data.payload as unknown as ParsedActivity;
    }

    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlKey) throw new Error("FIRECRAWL_API_KEY is not configured");
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");

    // 1) Scrape source page with links so we can detect embedded booking widgets
    const initial = await firecrawlScrape(firecrawlKey, url, {
      formats: ["markdown", "links"],
      onlyMainContent: false,
      waitFor: 2000,
    });
    const markdown = initial.markdown;
    const pageTitle = initial.title;
    const pageDesc = initial.description;
    const allLinks: string[] = Array.isArray(initial.links) ? initial.links : [];
    const html = initial.html ?? "";

    // 2) If a Peek booking widget is embedded, use the adapter for title + dates
    const peekUrl = detectPeekUrl(url, allLinks, html, markdown);
    const fhUrl = peekUrl ? null : detectFareHarborUrl(url, allLinks, html, markdown, hint);
    let peekData: PeekExtraction | null = null;
    if (peekUrl) {
      try {
        peekData = await scrapePeekWidget(firecrawlKey, peekUrl);
      } catch (e) {
        console.error("Peek adapter failed, falling back to generic parse:", e);
      }
    } else if (fhUrl) {
      try {
        peekData = await scrapeFareHarborWidget(firecrawlKey, fhUrl);
      } catch (e) {
        console.error("FareHarbor adapter failed, falling back to generic parse:", e);
      }
    }

    // 3) Ask Lovable AI to extract the rest (category, borough, venue, tags…)
    // If Peek gave us authoritative title/dates, pin them in the prompt.
    const todayIso = new Date().toISOString().slice(0, 10);
    const prompt = `You extract NYC event/activity details from a scraped web page.
Return STRICT JSON only — no commentary, no markdown fences.

TODAY is ${todayIso}. Only include FUTURE dates (>= today). NEVER include past dates, article publish dates, header/byline dates, "posted on" timestamps, or copyright years.

${
  hint
    ? `USER FOCUS HINT (highest priority): the user is specifically interested in: "${hint}".
- If the page lists multiple classes/events, pick the one matching this hint and ignore the others.
- Use this hint to choose the title, dates, and price. Prefer the section/heading whose name matches the hint over the page's overall title.
- If only the matching variant's dates should be returned, return only those dates.
`
    : ""
}
IMPORTANT title rules:
- Prefer the activity/event name (usually the H1 inside the booking widget or main content) over the site's <title> tag, which is often just the studio/venue brand.
- Do not append the venue name to the title.
${peekData?.title ? `- The authoritative title is: "${peekData.title}". Use it verbatim.` : ""}
${peekData?.dates && peekData.dates.length ? `- The authoritative dates list is provided below — copy it into the "dates" field verbatim, do NOT invent or filter.` : ""}

Schema:
{
  "title": string,
  "venue": string,
  "neighborhood": string,
  "borough": one of ${BOROUGHS.join(" | ")},
  "category": one of ${CATEGORIES.join(" | ")},
  "priceTier": one of ${PRICE_TIERS.join(" | ")},
  "priceNote": string | null,   // e.g. "$45", "$30 + 2 drink min"
  "kind": one of ${KINDS.join(" | ")},  // one_time = single date, recurring = multiple/weekly, timeless = no fixed date (e.g. restaurant, park)
  "tags": string[],             // 0-6 short lowercase keywords
  "notes": string | null,       // one short sentence summary
  "dates": [ { "startsAt": ISO-8601 string in America/New_York, "endsAt": ISO-8601 or null } ],
  "durationMinutes": number | null
}

IMPORTANT: For "durationMinutes" — convert the typical session length to MINUTES:
  - "3-4 hours" -> 210 (midpoint)
  - "2 hours" -> 120
  - "90 minutes" -> 90
  - "all day" -> 480
Look for phrases like "Duration:", "X hrs", "X-Y hours", "lasts about". If unclear, use null.

Use null/empty when truly unknown. If multiple show times exist, include up to 6 in dates.

Page title: ${pageTitle}
Description: ${pageDesc}
URL: ${url}
${peekData ? `\n--- Peek booking widget (authoritative) ---\n${JSON.stringify(peekData, null, 2)}\n` : ""}

--- Page content (markdown, truncated) ---
${markdown.slice(0, 8000)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured event data. Output ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`Couldn't parse the page (AI ${aiRes.status}): ${txt.slice(0, 200)}`);
    }
    const aiJson = (await aiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(content) as Record<string, unknown>;
    } catch {
      raw = {};
    }

    const datesRaw = Array.isArray(raw.dates) ? (raw.dates as unknown[]) : [];
    let dates = datesRaw
      .map((d) => {
        const o = d as { startsAt?: unknown; endsAt?: unknown };
        const startsAt = safeIso(o.startsAt);
        if (!startsAt) return null;
        return { startsAt, endsAt: safeIso(o.endsAt) };
      })
      .filter((x): x is { startsAt: string; endsAt: string | null } => x !== null)
      .slice(0, 8);

    // If Peek returned dates, trust those over the LLM's output
    if (peekData?.dates && peekData.dates.length) {
      dates = peekData.dates
        .map((d) => {
          const startsAt = safeIso(d.startsAt);
          return startsAt ? { startsAt, endsAt: safeIso(d.endsAt) } : null;
        })
        .filter((x): x is { startsAt: string; endsAt: string | null } => x !== null)
        .slice(0, 20);
    }

    const payload: ParsedActivity = {
      title:
        peekData?.title?.trim() ||
        (typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "") ||
        pageTitle ||
        "Untitled",
      venue: typeof raw.venue === "string" ? raw.venue : "",
      neighborhood: typeof raw.neighborhood === "string" ? raw.neighborhood : "",
      borough: coerce(BOROUGHS, raw.borough, "Manhattan"),
      category: coerce(CATEGORIES, raw.category, "music"),
      priceTier: coerce(PRICE_TIERS, raw.priceTier, "$$"),
      priceNote:
        peekData?.dates?.find((d) => d.priceNote)?.priceNote ??
        (typeof raw.priceNote === "string" && raw.priceNote.trim() ? raw.priceNote.trim() : null),
      kind: coerce(KINDS, raw.kind, dates.length > 1 ? "recurring" : dates.length === 1 ? "one_time" : "timeless"),
      tags: Array.isArray(raw.tags)
        ? (raw.tags as unknown[])
            .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
            .map((t) => t.toLowerCase().trim())
            .slice(0, 6)
        : [],
      notes: typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim() : null,
      dates,
      sourceUrl: url,
      durationMinutes:
        typeof raw.durationMinutes === "number" && Number.isFinite(raw.durationMinutes) && raw.durationMinutes > 0
          ? Math.round(raw.durationMinutes)
          : null,
    };

    // Cache it (best-effort)
    await supabaseAdmin
      .from("scrape_cache")
      .upsert({ url: cacheKey, payload: JSON.parse(JSON.stringify(payload)) });

    return payload;
  });

const DateInput = z.object({
  startsAt: z.string(),
  endsAt: z.string().nullable().optional(),
  isSoldOut: z.boolean().optional(),
});

const SaveInput = z.object({
  title: z.string().min(1).max(200),
  venue: z.string().max(200).default(""),
  neighborhood: z.string().max(200).default(""),
  borough: z.enum(BOROUGHS).default("Manhattan"),
  category: z.enum(CATEGORIES).default("music"),
  priceTier: z.enum(PRICE_TIERS).default("$$"),
  priceNote: z.string().max(80).nullable().optional(),
  status: z.enum(STATUSES).default("idea"),
  kind: z.enum(KINDS).default("one_time"),
  sourceUrl: z.string().url().nullable().optional(),
  imageSeed: z.string().max(80).default(""),
  notes: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().max(40)).max(12).default([]),
  dates: z.array(DateInput).max(20).default([]),
  durationMinutes: z.number().int().min(1).max(60 * 24 * 14).nullable().optional(),
});

export const createActivity = createServerFn({ method: "POST" })
  .inputValidator(SaveInput)
  .handler(async ({ data }) => {
    const seed =
      data.imageSeed?.trim() ||
      data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) ||
      "activity";
    const row = {
      title: data.title,
      venue: data.venue,
      neighborhood: data.neighborhood,
      borough: data.borough,
      category: data.category,
      price_tier: data.priceTier,
      price_note: data.priceNote ?? null,
      status: data.status,
      kind: data.kind,
      source_url: data.sourceUrl ?? null,
      image_seed: seed,
      notes: data.notes ?? null,
      tags: data.tags,
      duration_minutes: data.durationMinutes ?? null,
      dates: data.dates.map((d, i) => ({
        id: `d${i}-${Math.random().toString(36).slice(2, 8)}`,
        startsAt: d.startsAt,
        endsAt: d.endsAt ?? undefined,
        isSoldOut: d.isSoldOut ?? false,
      })),
    };
    const { data: inserted, error } = await supabaseAdmin
      .from("activities")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const listActivities = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const deleteActivity = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("activities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });