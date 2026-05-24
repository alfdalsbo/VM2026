import { ResultForm } from "@/components/result-form";
import { Notice, Panel } from "@/components/ui";
import { syncWorldCupAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getAppState } from "@/lib/state";

export const metadata = {
  title: "Admin",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  await requireAdmin();
  const state = await getAppState();

  return (
    <div className="space-y-6">
      <Panel>
        <p className="eyebrow">Admin</p>
        <h1 className="section-title mt-2">Fasitkontoret</h1>
        <p className="lead mt-3 max-w-3xl">
          Før resultater manuelt, rett sluttspill-plassholdere når lagene er klare, og la poengmotoren gjøre resten. Sletter du mål-feltene, fjernes fasiten for kampen.
        </p>
      </Panel>

      <Notice message={params.status} />
      <Notice message={params.error} tone="error" />

      <Panel className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Automatikk</p>
          <h2 className="text-xl font-black">FIFA-sync</h2>
          <p className="lead mt-1">
            Status: {state.sync.status} · sist ferdig {state.sync.lastCompletedAt ? new Date(state.sync.lastCompletedAt).toLocaleString("nb-NO") : "aldri"} ·{" "}
            {state.sync.message ?? "Klar, men ikke dramatisk."}
          </p>
        </div>
        <form action={syncWorldCupAction}>
          <button className="btn-primary" type="submit">
            Oppdater kampdata nå
          </button>
        </form>
      </Panel>

      <div className="grid gap-4">
        {state.matches.map((match) => (
          <ResultForm key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}
