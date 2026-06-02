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

  await expect(page.getByRole("heading", { name: /Dagens kamper|Neste kampdag/ })).toBeVisible({ timeout: 20_000 });
  const manualTopImage = page.locator(".manual-daily-image").first();
  await expect(manualTopImage).toBeVisible();
  await expect(manualTopImage.getByRole("button", { name: "Bytt til et tilfeldig bilde" })).toBeVisible();
  await expect(manualTopImage.locator(".image-context-toggle")).toHaveCount(0);
  await expect(page.getByText("Lagring")).toHaveCount(0);
  await expect(page.getByText("Joker")).toHaveCount(0);

  const firstMatch = page.locator("#m001");
  await expect(firstMatch).toContainText("Mexico");
  await expect(firstMatch).toContainText("Sør-Afrika");
  const firstMatchHistory = firstMatch.getByLabel("Tidligere VM-møte");
  await expect(firstMatchHistory).toBeVisible();
  await expect(firstMatchHistory).toContainText("Tshabalala");
  await firstMatchHistory.locator("summary", { hasText: "Mer" }).click();
  await expect(firstMatchHistory).toContainText("Soccer City");
  await expect(firstMatch.getByRole("button", { name: /S Seier/ })).toHaveCount(0);
  await expect(firstMatch.getByRole("button", { name: "Følg kamp" })).toHaveCount(0);
  await expect(firstMatch).not.toContainText("Før avspark");
  await expect(firstMatch).not.toContainText("#1");

  await firstMatch.getByRole("link", { name: "Mexico", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mexico" })).toBeVisible();
  await expect(page.getByText("VM-pass")).toBeVisible();
  await expect(page.getByText("VM-bildehylle")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Arkivtropp til FIFA-data kommer" })).toBeVisible();

  await page.goto("/kamp/m001");
  await expect(page.getByText("Kamp 1")).toBeVisible();
  await expect(page.getByText("Tidligere VM-møte")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sør-Afrika 1-1 Mexico" })).toBeVisible();
  await expect(page.getByText("Soccer City, Johannesburg")).toBeVisible();
  await expect(page.getByRole("link", { name: /Kilde: FIFA/ })).toBeVisible();
  await expect(page.getByTitle(/TV 2 Direkte/).first()).toBeVisible();
  await expect(page.getByText("Ikke publisert ennå")).toBeVisible();
  await expect(page.getByText("Taktisk rapport")).toHaveCount(0);

  await page.goto("/kamp/m018");
  await expect(page.getByText("Tidligere VM-møte")).toHaveCount(0);
  await expect(page.getByText("Norge åpner arkivet igjen")).toHaveCount(0);

  await page.goto("/");
  await page.locator("#m001").getByRole("button", { name: "Legg til Mexico" }).click();
  await page.locator("#m001").getByRole("button", { name: "Legg til Mexico" }).click();
  await page.locator("#m001").getByRole("button", { name: "Legg til Sør-Afrika" }).click();
  await expect(page.locator("#m001").getByText("Registrert")).toBeVisible({ timeout: 10_000 });
  const dailyVmMoment = page.locator(".tip-day-matches + .home-daily-vm-moment");
  await expect(dailyVmMoment).toBeVisible();
  await expect(page.getByText("Dagens VM-øyeblikk")).toHaveCount(1);
  await expect(page.getByText("VM-bildebanken")).toHaveCount(0);
  await expect(page.getByText("Arkivfunn fra kjelleren")).toHaveCount(0);
  const momentImageContextButton = dailyVmMoment.getByRole("button", { name: /Vis bildekontekst/ }).first();
  await expect(momentImageContextButton).toBeVisible();
  await expect(momentImageContextButton).toContainText("Les bildetekst");
  await momentImageContextButton.click();
  const momentImageContextCard = dailyVmMoment.locator(".daily-image .image-context-card");
  await expect(momentImageContextCard).toBeVisible();
  await expect(momentImageContextCard).toContainText("Hva ser vi?");
  await expect(momentImageContextCard).toContainText("Hvorfor betyr det noe?");
  await expect(momentImageContextCard).toContainText("Nerdekrok");
  await expect(dailyVmMoment.locator(".image-context-backdrop")).toHaveCount(0);
  await expect.poll(async () => momentImageContextCard.evaluate((element) => getComputedStyle(element).position)).not.toBe("fixed");
  await dailyVmMoment.locator(".image-context-close").click();
  await expect(momentImageContextCard).toHaveCount(0);
  await expect(dailyVmMoment.getByRole("button", { name: "Vis nytt bilde til VM-øyeblikket" })).toBeVisible();

  await page.goto("/kamper");
  await expect(page.getByRole("navigation").getByRole("link", { name: "Bonustabell", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Bonustips", exact: true })).toHaveCount(0);
  const firstListedMatch = page.locator("#m001");
  await expect(firstListedMatch).toContainText("Bonustips");
  await expect(firstListedMatch.getByRole("button", { name: "Åpne bonus" })).toBeVisible();
  await expect(firstListedMatch.locator(".tip-bonus-open")).toHaveCount(0);
  await expect(firstListedMatch.locator(".tip-bonus-open-badge")).toHaveCount(0);
  await firstListedMatch.getByRole("button", { name: "Åpne bonus" }).click();
  await expect(firstListedMatch.locator(".tip-bonus-open")).toBeVisible();
  await expect(firstListedMatch.locator(".tip-bonus-open-badge", { hasText: "Åpen" })).toBeVisible();
  await expect(firstListedMatch.getByRole("heading", { name: "Scorere og assister" })).toBeVisible();
  await expect(firstListedMatch.getByRole("heading", { name: "Gule og røde kort" })).toBeVisible();
  await expect(firstListedMatch.getByText(/Tropp ikke klar\.|Resultattipset står på 0-0\./).first()).toBeVisible();
  await expect(firstListedMatch.getByRole("button", { name: "Lagre bonustips" })).toHaveCount(0);
  await expect(firstListedMatch.getByRole("group", { name: "Mexico gule kort" })).toBeVisible();
  await expect(firstListedMatch.getByRole("group", { name: "Sør-Afrika røde kort" })).toBeVisible();
  await firstListedMatch.getByRole("button", { name: "Lukk bonus" }).click();
  await expect(firstListedMatch.locator(".tip-bonus-open")).toHaveCount(0);
  await expect(firstListedMatch.locator(".tip-bonus-open-badge")).toHaveCount(0);
  await firstListedMatch.getByRole("button", { name: "Åpne bonus" }).click();
  await firstListedMatch.getByRole("button", { name: "Legg til Mexico gule kort" }).click();
  await expect(firstListedMatch.getByText(/Kortbonus lagret|Lagrer/)).toBeVisible({ timeout: 10_000 });
  await firstListedMatch.getByRole("button", { name: "Autofyll bonus" }).click();
  await expect(page.getByText(/Autofylte|Ingen tomme bonustips/)).toBeVisible({ timeout: 10_000 });

  await page.goto("/kamper");
  await page.getByRole("button", { name: "Autofyll bonus for tippede kamper" }).click();
  await expect(page.getByText(/Autofylte|Ingen tomme bonustips/)).toBeVisible({ timeout: 10_000 });

  await page.goto("/live");
  await expect(page.getByRole("heading", { name: "Bonustabell" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Autofyll/ })).toHaveCount(0);
  await expect(page.getByText("Selve tippinga skjer nå inne på kampkortet")).toBeVisible();

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
  await expect(page.getByRole("heading", { name: "Arkivbildeveggen" })).toBeVisible();
  const vmArchiveContextButton = page.getByRole("button", { name: /Vis bildekontekst/ }).first();
  await expect(vmArchiveContextButton).toBeVisible();
  await vmArchiveContextButton.click();
  const vmImageContextCard = page.locator(".image-wall-context .image-context-card").first();
  await expect(vmImageContextCard).toBeVisible();
  await expect.poll(async () => vmImageContextCard.evaluate((element) => getComputedStyle(element).position)).not.toBe("fixed");
  await page.keyboard.press("Escape");
  await expect(page.locator(".image-wall-context .image-context-card")).toHaveCount(0);
  await expect(page.getByLabel("Tiår")).toBeVisible();
  await expect(page.getByText("Nerde fakta")).toBeVisible();
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
