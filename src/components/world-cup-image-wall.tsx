"use client";

import { useMemo, useState } from "react";

import { ImageContextToggle } from "@/components/image-context-toggle";
import type { WorldCupImageAsset } from "@/lib/world-cup-image-assets";

export function WorldCupImageWall({ images }: { images: WorldCupImageAsset[] }) {
  const [decade, setDecade] = useState("all");
  const [team, setTeam] = useState("all");
  const [factsOnly, setFactsOnly] = useState(false);

  const decades = useMemo(() => unique(images.map((image) => `${image.year.slice(0, 3)}0`)).sort(), [images]);
  const teams = useMemo(() => unique(images.flatMap((image) => image.teams)).sort((a, b) => a.localeCompare(b, "nb")), [images]);
  const filtered = images
    .filter((image) => decade === "all" || image.year.startsWith(decade.slice(0, 3)))
    .filter((image) => team === "all" || image.teams.includes(team))
    .filter((image) => !factsOnly || image.facts.length > 0)
    .slice(0, 30);

  return (
    <div className="world-cup-image-wall">
      <div className="image-wall-controls">
        <label>
          <span>Tiår</span>
          <select value={decade} onChange={(event) => setDecade(event.target.value)}>
            <option value="all">Alle</option>
            {decades.map((value) => (
              <option key={value} value={value}>
                {value}-tallet
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Lag</span>
          <select value={team} onChange={(event) => setTeam(event.target.value)}>
            <option value="all">Alle</option>
            {teams.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="image-wall-checkbox">
          <input type="checkbox" checked={factsOnly} onChange={(event) => setFactsOnly(event.target.checked)} />
          <span>Nerde fakta</span>
        </label>
      </div>

      <div className="image-wall-grid">
        {filtered.map((image) => (
          <article key={image.id} className="image-wall-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt={image.alt} style={{ objectPosition: image.focus === "top" ? "center top" : "center" }} />
            <ImageContextToggle
              className="image-wall-context"
              title={image.title}
              caption={image.caption}
              context={image.context}
              facts={image.facts}
              credit={image.credit}
              license={image.license}
              sourceUrl={image.sourceUrl}
            />
            <div>
              <span>{image.year}</span>
              <strong>{image.title}</strong>
              <p>{image.facts[0] ?? image.caption}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
