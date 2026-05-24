"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

export function ShareButton({ path, text, title }: { path: string; text: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  return (
    <button className="btn-primary" type="button" onClick={share}>
      <Share2 className="h-4 w-4" aria-hidden="true" />
      {copied ? "Kopiert" : "Del tippekort"}
    </button>
  );
}
