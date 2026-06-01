"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { saveAvatarAction } from "@/app/actions";
import { Avatar } from "@/components/avatar";
import type { AvatarDisplay } from "@/lib/avatars";
import { cx } from "@/lib/format";
import type { Player } from "@/lib/types";

const PREVIEW_SIZE = 180;

export function AvatarEditor({
  player,
  display,
  options,
  size = 72,
}: {
  player: Pick<Player, "shortName" | "avatar" | "color">;
  display: AvatarDisplay | null;
  options: string[];
  size?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<string | null>(fileFromSrc(display?.src ?? null));
  const [posX, setPosX] = useState(display?.posX ?? 50);
  const [posY, setPosY] = useState(display?.posY ?? 50);
  const [scale, setScale] = useState(display?.scale ?? 1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const previewSrc = file ? `/avatars/${encodeURIComponent(file)}` : null;

  function reset() {
    setFile(fileFromSrc(display?.src ?? null));
    setPosX(display?.posX ?? 50);
    setPosY(display?.posY ?? 50);
    setScale(display?.scale ?? 1);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function onPointerDown(event: React.PointerEvent) {
    if (!previewSrc) return;
    drag.current = { x: event.clientX, y: event.clientY };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current = { x: event.clientX, y: event.clientY };
    setPosX((value) => clamp(value - (dx / PREVIEW_SIZE) * 100));
    setPosY((value) => clamp(value - (dy / PREVIEW_SIZE) * 100));
  }

  function onPointerUp() {
    drag.current = null;
  }

  function save() {
    if (!file || pending) return;
    setError(null);
    startTransition(() => {
      void saveAvatarAction({ avatar: file, posX, posY, scale }).then((result) => {
        if (result.error) {
          setError(result.error);
          return;
        }
        setOpen(false);
        router.refresh();
      });
    });
  }

  return (
    <>
      <button type="button" className="avatar-edit-trigger" onClick={() => setOpen(true)} aria-label="Endre avatar">
        <Avatar player={player} display={display} size={size} />
        <span className="avatar-edit-hint">Endre</span>
      </button>

      {open ? (
        <div className="avatar-modal-backdrop" role="dialog" aria-modal="true" aria-label="Velg avatar">
          <div className="avatar-modal">
            <div className="avatar-modal-head">
              <h3>Velg og plasser avatar</h3>
              <button type="button" className="avatar-modal-close" onClick={close} aria-label="Lukk">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className="avatar-preview"
              style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt=""
                  draggable={false}
                  style={{ objectPosition: `${posX}% ${posY}%`, transform: `scale(${scale})` }}
                />
              ) : (
                <span className="avatar-preview-empty">Velg et bilde under</span>
              )}
            </div>

            {previewSrc ? <p className="avatar-preview-tip">Dra bildet for å plassere det. Bruk glidebryteren for å zoome.</p> : null}

            <label className="avatar-zoom">
              <span>Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
                disabled={!previewSrc}
              />
            </label>

            <div className="avatar-picker-grid">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cx("avatar-option", option === file && "avatar-option-active")}
                  onClick={() => {
                    setFile(option);
                    setPosX(50);
                    setPosY(50);
                    setScale(1);
                  }}
                  aria-pressed={option === file}
                  aria-label={`Velg ${option}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/avatars/${encodeURIComponent(option)}`} alt="" />
                  {option === file ? (
                    <span className="avatar-option-check" aria-hidden="true"><Check className="h-4 w-4" /></span>
                  ) : null}
                </button>
              ))}
            </div>

            {error ? <p className="avatar-picker-error">{error}</p> : null}

            <div className="avatar-modal-actions">
              <button type="button" className="btn-secondary" onClick={close}>Avbryt</button>
              <button type="button" className="btn-primary" onClick={save} disabled={!file || pending}>
                {pending ? "Lagrer..." : "Lagre avatar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function fileFromSrc(src: string | null): string | null {
  if (!src) return null;
  const raw = src.split("/").pop() ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
