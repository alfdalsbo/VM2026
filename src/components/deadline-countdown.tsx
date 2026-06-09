"use client";

import { useEffect, useState } from "react";

function formatRemaining(targetAt: string) {
  const remaining = Date.parse(targetAt) - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) return "Låst";

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}t ${minutes}m`;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function DeadlineCountdown({ targetAt }: { targetAt: string }) {
  const [label, setLabel] = useState("Fristen tikker");

  useEffect(() => {
    const update = () => setLabel(formatRemaining(targetAt));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [targetAt]);

  return <span aria-live="polite">{label}</span>;
}
