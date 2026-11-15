import { cn } from "@/lib/utils";

export const GST_RATE = 0.09;

export function formatSGD(value: number, decimals = 2): string {
  return `S$${value.toLocaleString("en-SG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

type Props = {
  value: number;
  decimals?: number;
  /** Show the amount including 9% GST next to the before-GST amount. */
  withGst?: boolean;
  className?: string;
};

/** Money in Singapore dollars, tabular figures. With withGst, shows before and after 9% GST. */
export function Money({ value, decimals = 2, withGst, className }: Props) {
  if (!withGst) return <span className={cn("num", className)}>{formatSGD(value, decimals)}</span>;
  return (
    <span className={cn("num", className)}>
      {formatSGD(value, decimals)}
      <span className="ml-1 text-xs font-normal text-muted-foreground">
        before GST, {formatSGD(value * (1 + GST_RATE), decimals)} incl. 9% GST
      </span>
    </span>
  );
}
