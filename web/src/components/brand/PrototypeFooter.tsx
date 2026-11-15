import { Ellipsis } from "./Ellipsis";

export const FOOTER_TEXT =
  "Concept prototype for Income Insurance, Singapore-India Hackathon 2026. Not an Income product. Fictional data.";

export function PrototypeFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{FOOTER_TEXT}</p>
        <p className="flex items-center gap-2">
          <Ellipsis size="sm" />
          <span>Underwritten by Income Insurance Limited (proposed)</span>
        </p>
      </div>
    </footer>
  );
}
