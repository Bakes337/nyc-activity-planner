export type Category =
  | "music"
  | "food"
  | "comedy"
  | "culture"
  | "crafts"
  | "active"
  | "theater"
  | "film";

export type Borough =
  | "Manhattan"
  | "Brooklyn"
  | "Queens"
  | "Bronx"
  | "Staten Island";

export type Status = "idea" | "planned" | "booked" | "visited" | "passed";
export type PriceTier = "free" | "$" | "$$" | "$$$";

export interface ActivityDate {
  id: string;
  startsAt: string; // ISO
  endsAt?: string;
  isSoldOut?: boolean;
}

export interface Activity {
  id: string;
  title: string;
  venue: string;
  neighborhood: string;
  borough: Borough;
  category: Category;
  priceTier: PriceTier;
  priceNote?: string;
  status: Status;
  imageSeed: string; // for placeholder gradient
  sourceUrl?: string;
  notes?: string;
  tags: string[];
  dates: ActivityDate[];
  kind: "one_time" | "recurring" | "timeless";
  durationMinutes?: number;
  isMonitored?: boolean;
  lastMonitoredAt?: string;
}

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; emoji: string }
> = {
  music: { label: "Music", color: "var(--cobalt)", emoji: "♪" },
  food: { label: "Food", color: "var(--neon-pink)", emoji: "✦" },
  comedy: { label: "Comedy", color: "var(--mint)", emoji: "◆" },
  culture: { label: "Culture", color: "var(--forest)", emoji: "▲" },
  crafts: { label: "Crafts", color: "var(--tiffany)", emoji: "✿" },
  active: { label: "Active", color: "var(--teal)", emoji: "❋" },
  theater: { label: "Theater", color: "#6B1422", emoji: "★" },
  film: { label: "Film", color: "var(--neon-coral)", emoji: "●" },
};

// Safe lookup: tolerates unknown/legacy category strings coming from the DB
// (e.g. "craft" singular) without crashing the page.
export function categoryMeta(category: string | undefined | null) {
  if (category && category in CATEGORY_META) {
    return CATEGORY_META[category as Category];
  }
  return { label: "Other", color: "var(--cobalt)", emoji: "✦" };
}

// Anchor "today" to a reasonable date for demo data
const TODAY = new Date();
const d = (offsetDays: number, hour = 19, minute = 30) => {
  const x = new Date(TODAY);
  x.setDate(x.getDate() + offsetDays);
  x.setHours(hour, minute, 0, 0);
  return x.toISOString();
};

export const ACTIVITIES: Activity[] = [
  {
    id: "a1",
    title: "Big Thief (solo set)",
    venue: "Bowery Ballroom",
    neighborhood: "Lower East Side",
    borough: "Manhattan",
    category: "music",
    priceTier: "$$",
    priceNote: "$45",
    status: "planned",
    imageSeed: "bowery",
    sourceUrl: "https://boweryballroom.com",
    tags: ["indie", "folk"],
    kind: "one_time",
    dates: [{ id: "a1d1", startsAt: d(2, 20, 0) }],
  },
  {
    id: "a2",
    title: "Late show w/ Mark Normand",
    venue: "Comedy Cellar",
    neighborhood: "West Village",
    borough: "Manhattan",
    category: "comedy",
    priceTier: "$$",
    priceNote: "$30 + 2 drink min",
    status: "idea",
    imageSeed: "cellar",
    tags: ["standup"],
    kind: "recurring",
    dates: [
      { id: "a2d1", startsAt: d(1, 22, 30) },
      { id: "a2d2", startsAt: d(4, 22, 30) },
      { id: "a2d3", startsAt: d(8, 22, 30), isSoldOut: true },
    ],
  },
  {
    id: "a3",
    title: "Smorgasburg",
    venue: "Marsha P. Johnson State Park",
    neighborhood: "Williamsburg",
    borough: "Brooklyn",
    category: "food",
    priceTier: "$",
    status: "idea",
    imageSeed: "smorg",
    tags: ["outdoor", "weekend"],
    kind: "recurring",
    dates: [
      { id: "a3d1", startsAt: d(3, 11, 0) },
      { id: "a3d2", startsAt: d(10, 11, 0) },
    ],
  },
  {
    id: "a4",
    title: "MoMA PS1: Greater New York",
    venue: "MoMA PS1",
    neighborhood: "Long Island City",
    borough: "Queens",
    category: "culture",
    priceTier: "$$",
    priceNote: "$10 suggested",
    status: "planned",
    imageSeed: "ps1",
    tags: ["exhibition"],
    kind: "timeless",
    dates: [],
  },
  {
    id: "a5",
    title: "Prospect Park drift",
    venue: "Prospect Park",
    neighborhood: "Park Slope",
    borough: "Brooklyn",
    category: "active",
    priceTier: "free",
    status: "idea",
    imageSeed: "prospect",
    tags: ["picnic", "walk"],
    kind: "timeless",
    dates: [],
  },
  {
    id: "a6",
    title: "Film Forum: Wong Kar-wai retrospective",
    venue: "Film Forum",
    neighborhood: "Hudson Square",
    borough: "Manhattan",
    category: "film",
    priceTier: "$$",
    priceNote: "$17",
    status: "planned",
    imageSeed: "filmforum",
    tags: ["retro"],
    kind: "one_time",
    dates: [
      { id: "a6d1", startsAt: d(5, 19, 0) },
      { id: "a6d2", startsAt: d(6, 21, 30) },
    ],
  },
  {
    id: "a7",
    title: "Stereolab",
    venue: "Brooklyn Steel",
    neighborhood: "East Williamsburg",
    borough: "Brooklyn",
    category: "music",
    priceTier: "$$$",
    priceNote: "$65",
    status: "idea",
    imageSeed: "steel",
    tags: ["indie"],
    kind: "one_time",
    dates: [{ id: "a7d1", startsAt: d(12, 20, 0), isSoldOut: true }],
  },
  {
    id: "a8",
    title: "Atomix tasting menu",
    venue: "Atomix",
    neighborhood: "Rose Hill",
    borough: "Manhattan",
    category: "food",
    priceTier: "$$$",
    priceNote: "$285pp",
    status: "idea",
    imageSeed: "atomix",
    tags: ["splurge", "anniversary"],
    kind: "one_time",
    dates: [{ id: "a8d1", startsAt: d(18, 18, 0) }],
  },
  {
    id: "a9",
    title: "Sleep No More (final run)",
    venue: "The McKittrick Hotel",
    neighborhood: "Chelsea",
    borough: "Manhattan",
    category: "theater",
    priceTier: "$$$",
    priceNote: "$140",
    status: "planned",
    imageSeed: "mckittrick",
    tags: ["immersive"],
    kind: "one_time",
    dates: [
      { id: "a9d1", startsAt: d(2, 19, 0) },
      { id: "a9d2", startsAt: d(9, 19, 0) },
    ],
  },
  {
    id: "a10",
    title: "Storm King day trip",
    venue: "Storm King Art Center",
    neighborhood: "New Windsor",
    borough: "Manhattan",
    category: "culture",
    priceTier: "$$",
    status: "idea",
    imageSeed: "stormking",
    tags: ["day trip"],
    kind: "timeless",
    dates: [],
  },
  {
    id: "a11",
    title: "Brighton Beach boardwalk",
    venue: "Brighton Beach",
    neighborhood: "Brighton Beach",
    borough: "Brooklyn",
    category: "active",
    priceTier: "free",
    status: "idea",
    imageSeed: "brighton",
    tags: ["beach"],
    kind: "timeless",
    dates: [],
  },
  {
    id: "a12",
    title: "Knockdown Center warehouse rave",
    venue: "Knockdown Center",
    neighborhood: "Maspeth",
    borough: "Queens",
    category: "music",
    priceTier: "$$",
    priceNote: "$40",
    status: "idea",
    imageSeed: "knockdown",
    tags: ["late night"],
    kind: "one_time",
    dates: [{ id: "a12d1", startsAt: d(6, 23, 0) }],
  },
  {
    id: "a13",
    title: "Joe's Pizza pilgrimage",
    venue: "Joe's Pizza",
    neighborhood: "Greenwich Village",
    borough: "Manhattan",
    category: "food",
    priceTier: "$",
    priceNote: "$4 slice",
    status: "idea",
    imageSeed: "joes",
    tags: ["classic"],
    kind: "timeless",
    dates: [],
  },
  {
    id: "a14",
    title: "Hayes Theater: revival",
    venue: "Hayes Theater",
    neighborhood: "Theater District",
    borough: "Manhattan",
    category: "theater",
    priceTier: "$$$",
    priceNote: "$95",
    status: "idea",
    imageSeed: "hayes",
    tags: ["broadway"],
    kind: "one_time",
    dates: [
      { id: "a14d1", startsAt: d(7, 19, 30) },
      { id: "a14d2", startsAt: d(14, 14, 0) },
    ],
  },
  {
    id: "a15",
    title: "Wave Hill garden",
    venue: "Wave Hill",
    neighborhood: "Riverdale",
    borough: "Bronx",
    category: "active",
    priceTier: "$",
    priceNote: "$10",
    status: "idea",
    imageSeed: "wavehill",
    tags: ["garden"],
    kind: "timeless",
    dates: [],
  },
  {
    id: "a16",
    title: "Snug Harbor walk",
    venue: "Snug Harbor Cultural Center",
    neighborhood: "Livingston",
    borough: "Staten Island",
    category: "culture",
    priceTier: "free",
    status: "idea",
    imageSeed: "snug",
    tags: ["day trip"],
    kind: "timeless",
    dates: [],
  },
  {
    id: "a17",
    title: "Nitehawk dinner-and-a-movie",
    venue: "Nitehawk Prospect Park",
    neighborhood: "Park Slope",
    borough: "Brooklyn",
    category: "film",
    priceTier: "$$",
    priceNote: "$18 + food",
    status: "idea",
    imageSeed: "nitehawk",
    tags: ["date"],
    kind: "recurring",
    dates: [
      { id: "a17d1", startsAt: d(4, 20, 0) },
      { id: "a17d2", startsAt: d(11, 20, 0) },
    ],
  },
  {
    id: "a18",
    title: "Union Hall trivia",
    venue: "Union Hall",
    neighborhood: "Park Slope",
    borough: "Brooklyn",
    category: "comedy",
    priceTier: "$",
    priceNote: "$5",
    status: "idea",
    imageSeed: "unionhall",
    tags: ["weeknight"],
    kind: "recurring",
    dates: [
      { id: "a18d1", startsAt: d(0, 20, 0) },
      { id: "a18d2", startsAt: d(7, 20, 0) },
    ],
  },
];

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
export function nextDate(a: Activity): ActivityDate | undefined {
  const now = Date.now();
  return [...a.dates]
    .filter((d) => new Date(d.startsAt).getTime() >= now - 1000 * 60 * 60)
    .sort(
      (x, y) => new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime(),
    )[0];
}

/** A painterly gradient generated from a string seed — used as the card hero. */
export function seedGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const palettes = [
    ["#1E3A8A", "#7FD8D4", "#FF3DA5"],
    ["#0F4D2E", "#5EFFB1", "#FBF5E3"],
    ["#0E8C7D", "#7FD8D4", "#1E3A8A"],
    ["#FF3DA5", "#1E3A8A", "#5EFFB1"],
    ["#6B1422", "#FF5C5C", "#FBF5E3"],
    ["#0B2C7A", "#0E8C7D", "#5EFFB1"],
  ];
  const p = palettes[h % palettes.length];
  const angle = (h % 180) - 90;
  return `linear-gradient(${angle}deg, ${p[0]} 0%, ${p[1]} 55%, ${p[2]} 100%)`;
}