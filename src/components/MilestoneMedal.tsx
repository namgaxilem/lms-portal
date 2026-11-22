import type { LucideIcon } from "lucide-react";
import { CheckCheck, Flame, Medal, Rocket, Trophy, Zap } from "lucide-react";
import { cn } from "@/components/ui";
import type { Milestone, MilestoneKey } from "@/lib/learning";

/** Icon and categorical colour per milestone (static class strings for Tailwind). */
const LOOK: Record<MilestoneKey, { icon: LucideIcon; done: string }> = {
  first: { icon: Rocket, done: "from-sky-300 to-sky-500 shadow-sky-500/30" },
  streak3: { icon: Flame, done: "from-orange-300 to-orange-500 shadow-orange-500/30" },
  ten: { icon: CheckCheck, done: "from-emerald-300 to-emerald-500 shadow-emerald-500/30" },
  streak7: { icon: Zap, done: "from-amber-300 to-amber-500 shadow-amber-500/30" },
  fifty: { icon: Medal, done: "from-violet-300 to-violet-500 shadow-violet-500/30" },
  courseDone: { icon: Trophy, done: "from-rose-300 to-rose-500 shadow-rose-500/30" },
};

const SIZES = {
  md: { box: "h-14 w-14", icon: 24 },
  lg: { box: "h-16 w-16", icon: 26 },
};

/** Progress towards a milestone: "85%" for the best course, "3/10" otherwise. */
export function milestoneAmount(m: Milestone) {
  return m.key === "courseDone" ? `${m.value}%` : `${m.value}/${m.target}`;
}

/**
 * Round medal of a portal milestone (computeMilestones, not a Moodle badge):
 * coloured when reached, muted otherwise. Decorative: callers name the
 * milestone and its state in text. `onTint` = drawn on a surface-2 tile.
 */
export function MilestoneMedal({
  milestone,
  size = "md",
  onTint = false,
}: {
  milestone: Milestone;
  size?: keyof typeof SIZES;
  onTint?: boolean;
}) {
  const { icon: Icon, done } = LOOK[milestone.key];
  const { box, icon } = SIZES[size];
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        box,
        milestone.done
          ? cn("bg-linear-to-br text-white shadow-lg", done)
          : cn("text-subtle", onTint ? "bg-surface-3" : "bg-surface-2")
      )}
    >
      <Icon size={icon} strokeWidth={2} />
    </span>
  );
}
