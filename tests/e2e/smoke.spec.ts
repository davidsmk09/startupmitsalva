import { expect, test, type Page } from "@playwright/test";

const uid = () => Math.random().toString(36).slice(2, 8);

test.beforeEach(async ({ context, baseURL }) => {
  // Cookie-Banner: nur notwendige Cookies (wie ein echter Besucher per Klick)
  await context.addCookies([{ name: "cookie_consent", value: "necessary", url: baseURL! }]);
});

async function acceptCookies(page: Page) {
  const btn = page.getByTestId("cookie-necessary");
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

async function register(page: Page) {
  const email = `e2e-${uid()}@example.com`;
  await page.goto("/register");
  await acceptCookies(page);
  await page.locator("#name").fill("E2E Testerin");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill("sicheres-passwort-123");
  await page.locator("#password2").fill("sicheres-passwort-123");
  await page.locator("#acceptTerms").click();
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await page.waitForURL(/\/dashboard/);
  return email;
}

test("Registrierung → Projekt → Scan (Mock) → Ergebnis + PDF", async ({ page }) => {
  await register(page);
  await expect(page.getByRole("heading", { name: "Übersicht" })).toBeVisible();
  await expect(page.getByTestId("demo-banner")).toBeVisible();

  // Projekt-Wizard
  await page.goto("/dashboard/projects/new");
  await page.locator("#domain").fill("muster-sanitaer.de");
  await page.locator("#brandName").fill("Muster Sanitär");
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.locator("#industry").fill("Sanitär");
  await page.locator("#city").fill("Köln");
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByTestId("create-project").click();
  await page.waitForURL(/\/dashboard\/prompts/);
  await expect(page.getByText("kat-01")).toBeVisible();

  // Scan starten
  await page.getByTestId("start-scan").first().click();
  await page.waitForURL(/\/dashboard\/scans\//);
  await expect(page.getByRole("tab", { name: "KI-Antworten" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Zusammenfassung")).toBeVisible();

  // Tabs
  await page.getByRole("tab", { name: "KI-Antworten" }).click();
  await expect(page.getByText(/\d+ Antworten/)).toBeVisible();
  await page.getByRole("tab", { name: "Technik-Check" }).click();
  await expect(page.getByText("Website erreichbar").or(page.getByText("robots.txt erlaubt KI-Crawler"))).toBeVisible();
  await page.getByRole("tab", { name: "Empfehlungen" }).click();

  // PDF-Download
  const href = await page.getByTestId("download-pdf").getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/pdf");
  expect((await res.body()).subarray(0, 4).toString()).toBe("%PDF");
});

test("Gratis-Check ohne Login → Teaser-Ergebnis", async ({ page }) => {
  await page.goto("/gratis-check");
  await acceptCookies(page);
  await page.locator("#domain").fill(`muster-${uid()}.de`);
  await page.locator("#brandName").fill("Muster Dach");
  await page.locator("#industry").fill("Dachdecker");
  await page.locator("#city").fill("Bonn");
  await page.locator("#email").fill(`lead-${uid()}@example.com`);
  await page.locator("#consent").click();
  await page.getByRole("button", { name: /Gratis-Check starten/ }).click();
  await page.waitForURL(/\/gratis-check\/ergebnis\//);
  await expect(page.getByTestId("teaser-score")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("link", { name: /vollständigen Report/ })).toBeVisible();
});
