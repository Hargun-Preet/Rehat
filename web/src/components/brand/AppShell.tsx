"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { Ellipsis } from "./Ellipsis";
import { NAV } from "./nav";
import { PrototypeFooter } from "./PrototypeFooter";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[1000] border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Income Business (concept), home">
            <span className="whitespace-nowrap font-heading text-lg font-bold text-ink">
              Income <span className="text-income-orange-700">Business</span>
            </span>
            <span className="rounded-full bg-income-orange-100 px-2 py-0.5 text-[11px] font-medium text-income-orange-700">concept</span>
            <Ellipsis size="sm" className="ml-1 hidden sm:inline-flex" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-0.5 xl:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-income-orange-100 hover:text-ink",
                  isActive(n.href) && "bg-income-orange-100 font-medium text-ink",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            className="rounded-md p-2 xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open ? (
          <nav aria-label="Main mobile" className="grid grid-cols-2 gap-1 border-t border-line px-6 py-3 xl:hidden">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-income-orange-100">
                {n.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      <main className="flex-1">{children}</main>
      <PrototypeFooter />
    </div>
  );
}
