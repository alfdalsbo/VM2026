import { DailyImageViewer } from "@/components/daily-image-viewer";
import { getDailyImages, pickRandomDailyImage } from "@/lib/daily-images";

export function DailyMatchImage() {
  const images = getDailyImages();
  if (images.length === 0) return null;
  const initialSrc = pickRandomDailyImage() ?? images[0];

  return <DailyImageViewer images={images} initialSrc={initialSrc} />;
}
