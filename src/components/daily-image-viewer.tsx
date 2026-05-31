"use client";

import { useRef, useState } from "react";

const SWIPE_THRESHOLD = 40;

export function DailyImageViewer({
  images,
  initialSrc,
}: {
  images: string[];
  initialSrc: string;
}) {
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
      className="daily-image"
      onTouchStart={interactive ? handleTouchStart : undefined}
      onTouchEnd={interactive ? handleTouchEnd : undefined}
      onClick={interactive ? showRandom : undefined}
      data-interactive={interactive ? "true" : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="daily-image-photo" draggable={false} />
    </figure>
  );
}
