import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { FlashToast } from "@/components/flash-toast";
import { requireSession } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const player = await requireSession();
  return (
    <AppShell player={player}>
      {children}
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </AppShell>
  );
}
