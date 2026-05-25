import { expect, test } from "@playwright/test";

test("user can log in and tip from the match-first dashboard", async ({ page }, testInfo) => {
  const playerId = testInfo.project.name === "mobile" ? "anders" : "alf";
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
  await page.getByLabel("Spiller").selectOption(playerId);
  await page.getByLabel("Felles kode").fill("Norge");
  await page.getByRole("button", { name: "Logg inn" }).click();

  await expect(page.getByRole("heading", { name: /Dagens kamper|Neste kampdag/ })).toBeVisible();
  await expect(page.getByText("Lagring")).toHaveCount(0);
  await expect(page.getByText("Joker")).toHaveCount(0);

  const firstMatch = page.locator("#m001");
  await expect(firstMatch).toContainText("Mexico");
  await expect(firstMatch).toContainText("Sør-Afrika");
  await expect(firstMatch.getByRole("button", { name: /S Seier/ })).toHaveCount(0);
  await expect(firstMatch.getByRole("button", { name: "Følg kamp" })).toHaveCount(0);
  await expect(firstMatch).not.toContainText("TV 2 Direkte");
  await expect(firstMatch).not.toContainText("Før avspark");
  await expect(firstMatch).not.toContainText("#1");
  await firstMatch.getByLabel("Mexico mål").fill("2");
  await firstMatch.getByLabel("Sør-Afrika mål").fill("1");
  await expect(firstMatch.getByRole("button", { name: /Tipp kampen|Oppdater tipset/ })).toBeVisible();

  await firstMatch.getByRole("link", { name: "Mexico", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mexico" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tropp" })).toBeVisible();

  await page.goto("/");
  await page.locator("#m001").getByRole("link", { name: /Kampkort for Mexico - Sør-Afrika/ }).click();
  await expect(page.getByText("Kamp 1")).toBeVisible();
  await expect(page.getByText("TV 2 Direkte")).toBeVisible();
  await expect(page.getByText("Ikke publisert ennå")).toBeVisible();

  await page.goto("/vm");
  await expect(page.getByRole("heading", { name: "Veien til finalen" })).toBeVisible();
  await expect(page.getByText("Vinner gruppe A").first()).toBeVisible();
  await expect(page.getByText("Vinner til kamp").first()).toBeVisible();

  await expect(page.getByRole("navigation").getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);
});
