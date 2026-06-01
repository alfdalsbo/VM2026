import { Panel } from "@/components/ui";
import type { NostalgiaArchive, NostalgiaMoment, TeamNostalgiaProfile } from "@/lib/world-cup-nostalgia";
import { getApprovedMomentImage } from "@/lib/world-cup-nostalgia";

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
    </section>
  );
}

function ArchivePoster({ moment, size = "default" }: { moment: NostalgiaMoment; size?: "default" | "large" }) {
  const image = getApprovedMomentImage(moment);

  if (image) {
    return (
      <figure className={`archive-poster archive-poster-${size}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.alt} />
        {image.credit ? <figcaption>{image.credit}</figcaption> : null}
      </figure>
    );
  }

  return (
    <div className={`archive-poster archive-poster-${size} archive-poster-fallback`} aria-label={`${moment.year}: ${moment.title}`}>
      <span>VM</span>
      <strong>{moment.year}</strong>
      <em>Arkivkort</em>
    </div>
  );
}
