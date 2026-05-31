# Samarbeid og deploy

Dette repoet er koblet til Vercel-prosjektet `tippekjelleren`.

## Lokal kjøring

```bash
cp .env.example .env.local
npm install
npm run dev
```

Lokal standardkode er `Norge`. `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` og eksterne API-nokler kan stå tomme lokalt; da bruker appen lokal fil under `.data/`.

## Arbeidsflyt

1. Lag en branch fra oppdatert `main`.
2. Push branchen til GitHub.
3. Bruk Vercels preview deployment for branchen/PR-en til testing.
4. Merge til `main` når preview og GitHub Actions er grønne.
5. Vercel lager production deployment automatisk fra `main`.

Ikke bruk lokal `vercel --prod` som normal arbeidsflyt. Direkte CLI-deploy brukes bare som nødgrep.

## Faste Vercel-peker

- Produksjon: `https://tippekjelleren.vercel.app`
- Vercel-prosjekt: `tippekjelleren`
- GitHub-repo: `alfdalsbo/VM2026`
- Production branch: `main`
- Root directory: `.`

`tippekjelleren.vercel.app` er lagt inn som prosjektdomene i Vercel, ikke bare som manuell deployment-alias. Derfor skal domenet følge siste vellykkede production deployment automatisk.

## Feilsøking ved "jeg ser ikke endringen"

Sjekk i denne rekkefolgen:

1. Er committen pushet til riktig branch på GitHub?
2. Har Vercel laget en deployment for committen?
3. Er deploymenten grønn eller rød?
4. Hvis deploymenten er grønn, peker `tippekjelleren.vercel.app` på samme deployment-id?
5. Hvis alt over stemmer, test hard refresh eller privat fane.

Build-feil sjekkes i Vercel `Deployments` eller i GitHub Actions `Verify`.

## Miljøvariabler

Prod-hemmeligheter ligger i Vercel, ikke i GitHub og ikke i `.env.local`.

Minimum for produksjon:

```env
TIPPEKJELLEREN_PASSCODE=...
AUTH_SECRET=...
ADMIN_PLAYER_IDS=alf
CRON_SECRET=...
BLOB_READ_WRITE_TOKEN=...
DATABASE_URL=...
```

`DATABASE_URL` bør settes til Supabase/Postgres for varig produksjonslagring. Uten `DATABASE_URL` bruker appen Vercel Blob hvis `BLOB_READ_WRITE_TOKEN` finnes.
