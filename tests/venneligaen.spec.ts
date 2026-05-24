import { expect, test } from "@playwright/test";

test("user can log in and see VM matches", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Spiller").selectOption("alf");
  await page.getByLabel("Felles kode").fill("vm2026");
  await page.getByRole("button", { name: "Logg inn" }).click();

  await expect(page.getByRole("heading", { name: /Tippekampen/ })).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "Kamper", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Alle kampene" })).toBeVisible();
  const firstMatch = page.locator("#m001");
  await expect(firstMatch.locator("strong", { hasText: "Mexico" })).toBeVisible();
  await expect(firstMatch.locator("strong", { hasText: "South Africa" })).toBeVisible();
});
