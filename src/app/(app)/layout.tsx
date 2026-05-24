import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const player = await requireSession();
  return <AppShell player={player}>{children}</AppShell>;
}
