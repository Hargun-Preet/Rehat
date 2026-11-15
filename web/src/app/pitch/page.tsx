import { loadJSON } from "@/lib/data";
import { dayName, pct, sgd } from "@/lib/format";
import type { Backtest, Pricing } from "@/lib/types";

import Pitch, { type Step } from "./Pitch";

type Lq = { current: { settlement_date: string; p50: number; p90: number; p99: number }; validation: { overall_p90_coverage: number } };

export default async function PitchPage() {
  const [pr, bt, lq] = await Promise.all([loadJSON<Pricing>("pricing.json"), loadJSON<Backtest>("backtest.json"), loadJSON<Lq>("liquidity.json")]);
  const std = pr.plans.find((p) => p.plan === "Standard")!;
  const b = bt.base;
  const steps: Step[] = [
    {
      at: "0:00", title: "The problem", href: "/",
      points: [
        "One 20-worker landscaping firm, a hot wet May, payroll due.",
        "The law already made this loss: rest at WBGT 32 is paid time, and work permit holders are paid on idle days.",
        "No insurance covers weather downtime without damage.",
      ],
      kpi: { v: "S$510", l: "worked month: 3.19 h x S$8 x 20 workers" },
    },
    {
      at: "0:45", title: "Why us", href: "/income",
      points: ["The payer, the channel and the trigger already exist.", "Every small firm with manual workers must buy WIC. Income sells it.", "Rehat is a tick box at WIC renewal."],
      kpi: { v: sgd(pr.market.income_wic_slice / 1e6, 1) + "M", l: "premium in Income's WIC slice (12% share, assumption)" },
    },
    {
      at: "1:15", title: "Onboarding in 60 seconds", href: "/onboard",
      points: ["UEN, then headcount from WIC, then the named station on a map.", "Plan with GST and launch credit.", "The honest sentence, a teach-back question, PDPA consent."],
      kpi: { v: sgd(std.week, 2), l: "a worker a week, Standard, before GST" },
    },
    {
      at: "2:00", title: "Replay 31 October 2025", href: "/replay?autoplay=1",
      points: ["Real NEA readings at 15 stations, every 15 minutes.", "Rest minutes fill up station by station.", "One record day joins the month; the receipt shows what counts."],
      kpi: { v: "35.0 C", l: "Sentosa at 12:15, inside the meal hour" },
    },
    {
      at: "2:45", title: "Site Match", href: "/employer/site-match?log=01_honest_contractor_log.csv", alt: { label: "Show a faked log", href: "/employer/site-match?log=08_threshold_bunched.csv" },
      points: ["A firm on a hotter site uploads the contractor's heat log.", "Honest log: approved top-up. Faked log: sent to a person, with reasons.", "AI never rejects a claim."],
      kpi: { v: "10 h", l: "Site Match cap a worker a year" },
    },
    {
      at: "3:20", title: "Insurer console", href: "/insurer",
      points: [`Cash needed on ${dayName(lq.current.settlement_date)}: P50 ${sgd(lq.current.p50)}, P90 ${sgd(lq.current.p90)}.`, "The band narrows as the month goes on.", `Stop-loss at ${pct(pr.reinsurance.chosen_attach)}, hard cap ${pct(pr.reinsurance.hard_cap_lr)}.`],
      kpi: { v: pct(lq.validation.overall_p90_coverage), l: "of past months came in at or under the P90 forecast" },
    },
    {
      at: "4:00", title: "Back-test and unit economics", href: "/backtest",
      points: [`${sgd(std.week, 2)} a worker a week. ${b.zero_payout_years_book} of ${b.years.length} years with no payout. ${b.pct_months_paying}% of months pay something.`, `1-in-10 loss ratio ${pct(pr.loss_ratios.one_in_ten)} at the current premium.`, "Honest limits: rebuild accuracy near the threshold, haze history, basis risk."],
      kpi: { v: `${b.expected_insured_h} h`, l: "expected insured hours a worker a year" },
    },
    {
      at: "4:30", title: "Roadmap and the ask", href: "/compliance",
      points: ["Riders via platform WIC. Hawkers via Stallholder Insurance.", "300-firm pilot from April 2027, Income retains the risk.", "Everything uses existing law."],
      kpi: { v: sgd(pr.pilot.premium), l: "pilot premium, 300 firms and 6,000 workers" },
    },
  ];
  return <Pitch steps={steps} />;
}
