// Generates short, fully local, offline vertical placeholder video clips for
// seed/demo data using sharp (SVG->JPEG frame rendering) piped into the
// Playwright-bundled ffmpeg binary (image2pipe -> libvpx_vp8/webm). This
// avoids depending on any third-party video CDN for the demo dataset.
import sharp from "sharp";
import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import path from "path";

const FFMPEG = "/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux";
const OUT_DIR = path.join(process.cwd(), "public", "seed-videos");
const WIDTH = 480;
const HEIGHT = 854;
const FPS = 24;
const SECONDS = 4;
const FRAMES = FPS * SECONDS;

const PALETTES = [
  ["#7c3aed", "#d946ef", "#22d3ee"],
  ["#ec4899", "#8b5cf6", "#3b82f6"],
  ["#f97316", "#d946ef", "#7c3aed"],
  ["#22d3ee", "#3b82f6", "#8b5cf6"],
  ["#d946ef", "#ec4899", "#f59e0b"],
  ["#6366f1", "#22d3ee", "#ec4899"],
  ["#f43f5e", "#8b5cf6", "#22d3ee"],
  ["#14b8a6", "#3b82f6", "#d946ef"],
  ["#a855f7", "#f43f5e", "#facc15"],
  ["#0ea5e9", "#7c3aed", "#ec4899"],
  ["#f59e0b", "#ec4899", "#8b5cf6"],
  ["#10b981", "#22d3ee", "#6366f1"],
  ["#e11d48", "#f97316", "#facc15"],
];

function frameSvg(t, palette, shapeSeed) {
  const [c1, c2, c3] = palette;
  const angle = (t * 40) % 360;
  const cx = WIDTH / 2 + Math.sin(t * 2 + shapeSeed) * WIDTH * 0.22;
  const cy = HEIGHT * 0.42 + Math.cos(t * 1.6 + shapeSeed) * HEIGHT * 0.12;
  const r = 90 + Math.sin(t * 3) * 18;
  const barY = HEIGHT - 40 - Math.abs(Math.sin(t * 2.4)) * 60;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <defs>
      <linearGradient id="g" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="50%" stop-color="${c2}"/>
        <stop offset="100%" stop-color="${c3}"/>
      </linearGradient>
      <radialGradient id="v" cx="50%" cy="35%" r="75%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.5"/>
      </radialGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" opacity="0.16"/>
    <circle cx="${WIDTH - cx * 0.5}" cy="${HEIGHT - cy * 0.6}" r="${r * 0.6}" fill="#ffffff" opacity="0.10"/>
    <rect x="${WIDTH * 0.15}" y="${barY}" width="${WIDTH * 0.7}" height="10" rx="5" fill="#ffffff" opacity="0.25"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#v)"/>
  </svg>`;
}

async function renderClip(index, palette) {
  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `clip-${index}.webm`);

  return new Promise((resolve, reject) => {
    const ff = spawn(FFMPEG, [
      "-y",
      "-f", "image2pipe",
      "-framerate", String(FPS),
      "-c:v", "mjpeg",
      "-i", "pipe:0",
      "-c:v", "libvpx",
      "-b:v", "1200k",
      "-pix_fmt", "yuv420p",
      outPath,
    ]);
    let stderr = "";
    ff.stderr.on("data", (d) => (stderr += d.toString()));
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve(outPath) : reject(new Error(`ffmpeg exited ${code}\n${stderr}`))));

    (async () => {
      for (let f = 0; f < FRAMES; f++) {
        const t = f / FPS;
        const svg = frameSvg(t, palette, index);
        const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 78 }).toBuffer();
        if (!ff.stdin.write(jpeg)) {
          await new Promise((r) => ff.stdin.once("drain", r));
        }
      }
      ff.stdin.end();
    })().catch(reject);
  });
}

async function main() {
  for (let i = 0; i < PALETTES.length; i++) {
    const out = await renderClip(i, PALETTES[i]);
    console.log("generated", out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
