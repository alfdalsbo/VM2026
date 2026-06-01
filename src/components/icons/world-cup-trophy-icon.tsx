import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

export function WorldCupTrophyIcon({ className, ...props }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/vmtrofe.png"
      alt=""
      className={className}
      style={{ objectFit: "contain", ...props.style }}
      {...props}
    />
  );
}
