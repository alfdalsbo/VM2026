import { pickDailyImage } from "@/lib/daily-images";

const osloDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Oslo",
  year: "numeric",
});

function osloDateKey(value: string | Date): string {
  const parts = osloDateFormatter.formatToParts(typeof value === "string" ? new Date(value) : value);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function DailyMatchImage({ focusDate }: { focusDate?: string }) {
  const today = focusDate ?? osloDateKey(new Date());
  const image = pickDailyImage(today);
  if (!image) return null;

  return (
    <figure className="daily-image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.caption} className="daily-image-photo" />
      <figcaption className="daily-image-caption">
        <span className="daily-image-caption-text">{image.caption}</span>
        {image.attribution ? (
          <span className="daily-image-credit">
            Foto: {image.source ? (
              <a href={image.source} target="_blank" rel="noreferrer noopener">{image.attribution}</a>
            ) : (
              image.attribution
            )}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
