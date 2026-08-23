<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tippekjelleren Agent Rules

## Systemkobling

- Tippekjelleren VM2026 er et tidsbundet fritidsprodukt i vedlikeholdsmodus, ikke et eget person- eller kunnskapsdomene. Repoet eier kode, spilldata, produktlogikk, design og release.
- Ikke utled harde personlighetspåstander fra tipping, fotballdata, venneaktivitet eller produktvalg alene.
- Dersom Alf Kåre eksplisitt avklarer en stabil interesse, arbeidsform eller preferanse med verdi utover produktet, kan den promoteres til `alfdalsbo/personlig`; avledede/usikre funn går til personrepoets `context/PROFILKANDIDATER.md`.
- Generaliserbar app-, agent-, spillprodukt- eller leveranselæring vurderes mot `alfdalsbo/arbeidssystem`. Ikke opprett lokal personprofil eller ekstra kontekstarkitektur bare for symmetri.

- This app is Tippekjelleren VM 2026. Do not broaden v1 into general betting, gambling, non-VM events, public leagues, payments, or open registration.
- Keep the tone private, Norwegian, football-focused, and gently self-important in the same broad family as Geotia, but do not import Geotia lore.
- Do not use official FIFA logos, marks, or protected assets unless the user provides approved files.
- For durable Vercel storage, use `DATABASE_URL` with Supabase/Postgres. Local file storage is only for development.
- Run `npm run verify` when feasible before handoff.

## Global app release gate

For GitHub, CI, Vercel or release work, read the latest `alfdalsbo/arbeidssystem/11-app-leveransestandard.md` before the first release-related write.

Choose release mode first:

1. **No deploy** for work proven not to affect runtime/product.
2. **Atomic one-shot publish** for one small coherent low-risk change: gather all affected files first, validate the whole change, then make one commit/push/publish round.
3. **Iterative branch/draft PR** for expected iteration or broad/risky work: local/agent verification and GitHub CI after the candidate is mature. Automatic Vercel Preview from every work-branch commit is not standard; create at most one explicit Preview candidate when a finished version genuinely needs browser/runtime/integration verification, then merge to `main`, Production + smoke.

Do not use repeated pushes so GitHub Actions or Vercel can find local errors, and do not split one logical connector-driven change into several `main` pushes. High-frequency agent-/work branches are deploy-silent through `vercel.json`. Vercel Production from `main` is the normal publication path; Preview is opt-in when it provides concrete signal. Direct manual production deploy is an exception/recovery path.

`scripts/vercel-ignore-build.mjs` owns the positive product boundary. `src/**`, `public/**`, the Next build helper and relevant package/framework/runtime configuration build; documentation, tests, analysis files and CI changes do not build alone. If a new indirect build/runtime input is introduced, update the boundary and regression test in the same change. Git uncertainty fails safe to build.

Database, auth, secrets, permissions, scheduled sync behavior and irreversible data changes follow stricter local gates than cost optimization.
