import Link from "next/link";
import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/actions";
import { WorldCupTrophyIcon } from "@/components/icons/world-cup-trophy-icon";
import type { Player } from "@/lib/types";

const nav = [
  { href: "/", label: "Hjem" },
  { href: "/kamper", label: "Kamper" },
  { href: "/tabell", label: "Tabell" },
  { href: "/live", label: "Bonustabell" },
  { href: "/vm", label: "VM26" },
  { href: "/nerding", label: "Nerding" },
  { href: "/profil", label: "Profil" },
];

export function AppShell({ children }: { children: React.ReactNode; player: Player }) {
  return (
    <div className="min-h-screen text-[#17130f]">
      <header className="shirt-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center">
              <WorldCupTrophyIcon className="h-10 w-10" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-black uppercase tracking-[0.08em]">Tippekjelleren</span>
              <span className="block text-xs font-semibold text-[#72533a]">VM 2026</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <form action={logoutAction}>
              <button className="icon-link" type="submit" aria-label="Logg ut">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="nav-pill">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
