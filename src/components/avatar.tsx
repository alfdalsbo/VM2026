import type { AvatarDisplay } from "@/lib/avatars";
import { cx } from "@/lib/format";
import type { Player } from "@/lib/types";

export function Avatar({
  player,
  display,
  size = 40,
  className,
}: {
  player: Pick<Player, "shortName" | "avatar" | "color">;
  display?: AvatarDisplay | null;
  size?: number;
  className?: string;
}) {
  const dimension = `${size}px`;

  if (display) {
    return (
      <span
        className={cx("avatar avatar-img", className)}
        style={{ width: dimension, height: dimension }}
        role="img"
        aria-label={player.shortName}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={display.src}
          alt=""
          style={{
            objectPosition: `${display.posX}% ${display.posY}%`,
            transform: `scale(${display.scale})`,
          }}
        />
      </span>
    );
  }

  return (
    <span
      className={cx("avatar avatar-fallback", className)}
      style={{ width: dimension, height: dimension, backgroundColor: player.color }}
      aria-hidden="true"
    >
      {player.avatar}
    </span>
  );
}
