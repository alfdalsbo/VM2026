import { expect, test } from "@playwright/test";

test("user can log in and tip from the match-first dashboard", async ({ page }, testInfo) => {
  test.setTimeout(75_000);
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
  await expect(page.getByText("Dagens VM-øyeblikk")).toBeVisible();
  await expect(page.getByText("Lagring")).toHaveCount(0);
  await expect(page.getByText("Joker")).toHaveCount(0);

  const firstMatch = page.locator("#m001");
  await expect(firstMatch).toContainText("Mexico");
  await expect(firstMatch).toContainText("Sør-Afrika");
  await expect(firstMatch.getByLabel("Historisk ekko")).toBeVisible();
  await expect(firstMatch.getByRole("button", { name: /S Seier/ })).toHaveCount(0);
  await expect(firstMatch.getByRole("button", { name: "Følg kamp" })).toHaveCount(0);
  await expect(firstMatch).not.toContainText("Før avspark");
  await expect(firstMatch).not.toContainText("#1");

  await firstMatch.getByRole("link", { name: "Mexico", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mexico" })).toBeVisible();
  await expect(page.getByText("VM-pass")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arkivtropp til FIFA-data kommer" })).toBeVisible();

  await page.goto("/kamp/m001");
  await expect(page.getByText("Kamp 1")).toBeVisible();
  await expect(page.getByText("Historisk ekko")).toBeVisible();
  await expect(page.getByText("TV 2 Direkte")).toBeVisible();
  await expect(page.getByText("Ikke publisert ennå")).toBeVisible();
  await expect(page.getByText("Taktisk rapport")).toHaveCount(0);

  await page.goto("/");
  await page.locator("#m001").getByRole("button", { name: "Legg til Mexico" }).click();
  await page.locator("#m001").getByRole("button", { name: "Legg til Mexico" }).click();
  await page.locator("#m001").getByRole("button", { name: "Legg til Sør-Afrika" }).click();

  await page.goto("/kamper");
  const firstKnockout = page.locator("#m073");
  await expect(firstKnockout).toContainText("21:00");
  await expect(firstKnockout).toContainText("Toer gruppe A");
  await expect(firstKnockout).toContainText("Toer gruppe B");
  await expect(firstKnockout).toContainText("Sluttspillkupongen åpner når begge lag er klare.");
  await expect(firstKnockout.getByRole("button", { name: /Legg til/ })).toHaveCount(0);

  await page.goto("/vm");
  await expect(page.getByRole("heading", { name: "VM-historien på dommerbordet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mesterveggen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Veien til finalen" })).toBeVisible();
  await expect(page.getByText("Vinner gruppe A").first()).toBeVisible();
  await expect(page.getByText("Vinner til kamp").first()).toBeVisible();
  await expect(page.locator("#grupper .group-table-wrap").first()).toBeVisible();
  const overflowingGroupTables = await page.locator("#grupper .group-table-wrap").evaluateAll((tables) =>
    tables.filter((table) => table.scrollWidth > table.clientWidth + 1).length,
  );
  expect(overflowingGroupTables).toBe(0);
  const hasOnlyVerticalPageScroll = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  expect(hasOnlyVerticalPageScroll).toBe(true);

  const vmMexicoLink = page.locator("#grupper").getByRole("link", { name: "Mexico", exact: true }).first();
  await expect(vmMexicoLink).toBeVisible();
  await vmMexicoLink.click();
  await expect(page.getByRole("heading", { name: "Mexico" })).toBeVisible();

  await expect(page.getByRole("navigation").getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);
});
