/** Portrait iOS launch images: [image width, image height, css width, css height, dpr] */
const SPLASH: Array<[number, number, number, number, number]> = [
  [1320, 2868, 440, 956, 3],
  [1206, 2622, 402, 874, 3],
  [1179, 2556, 393, 852, 3],
  [1284, 2778, 428, 926, 3],
  [1170, 2532, 390, 844, 3],
  [1125, 2436, 375, 812, 3],
  [1242, 2688, 414, 896, 3],
  [1242, 2208, 414, 736, 3],
  [828, 1792, 414, 896, 2],
  [750, 1334, 375, 667, 2],
  [1488, 2266, 744, 1133, 2],
  [1640, 2360, 820, 1180, 2],
  [1536, 2048, 768, 1024, 2],
  [1668, 2224, 834, 1112, 2],
  [1668, 2388, 834, 1194, 2],
  [2048, 2732, 1024, 1366, 2],
];

export const appleSplashLinks = SPLASH.map(([w, h, cssW, cssH, dpr]) => ({
  rel: "apple-touch-startup-image",
  href: `/splash/splash-${w}x${h}.png`,
  media: `(device-width: ${cssW}px) and (device-height: ${cssH}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}));
