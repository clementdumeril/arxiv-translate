// End-to-end check of the unpacked extension in Chrome for Testing (headless, via Puppeteer).
// It opens one arXiv HTML paper, opens popup.html in a second tab, clicks "Traduire cet article" there,
// waits for the content script to finish, and prints how many paragraphs came back translated.
//
//   npm install
//   node tools/smoke_test.mjs --engine google --paper 2502.00581 --lang fr --out docs
//
// The popup normally reads the active tab; here it runs in its own tab, so chrome.tabs.query is pointed
// at the paper's tab before popup.js loads. Everything else (storage, messages, backend calls) is the
// extension's own code. With --out, it writes popup.png and page.png into that folder.
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const args = Object.fromEntries(process.argv.slice(2).join(" ").split("--").filter(Boolean)
  .map((s) => s.trim().split(/\s+/)));
const engine = args.engine || "google", paper = args.paper || "2502.00581", lang = args.lang || "fr";
if (args.out) fs.mkdirSync(args.out, { recursive: true });
const ext = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const browser = await puppeteer.launch({ headless: true, pipe: true, enableExtensions: [ext] });
const sw = await (await browser.waitForTarget((t) => t.type() === "service_worker")).worker();
const extId = new URL(sw.url()).host;
await sw.evaluate((s) => chrome.storage.local.set(s), {
  translateEngine: engine, targetLang: lang, ...(args.model ? { ollamaModel: args.model } : {}),
});

const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 900 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().split("[node")[0].trim()); });
await page.goto(`https://arxiv.org/html/${paper}`, { waitUntil: "networkidle2", timeout: 60000 });
const tab = await sw.evaluate(async (u) => (await chrome.tabs.query({ url: u + "*" }))[0], `https://arxiv.org/html/${paper}`);

const popup = await browser.newPage();
await popup.setViewport({ width: 320, height: 600 });
await popup.evaluateOnNewDocument((t) => {
  chrome.tabs.query = (_q, cb) => cb([t]);
}, { id: tab.id, url: tab.url });
await popup.goto(`chrome-extension://${extId}/popup.html`);
await new Promise((r) => setTimeout(r, 500));
if (args.out) await popup.screenshot({ path: path.join(args.out, "popup.png"), fullPage: true });

const t0 = Date.now();
await popup.click("#btn-translate").catch(() => {});  // the popup closes itself after sending the message
await page.bringToFront();
await page.waitForFunction(() => /termin/i.test(document.querySelector("#arxiv-translate-status .status-text")?.textContent || ""),
  { timeout: 30 * 60 * 1000, polling: 1000 });
const summary = await page.evaluate(() => ({
  status: document.querySelector("#arxiv-translate-status .status-text").textContent,
  translated: document.querySelectorAll(".arxiv-translated-paragraph").length,
  translatedWithMath: [...document.querySelectorAll(".arxiv-translated-paragraph")].filter((e) => e.querySelector("math")).length,
}));
if (args.out) await page.screenshot({ path: path.join(args.out, "page.png") });
const counts = {};
for (const e of errors) counts[e] = (counts[e] || 0) + 1;
console.log(JSON.stringify({ browser: await browser.version(), paper, engine, lang,
  seconds: Math.round((Date.now() - t0) / 1000), ...summary, errors: counts }, null, 2));
await browser.close();
