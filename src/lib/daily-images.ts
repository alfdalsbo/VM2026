export type DailyImage = {
  /**
   * Path under /public, e.g. "/daily-images/maradona.jpg".
   */
  src: string;
  /**
   * Short caption shown over the image.
   */
  caption: string;
  /**
   * Photo credit line. Required for Wikimedia Commons / CC photos.
   */
  attribution?: string;
  /**
   * Optional URL to the source / license terms.
   */
  source?: string;
};

/**
 * Curated bank of images used as the "dagens bilde" banner on the dashboard.
 * - Add free-licensed images here with proper attribution.
 * - Multiple entries per team are fine; the rotator picks deterministically by date.
 */
export const dailyImages: DailyImage[] = [
  {
    src: "/daily-images/argentina-maradona.jpg",
    caption: "Diego Maradona under VM 2006 i Leipzig.",
    attribution: "Armando Tovar (CC BY 2.0)",
    source: "https://commons.wikimedia.org/wiki/File:Diego_Maradona.jpg",
  },
  {
    src: "/daily-images/brasil-pele.jpg",
    caption: "Pelé i Brasil-drakten — El Gráfico, 1970.",
    attribution: "El Gráfico (public domain)",
    source: "https://commons.wikimedia.org/wiki/File:Pele_con_brasil_(cropped).jpg",
  },
  {
    src: "/daily-images/nederland-cruyff.jpg",
    caption: "Johan Cruyff på Schiphol, november 1973.",
    attribution: "Rob Mieremet / Anefo (CC0)",
    source: "https://commons.wikimedia.org/wiki/File:Johan_Cruyff_met_dochter_Chantal_op_de_arm,_Bestanddeelnr_926-8208.jpg",
  },
  {
    src: "/daily-images/tyskland-beckenbauer.jpg",
    caption: "Franz Beckenbauer — Der Kaiser, 2006.",
    attribution: "Florian K (CC BY-SA 3.0)",
    source: "https://commons.wikimedia.org/wiki/File:Franz_Beckenbauer.JPG",
  },
  {
    src: "/daily-images/frankrike-zidane.jpg",
    caption: "Zinedine Zidane, VM-finalen 2006 i Berlin.",
    attribution: "David Ruddell (CC BY 2.0)",
    source: "https://commons.wikimedia.org/wiki/File:Zinedine_zidane_wcf_2006-edit.jpg",
  },
  {
    src: "/daily-images/fallback.svg",
    caption: "VM 2026 — vi varmer opp.",
  },
];

/**
 * Deterministic rotation across the full image bank — same date always picks
 * the same image, so alle ser samme bilde samme dag.
 */
export function pickDailyImage(today: string): DailyImage | null {
  if (dailyImages.length === 0) return null;
  const seed = hashString(today);
  return dailyImages[seed % dailyImages.length];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
