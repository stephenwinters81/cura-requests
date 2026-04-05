import puppeteer from "puppeteer";
import path from "path";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "public", "slides");

async function main() {
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

  // Go to new request
  await page.goto(`${BASE_URL}/requests/new`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));

  // Click the practice combobox to open it
  const practiceButton = await page.$('button[role="combobox"]');
  if (practiceButton) {
    await practiceButton.click();
    await new Promise((r) => setTimeout(r, 500));

    // Type to search for Lumus
    await page.keyboard.type("Lumus Imaging Fairfield");
    await new Promise((r) => setTimeout(r, 500));

    // Click the first matching option
    const option = await page.$('[role="option"]');
    if (option) {
      await option.click();
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Now screenshot the "Where to send" card which should show the radiologist dropdown
  const cards = await page.$$("div.rounded-xl.border.bg-card");
  if (cards[0]) {
    await cards[0].scrollIntoView();
    await new Promise((r) => setTimeout(r, 400));
    await cards[0].screenshot({
      path: path.join(OUT_DIR, "form-where-to-send-with-radiologist.png"),
    });
    console.log("-> form-where-to-send-with-radiologist.png");
  }

  // Also take a viewport screenshot for context
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({
    path: path.join(OUT_DIR, "form-practice-selected.png"),
  });
  console.log("-> form-practice-selected.png");

  await browser.close();
  console.log("Done");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
