import type { Metadata } from "next";
import { Inter, Ubuntu } from "next/font/google";

import { AppShell } from "@/components/brand";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const ubuntu = Ubuntu({ variable: "--font-ubuntu", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Rehat | Weather downtime cover",
  description: "Weather downtime cover for small firms with outdoor crews.",
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
