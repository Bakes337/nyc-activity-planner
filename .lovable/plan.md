# Monitor URLs for new dates (weekly)

Today you can follow Eventbrite organizers. This adds a separate "watch this page" feature: paste any URL + an optional focus hint (like "Buttercream Essentials 3") and the app re-scrapes it weekly. Any newly-appearing date becomes a suggestion in your inbox.

## What you'll get

- A "Monitor a page" section in **Settings** to paste a URL + focus hint and review/remove watches.
- New dates show up in **Suggestions** alongside organizer matches, with the same Add / Dismiss buttons.
- A weekly cron job that re-scrapes every watched URL automatically. Manual "Refresh now" button too.
- First successful scrape establishes the baseline (no spam of "new" dates on day one).

## How it works

1. New table `monitored_urls` (url, hint, title, last_seen_dates jsonb, last_checked_at, last_error).
2. New table `monitored_url_suggestions` (url_id, starts_at, ends_at, price_note, status: new/dismissed/accepted). Same shape/spirit as `organizer_suggestions` so Suggestions page can list both.
3. Server functions in `src/lib/monitors.functions.ts`:
   - `addMonitoredUrl({ url, hint })` — inserts row, runs initial scrape to seed `last_seen_dates`.
   - `refreshMonitoredUrl({ id })` and `refreshAllMonitoredUrls()` — reuse the existing Peek/FareHarbor/Lovable-AI extraction logic from `activities.functions.ts` (refactor the dates-extraction portion into a shared helper) to get the current date list; diff against `last_seen_dates`; insert new ones as suggestions.
   - `listMonitoredUrls`, `removeMonitoredUrl`, `acceptMonitorSuggestion`, `dismissMonitorSuggestion`.
4. Public cron route `src/routes/api/public/cron.refresh-monitors.ts` calling `refreshAllMonitoredUrls`. Schedule via pg_cron, weekly (Mondays 9am ET).
5. UI: add a "Monitored pages" section to **Settings** (URL + hint inputs, list of watches with Refresh/Remove). Extend `/suggestions` to also fetch and render monitor suggestions in the same list.

## Notes

- Reuses your existing Firecrawl key + the URL-parsing pipeline you already trust, so nycakeacademy + FareHarbor will work the same way it does in `/add`.
- "New date" = startsAt not present in the previous `last_seen_dates` snapshot, ignoring sold-out tiles.

Sound good?
