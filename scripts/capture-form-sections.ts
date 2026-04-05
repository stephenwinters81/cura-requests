/**
 * Capture zoomed screenshots of each form section.
 * Run with: npx tsx scripts/capture-form-sections.ts
 */
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "public", "slides");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', "winters@curaspecialists.com.au");
  await page.type('input[type="password"]', "changeme123!");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  // Go to new request form
  await page.goto(`${BASE_URL}/requests/new`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));

  // Get all card elements
  const cards = await page.$$("div.rounded-xl.border.bg-card");
  console.log(`Found ${cards.length} form cards`);

  const names = [
    "form-where-to-send.png",
    "form-patient-info.png",
    "form-request-details.png",
    "form-referring-provider.png",
    "form-patient-copy.png",
  ];

  for (let i = 0; i < Math.min(cards.length, names.length); i++) {
    await cards[i].scrollIntoView();
    await new Promise((r) => setTimeout(r, 400));
    await cards[i].screenshot({ path: path.join(OUT_DIR, names[i]) });
    console.log(`  -> ${names[i]}`);
  }

  await browser.close();

  const files = fs.readdirSync(OUT_DIR).filter((f) => f.startsWith("form-"));
  console.log(`\nDone! Captured ${files.length} form section screenshots:`);
  files.forEach((f) => {
    const size = fs.statSync(path.join(OUT_DIR, f)).size;
    console.log(`  ${f} (${(size / 1024).toFixed(0)} KB)`);
  });
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
