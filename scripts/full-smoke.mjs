import { chromium } from "playwright-core";
import path from "path";

const EXECUTABLE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`5xx ${r.status()} ${r.url()}`);
  });

  async function shot(name) {
    await page.screenshot({ path: path.join(process.cwd(), "scratch", `full-${name}.png`) });
  }

  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 20000 });
  await page.fill("input#identifier", "demo@fliq.app");
  await page.fill("input#password", "Password123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/home", { timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot("home");

  const routes = [
    "/discover",
    "/search",
    "/activity",
    "/inbox",
    "/profile/alex_rivera",
    "/profile/jessica_07",
    "/profile/edit",
    "/settings",
    "/settings/privacy",
    "/settings/notifications",
    "/settings/blocked-users",
    "/settings/watch-history",
    "/analytics",
    "/live",
    "/discover/hashtag/fliqstar",
    "/discover/category/dance",
  ];

  for (const route of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(700);
    await shot(route.replace(/\//g, "_"));
  }

  // Video detail via search
  const res = await page.request.get(`${BASE}/api/videos/feed?tab=foryou&offset=0`);
  const feedData = await res.json();
  const videoId = feedData.videos?.[0]?.id;
  if (videoId) {
    await page.goto(`${BASE}/video/${videoId}`, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(1000);
    await shot("video_detail");
  }

  const soundRes = await page.request.get(`${BASE}/api/discover`);
  const soundData = await soundRes.json();
  const soundId = soundData.sounds?.[0]?.id;
  if (soundId) {
    await page.goto(`${BASE}/sounds/${soundId}`, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(600);
    await shot("sound_detail");
  }

  await page.goto(`${BASE}/admin`, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(600);
  await shot("admin");

  // Desktop viewport pass
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/home`, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(1200);
  await shot("desktop_home");
  await page.goto(`${BASE}/discover`, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(800);
  await shot("desktop_discover");

  console.log("ERRORS:", JSON.stringify(errors, null, 2));
  console.log("ERROR_COUNT:", errors.length);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
