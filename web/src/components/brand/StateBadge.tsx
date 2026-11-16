import { CheckCircle2, CircleDashed, CircleMinus, Flame, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type HourState = "TRIGGERED" | "NOT_TRIGGERED" | "PENDING" | "APPROVED" | "REVIEW";

const styles: Record<HourState, { label: string; cls: string; Icon: typeof Flame }> = {
  TRIGGERED: { label: "Triggered", cls: "bg-state-triggered-bg text-state-triggered border-state-triggered/40", Icon: Flame },
  NOT_TRIGGERED: { label: "Not triggered", cls: "bg-state-not-bg text-state-not border-state-not/30", Icon: CircleMinus },
  PENDING: { label: "Pending data", cls: "bg-state-pending-bg text-state-pending border-state-pending/60 border-dashed", Icon: CircleDashed },
  APPROVED: { label: "Approved", cls: "bg-state-ok-bg text-state-ok border-state-ok/40", Icon: CheckCircle2 },
  REVIEW: { label: "Sent for review", cls: "bg-state-review-bg text-state-review border-state-review/40", Icon: Search },
};

/** State badge: label, colour and icon together. Never colour alone. */
export function StateBadge({ state, className, compact, label }: { state: HourState; className?: string; compact?: boolean; label?: string }) {
  const s = styles[state];
  const displayLabel = label ?? s.label;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        s.cls,
        className,
      )}
    >
      <s.Icon className="h-3.5 w-3.5" aria-hidden />
      {compact ? <span className="sr-only">{displayLabel}</span> : displayLabel}
    </span>
  );
}
