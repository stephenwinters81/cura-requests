/**
 * Capture screenshots of CURA Requests app for the onboarding slideshow.
 * Run with: npx tsx scripts/capture-slides.ts
 */
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "public", "slides");
const VIEWPORT = { width: 1440, height: 900 };

const CREDENTIALS = {
  email: "winters@curaspecialists.com.au",
  password: "changeme123!",
};

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // --- 1. Login page ---
  console.log("Capturing login page...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
  await page.screenshot({ path: path.join(OUT_DIR, "slide-login.png"), fullPage: false });
  console.log("  -> slide-login.png");

  // --- 2. Login page with filled credentials ---
  console.log("Capturing login (filled)...");
  await page.type('input[type="email"]', CREDENTIALS.email, { delay: 0 });
  await page.type('input[type="password"]', CREDENTIALS.password, { delay: 0 });
  await page.screenshot({ path: path.join(OUT_DIR, "slide-login-filled.png"), fullPage: false });
  console.log("  -> slide-login-filled.png");

  // --- 3. Submit login ---
  console.log("Logging in...");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  const currentUrl = page.url();
  console.log(`  -> Navigated to: ${currentUrl}`);

  // If we hit MFA page, capture it
  if (currentUrl.includes("/login/mfa")) {
    console.log("Capturing MFA page...");
    await page.screenshot({ path: path.join(OUT_DIR, "slide-mfa.png"), fullPage: false });
    console.log("  -> slide-mfa.png");
  }

  // If MFA is not enabled, we should be on dashboard already
  // If MFA is enabled, we need to bypass — but we checked and it's disabled for this user

  // --- 4. Dashboard ---
  if (!currentUrl.includes("/dashboard")) {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2", timeout: 15000 });
  }
  console.log("Capturing dashboard...");
  // Wait a moment for any client-side rendering
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, "slide-dashboard.png"), fullPage: false });
  console.log("  -> slide-dashboard.png");

  // --- 5. New Request form (top portion) ---
  console.log("Capturing new request form...");
  await page.goto(`${BASE_URL}/requests/new`, { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, "slide-new-request-top.png"), fullPage: false });
  console.log("  -> slide-new-request-top.png");

  // Scroll down to capture bottom portion
  await page.evaluate(() => window.scrollTo(0, 600));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, "slide-new-request-bottom.png"), fullPage: false });
  console.log("  -> slide-new-request-bottom.png");

  // Full page version
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(OUT_DIR, "slide-new-request-full.png"), fullPage: true });
  console.log("  -> slide-new-request-full.png");

  // --- 6. Request History ---
  console.log("Capturing request history...");
  await page.goto(`${BASE_URL}/requests`, { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, "slide-history.png"), fullPage: false });
  console.log("  -> slide-history.png");

  // --- 7. Provider Numbers ---
  console.log("Capturing provider numbers...");
  await page.goto(`${BASE_URL}/settings/providers`, { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, "slide-providers.png"), fullPage: false });
  console.log("  -> slide-providers.png");

  // --- 8. Signature ---
  console.log("Capturing signature settings...");
  await page.goto(`${BASE_URL}/settings/signature`, { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, "slide-signature.png"), fullPage: false });
  console.log("  -> slide-signature.png");

  // --- 9. Change Password ---
  console.log("Capturing password settings...");
  await page.goto(`${BASE_URL}/settings/password`, { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, "slide-password.png"), fullPage: false });
  console.log("  -> slide-password.png");

  await browser.close();

  // List all captured files
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".png"));
  console.log(`\nDone! Captured ${files.length} screenshots:`);
  files.forEach((f) => {
    const size = fs.statSync(path.join(OUT_DIR, f)).size;
    console.log(`  ${f} (${(size / 1024).toFixed(0)} KB)`);
  });
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
