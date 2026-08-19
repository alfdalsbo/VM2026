<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tippekjelleren Agent Rules

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
3. **Iterative branch/draft PR** for expected iteration or broad/risky work: local/agent verification and Vercel Preview during iteration, ready PR only when finished, one external final CI, merge to `main`, then Production + smoke.

Do not use repeated pushes so GitHub Actions can find local errors, and do not split one logical connector-driven change into several `main` pushes. Vercel Git integration owns Preview/Production; direct manual production deploy is an exception/recovery path.

Database, auth, secrets, permissions, scheduled sync behavior and irreversible data changes follow stricter local gates than cost optimization.
