import { ManualDailyImageViewer } from "@/components/manual-daily-image-viewer";
import { getManualDailyImages, pickRandomManualDailyImage } from "@/lib/manual-daily-images";

export function DailyMatchImage() {
  const images = getManualDailyImages();
  if (images.length === 0) return null;
  const initialSrc = pickRandomManualDailyImage() ?? images[0];

  return <ManualDailyImageViewer images={images} initialSrc={initialSrc} />;
}
