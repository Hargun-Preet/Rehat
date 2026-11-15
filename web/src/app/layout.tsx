import type { Metadata } from "next";
import { Inter, Ubuntu } from "next/font/google";

import { AppShell } from "@/components/brand";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "600"] });
const ubuntu = Ubuntu({ variable: "--font-ubuntu", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Rehat by Income (concept prototype)",
  description: "Weather downtime cover for small firms with outdoor crews. Concept prototype, fictional data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${ubuntu.variable}`}>
        <TooltipProvider delayDuration={150}>
          <AppShell>{children}</AppShell>
        </TooltipProvider>
      </body>
    </html>
  );
}
