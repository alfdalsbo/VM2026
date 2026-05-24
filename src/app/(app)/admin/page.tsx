import { ResultForm } from "@/components/result-form";
import { Notice, Panel } from "@/components/ui";
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

      <div className="grid gap-4">
        {state.matches.map((match) => (
          <ResultForm key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}
