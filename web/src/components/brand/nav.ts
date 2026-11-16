import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ChartNoAxesCombined,
  FileCheck2,
  FlaskConical,
  LayoutDashboard,
  MapPinned,
  Presentation,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export type NavItem = { href: string; label: string; description?: string; Icon: LucideIcon; activePrefixes?: string[] };

/** The three audience doors stay simple. Supporting technical views live under Labs. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Story", description: "How Rehat works", Icon: LayoutDashboard, activePrefixes: ["/", "/replay"] },
  { href: "/employer", label: "Employer", description: "Account, cover and receipts", Icon: Building2, activePrefixes: ["/income", "/onboard", "/employer"] },
  { href: "/worker", label: "Worker", description: "Safety notices", Icon: UsersRound },
  { href: "/insurer", label: "Income", description: "Portfolio and pricing", Icon: ChartNoAxesCombined, activePrefixes: ["/insurer"] },
];

export const LABS_NAV: NavItem[] = [
  { href: "/labs", label: "Labs overview", description: "Technical detail and testing", Icon: FlaskConical },
  { href: "/employer/site-match", label: "Site Match pilot", description: "Optional on-site log review", Icon: FileCheck2 },
  { href: "/live", label: "Live map", description: "Station status", Icon: MapPinned },
  { href: "/backtest", label: "Back-test lab", description: "Stress the product", Icon: FlaskConical },
  { href: "/compliance", label: "Compliance", description: "Rules and controls", Icon: ShieldCheck },
  { href: "/pitch", label: "Walkthrough", description: "Guided product story", Icon: Presentation },
];
