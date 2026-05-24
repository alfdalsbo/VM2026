import { Bell, BellOff } from "lucide-react";

import { toggleFollowMatchAction } from "@/app/actions";

export function FollowMatchButton({
  matchId,
  following,
  next,
}: {
  matchId: string;
  following: boolean;
  next: string;
}) {
  const Icon = following ? BellOff : Bell;
  return (
    <form action={toggleFollowMatchAction}>
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="next" value={next} />
      <button className={following ? "btn-secondary follow-active" : "btn-secondary"} type="submit">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {following ? "Følger" : "Følg kamp"}
      </button>
    </form>
  );
}
