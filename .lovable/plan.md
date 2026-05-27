# Activity Planner — Phase 1 Plan

A personal NYC activity tracker. Phase 1 ships as a mobile-first PWA with **hardcoded dummy data** so we can iterate on look and feel before wiring up Supabase. Backend, scraper, AI chat, friends, and Spotify are designed-for but not built.

---

## 1. Database schema (designed now, implemented later)

Not coded yet — this is the target shape that the TypeScript dummy data will mirror, so swapping to Supabase later is a 1:1 mapping.

### Core tables

**`activities`** — the central object
- `id` uuid pk
- `user_id` uuid → auth.users
- `title` text
- `description` text
- `venue_name` text
- `neighborhood` text
- `borough` enum (`manhattan`, `brooklyn`, `queens`, `bronx`, `staten_island`)
- `address` text, `lat` float, `lng` float
- `category` enum (`concert`, `comedy`, `food`, `museum`, `outdoors`, `theater`, `nightlife`, `film`, `art`, `sports`, `other`)
- `price_min` int, `price_max` int, `price_tier` enum (`free`, `$`, `$$`, `$$$`, `$$$$`)
- `status` enum (`saved`, `interested`, `planned`, `attended`, `archived`)
- `source_url` text (for Import from URL)
- `image_url` text
- `notes` text (personal)
- `kind` enum (`one_time`, `recurring`, `timeless`) — drives calendar behavior
- `created_at`, `updated_at`

**`activity_dates`** — one activity → many showings
- `id`, `activity_id` fk
- `starts_at` timestamptz, `ends_at` timestamptz nullable
- `is_sold_out` bool
- `ticket_url` text
- `notes` text

**`tags`** + **`activity_tags`** — many-to-many free-form tags (e.g., "date night", "rainy day", "with kids")

**`profiles`** — extends auth.users
- `id` (= auth.users.id), `display_name`, `home_address`, `default_borough`, `avatar_url`

### Future-phase tables (schema reserved, not built)

- **`friends`** — `user_id`, `friend_id`, `status` (pending/accepted)
- **`activity_reactions`** — `activity_id`, `user_id`, `reaction` (👍/❤️/🤔) — shared via invite links
- **`availability_windows`** — `user_id`, `starts_at`, `ends_at` — for group overlap
- **`integrations`** — `user_id`, `provider` (google_calendar, spotify), `tokens` (encrypted)
- **`notification_preferences`** — per-user flags
- **`playlists`** — monthly Spotify playlist refs

### Relationships
```text
auth.users 1─1 profiles
profiles   1─∞ activities ─∞ activity_dates
                  └─∞ activity_tags ∞─1 tags
profiles   ∞─∞ friends (self-join)
activities ∞─∞ activity_reactions ∞─1 profiles
```

### RLS sketch (for later)
- `activities`, `activity_dates`, `tags`: owner-only read/write
- `activity_reactions`: readable by owner + friends with accepted status
- Roles in a separate `user_roles` table (no role columns on profiles)

---

## 2. Page structure & navigation

Six top-level pages. **Mobile: bottom nav (5 primary) + settings in profile menu. Desktop: collapsible left sidebar.**

| Page | Route | Purpose |
|---|---|---|
| Library | `/` | Default. Grid/list of saved activities with filters. |
| Calendar | `/calendar` | Month / week / list views of dated activities. |
| Chat | `/chat` | AI assistant (mocked responses Phase 1). |
| Playlists | `/playlists` | Monthly Spotify playlist cards (placeholder). |
| Add Activity | `/add` (modal on mobile, route on desktop) | Manual entry + Import from URL tab. |
| Settings | `/settings` | Profile, integrations, notifications. |

**Bottom nav (mobile)**: Library, Calendar, **+ Add (center FAB)**, Chat, Playlists.
**Sidebar (desktop)**: same items + Settings pinned to bottom with avatar.

Top of every page: search bar + quick filter chips (mobile collapses search behind icon).

---

## 3. Activity card design

One component, three render modes driven by a `variant` prop.

### `variant="library"` (grid card, ~280px)
- 16:9 image (or generated gradient by category)
- Title (2-line clamp)
- Venue · Neighborhood
- Category pill + price tier
- Next upcoming date (or "Anytime" for timeless, "Sold out" badge if all dates gone)
- Status chip (saved/interested/planned/attended)
- Tap → detail sheet

### `variant="calendar"` (compact pill on calendar cell)
- Color-coded by category
- Title only, truncated
- Strikethrough + muted if sold out
- Tap → detail sheet

### `variant="chat"` (inline recommendation in chat)
- Horizontal card: thumbnail left, title + venue + date + price right
- Quick actions: Save, Plan, Dismiss

### Detail sheet (bottom sheet on mobile, side panel on desktop)
- Hero image, title, full description
- All dates with sold-out states + ticket links
- Venue with map preview
- Tags, notes (inline editable)
- Status selector, source URL, edit/delete

---

## 4. Filter & sort UX

**Mobile**: top bar with a **Filters** button → bottom sheet drawer with all controls; active filters shown as removable chips below the bar.
**Desktop**: same chips bar + filters live in a **collapsible left rail** on Library and Calendar.

Filter fields: category (multi), neighborhood/borough (multi), price tier (range), date range, status (multi), tags (multi), hide-sold-out toggle.
Sort: next date (default), recently added, price, alphabetical.

Same filter component is shared by Library and Calendar so the mental model is identical.

---

## 5. Dummy data

20–30 hardcoded activities in `src/data/activities.ts`:
- Real NYC venues (Bowery Ballroom, Comedy Cellar, Smorgasburg, MoMA PS1, Prospect Park, Film Forum, etc.)
- Realistic neighborhoods across all 5 boroughs, weighted to Manhattan + Brooklyn
- Plausible dates spread across the next ~3 months + a few timeless bookmarks
- Mix of all categories, price tiers, statuses
- A handful with multiple dates; 2–3 marked sold-out
- Curated tag set: "date night", "rainy day", "free", "outdoor", "late night", "with friends", etc.

Data access goes through a thin `useActivities()` hook so swapping to Supabase queries later is mechanical.

---

## 6. Design direction

- **Bright and fun**: saturated category colors, generous rounded corners, playful but readable type, soft shadows.
- **Mobile-first**: thumb-reachable bottom nav, large tap targets, sheet-based detail views.
- **Calendar = "what's possible"**: airy, non-grid-locked feel; faded sold-out items; subtle weather/category color washes per day.
- **Minimal clicks**: + FAB everywhere, one-tap status changes from card, inline tag editing.

I'll propose 3 rendered visual directions (via design directions) after we agree on this plan, so you can pick the look before I build.

---

## 7. PWA

Manifest-only PWA (icons + `display: "standalone"`) so you can add to home screen and the app is share-target ready in spirit. **No service worker in Phase 1** — service workers interfere with the Lovable preview iframe, and you don't need offline yet. Full PWA share-target registration is a future-phase item.

---

## 8. Future-phase hooks (designed in, not built)

- **Import from URL**: form accepts URL + optional manual fields; stores URL in `source_url`. Later: POST to FastAPI scraper, hydrate fields.
- **Bookmark import**: route stub `/settings/import` reserved.
- **Google Calendar overlay**: calendar view leaves a layer slot for external events.
- **AI chat**: chat UI sends to a `sendMessage(message, context)` function — mocked now, swap to edge function calling Claude later. Context object already includes calendar + weather + energy + companions placeholders.
- **Friends/reactions**: detail sheet has a hidden "Reactions" section behind a feature flag.
- **Notifications**: settings page lists toggles wired to local state only.
- **Share target**: manifest leaves room to add `share_target` later.

---

## 9. Tech choices for Phase 1

- React + Vite + TypeScript + Tailwind + shadcn (already scaffolded by Lovable template)
- Routing: React Router
- Calendar: `react-day-picker` for month, custom week/list views (lightweight, no heavy deps)
- State: React Query for the data hook (so backend swap is trivial) + Zustand for filter UI state
- Icons: Lucide
- No Supabase calls yet. No service worker.

---

## Build order once approved

1. Pick a visual direction (I'll generate 3).
2. Scaffold routes, bottom nav + sidebar shell, theme tokens.
3. Build dummy data + `useActivities` hook + filter store.
4. Library page with card + filters + detail sheet.
5. Calendar page (month → week → list) sharing card + filters.
6. Add Activity form (manual + Import from URL stub).
7. Chat page with mocked assistant.
8. Playlists placeholder.
9. Settings page.
10. PWA manifest + icons.

---

**Questions for you before I generate directions:**
1. Bottom nav with center + FAB on mobile, sidebar on desktop — good, or do you want tabs?
2. Detail view as bottom sheet (mobile) / side panel (desktop) — or full-page route?
3. Should the calendar default to **month**, **week**, or **list** on first load (separately per device)?
4. Any NYC venues / categories you want guaranteed in the dummy data?
