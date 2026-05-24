import { expect, test } from "@playwright/test";

test("user can log in and tip from the match-first dashboard", async ({ page }) => {
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

  await expect(page.getByRole("heading", { name: /Dagens kamper|Neste kampdag/ })).toBeVisible();
  await expect(page.getByText("Lagring")).toHaveCount(0);
  await expect(page.getByText("Joker")).toHaveCount(0);

  const firstMatch = page.locator("#m001");
  await expect(firstMatch).toContainText("Mexico");
  await expect(firstMatch).toContainText("South Africa");
  await expect(firstMatch.getByRole("button", { name: /S Seier/ })).toHaveCount(0);
  await firstMatch.getByLabel("Mexico mål").fill("2");
  await firstMatch.getByLabel("South Africa mål").fill("1");
  await expect(firstMatch.getByRole("button", { name: "Tipp kampen" })).toBeVisible();
  await expect(firstMatch).toContainText("TV 2 Direkte");

  await firstMatch.getByRole("link", { name: "Mexico", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mexico" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tropp" })).toBeVisible();

  await page.goto("/");
  await page.locator("#m001").getByRole("link", { name: /Kampkort for Mexico mot South Africa/ }).click();
  await expect(page.getByText("Kamp #1")).toBeVisible();
  await expect(page.getByText("Ikke publisert ennå")).toBeVisible();

  await expect(page.getByRole("navigation").getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);
});
