import { Info } from "lucide-react";

import { Panel } from "@/components/ui";
import { WorldCupImageWall } from "@/components/world-cup-image-wall";
import type { NostalgiaArchive, NostalgiaMoment, TeamNostalgiaProfile } from "@/lib/world-cup-nostalgia";
import { getApprovedMomentImage } from "@/lib/world-cup-nostalgia";
import { getRelevantWorldCupImages, type WorldCupImageAsset } from "@/lib/world-cup-image-assets";

export function NostalgiaHero({ moment }: { moment: NostalgiaMoment }) {
  return (
    <Panel className="nostalgia-hero">
      <ArchivePoster moment={moment} size="large" />
      <div className="nostalgia-hero-copy">
        <p className="eyebrow">Dagens VM-øyeblikk</p>
        <h2>{moment.title}</h2>
        <p>{moment.body}</p>
        <strong>{moment.cellarVerdict}</strong>
        <a href={moment.source.url} target="_blank" rel="noreferrer">
          Kilde: {moment.source.name}
        </a>
      </div>
    </Panel>
  );
}

export function MatchNostalgiaNote({ moment }: { moment: NostalgiaMoment }) {
  return (
    <aside className="match-nostalgia-note" aria-label="Historisk ekko">
      <span>{moment.year}</span>
      <strong>{moment.title}</strong>
      <p>{moment.cellarVerdict}</p>
    </aside>
  );
}

export function MatchNostalgiaPanel({ moment }: { moment: NostalgiaMoment }) {
  return (
    <Panel className="nostalgia-match-panel">
      <ArchivePoster moment={moment} />
      <div>
        <p className="eyebrow">Historisk ekko</p>
        <h2 className="section-title mt-2">{moment.title}</h2>
        <p className="lead mt-3">{moment.body}</p>
        <p className="nostalgia-verdict">{moment.cellarVerdict}</p>
        <a className="nostalgia-source" href={moment.source.url} target="_blank" rel="noreferrer">
          {moment.source.name}
        </a>
      </div>
    </Panel>
  );
}

export function TeamNostalgiaPass({ profile }: { profile: TeamNostalgiaProfile }) {
  return (
    <Panel className="team-nostalgia-pass">
      <div>
        <p className="eyebrow">VM-pass</p>
        <h2 className="section-title mt-2">{profile.bestWorldCup}</h2>
        <p className="lead mt-3">{profile.cellarAngle}</p>
      </div>
      <dl className="team-pass-grid">
        <div>
          <dt>Kulthelter</dt>
          <dd>{profile.cultHeroes.join(", ")}</dd>
        </div>
        <div>
          <dt>Arr</dt>
          <dd>{profile.scar}</dd>
        </div>
        <div>
          <dt>Signaturkamp</dt>
          <dd>{profile.signatureMatch}</dd>
        </div>
      </dl>
    </Panel>
  );
}

export function TeamImageShelf({ teamName }: { teamName: string }) {
  const images = getRelevantWorldCupImages({ surface: "team", teams: [teamName], tags: ["archive"] }, 3);
  if (!images.length) return null;

  return (
    <Panel className="team-image-shelf">
      <div>
        <p className="eyebrow">VM-bildehylle</p>
        <h2 className="section-title mt-2">Tre arkivfunn til passet</h2>
      </div>
      <div className="team-image-shelf-grid">
        {images.map((image) => (
          <ArchiveImageTile key={image.id} image={image} />
        ))}
      </div>
    </Panel>
  );
}

export function NostalgiaArchiveSection({ archive }: { archive: NostalgiaArchive }) {
  return (
    <section id="arkiv" className="space-y-4">
      <div>
        <p className="eyebrow">Kjellerarkivet</p>
        <h2 className="section-title">VM-historien på dommerbordet</h2>
      </div>

      <div className="nostalgia-archive-grid">
        <Panel className="nostalgia-timeline-panel">
          <h3 className="text-xl font-black">Tidslinje</h3>
          <div className="nostalgia-timeline">
            {archive.timeline.map((moment) => (
              <article key={moment.id}>
                <span>{moment.year}</span>
                <strong>{moment.title}</strong>
                <p>{moment.body}</p>
              </article>
            ))}
          </div>
        </Panel>

        <div className="nostalgia-side-stack">
          <Panel>
            <h3 className="text-xl font-black">Mesterveggen</h3>
            <div className="champion-wall mt-4">
              {archive.championWall.map((row) => (
                <div key={row.team}>
                  <strong>{row.titles}</strong>
                  <span>{row.team}</span>
                  <em>{row.note}</em>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="nostalgia-format-panel">
            <h3 className="text-xl font-black">2026-formatet</h3>
            <div className="format-fact-grid mt-4">
              {archive.formatFacts.map((fact) => (
                <div key={fact.label}>
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                  <p>{fact.detail}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="norway-archive-panel">
            <h3 className="text-xl font-black">Norge-mappen</h3>
            <ul>
              {archive.norwayNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel className="archive-image-wall-panel">
        <h3 className="text-xl font-black">Arkivbildeveggen</h3>
        <p className="lead mt-2">Filtrer etter tiår, lag og fakta. Dette er rommet der en kamp plutselig blir pensum.</p>
        <WorldCupImageWall images={archive.imageWall} />
      </Panel>
    </section>
  );
}

function ArchivePoster({ moment, size = "default" }: { moment: NostalgiaMoment; size?: "default" | "large" }) {
  const image = getApprovedMomentImage(moment);

  if (image) {
    return (
      <figure className={`archive-poster archive-poster-${size}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.alt} style={{ objectPosition: image.focus === "top" ? "center top" : image.focus === "bottom" ? "center bottom" : "center" }} />
        {image.credit ? <figcaption>{image.credit}</figcaption> : null}
        <ImageContextToggle
          title={image.title}
          caption={image.caption}
          context={image.context}
          facts={image.facts}
          credit={image.credit}
          license={image.license}
          sourceUrl={image.sourceUrl}
        />
      </figure>
    );
  }

  return (
    <div className={`archive-poster archive-poster-${size} archive-poster-fallback`} aria-label={`${moment.year}: ${moment.title}`}>
      <span>VM</span>
      <strong>{moment.year}</strong>
      <em>Arkivkort</em>
      <ImageContextToggle
        title={moment.title}
        caption={moment.body}
        context={moment.cellarVerdict}
        facts={[`Kilde: ${moment.source.name}`]}
        credit={moment.source.name}
        sourceUrl={moment.source.url}
      />
    </div>
  );
}

function ImageContextToggle({
  title,
  caption,
  context,
  facts,
  credit,
  license,
  sourceUrl,
}: {
  title: string;
  caption: string;
  context: string;
  facts?: string[];
  credit?: string;
  license?: string;
  sourceUrl?: string;
}) {
  return (
    <details className="image-context-toggle archive-image-context">
      <summary aria-label={`Vis bildekontekst for ${title}`}>
        <Info className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div className="image-context-card">
        <strong>{title}</strong>
        <span className="image-context-label">Hva ser vi?</span>
        <p>{caption}</p>
        <span className="image-context-label">Hvorfor betyr det noe?</span>
        <p>{context}</p>
        {facts?.length ? (
          <>
            <span className="image-context-label">Nerdekrok</span>
            <ul>
              {facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </>
        ) : null}
        {credit || license ? <span>{[credit, license].filter(Boolean).join(" · ")}</span> : null}
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            Kilde
          </a>
        ) : null}
      </div>
    </details>
  );
}

function ArchiveImageTile({ image }: { image: WorldCupImageAsset }) {
  return (
    <article className="archive-image-tile">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.alt} style={{ objectPosition: image.focus === "top" ? "center top" : "center" }} />
      <div>
        <span>{image.year}</span>
        <strong>{image.title}</strong>
        <p>{image.facts[0] ?? image.caption}</p>
      </div>
    </article>
  );
}
