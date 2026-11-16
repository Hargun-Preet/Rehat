import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "orange" | "blue" | "green" | "amber" | "slate";
type Size = "sm" | "md" | "lg";

const tones: Record<Tone, string> = {
  orange: "bg-income-orange-100 text-income-orange-700",
  blue: "bg-income-blue-100 text-income-blue",
  green: "bg-state-ok-bg text-state-ok",
  amber: "bg-state-pending-bg text-state-pending",
  slate: "bg-paper text-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
  md: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
  lg: "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6",
};

/** A consistent visual anchor for a workflow, status or product capability. */
export function IconTile({ icon: Icon, tone = "orange", size = "md", className }: { icon: LucideIcon; tone?: Tone; size?: Size; className?: string }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-xl", tones[tone], sizes[size], className)}>
      <Icon strokeWidth={1.9} />
    </span>
  );
}
