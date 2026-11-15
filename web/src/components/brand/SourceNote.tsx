import { Database } from "lucide-react";

import { cn } from "@/lib/utils";

/** Small source line under a number or chart. */
export function SourceNote({ children, href, className }: { children: React.ReactNode; href?: string; className?: string }) {
  return (
    <p className={cn("mt-2 flex items-start gap-1.5 text-xs text-muted-foreground", className)}>
      <Database className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      <span>
        Source: {children}
        {href ? (
          <>
            {" "}
            <a href={href} className="underline underline-offset-2 hover:text-income-blue-600" target="_blank" rel="noreferrer">
              link
            </a>
          </>
        ) : null}
      </span>
    </p>
  );
}
