import { clubIdentity, type TeamColors } from "@/lib/clubTheme.ts";
import { Jersey } from "./Jersey.tsx";

export function ClubBadge({ team, size = 44 }: { team: TeamColors; size?: number }) {
  return <Jersey club={clubIdentity(team)} size={size} />;
}
