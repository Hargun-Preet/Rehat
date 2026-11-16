import { sgd } from "@/lib/format";
import { productPlan, type ProductSpec } from "@/lib/product";
import { loadProduct } from "@/lib/product.server";

import Pitch, { type Step } from "./Pitch";

const whole = (value: number) => new Intl.NumberFormat("en-SG", { maximumFractionDigits: 0 }).format(value);
const compactMoney = (value: number) => `S$${new Intl.NumberFormat("en-SG", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
const point = (text: string, source?: NonNullable<Step["kpi"]["source"]>) => source ? { text, source } : { text };

function fact(product: ProductSpec, id: string) {
  const found = product.facts.find((item) => item.id === id);
  if (!found) throw new Error(`Missing product fact: ${id}`);
  return found.text;
}

export default async function PitchPage() {
  const product = await loadProduct();
  const standard = productPlan(product);
  const mandatoryHeatTier = product.triggers.heat.tiers.find((tier) => tier.label.includes("mandatory"));
  const deductible = product.levers.find((lever) => lever.term === "Deductible");
  if (!mandatoryHeatTier || !deductible) throw new Error("Product terms needed for pitch mode are missing.");

  const planPrices = product.plans.map((plan) => sgd(plan.per_worker_week, 2)).join(" to ");
  const premiumSplit = product.premium_split.map((part) => whole(part.share * 100)).join(" / ");
  const demoReceipt = product.demo_clock.may_receipt;
  const demoReceiptMonth = new Intl.DateTimeFormat("en-SG", { month: "long", year: "numeric" }).format(new Date(`${demoReceipt.month}-01T00:00:00`));
  const demoPaymentDate = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "long" }).format(new Date(`${demoReceipt.payment_date}T00:00:00`));
  const steps: Step[] = [
    {
      at: "0:00", title: "The hook", href: "/",
      points: [
        point(product.copy.hook, "published"),
        point(product.copy.tagline),
        point("Rehat protects weather downtime before payroll, without a claim form."),
      ],
      kpi: { v: sgd(product.product.benefit_per_worker_hour), l: "per outdoor worker for each insured hour", source: "plan" },
    },
    {
      at: "0:25", title: "Mr Tan's problem", href: "/employer",
      points: [
        point(`${product.demo_firm.owner_display} runs ${product.demo_firm.name}, a ${product.demo_firm.trade} firm with ${whole(product.demo_firm.outdoor_workers)} outdoor workers.`, "plan"),
        point(`A firm like his carries about ${sgd(product.unit_economics_standard_per_worker.firm_loss_normal_year_20_workers.value)} of weather downtime in a normal year.`, "simulation"),
        point("The hard months create a payroll cost without physical damage."),
      ],
      kpi: { v: sgd(product.unit_economics_standard_per_worker.firm_loss_normal_year_20_workers.value), l: "weather downtime in a normal year", source: "simulation" },
    },
    {
      at: "0:55", title: "The rule and reality", href: "/worker",
      points: [
        point(product.copy.rule_statement, "published"),
        point(fact(product, "mom_action"), "published"),
        point(fact(product, "rain_share"), "simulation"),
      ],
      kpi: { v: `${whole(mandatoryHeatTier.rest_minutes)} min`, l: `rest each hour at a heat reading of ${whole(mandatoryHeatTier.from)}`, source: "published" },
    },
    {
      at: "1:25", title: "The opportunity", href: "/insurer",
      points: [
        point(`${compactMoney(product.market.all_crews.premium)} of premium if all outdoor crews were covered.`, "published"),
        point(`${compactMoney(product.market.small_firms.premium)} across about ${whole(product.market.small_firms.employers)} small employers.`, "assumption"),
        point(`Start at renewal with ${whole(product.market.reachable_first.employers)} reachable employers.`, "assumption"),
      ],
      kpi: { v: compactMoney(product.market.all_crews.premium), l: "annual premium across all outdoor crews", source: "published" },
    },
    {
      at: "1:50", title: "How Rehat works", href: "/employer", alt: { label: "Replay the record day (questions)", href: "/replay?autoplay=1" },
      points: [
        point(product.copy.one_line, "plan"),
        point(`${demoReceiptMonth}: ${demoReceipt.rain_hours} hours of rain against a ${demoReceipt.deductible_hours}-hour deductible, then ${sgd(demoReceipt.payment)} paid by ${demoPaymentDate}.`, demoReceipt.source),
        point("Every hour, Rehat reads independent NEA heat, rain and haze data at the named station."),
        point("It counts downtime above the normal month, then pays before payroll. Alerts and the compliance log come with every policy."),
      ],
      kpi: { v: sgd(demoReceipt.payment), l: `${demoReceiptMonth} payment for the demo firm`, source: demoReceipt.source },
    },
    {
      at: "2:25", title: "A normal month stays with the firm", href: "/employer/receipt",
      points: [
        point(product.copy.human_line),
        point(deductible.plain, "plan"),
        point(`The benefit is ${sgd(product.product.benefit_per_worker_hour)} an hour. The yearly limit is ${whole(product.limits.insured_hours_per_year)} insured hours, or ${sgd(product.limits.max_payout_per_worker_year)} a worker.`, "plan"),
      ],
      kpi: { v: standard.deductible_label, l: "the Standard plan's monthly deductible", source: "plan" },
    },
    {
      at: "2:55", title: "Choose your deductible", href: "/onboard?step=deductible",
      points: [
        point(`Plans run from ${planPrices} a worker a week, before GST.`, "plan"),
        point(`${standard.name} costs ${sgd(standard.example_20_workers.premium_year)} a year for ${whole(product.demo_firm.outdoor_workers)} workers.`, "back-test"),
        point(`The observed 26-year result returns ${sgd(standard.example_20_workers.average_payout_year)}. The capped worst year returns ${sgd(standard.example_20_workers.worst_year_payout)}.`, "back-test"),
      ],
      kpi: { v: sgd(standard.per_worker_week, 2), l: "a worker a week on Standard, before GST", source: "back-test" },
    },
    {
      at: "3:30", title: "The planned split", href: "/insurer",
      points: [
        point(`${premiumSplit} is the planned split between claims, expenses, reinsurance and profit.`, "plan"),
        point(`${sgd(product.three_year_path.total_profit)} of profit across the planned three-year path.`, "plan"),
        point("Loss years are very wet years and severe haze years, not El Niño labels alone.", "back-test"),
        point(`The ${whole(product.pilot.firms)}-firm pilot is capped at ${sgd(product.pilot.capped_worst_case)}. A MOM heat action forfeits that month's heat payout.`, "plan"),
      ],
      kpi: { v: premiumSplit, l: "claims / expenses / reinsurance / profit", source: "plan" },
    },
    {
      at: "4:00", title: "AI sits in the interface", href: "/labs",
      points: [
        point("Rules decide the payout. AI reads, explains and warns."),
        point("Every receipt explanation is checked against the calculated hours and amount."),
        point("Anything outside a review band is sent to a person. AI never rejects a claim on its own."),
      ],
      kpi: { v: "Rules decide", l: "AI supports the workflow, not the payout" },
    },
    {
      at: "4:25", title: "The ask", href: "/insurer",
      points: [
        point(`${whole(product.pilot.firms)} firms from ${product.pilot.start}, with ${whole(product.pilot.workers)} workers.`, "plan"),
        point(`${compactMoney(product.pilot.premium)} of pilot premium and ${sgd(product.pilot.capped_worst_case)} as the known cap.`, "plan"),
        point(product.copy.ask),
      ],
      kpi: { v: `${whole(product.pilot.firms)} firms`, l: `pilot from ${product.pilot.start}`, source: "plan" },
    },
  ];

  return <Pitch steps={steps} />;
}
