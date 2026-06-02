"use client";

import { Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type ImageContextToggleProps = {
  title: string;
  caption: string;
  context: string;
  facts?: string[];
  credit?: string;
  license?: string;
  sourceUrl?: string;
  className?: string;
  defaultOpen?: boolean;
};

export function ImageContextToggle({
  title,
  caption,
  context,
  facts = [],
  credit,
  license,
  sourceUrl,
  className,
  defaultOpen = false,
}: ImageContextToggleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const titleId = useId();
  const panelId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const classes = ["image-context-toggle", className].filter(Boolean).join(" ");
  const creditLine = [credit, license].filter(Boolean).join(" · ");

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className={classes} data-open={open ? "true" : undefined} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className="image-context-trigger"
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={`Vis bildekontekst for ${title}`}
        onClick={() => setOpen((current) => !current)}
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="image-context-backdrop"
            aria-label="Lukk bildekontekst"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <section id={panelId} className="image-context-card" role="dialog" aria-modal="false" aria-labelledby={titleId}>
            <div className="image-context-card-header">
              <strong id={titleId}>{title}</strong>
              <button
                type="button"
                className="image-context-close"
                aria-label="Lukk bildekontekst"
                onClick={() => setOpen(false)}
                ref={closeButtonRef}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <span className="image-context-label">Hva ser vi?</span>
            <p>{caption}</p>
            <span className="image-context-label">Hvorfor betyr det noe?</span>
            <p>{context}</p>
            {facts.length ? (
              <>
                <span className="image-context-label">Nerdekrok</span>
                <ul>
                  {facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {creditLine ? <span>{creditLine}</span> : null}
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                Kilde
              </a>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
