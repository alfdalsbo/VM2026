"use client";

import { Shuffle } from "lucide-react";
import { useRef, useState } from "react";

const SWIPE_THRESHOLD = 40;

export function ManualDailyImageViewer({ images, initialSrc }: { images: string[]; initialSrc: string }) {
  const [src, setSrc] = useState(initialSrc);
  const startX = useRef<number | null>(null);

  function showRandom() {
    if (images.length <= 1) return;
    let next = src;
    while (next === src) {
      next = images[Math.floor(Math.random() * images.length)];
    }
    setSrc(next);
  }

  function handleTouchStart(event: React.TouchEvent) {
    startX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (startX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? startX.current;
    if (Math.abs(endX - startX.current) > SWIPE_THRESHOLD) {
      showRandom();
    }
    startX.current = null;
  }

  const interactive = images.length > 1;

  return (
    <figure
      className="manual-daily-image"
      onTouchStart={interactive ? handleTouchStart : undefined}
      onTouchEnd={interactive ? handleTouchEnd : undefined}
      onClick={interactive ? showRandom : undefined}
      data-interactive={interactive ? "true" : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="manual-daily-image-photo" draggable={false} />
      {interactive ? (
        <button
          type="button"
          className="daily-image-shuffle manual-daily-image-shuffle"
          onClick={(event) => {
            event.stopPropagation();
            showRandom();
          }}
          aria-label="Bytt til et tilfeldig bilde"
        >
          <Shuffle className="h-4 w-4" aria-hidden="true" />
          <span>Shuffle</span>
        </button>
      ) : null}
    </figure>
  );
}
