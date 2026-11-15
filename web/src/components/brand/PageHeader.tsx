import { Ellipsis } from "./Ellipsis";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-6 pt-10">
      {eyebrow ? (
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-income-orange-700">
          <Ellipsis size="sm" /> {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
      {children ? <div className="mt-3 max-w-3xl text-base text-muted-foreground">{children}</div> : null}
    </div>
  );
}

export function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-6xl px-6 py-4 ${className}`}>{children}</section>;
}
