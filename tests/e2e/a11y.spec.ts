import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "cookie_consent", value: "necessary", url: baseURL! }]);
});

for (const path of ["/", "/preise", "/gratis-check", "/faq", "/so-funktionierts", "/angebot", "/kontakt", "/login", "/register"]) {
  test(`Barrierefreiheit (WCAG 2 AA, axe): ${path}`, async ({ page }) => {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}
