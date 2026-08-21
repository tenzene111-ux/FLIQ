// Deterministic, offline placeholder art generation. Fliq's seed/demo data
// avoids depending on third-party image CDNs at runtime — thumbnails, sound
// covers and avatar fallbacks are generated as small inline SVG data URIs
// derived from a seed string, so the app renders identically with or
// without external network access.

const PALETTES: [string, string, string][] = [
  ["#7c3aed", "#d946ef", "#22d3ee"],
  ["#ec4899", "#8b5cf6", "#3b82f6"],
  ["#f97316", "#d946ef", "#7c3aed"],
  ["#22d3ee", "#3b82f6", "#8b5cf6"],
  ["#d946ef", "#ec4899", "#f59e0b"],
  ["#6366f1", "#22d3ee", "#ec4899"],
  ["#f43f5e", "#8b5cf6", "#22d3ee"],
  ["#14b8a6", "#3b82f6", "#d946ef"],
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function paletteForSeed(seed: string): [string, string, string] {
  return PALETTES[hashSeed(seed) % PALETTES.length];
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Portrait video thumbnail/poster placeholder (9:16). */
export function videoThumbnail(seed: string, label = ""): string {
  const [c1, c2, c3] = paletteForSeed(seed);
  const angle = hashSeed(seed) % 360;
  const glyph = label.slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="405" height="720" viewBox="0 0 405 720">
    <defs>
      <linearGradient id="g" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="50%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c3}"/>
      </linearGradient>
      <radialGradient id="v" cx="50%" cy="40%" r="75%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.45"/>
      </radialGradient>
    </defs>
    <rect width="405" height="720" fill="url(#g)"/>
    <rect width="405" height="720" fill="url(#v)"/>
    <circle cx="202" cy="330" r="70" fill="#ffffff" opacity="0.14"/>
    <text x="202" y="352" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#ffffff" opacity="0.9" text-anchor="middle">${glyph}</text>
  </svg>`;
  return encodeSvg(svg);
}

/** Square cover art placeholder for sounds/albums. */
export function coverArt(seed: string, label = ""): string {
  const [c1, c2] = paletteForSeed(seed);
  const glyph = label.slice(0, 1).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#g)"/>
    <circle cx="150" cy="150" r="46" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="6"/>
    <circle cx="150" cy="150" r="10" fill="#fff" fill-opacity="0.85"/>
    <text x="150" y="270" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff" opacity="0.85" text-anchor="middle">${glyph}</text>
  </svg>`;
  return encodeSvg(svg);
}

/** Wide hero/banner placeholder (for challenge cards etc). */
export function heroArt(seed: string): string {
  const [c1, c2, c3] = paletteForSeed(seed);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="55%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c3}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="300" fill="url(#g)"/>
  </svg>`;
  return encodeSvg(svg);
}

// Locally generated, offline-safe placeholder clips (see scripts/gen-seed-videos.mjs)
// — served straight from /public so seed/demo data never depends on a
// third-party video CDN being reachable.
export const SAMPLE_VIDEO_URLS = Array.from({ length: 13 }, (_, i) => `/seed-videos/clip-${i}.webm`);
