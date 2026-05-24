# Venneligaen VM 2026

Privat VM 2026-app for vennegjengen. Appen lar en fast gjeng logge inn med felles kode, tippe alle VM-kampene, bruke én joker per kampdag og få automatisk poengberegning når admin fører fasit.

## Funksjoner

- Fast brukerliste: Alf Kåre, Vegard, Jørgen, Steinar, Sverre, Fredrik, Glenn Ruben og Danny.
- VM 2026-kampene er seedet fra FIFAs offentlige kampkalender.
- Tips låses automatisk ved kampstart i Europe/Oslo-tid.
- Poeng: riktig utfall 3, riktig målforskjell +2, eksakt resultat +5.
- Joker dobler poeng på valgt kamp, maks én joker per kampdag.
- Sluttspill støtter straffekonkurranse med `advancingTeam`.
- Admin kan føre fasit og oppdatere sluttspill-plassholdere.
- Tabell, profil, badges og små interne kåringer.

## Lokal kjøring

```bash
npm install
npm run dev
```

Åpne `http://localhost:3000`. Lokal standardkode er `vm2026`.

## Miljøvariabler

```bash
VENNELIGAEN_PASSCODE=sett-en-delt-privat-kode
AUTH_SECRET=lang-tilfeldig-hemmelighet
ADMIN_PLAYER_IDS=alf
DATABASE_URL=postgres://...
```

`DATABASE_URL` kan peke på Supabase/Postgres. Uten `DATABASE_URL` bruker appen lokal fil under `.data/`, som er fint for lokal utvikling, men ikke for varig Vercel-lagring.

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

## Viktige avgrensninger

- Dette er kun en VM 2026-app i første versjon.
- Ingen betaling, gambling, offentlige ligaer eller åpen registrering.
- Ingen live-resultat-API i v1; admin fører fasit manuelt.
- Ingen offisiell FIFA-logo eller beskyttede VM-assets brukes.
