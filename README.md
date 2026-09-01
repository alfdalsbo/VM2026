# Tippekjelleren VM 2026

Privat VM 2026-app for vennegjengen. Appen lar en fast gjeng logge inn med felles kode, tippe alle VM-kampene og få automatisk poengberegning når kampdata synkes inn.

## Funksjoner

- Fast brukerliste: Alf Kåre, Anders, Danny, Fredrik, Glenn Ruben, Jørgen, Ruben, Steinar, Sverre og Vegard.
- VM 2026-kampene er seedet fra FIFAs offentlige kampkalender.
- Rask resultattipping med scorefelt for eksakt resultat.
- Tips låses automatisk ved kampstart i Europe/Oslo-tid.
- Poeng: riktig utfall 3, riktig målforskjell +2, eksakt resultat +5.
- Sluttspill støtter ekstraomganger og straffekonkurranse når ordinær tid tippes uavgjort.
- FIFA-data kan synkes automatisk/best-effort via gratis offentlig API: kampstatus/resultat, lagmetadata, tropp/trener når publisert, formasjon, dommere, tilskuertall, vær og enkel statistikk der FIFA eksponerer det.
- VM-side med gruppetabeller, utslag, TV-guide og statistikkflater.
- Kampkort, lagsider og delbare tippekort for skryt i vennegjengen.
- Tabell, profil, badges og små interne kåringer.

## Lokal kjøring

```bash
npm install
npm run dev
```

Åpne `http://localhost:3000`. Lokal standardkode er `Norge`.

## Samarbeid og deploy

Vercel-prosjektet heter `tippekjelleren` og er koblet til GitHub-repoet `alfdalsbo/VM2026`. `main` er production branch. Alle andre branches, inkludert pull requests, er deploy-stille; en vanlig Git-push er derfor ikke en deployment-intensjon. Når en `main`-commit berører en definert produktinput, lager Vercel production deployment automatisk. Dokumentasjon, tester og kontrollfiler alene skal ikke bygge produktet.

Fast produksjonsadresse er `https://tippekjelleren.vercel.app`. Den adressen er lagt inn som prosjektdomene i Vercel og skal derfor følge siste grønne production deployment automatisk.

Normal flyt:

```bash
git checkout main
git pull
git checkout -b min-endring
npm run verify
git push -u origin min-endring
```

Kjør lokal verifikasjon før push og bruk GitHub Actions for en moden, kvalifisert PR. Vercel Preview er ikke en normal PR-fase i denne konfigurasjonen: hvis en ferdig kandidat virkelig trenger browser-/runtime-/integrasjonsverifikasjon, må Preview aktiveres bevisst og midlertidig før den brukes. Se `CONTRIBUTING.md` for feilsøking når en endring ikke vises i produksjon.

## Miljøvariabler

```bash
TIPPEKJELLEREN_PASSCODE=Norge
AUTH_SECRET=lang-tilfeldig-hemmelighet
ADMIN_PLAYER_IDS=alf
BLOB_READ_WRITE_TOKEN=vercel-blob-token
CRON_SECRET=lang-tilfeldig-cron-hemmelighet
DATABASE_URL=postgres://...
API_FOOTBALL_KEY=
API_FOOTBALL_SEASON=2026
BONUS_ODDS_URL=https://example.com/tippekjelleren-bonus-odds.json
```

`DATABASE_URL` kan peke på Supabase/Postgres og får førsteprioritet. Uten `DATABASE_URL` bruker appen Vercel Blob når `BLOB_READ_WRITE_TOKEN` finnes. Hvis ingen varig lagring er konfigurert, faller den tilbake til lokal fil under `.data/`, som bare er egnet for lokal utvikling.

`API_FOOTBALL_KEY` er valgfri og brukes kun server-side som gratis fallback for raskere kampstatus, lagoppstillinger, hendelser og enkel statistikk når FIFA henger etter. Appen bruker ikke odds- eller predictions-endepunktene fra API-Football. Gratisbudsjettet styres internt mot 100 kall per UTC-dag.

`BONUS_ODDS_URL` er valgfri og brukes kun server-side til autofyll av kampbonus. Feeden skal være provider-nøytral JSON, indeksert på appens kamp-ID-er:

```json
{
  "matches": {
    "m001": {
      "homeScorers": [{ "playerId": "mex-9", "weight": 0.42 }, { "playerName": "Santiago Gimenez", "odds": 2.8 }],
      "awayScorers": [{ "playerId": "rsa-11", "odds": 4.5 }],
      "homeAssists": [{ "playerId": "mex-10", "weight": 0.25 }],
      "awayAssists": [{ "playerName": "Percy Tau", "odds": 5.2 }],
      "yellowCardsTotal": 5,
      "redCardsTotal": 0,
      "homeYellowCardsTotal": 3,
      "awayYellowCardsTotal": 2,
      "homeRedCardsTotal": 0,
      "awayRedCardsTotal": 0
    }
  }
}
```

`weight` brukes direkte når den finnes. Ellers konverteres `odds` til implisitt sannsynlighet med `1 / odds`. Spillere som ikke matcher syncede VM-tropper blir ignorert, og appen faller tilbake til intern prognose når det ikke finnes brukbare oddsdata.

## Kontroll

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Playwright:

```bash
npm run test:e2e
```

## Manuell GitHub-sync etter mesterskapet

Den automatiske GitHub-synken ble stanset etter mesterskapet. Workflowen `.github/workflows/sync-world-cup.yml` kan nå bare kjøres manuelt. For en manuell kjøring må GitHub-repoet ha en Actions secret med samme verdi som Vercel-miljøvariabelen `CRON_SECRET`. Vercel Cron står fortsatt som daglig sikkerhetskall i den eksisterende driftskonfigurasjonen.

```bash
gh auth login
gh secret set CRON_SECRET --repo alfdalsbo/VM2026
```

Lim inn samme hemmelighet som ligger i Vercel. Workflowen kan også kjøres manuelt fra fanen Actions i GitHub. Velg `force` når du vil hente lag/troppdata utenfor VM-vinduet.

## Utslagsrunder

FIFA-sync forsøker å fylle ekte lag i sluttspillet når FIFAs offentlige kampdata publiserer dem. Appen kan også fylle det den kan regne ut selv fra ferdige kamper:

- `1A`, `2B` og tilsvarende fylles når gruppen er ferdigspilt i appens resultater.
- `W89`, `RU101` og tilsvarende fylles fra vinnere/tapere i tidligere utslagskamper.
- Beste treere som `3ABCDF` fylles ikke automatisk lokalt, fordi FIFA bestemmer den konkrete koblingen etter gruppespillet. De kan komme via FIFA-sync eller settes i kode/state ved behov.

## Viktige avgrensninger

- Dette er kun en VM 2026-app i første versjon.
- Ingen betaling, gambling, offentlige ligaer eller åpen registrering.
- Automatisk kampdata er best-effort via gratis FIFA-data.
- Per 24. mai 2026 svarer FIFAs 2026-squad-endepunkt med tomme spiller- og trenerlister, men appen er klar til å fylle dem når FIFA publiserer dataene.
- Ingen offisiell FIFA-logo eller beskyttede VM-assets brukes.
