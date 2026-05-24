import { expect, test } from "@playwright/test";

test("user can log in and see VM matches", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Spiller").locator("option")).toContainText([
    "Alf Kåre",
    "Anders",
    "Danny",
    "Fredrik",
    "Glenn Ruben",
    "Jørgen",
    "Steinar",
    "Sverre",
    "Vegard",
  ]);
  await page.getByLabel("Spiller").selectOption("alf");
  await page.getByLabel("Felles kode").fill("Norge");
  await page.getByRole("button", { name: "Logg inn" }).click();

  await expect(page.getByRole("heading", { name: /Tippekampen/ })).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "Kamper", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Alle kampene" })).toBeVisible();
  const firstMatch = page.locator("#m001");
  await expect(firstMatch.locator("strong", { hasText: "Mexico" })).toBeVisible();
  await expect(firstMatch.locator("strong", { hasText: "South Africa" })).toBeVisible();
  await firstMatch.getByRole("button", { name: /S Seier/ }).click();
  await expect(firstMatch.getByLabel("Mexico mål")).toHaveValue("1");
  await expect(firstMatch.getByLabel("South Africa mål")).toHaveValue("0");
  await expect(firstMatch).toContainText("TV 2 Direkte");
  await page.getByRole("navigation").getByRole("link", { name: "VM", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hele turneringen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stillingen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Når og hvor" })).toBeVisible();
});
