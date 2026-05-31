import { loginAction } from "@/app/actions";
import { WorldCupTrophyIcon } from "@/components/icons/world-cup-trophy-icon";
import { Notice } from "@/components/ui";
import { publicPlayers } from "@/lib/auth";

export const metadata = {
  title: "Logg inn",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const rejected = params.error === "avvist";
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";

  return (
    <main className="min-h-screen bg-[#101820] text-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="relative flex min-h-[48vh] items-end overflow-hidden p-6 lg:min-h-screen lg:p-12">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#101820,#7f1d1d_58%,#c8912a)]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.12),rgba(255,255,255,.12)_10px,transparent_10px,transparent_22px)]" />
          <div className="relative max-w-3xl">
            <p className="eyebrow">Tippekjelleren · VM 2026</p>
            <h1 className="mt-4 text-5xl font-black leading-none tracking-[0] sm:text-7xl">Privat VM-domstol for gjengen.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/82">
              Velg spiller, skriv felles kode og gjør deg klar til å overvurdere både form, xG og egen dømmekraft.
            </p>
          </div>
        </section>

        <section className="flex items-center bg-[#f7f1e8] p-6 text-[#17130f] lg:p-10">
          <div className="w-full">
            <div className="mb-8 flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded bg-[#b4232f] text-white">
                <WorldCupTrophyIcon className="h-10 w-10" aria-hidden="true" />
              </span>
              <div>
                <p className="eyebrow">Adgangskontroll</p>
                <h2 className="text-2xl font-black">Åpne ligaen</h2>
              </div>
            </div>

            <form action={loginAction} className="login-form grid gap-4">
              <input type="hidden" name="next" value={next} />
              <label>
                <span>Spiller</span>
                <select name="playerId" required defaultValue="alf">
                  {publicPlayers().map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.shortName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Felles kode</span>
                <input name="passcode" type="password" autoComplete="current-password" placeholder="Privat kode" required />
              </label>
              <Notice message={rejected ? "Adgang nektet. Enten feil kode, eller så prøvde tabellen å beskytte seg." : undefined} tone="error" />
              <button className="btn-primary w-full" type="submit">
                Logg inn
              </button>
            </form>

            <p className="lead mt-6 text-sm">
              Bruk den private koden for gjengen. Lokal utviklingskode står i README, men produksjon bruker egen Vercel-kode.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
