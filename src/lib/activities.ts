import type { Activity, ActivityDate, Borough, Category, PriceTier, Status } from "./data";

// Row shape returned by Supabase (snake_case columns).
export interface ActivityRow {
  id: string;
  title: string;
  venue: string;
  neighborhood: string;
  borough: string;
  category: string;
  price_tier: string;
  price_note: string | null;
  status: string;
  kind: string;
  source_url: string | null;
  image_seed: string;
  notes: string | null;
  tags: string[] | null;
  dates: unknown;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
  is_monitored?: boolean | null;
  last_monitored_at?: string | null;
  done_at?: string | null;
  rating?: number | null;
  rating_notes?: string | null;
}


export function rowToActivity(r: ActivityRow): Activity {
  const datesArr = Array.isArray(r.dates) ? (r.dates as ActivityDate[]) : [];
  return {
    id: r.id,
    title: r.title,
    venue: r.venue,
    neighborhood: r.neighborhood,
    borough: r.borough as Borough,
    category: r.category as Category,
    priceTier: r.price_tier as PriceTier,
    priceNote: r.price_note ?? undefined,
    status: r.status as Status,
    kind: r.kind as Activity["kind"],
    sourceUrl: r.source_url ?? undefined,
    imageSeed: r.image_seed || r.id,
    notes: r.notes ?? undefined,
    tags: r.tags ?? [],
    dates: datesArr,
    durationMinutes: r.duration_minutes ?? undefined,
    isMonitored: r.is_monitored ?? false,
    lastMonitoredAt: r.last_monitored_at ?? undefined,
  };
}