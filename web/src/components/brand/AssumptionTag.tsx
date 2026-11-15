import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Marks a number that is an assumption. The tooltip gives the basis. */
export function AssumptionTag({ basis, label = "assumption" }: { basis: string; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-dashed border-state-pending/60 bg-state-pending-bg px-2 py-0.5 align-middle text-[11px] font-medium text-state-pending"
          aria-label={`Assumption: ${basis}`}
        >
          <Info className="h-3 w-3" aria-hidden />
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">Assumption: {basis}</TooltipContent>
    </Tooltip>
  );
}
