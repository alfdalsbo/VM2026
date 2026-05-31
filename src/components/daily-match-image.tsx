import { DailyImageViewer } from "@/components/daily-image-viewer";
import { getDailyImages, pickDailyImage } from "@/lib/daily-images";

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
  const images = getDailyImages();
  if (images.length === 0) return null;
  const initialSrc = pickDailyImage(today) ?? images[0];

  return <DailyImageViewer images={images} initialSrc={initialSrc} />;
}
