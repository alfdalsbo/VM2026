"use client";

import { Shuffle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { DailyImageAsset } from "@/lib/daily-images";
import { ImageContextToggle } from "@/components/image-context-toggle";
import {
  chooseFreshWorldCupImage,
  parseSeenImages,
  rememberSeenWorldCupImage,
  SEEN_IMAGES_STORAGE_KEY,
} from "@/lib/world-cup-image-freshness";

const SWIPE_THRESHOLD = 40;

export function DailyImageViewer({
  images,
  initialAsset,
  seed = "daily-image",
  surfaceKey = "daily-home",
  shuffleAriaLabel = "Vis nytt arkivfunn",
  shuffleLabel = "Nytt arkivfunn",
}: {
  images: DailyImageAsset[];
  initialAsset: DailyImageAsset;
  seed?: string;
  surfaceKey?: string;
  shuffleAriaLabel?: string;
  shuffleLabel?: string;
}) {
  const [asset, setAsset] = useState(initialAsset);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAsset((current) => chooseAndRemember(current.id, `${seed}-mount`));
    }, 0);
    return () => window.clearTimeout(timeout);
    // Only run when the server-provided image pool changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, seed, surfaceKey]);

  function readSeen() {
    return parseSeenImages(window.localStorage.getItem(SEEN_IMAGES_STORAGE_KEY));
  }

  function writeSeen(nextAsset: DailyImageAsset, seen = readSeen()) {
    const nextSeen = rememberSeenWorldCupImage(seen, nextAsset.id, surfaceKey);
    window.localStorage.setItem(SEEN_IMAGES_STORAGE_KEY, JSON.stringify(nextSeen));
  }

  function chooseAndRemember(currentId: string | undefined, nextSeed: string) {
    const seen = readSeen();
    const next = chooseFreshWorldCupImage({ pool: images, currentId, seen, surfaceKey, seed: nextSeed });
    writeSeen(next, seen);
    return next;
  }

  function showRandom() {
    if (images.length <= 1) return;
    const next = chooseAndRemember(asset.id, `${seed}-${Date.now()}-${Math.random()}`);
    setAsset(next);
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
  const objectPosition = asset.focus === "top" ? "center top" : asset.focus === "bottom" ? "center bottom" : "center";

  return (
    <figure
      className="daily-image"
      onTouchStart={interactive ? handleTouchStart : undefined}
      onTouchEnd={interactive ? handleTouchEnd : undefined}
      onClick={interactive ? showRandom : undefined}
      data-interactive={interactive ? "true" : undefined}
      data-display-mode={asset.displayMode}
      data-orientation={asset.orientation}
    >
      <div className="daily-image-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.src}
          alt={asset.alt}
          className="daily-image-photo"
          draggable={false}
          style={{ objectPosition }}
        />
      </div>
      {interactive ? (
        <button
          type="button"
          className="daily-image-shuffle"
          onClick={(event) => {
            event.stopPropagation();
            showRandom();
          }}
          aria-label={shuffleAriaLabel}
        >
          <Shuffle className="h-4 w-4" aria-hidden="true" />
          <span>{shuffleLabel}</span>
        </button>
      ) : null}
      <ImageContextToggle
        className="daily-image-context"
        title={asset.title}
        caption={asset.caption}
        context={asset.context}
        facts={asset.facts}
        credit={asset.credit}
        license={asset.license}
        sourceUrl={asset.sourceUrl}
      />
    </figure>
  );
}
