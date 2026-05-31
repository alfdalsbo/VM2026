"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

import { cx } from "@/lib/format";

const DISMISS_AFTER_MS = 5000;

export function FlashToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const error = searchParams.get("error");
  const message = error ?? status;
  const tone: "info" | "error" = error ? "error" : "info";

  const clearFromUrl = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("status");
    next.delete("error");
    const query = next.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams]);

  if (!message) return null;

  return (
    <FlashToastBody
      key={`${tone}:${message}`}
      message={message}
      tone={tone}
      onDismissed={clearFromUrl}
    />
  );
}

function FlashToastBody({
  message,
  tone,
  onDismissed,
}: {
  message: string;
  tone: "info" | "error";
  onDismissed: () => void;
}) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setClosing(true), DISMISS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function handleAnimationEnd() {
    if (closing) onDismissed();
  }

  return (
    <div
      className={cx("flash-toast", `flash-toast-${tone}`, closing && "flash-toast-closing")}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      onAnimationEnd={handleAnimationEnd}
    >
      <span className="flash-toast-icon" aria-hidden="true">
        {tone === "error" ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
      </span>
      <span className="flash-toast-message">{message}</span>
      <button
        type="button"
        className="flash-toast-close"
        onClick={() => setClosing(true)}
        aria-label="Lukk varsel"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
