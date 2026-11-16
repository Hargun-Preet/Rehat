import type { LucideIcon } from "lucide-react";

import { Ellipsis } from "./Ellipsis";
import { IconTile } from "./IconTile";

export function PageHeader({ eyebrow, title, children, icon: Icon }: { eyebrow?: string; title: string; children?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-7 pt-10 sm:pt-12">
      {Icon ? <IconTile icon={Icon} size="lg" className="mb-5" /> : null}
      {eyebrow ? (
        <p className="eyebrow mb-3 flex items-center gap-2">
          <Ellipsis size="sm" /> {eyebrow}
        </p>
      ) : null}
      <h1 className="max-w-4xl text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
      {children ? <div className="mt-3 max-w-3xl text-[1.0625rem] leading-relaxed text-muted-foreground">{children}</div> : null}
    </div>
  );
}

export function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-6xl px-6 py-4 ${className}`}>{children}</section>;
}
