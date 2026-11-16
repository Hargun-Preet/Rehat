import Link from "next/link";

import { Ellipsis } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <Ellipsis />
      <h1 className="mt-4 text-2xl font-bold">We couldn&apos;t find this page</h1>
      <p className="mt-3 text-muted-foreground">
        Try the{" "}
        <Link href="/" className="text-income-blue-600 underline">
          Rehat overview
        </Link>{" "}
        or the{" "}
        <Link href="/pitch" className="text-income-blue-600 underline">
          guided walkthrough
        </Link>
        .
      </p>
    </div>
  );
}
