"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { Ellipsis } from "./Ellipsis";
import { LABS_NAV, PRIMARY_NAV, type NavItem } from "./nav";
import { PrototypeFooter } from "./PrototypeFooter";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [labsOpen, setLabsOpen] = useState(false);
  const labsRef = useRef<HTMLDivElement>(null);
  const isActive = (item: NavItem) => {
    const prefixes = item.activePrefixes ?? [item.href];
    return prefixes.some((prefix) => (prefix === "/" ? path === "/" : path.startsWith(prefix)));
  };
  const labsActive = LABS_NAV.some(isActive);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (labsRef.current && !labsRef.current.contains(event.target as Node)) setLabsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLabsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[1000] border-b border-line bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Rehat, home">
            <span className="whitespace-nowrap font-heading text-lg font-bold text-ink">
              Re<span className="text-income-orange-700">hat</span>
            </span>
            <span className="hidden items-center gap-1 rounded-full border border-income-blue-100 bg-income-blue-50 px-2 py-0.5 text-[11px] font-semibold text-income-blue sm:inline-flex">
              <ShieldCheck className="h-3 w-3" aria-hidden /> Weather downtime cover
            </span>
            <Ellipsis size="sm" className="ml-1 hidden sm:inline-flex" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
            {PRIMARY_NAV.map((n) => {
              const Icon = n.Icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive(n) ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-income-orange-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange",
                    isActive(n) && "bg-income-orange-100 font-semibold text-ink",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {n.label}
                </Link>
              );
            })}
            <div ref={labsRef} className="relative">
              <div className={cn("inline-flex items-center rounded-full text-sm text-muted-foreground transition-colors hover:bg-income-orange-100 hover:text-ink", labsActive && "bg-income-orange-100 font-semibold text-ink")}>
                <Link href="/labs" onClick={() => setLabsOpen(false)} className="inline-flex items-center rounded-l-full px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange">
                  Labs
                </Link>
                <button
                  type="button"
                  aria-expanded={labsOpen}
                  aria-controls="labs-navigation"
                  aria-haspopup="menu"
                  aria-label="Open Labs menu"
                  onClick={() => setLabsOpen((current) => !current)}
                  className="inline-flex rounded-r-full py-1.5 pl-0.5 pr-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange"
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", labsOpen && "rotate-180")} />
                </button>
              </div>
              {labsOpen ? (
                <div id="labs-navigation" role="menu" className="absolute right-0 top-10 grid w-64 gap-1 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-raised)]">
                  {LABS_NAV.map((n) => {
                    const Icon = n.Icon;
                    return (
                      <Link key={n.href} href={n.href} role="menuitem" onClick={() => setLabsOpen(false)} className={cn("flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-income-orange-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange", isActive(n) && "bg-income-orange-100 font-medium text-ink")}>
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-paper text-income-blue"><Icon className="h-3.5 w-3.5" /></span>
                        <span>
                          <span className="block font-medium text-ink">{n.label}</span>
                          <span className="block text-xs text-muted-foreground">{n.description}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <Link href="/onboard" className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-income-orange-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-income-orange-700/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange focus-visible:ring-offset-2">
              Get a quote <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
          <button
            type="button"
            className="rounded-md p-2 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open ? (
          <nav aria-label="Main mobile" className="border-t border-line bg-surface px-6 py-4 lg:hidden">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose your view</p>
            <div className="grid gap-1">
              {PRIMARY_NAV.map((n) => {
                const Icon = n.Icon;
                return (
                  <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-income-orange-100", isActive(n) && "bg-income-orange-100 font-semibold text-ink")}>
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper text-income-blue"><Icon className="h-4 w-4" /></span>
                    <span>
                      <span className="block">{n.label}</span>
                      <span className="block text-xs font-normal text-muted-foreground">{n.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
            <Link href="/onboard" onClick={() => setOpen(false)} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-income-orange-700 px-3 py-2.5 text-center text-sm font-semibold text-white">
              See your WIC renewal quote <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="mt-4 border-t border-line-soft pt-3">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Labs</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {LABS_NAV.map((n) => {
                  const Icon = n.Icon;
                  return (
                    <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-income-orange-100", isActive(n) && "bg-income-orange-100 font-semibold text-ink")}>
                      <Icon className="h-4 w-4 text-income-blue" /> {n.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        ) : null}
      </header>
      <main className="flex-1">{children}</main>
      <PrototypeFooter />
    </div>
  );
}
