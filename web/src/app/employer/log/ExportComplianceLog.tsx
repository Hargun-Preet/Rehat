"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Uses the browser's built-in PDF printer so the offline demo never needs a service. */
export function ExportComplianceLog() {
  return (
    <div data-print-hide>
      <Button type="button" variant="secondary" className="w-full" onClick={() => window.print()}>
        <Download className="h-4 w-4" /> Export PDF
      </Button>
      <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
        Choose “Save as PDF” in the print window.
      </p>
    </div>
  );
}
