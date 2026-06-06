import type { Activity } from "../lib/data";

/**
 * Picks a vector illustration that's evocative of the activity, drawn in the
 * brand palette over the card's painterly gradient. Match by keyword on
 * title/tags/venue first, then fall back to a category-level illustration.
 */

type IllustrationKey =
  | "sewing"
  | "cake"
  | "pizza"
  | "pottery"
  | "stainedGlass"
  | "knitting"
  | "painting"
  | "guitar"
  | "dj"
  | "piano"
  | "mic"
  | "filmReel"
  | "theaterMasks"
  | "popcorn"
  | "museum"
  | "garden"
  | "beach"
  | "bike"
  | "running"
  | "yoga"
  | "wine"
  | "coffee"
  | "dining"
  | "musicNote"
  | "foodFork"
  ;

const KEYWORDS: { match: RegExp; key: IllustrationKey }[] = [
  { match: /jean|sew|denim|tailor|stitch|quilt/i, key: "sewing" },
  { match: /cake|bake|pastry|patisserie|cookie|dessert/i, key: "cake" },
  { match: /pizza|slice/i, key: "pizza" },
  { match: /pottery|ceramic|clay|wheel throw/i, key: "pottery" },
  { match: /stain(ed)? glass|glassblow|mosaic/i, key: "stainedGlass" },
  { match: /knit|crochet|weav|yarn|macram/i, key: "knitting" },
  { match: /paint|watercolor|sip.*paint|drawing|sketch/i, key: "painting" },
  { match: /guitar|acoustic|folk|indie|band/i, key: "guitar" },
  { match: /dj|rave|warehouse|techno|club night/i, key: "dj" },
  { match: /piano|jazz|classical|symphony/i, key: "piano" },
  { match: /standup|stand[- ]up|comedy cellar|mic|open mic/i, key: "mic" },
  { match: /film|cinema|movie|screen|retrospective/i, key: "filmReel" },
  { match: /theater|broadway|play|immersive|musical/i, key: "theaterMasks" },
  { match: /popcorn|drive[- ]in/i, key: "popcorn" },
  { match: /museum|gallery|exhibit|moma|met /i, key: "museum" },
  { match: /garden|botanic|park|prospect|wave hill|storm king/i, key: "garden" },
  { match: /beach|boardwalk|coney|brighton|rockaway/i, key: "beach" },
  { match: /bike|cycl|ride/i, key: "bike" },
  { match: /run|marathon|jog/i, key: "running" },
  { match: /yoga|pilates|meditat/i, key: "yoga" },
  { match: /wine|natural wine|sommelier|vineyard/i, key: "wine" },
  { match: /coffee|espresso|cafe|café/i, key: "coffee" },
  { match: /tasting|omakase|dinner|chef|menu|restaurant/i, key: "dining" },
];

function pickIllustration(a: Activity): IllustrationKey {
  const hay = [a.title, a.venue, a.neighborhood, ...(a.tags ?? [])]
    .filter(Boolean)
    .join(" ");
  for (const { match, key } of KEYWORDS) {
    if (match.test(hay)) return key;
  }
  // category fallbacks
  switch (a.category) {
    case "music":
      return "musicNote";
    case "food":
      return "foodFork";
    case "comedy":
      return "mic";
    case "culture":
      return "museum";
    case "crafts":
      return "painting";
    case "active":
      return "garden";
    case "theater":
      return "theaterMasks";
    case "film":
      return "filmReel";
    default:
      return "musicNote";
  }
}

// Shared paint colors layered over the gradient hero. White-ish for fills,
// ink for outlines, and a neon-pink accent dot for some compositions.
const STROKE = "rgba(10,31,61,0.85)";
const FILL_LIGHT = "rgba(251,245,227,0.95)";
const FILL_MINT = "#5EFFB1";
const FILL_TIFFANY = "#7FD8D4";
const FILL_PINK = "#FF3DA5";
const FILL_CREAM = "#FBF5E3";

/* eslint-disable react/no-unknown-property */

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 120"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
    >
      {/* soft painterly wash so illustration pops over the gradient */}
      <path
        d="M0,80 C 40,40 80,110 120,70 S 200,60 200,90 L200,120 L0,120 Z"
        fill="rgba(255,255,255,0.18)"
      />
      {children}
    </svg>
  );
}

const ILLUSTRATIONS: Record<IllustrationKey, React.ReactNode> = {
  sewing: (
    <g>
      {/* sewing machine body */}
      <rect x="55" y="50" width="90" height="38" rx="6" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <rect x="55" y="84" width="100" height="6" rx="2" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="2" />
      <circle cx="135" cy="60" r="6" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
      <path d="M68 88 L68 100 L78 100" stroke={STROKE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* needle + thread */}
      <line x1="78" y1="64" x2="78" y2="92" stroke={STROKE} strokeWidth="2" />
      <path d="M82 92 q 6 6 -2 12 t 4 10" stroke={FILL_MINT} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* spool */}
      <rect x="95" y="42" width="10" height="14" rx="2" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
    </g>
  ),
  cake: (
    <g>
      <ellipse cx="100" cy="98" rx="55" ry="6" fill="rgba(10,31,61,0.18)" />
      {/* tiers */}
      <rect x="65" y="70" width="70" height="26" rx="3" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <rect x="78" y="48" width="44" height="24" rx="3" fill={FILL_PINK} stroke={STROKE} strokeWidth="2.5" />
      {/* drips */}
      <path d="M65 78 q 6 8 12 0 t 12 0 t 12 0 t 12 0 t 12 0" fill="none" stroke={FILL_MINT} strokeWidth="3" strokeLinecap="round" />
      {/* candle */}
      <rect x="98" y="36" width="4" height="12" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="1.5" />
      <path d="M100 30 q 3 4 0 8 q -3 -4 0 -8 z" fill={FILL_PINK} stroke={STROKE} strokeWidth="1.5" />
    </g>
  ),
  pizza: (
    <g>
      <path d="M40 90 L100 30 L160 90 Z" fill={FILL_CREAM} stroke={STROKE} strokeWidth="2.5" />
      <circle cx="90" cy="70" r="6" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
      <circle cx="115" cy="62" r="5" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
      <circle cx="105" cy="82" r="4" fill={FILL_MINT} stroke={STROKE} strokeWidth="2" />
      <circle cx="80" cy="84" r="3" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="2" />
    </g>
  ),
  pottery: (
    <g>
      <ellipse cx="100" cy="98" rx="55" ry="5" fill="rgba(10,31,61,0.2)" />
      <path d="M70 88 Q 60 60 80 50 L120 50 Q 140 60 130 88 Z" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="2.5" />
      <ellipse cx="100" cy="50" rx="20" ry="5" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <path d="M75 70 Q 100 76 125 70" stroke={STROKE} strokeWidth="1.5" fill="none" />
    </g>
  ),
  stainedGlass: (
    <g>
      <rect x="60" y="22" width="80" height="80" rx="4" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <path d="M100 22 L100 102 M60 62 L140 62 M70 22 L130 102 M130 22 L70 102" stroke={STROKE} strokeWidth="2" />
      <path d="M60 22 L100 62 L60 62 Z" fill={FILL_PINK} />
      <path d="M140 22 L100 62 L140 62 Z" fill={FILL_MINT} />
      <path d="M60 102 L100 62 L60 62 Z" fill={FILL_TIFFANY} />
      <path d="M140 102 L100 62 L140 62 Z" fill={FILL_CREAM} />
    </g>
  ),
  knitting: (
    <g>
      <circle cx="90" cy="70" r="26" fill={FILL_PINK} stroke={STROKE} strokeWidth="2.5" />
      <path d="M68 60 Q 90 80 112 60 M68 72 Q 90 92 112 72 M68 84 Q 90 100 112 84" stroke={STROKE} strokeWidth="1.5" fill="none" />
      <line x1="80" y1="46" x2="135" y2="92" stroke={STROKE} strokeWidth="2.5" />
      <line x1="100" y1="42" x2="155" y2="88" stroke={STROKE} strokeWidth="2.5" />
      <circle cx="135" cy="92" r="3" fill={FILL_MINT} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="155" cy="88" r="3" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="1.5" />
    </g>
  ),
  painting: (
    <g>
      {/* palette */}
      <path d="M55 70 Q 55 40 95 40 Q 135 40 140 70 Q 140 90 115 92 Q 110 80 95 84 Q 78 88 80 100 Q 55 96 55 70 Z" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <circle cx="80" cy="60" r="5" fill={FILL_PINK} />
      <circle cx="100" cy="55" r="5" fill={FILL_MINT} />
      <circle cx="120" cy="62" r="5" fill={FILL_TIFFANY} />
      <circle cx="115" cy="78" r="4" fill="#1E3A8A" />
      {/* brush */}
      <line x1="140" y1="40" x2="170" y2="14" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <path d="M138 44 L148 38 L142 50 Z" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
    </g>
  ),
  guitar: (
    <g>
      <ellipse cx="80" cy="80" rx="28" ry="22" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <circle cx="80" cy="80" r="8" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
      <rect x="100" y="74" width="50" height="12" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="2.5" transform="rotate(-15 100 74)" />
      <rect x="148" y="60" width="14" height="20" rx="2" fill={FILL_MINT} stroke={STROKE} strokeWidth="2.5" transform="rotate(-15 148 60)" />
    </g>
  ),
  dj: (
    <g>
      <rect x="40" y="55" width="120" height="44" rx="4" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <circle cx="70" cy="77" r="14" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
      <circle cx="70" cy="77" r="4" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="130" cy="77" r="14" fill={FILL_MINT} stroke={STROKE} strokeWidth="2" />
      <circle cx="130" cy="77" r="4" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="1.5" />
      <rect x="92" y="68" width="16" height="20" rx="2" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="2" />
    </g>
  ),
  piano: (
    <g>
      <rect x="40" y="50" width="120" height="40" rx="3" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={40 + (i + 1) * 15} y1="50" x2={40 + (i + 1) * 15} y2="90" stroke={STROKE} strokeWidth="1.5" />
      ))}
      {[0, 1, 3, 4, 5].map((i) => (
        <rect key={i} x={40 + i * 15 + 10} y="50" width="10" height="22" fill={STROKE} />
      ))}
    </g>
  ),
  mic: (
    <g>
      <rect x="88" y="20" width="24" height="50" rx="12" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <path d="M88 38 L112 38 M88 50 L112 50" stroke={STROKE} strokeWidth="1.5" />
      <path d="M76 60 Q 76 92 100 92 Q 124 92 124 60" fill="none" stroke={STROKE} strokeWidth="2.5" />
      <line x1="100" y1="92" x2="100" y2="106" stroke={STROKE} strokeWidth="2.5" />
      <line x1="85" y1="106" x2="115" y2="106" stroke={STROKE} strokeWidth="2.5" />
      <circle cx="100" cy="44" r="3" fill={FILL_PINK} />
    </g>
  ),
  filmReel: (
    <g>
      <circle cx="100" cy="62" r="34" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <circle cx="100" cy="62" r="6" fill={STROKE} />
      <circle cx="100" cy="40" r="5" fill={FILL_PINK} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="100" cy="84" r="5" fill={FILL_MINT} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="78" cy="62" r="5" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="1.5" />
      <circle cx="122" cy="62" r="5" fill={FILL_CREAM} stroke={STROKE} strokeWidth="1.5" />
      <path d="M70 100 L130 100" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  theaterMasks: (
    <g>
      <path d="M55 40 Q 55 90 90 92 Q 100 80 95 60 Q 90 40 55 40 Z" fill={FILL_PINK} stroke={STROKE} strokeWidth="2.5" />
      <circle cx="70" cy="58" r="3" fill={STROKE} />
      <circle cx="84" cy="56" r="3" fill={STROKE} />
      <path d="M68 76 Q 78 84 88 74" stroke={STROKE} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M145 40 Q 145 90 110 92 Q 100 80 105 60 Q 110 40 145 40 Z" fill={FILL_MINT} stroke={STROKE} strokeWidth="2.5" />
      <circle cx="130" cy="58" r="3" fill={STROKE} />
      <circle cx="116" cy="56" r="3" fill={STROKE} />
      <path d="M112 80 Q 122 70 132 80" stroke={STROKE} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  ),
  popcorn: (
    <g>
      <path d="M70 50 L130 50 L138 100 L62 100 Z" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <path d="M70 50 L130 50 M76 60 L132 60" stroke={FILL_PINK} strokeWidth="3" />
      {[
        [82, 44],
        [100, 36],
        [118, 42],
        [92, 32],
        [110, 30],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill={FILL_CREAM} stroke={STROKE} strokeWidth="2" />
      ))}
    </g>
  ),
  museum: (
    <g>
      <path d="M45 50 L100 22 L155 50 L155 56 L45 56 Z" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <rect x="55" y="56" width="10" height="36" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="2" />
      <rect x="80" y="56" width="10" height="36" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="2" />
      <rect x="105" y="56" width="10" height="36" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="2" />
      <rect x="130" y="56" width="10" height="36" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="2" />
      <rect x="40" y="92" width="120" height="8" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
    </g>
  ),
  garden: (
    <g>
      <circle cx="60" cy="50" r="18" fill={FILL_MINT} stroke={STROKE} strokeWidth="2" />
      <circle cx="100" cy="40" r="22" fill={FILL_TIFFANY} stroke={STROKE} strokeWidth="2" />
      <circle cx="140" cy="52" r="18" fill={FILL_MINT} stroke={STROKE} strokeWidth="2" />
      <rect x="55" y="68" width="10" height="32" fill="#0F4D2E" stroke={STROKE} strokeWidth="1.5" />
      <rect x="95" y="60" width="10" height="40" fill="#0F4D2E" stroke={STROKE} strokeWidth="1.5" />
      <rect x="135" y="68" width="10" height="32" fill="#0F4D2E" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="120" cy="82" r="4" fill={FILL_PINK} />
      <circle cx="78" cy="86" r="3" fill={FILL_PINK} />
    </g>
  ),
  beach: (
    <g>
      {/* sun */}
      <circle cx="160" cy="35" r="14" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
      {/* waves */}
      <path d="M0 78 Q 25 70 50 78 T 100 78 T 150 78 T 200 78" stroke={FILL_TIFFANY} strokeWidth="4" fill="none" />
      <path d="M0 92 Q 25 84 50 92 T 100 92 T 150 92 T 200 92" stroke={FILL_MINT} strokeWidth="4" fill="none" />
      {/* umbrella */}
      <path d="M50 78 Q 70 50 100 78 Z" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
      <line x1="80" y1="64" x2="80" y2="100" stroke={STROKE} strokeWidth="2.5" />
    </g>
  ),
  bike: (
    <g>
      <circle cx="65" cy="80" r="18" fill="none" stroke={STROKE} strokeWidth="3" />
      <circle cx="135" cy="80" r="18" fill="none" stroke={STROKE} strokeWidth="3" />
      <path d="M65 80 L95 50 L120 80 L100 80 Z" fill={FILL_PINK} stroke={STROKE} strokeWidth="2.5" />
      <line x1="95" y1="50" x2="105" y2="50" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <line x1="120" y1="80" x2="135" y2="80" stroke={STROKE} strokeWidth="2.5" />
    </g>
  ),
  running: (
    <g>
      <circle cx="110" cy="32" r="8" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
      <path d="M110 40 L100 60 L80 70 M100 60 L115 78 L100 96 M115 78 L130 70" stroke={STROKE} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M60 96 Q 70 90 82 96 M140 96 Q 150 90 162 96" stroke={FILL_MINT} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  ),
  yoga: (
    <g>
      <circle cx="100" cy="36" r="8" fill={FILL_PINK} stroke={STROKE} strokeWidth="2" />
      <path d="M100 44 L100 72 M100 72 L70 90 M100 72 L130 90 M100 56 L75 60 M100 56 L125 60" stroke={STROKE} strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="55" y="96" width="90" height="6" rx="2" fill={FILL_MINT} stroke={STROKE} strokeWidth="2" />
    </g>
  ),
  wine: (
    <g>
      <path d="M80 30 L120 30 Q 120 70 100 70 Q 80 70 80 30 Z" fill={FILL_PINK} stroke={STROKE} strokeWidth="2.5" />
      <line x1="100" y1="70" x2="100" y2="96" stroke={STROKE} strokeWidth="2.5" />
      <ellipse cx="100" cy="100" rx="22" ry="4" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2" />
    </g>
  ),
  coffee: (
    <g>
      <path d="M60 50 L140 50 L132 96 Q 130 100 124 100 L76 100 Q 70 100 68 96 Z" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <path d="M140 60 Q 162 60 162 78 Q 162 92 140 92" fill="none" stroke={STROKE} strokeWidth="2.5" />
      <path d="M82 36 q 4 -8 0 -14 M100 36 q 4 -8 0 -14 M118 36 q 4 -8 0 -14" stroke={FILL_PINK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  ),
  dining: (
    <g>
      <circle cx="100" cy="70" r="34" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="2.5" />
      <circle cx="100" cy="70" r="22" fill={FILL_CREAM} stroke={STROKE} strokeWidth="1.5" />
      <path d="M55 32 L55 70 M50 32 L60 32 M55 70 L55 100" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M145 32 Q 152 50 145 60 L145 100" stroke={STROKE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  ),
  musicNote: (
    <g>
      <path d="M80 26 L80 86" stroke={STROKE} strokeWidth="4" strokeLinecap="round" />
      <path d="M130 18 L130 78" stroke={STROKE} strokeWidth="4" strokeLinecap="round" />
      <path d="M80 26 L130 18 L130 32 L80 40 Z" fill={FILL_PINK} stroke={STROKE} strokeWidth="2.5" />
      <ellipse cx="72" cy="88" rx="14" ry="10" fill={STROKE} />
      <ellipse cx="122" cy="80" rx="14" ry="10" fill={STROKE} />
    </g>
  ),
  foodFork: (
    <g>
      <path d="M70 26 L70 60 M58 26 L58 50 Q 58 60 70 60 M82 26 L82 50 Q 82 60 70 60 M70 60 L70 100" stroke={STROKE} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M130 26 Q 118 32 118 56 Q 118 64 130 64 L130 100" stroke={STROKE} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="50" r="6" fill={FILL_PINK} />
    </g>
  ),
};

export function ActivityIllustration({ activity }: { activity: Activity }) {
  const key = pickIllustration(activity);
  return <Frame>{ILLUSTRATIONS[key]}</Frame>;
}