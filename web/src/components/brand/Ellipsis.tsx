import { cn } from "@/lib/utils";

type Props = {
  /** "loader" animates the dots; "divider" is a static accent. */
  variant?: "loader" | "divider";
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

const dotSize = { sm: "h-1.5 w-1.5", md: "h-2.5 w-2.5", lg: "h-3.5 w-3.5" };

/** Three orange dots: Income's "For every story" ellipsis. Used as loader, divider and "on its way" state. */
export function Ellipsis({ variant = "divider", size = "md", label, className }: Props) {
  const loading = variant === "loader";
  return (
    <span
      role={loading ? "status" : undefined}
      aria-label={label ?? (loading ? "Loading" : undefined)}
      aria-hidden={!loading && !label ? true : undefined}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("rounded-full bg-income-orange", dotSize[size])}
          style={loading ? { animation: `rehat-dot 1.2s ${i * 0.16}s infinite ease-in-out` } : undefined}
        />
      ))}
      {label && variant === "divider" ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export function EllipsisDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <Ellipsis size="sm" />
    </div>
  );
}
