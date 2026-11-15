"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const missingData = /ENOENT|public[/\\]data/.test(error.message);
  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-2xl font-bold">Something did not load</h1>
      <p className="mt-3 text-muted-foreground">
        {missingData
          ? "This page reads precomputed data that has not been exported yet. Run make export in the project folder, then reload."
          : "This page hit an error. Your data is safe. Try again, or go back to the overview."}
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.assign("/")}>
          Go to overview
        </Button>
      </div>
    </div>
  );
}
