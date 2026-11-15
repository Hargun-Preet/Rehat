import { Ellipsis } from "@/components/brand";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-24 text-muted-foreground">
      <Ellipsis variant="loader" size="lg" label="Loading" /> Loading
    </div>
  );
}
