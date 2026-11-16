import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarClock,
  FileCheck2,
  HardHat,
  MapPinned,
  ReceiptText,
  ShieldCheck,
  Sun,
  WalletCards,
} from "lucide-react";

import { AssumptionTag, Ellipsis, EllipsisDivider, IconTile, SourceNote } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Spotlight } from "@/components/ui/spotlight-new";
import { sgd } from "@/lib/format";
import { productPlan } from "@/lib/product";
import { loadProduct } from "@/lib/product.server";

import { LandingQuote } from "./LandingQuote";

const orange = (alpha: number) => `radial-gradient(68.54% 68.72% at 55.02% 31.46%, rgba(245,113,0,${alpha}) 0, rgba(245,113,0,${alpha / 4}) 50%, rgba(245,113,0,0) 80%)`;

export default async function Home() {
  const product = await loadProduct();
  const standard = productPlan(product);
  const benefit = product.product.benefit_per_worker_hour;

  const stats = [
    { Icon: WalletCards, tone: "orange" as const, label: "Standard cover", value: `${sgd(standard.per_worker_week, 2)} / week`, detail: "per outdoor worker, before GST", source: "back-test" },
    { Icon: ReceiptText, tone: "blue" as const, label: "Eligible benefit", value: `${sgd(benefit, 0)} / hour`, detail: "per worker for each insured hour", source: null },
    { Icon: CalendarClock, tone: "amber" as const, label: "Standard months that pay", value: standard.months_that_pay, detail: "in the product back-test", source: "back-test" },
    { Icon: FileCheck2, tone: "green" as const, label: "Claim forms", value: "0", detail: product.product.payment, source: null },
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-surface">
        <Spotlight gradientFirst={orange(0.13)} gradientSecond={orange(0.08)} gradientThird={orange(0.05)} />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-6 pb-14 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.72fr)] lg:items-center">
          <div>
            <p className="eyebrow mb-5 flex items-center gap-2"><Ellipsis size="sm" /> {product.product.descriptor}</p>
            <h1 className="max-w-3xl text-4xl font-bold text-ink sm:text-6xl">{product.copy.tagline}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Weather downtime cover helps outdoor teams keep required rest breaks and payroll on track when heat, rain or haze make a normal month hard.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <HeroTag Icon={HardHat} text="Built around your work injury policy" />
              <HeroTag Icon={MapPinned} text="Named NEA station" />
              <HeroTag Icon={WalletCards} text="PayNow before payroll" />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/onboard">See your quote <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="/employer">Explore the employer workspace</Link></Button>
            </div>
          </div>
          <LandingQuote plans={product.plans} product={product.product} demo_firm={product.demo_firm} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ Icon, tone, label, value, detail, source }) => (
            <div key={label} className="product-card p-5">
              <div className="flex items-start justify-between gap-3"><p className="text-sm text-muted-foreground">{label}</p><IconTile icon={Icon} tone={tone} size="sm" /></div>
              <p className="num mt-3 font-heading text-2xl font-bold text-ink">{value}{source ? <AssumptionTag basis={`Published ${source} result in the product terms.`} label={source} /> : null}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
        <SourceNote>Rehat uses precomputed public NEA and MSS readings so the product can be reviewed offline.</SourceNote>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="max-w-2xl">
          <p className="eyebrow">Why teams choose Rehat</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Keep the rule, protect the workday.</h2>
          <p className="mt-3 text-muted-foreground">Clear independent readings, a plain monthly deductible and one evidence-led receipt make the cover easy to run.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <ValueCard Icon={Sun} title="Required breaks stay protected" text={product.copy.rule_statement} tone="orange" />
          <ValueCard Icon={ShieldCheck} title="The rule is visible before you buy" text="You see the named station, the monthly deductible, the allowance and the annual cap before you submit." tone="blue" />
          <ValueCard Icon={Building2} title="No worker details to price it" text="Price uses the selected plan and declared outdoor headcount. Worker names, NRICs and phone numbers are not needed." tone="green" />
        </div>
      </section>

      <EllipsisDivider />

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">A month with Rehat</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">One clear operational loop.</h2>
          </div>
          <Link className="inline-flex items-center gap-1 text-sm font-semibold text-income-blue hover:text-income-blue-600" href="/replay">See a replay <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MonthStep number="01" Icon={BellRing} title="Plan tomorrow" text="An alert names the station and likely heat window so heavy work can move earlier." />
          <MonthStep number="02" Icon={Sun} title="Protect the break" text="Workers receive a plain notice when the reading reaches the heat threshold." />
          <MonthStep number="03" Icon={ReceiptText} title="Review the receipt" text="Every counted hour, allowance and unresolved reading stays visible." />
          <MonthStep number="04" Icon={CalendarClock} title="Receive payment" text={product.product.payment} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-5">
        <div className="rounded-2xl border border-income-orange-200 bg-income-orange-100/60 p-6 sm:flex sm:items-start sm:gap-4">
          <IconTile icon={MapPinned} tone="orange" className="mb-4 sm:mb-0" />
          <div>
            <p className="text-sm font-semibold text-income-orange-700">The named-station rule</p>
            <p className="mt-2 max-w-4xl text-lg leading-relaxed text-ink">{product.copy.may_not_pay}</p>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroTag({ Icon, text }: { Icon: typeof HardHat; text: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-sm font-medium text-ink shadow-sm"><Icon className="h-3.5 w-3.5 text-income-blue" aria-hidden />{text}</span>;
}

function ValueCard({ Icon, title, text, tone }: { Icon: typeof Sun; title: string; text: string; tone: "orange" | "blue" | "green" }) {
  return (
    <div className="product-card p-6">
      <IconTile icon={Icon} tone={tone} />
      <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function MonthStep({ number, Icon, title, text }: { number: string; Icon: typeof BellRing; title: string; text: string }) {
  return (
    <div className="product-card relative overflow-hidden p-5">
      <span className="num absolute right-4 top-3 text-3xl font-bold text-income-orange-200">{number}</span>
      <IconTile icon={Icon} tone="blue" size="sm" />
      <h3 className="mt-5 text-base font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
