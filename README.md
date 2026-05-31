# Tippekjelleren VM 2026

Privat VM 2026-app for vennegjengen. Appen lar en fast gjeng logge inn med felles kode, tippe alle VM-kampene og få automatisk poengberegning når kampdata synkes inn.

## Funksjoner

- Fast brukerliste: Alf Kåre, Anders, Danny, Fredrik, Glenn Ruben, Jørgen, Steinar, Sverre og Vegard.
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

Vercel-prosjektet heter `tippekjelleren` og er koblet til GitHub-repoet `alfdalsbo/VM2026`. Push/merge til `main` lager production deployment automatisk. Pull requests og andre branches får preview deployments.

Fast produksjonsadresse er `https://tippekjelleren.vercel.app`. Den adressen er lagt inn som prosjektdomene i Vercel og skal derfor følge siste grønne production deployment automatisk.

Normal flyt:

```bash
git checkout main
git pull
git checkout -b min-endring
npm run verify
git push -u origin min-endring
```

Test Vercel preview-URL-en fra PR-en før merge til `main`. Se `CONTRIBUTING.md` for feilsøking når en endring ikke vises i produksjon.

## Miljøvariabler

```bash
TIPPEKJELLEREN_PASSCODE=Norge
AUTH_SECRET=lang-tilfeldig-hemmelighet
ADMIN_PLAYER_IDS=alf
BLOB_READ_WRITE_TOKEN=vercel-blob-token
CRON_SECRET=lang-tilfeldig-cron-hemmelighet
DATABASE_URL=postgres://...
```

`DATABASE_URL` kan peke på Supabase/Postgres og får førsteprioritet. Uten `DATABASE_URL` bruker appen Vercel Blob når `BLOB_READ_WRITE_TOKEN` finnes. Hvis ingen varig lagring er konfigurert, faller den tilbake til lokal fil under `.data/`, som bare er egnet for lokal utvikling.

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

## GitHub-sync hvert 10. minutt

Workflowen `.github/workflows/sync-world-cup.yml` kaller produksjons-endepunktet hvert tiende minutt i juni og juli 2026. For at den skal virke må GitHub-repoet ha en Actions secret med samme verdi som Vercel-miljøvariabelen `CRON_SECRET`.

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
