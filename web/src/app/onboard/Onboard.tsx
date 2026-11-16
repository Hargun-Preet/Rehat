"use client";

import {
  BadgeCheck,
  Banknote,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileCheck2,
  HardHat,
  Lock,
  MapPin,
  ReceiptText,
  Send,
  ShieldCheck,
  Sun,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AssumptionTag, IconTile, PageHeader, Section } from "@/components/brand";
import { StationMap, type MapPoint } from "@/components/rehat/StationMap";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { dayName, num, sgd } from "@/lib/format";
import { productPlan, productQuote, type ProductPlan, type ProductSpec } from "@/lib/product";
import { ENGINE_URL } from "@/lib/useJSON";
import { cn } from "@/lib/utils";

type MonthlyDeductible = {
  month: string;
  heat_allowance_h: number;
  rain_allowance_h: number;
};

type MonthlyDeductibleSchedule = {
  months: MonthlyDeductible[];
  heat_basis: string;
  rain_basis: string;
  heat_is_assumption: boolean;
  rain_is_assumption: boolean;
};

export type OnboardData = {
  site: { address: string; lat: number; lon: number };
  primary_station: string;
  backup_station: string;
  rain_gauge: string;
  psi_region: string;
  meal_hour: number;
  station_reason: string;
  suggestion: { reason: string; changed: boolean } | null;
  monthly_deductibles?: Record<string, MonthlyDeductibleSchedule>;
  first_payout_date?: string;
};

type Station = { station_id: string; name: string; lat: number; lon: number };
export type StationsData = { wbgt: Station[]; rain: Station[] };

type UenCheck = {
  uen: string;
  format_ok: boolean;
  kind: string | null;
  message: string;
  acra: null | { found?: boolean; demo?: boolean; offline?: boolean; name?: string; status?: string; live?: boolean; entity_type?: string; issue_date?: string; checked_at?: string; source?: string };
};

const STEPS = [
  { label: "Your WIC", detail: "Confirm business and site", Icon: Building2 },
  { label: "Deductible", detail: "Choose your monthly buffer", Icon: ShieldCheck },
  { label: "Confirm", detail: "Read and understand", Icon: CircleHelp },
  { label: "Schedule", detail: "Review your cover", Icon: ReceiptText },
];

const LOADER = [{ text: "Checking the company register" }, { text: "Preparing your WIC details" }, { text: "Finding your named NEA stations" }, { text: "Ready" }];

function localFormat(raw: string, demoUen: string): UenCheck {
  const uen = raw.replace(/\s+/g, "").toUpperCase();
  if (uen === demoUen.toUpperCase() || uen.startsWith("T99DM")) {
    return { uen, format_ok: true, kind: "demo", message: "Demo company ready.", acra: { demo: true } };
  }
  const ok = /^\d{8}[A-Z]$/.test(uen) || /^(19|20)\d{7}[A-Z]$/.test(uen) || /^[TSR]\d{2}[A-Z]{2}\d{4}[A-Z]$/.test(uen);
  return { uen, format_ok: ok, kind: ok ? "unknown" : null, message: ok ? "Format looks right." : "That does not look like a Singapore UEN. Check the number and try again.", acra: ok ? { offline: true } : null };
}

export default function Onboard({ data, stations, product, initialPlanId, initialStep }: { data: OnboardData; stations: StationsData; product: ProductSpec; initialPlanId: string; initialStep: number }) {
  const [step, setStep] = useState(initialStep);
  const [uen, setUen] = useState(product.demo_firm.uen);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [planId, setPlanId] = useState(initialPlanId);
  const [ack, setAck] = useState(false);
  const [warranty, setWarranty] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const [uenCheck, setUenCheck] = useState<UenCheck | null>(null);
  const [uenError, setUenError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const hasChangedStep = useRef(false);

  const plan = productPlan(product, planId);
  const quote = productQuote(product, plan);
  const correct = answer !== null && product.copy.teach_back_options[answer]?.correct === true;
  const confirmationRequirements = [
    { label: "Acknowledge the named-station limit", complete: ack },
    { label: "Choose the correct payment answer", complete: correct },
    { label: "Tick the required rest-break warranty", complete: warranty },
    { label: "Agree to the data use", complete: consent },
  ];
  const missingConfirmations = confirmationRequirements.filter((requirement) => !requirement.complete);
  const canContinue = step === 0 ? verified : step === 2 ? missingConfirmations.length === 0 : true;
  const lookup = useMemo(() => Object.fromEntries([...stations.wbgt, ...stations.rain].map((station) => [station.station_id, station])), [stations]);
  const mapPoints = createMapPoints(data, lookup);

  const startChecks = async () => {
    setUenError(null);
    const local = localFormat(uen, product.demo_firm.uen);
    if (!local.format_ok) {
      setUenError(local.message);
      return;
    }
    setLoading(true);
    const started = Date.now();
    let result = local;
    if (local.kind !== "demo") {
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 6000);
        const response = await fetch(`${ENGINE_URL}/uen/${encodeURIComponent(local.uen)}`, { signal: controller.signal });
        window.clearTimeout(timeout);
        if (response.ok) result = await response.json() as UenCheck;
      } catch {
        // The walkthrough stays usable offline; a live policy would wait for verification.
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, 760 - (Date.now() - started))));
    setUenCheck(result);
    const entityVerified = result.acra?.demo || (result.acra?.found && result.acra?.live);
    setVerified(Boolean(entityVerified));
    if (!entityVerified) {
      setUenError(result.acra?.offline ? "The register is unavailable. Please try again before continuing with a live renewal." : "We could not verify an active company for this UEN. Please check the number.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!hasChangedStep.current) {
      hasChangedStep.current = true;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.requestAnimationFrame(() => stepContentRef.current?.focus({ preventScroll: true }));
  }, [step]);

  useEffect(() => {
    setPlanId(initialPlanId);
  }, [initialPlanId]);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  const next = () => setStep((current) => Math.min(current + 1, STEPS.length - 1));
  const back = () => setStep((current) => Math.max(current - 1, 0));

  return (
    <>
      <MultiStepLoader loadingStates={LOADER} loading={loading} duration={250} loop={false} />
      <PageHeader eyebrow="Add Rehat to your work injury policy" title="Your renewal quote in four short steps" icon={WalletCards}>
        Confirm the crew and named station, choose the monthly deductible, then see the complete schedule before you submit.
      </PageHeader>

      <Section className="pb-28 lg:pb-10">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <Progress step={step} />
            <div className="sticky top-16 z-20 mb-4 lg:hidden"><QuoteStrip plan={plan} quote={quote} /></div>
            <div ref={stepContentRef} tabIndex={-1} aria-label={`Step ${step + 1}: ${STEPS[step].label}`} className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] outline-none focus-visible:ring-2 focus-visible:ring-income-orange sm:p-8">
              {step === 0 ? <YourWic data={data} product={product} lookup={lookup} points={mapPoints} uen={uen} uenError={uenError} uenCheck={uenCheck} verified={verified} onUenChange={(value) => { setUen(value); setVerified(false); setUenCheck(null); setUenError(null); }} onVerify={startChecks} /> : null}
              {step === 1 ? <ChooseDeductible product={product} selected={plan} onSelect={(nextPlan) => { setPlanId(nextPlan.id); setSubmitted(false); }} /> : null}
              {step === 2 ? <ConfirmTerms product={product} mealHour={data.meal_hour} ack={ack} warranty={warranty} answer={answer} consent={consent} correct={correct} onAck={setAck} onWarranty={setWarranty} onAnswer={setAnswer} onConsent={setConsent} /> : null}
              {step === 3 ? <Schedule product={product} data={data} lookup={lookup} plan={plan} quote={quote} correct={correct} submitted={submitted} /> : null}

              {!(step === 0 && !verified) ? <div className={cn("mt-8 flex items-center gap-3 border-t border-line-soft pt-5", step === 0 ? "justify-end" : "justify-between")}>
                {step > 0 ? <Button variant="outline" onClick={back}><ChevronLeft className="h-4 w-4" /> Back</Button> : null}
                {step < STEPS.length - 1 ? <div className="ml-auto flex flex-col items-end gap-2"><Button onClick={next} disabled={!canContinue} aria-describedby={step === 2 && missingConfirmations.length > 0 ? "confirmation-requirements" : undefined}>{step === 0 ? "Choose your deductible" : step === 1 ? "Review the terms" : missingConfirmations.length > 0 ? "Complete the required checks" : "Confirm and add to policy"}<ChevronRight className="h-4 w-4" /></Button>{step === 2 && missingConfirmations.length > 0 ? <ConfirmationChecklist requirements={confirmationRequirements} /> : null}</div> : submitted ? <Button variant="secondary" onClick={() => window.location.assign("/employer")}>Open employer workspace <ChevronRight className="h-4 w-4" /></Button> : <Button onClick={() => setSubmitted(true)}>Submit renewal request <Send className="h-4 w-4" /></Button>}
              </div> : null}
            </div>
          </div>
          <aside className="hidden lg:sticky lg:top-24 lg:block" aria-label="Your renewal quote"><QuotePanel plan={plan} quote={quote} /></aside>
        </div>
      </Section>
    </>
  );
}

function Progress({ step }: { step: number }) {
  return <div className="mb-5 rounded-2xl border border-line-soft bg-surface px-4 py-3 shadow-[var(--shadow-card)]"><div className="mb-3 flex items-center justify-between lg:hidden"><p className="text-sm font-semibold text-ink">Step {step + 1} of {STEPS.length}</p><p className="text-xs text-muted-foreground">About one minute</p></div><ol className="grid grid-cols-4 gap-2" aria-label="Onboarding progress">{STEPS.map((item, index) => { const done = index < step; const active = index === step; const Icon = item.Icon; return <li key={item.label} aria-current={active ? "step" : undefined} className="min-w-0"><div className="flex items-center gap-2"><span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", done ? "bg-state-ok text-white" : active ? "bg-income-orange-700 text-white" : "bg-paper text-muted-foreground")}>{done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}</span>{index < STEPS.length - 1 ? <span className={cn("hidden h-px flex-1 lg:block", done ? "bg-state-ok" : "bg-line")} /> : null}</div><p className={cn("mt-2 truncate text-xs font-medium sm:text-sm", active ? "text-ink" : "text-muted-foreground")}>{item.label}</p><p className="hidden text-xs text-muted-foreground xl:block">{item.detail}</p></li>; })}</ol></div>;
}

function ConfirmationChecklist({ requirements }: { requirements: { label: string; complete: boolean }[] }) {
  const missing = requirements.filter((requirement) => !requirement.complete);
  return <div id="confirmation-requirements" role="status" aria-live="polite" className="w-full max-w-sm rounded-xl border border-income-orange-200 bg-income-orange-100/60 p-3 text-left"><p className="text-xs font-semibold text-income-orange-700">Still needed before you continue</p><ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink">{missing.map((requirement) => <li key={requirement.label} className="flex items-start gap-2"><span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-income-orange-700" />{requirement.label}</li>)}</ul></div>;
}

function YourWic({ data, product, lookup, points, uen, uenError, uenCheck, verified, onUenChange, onVerify }: { data: OnboardData; product: ProductSpec; lookup: Record<string, Station>; points: MapPoint[]; uen: string; uenError: string | null; uenCheck: UenCheck | null; verified: boolean; onUenChange: (value: string) => void; onVerify: () => void }) {
  const isDemo = uenCheck?.acra?.demo === true || uen.replace(/\s+/g, "").toUpperCase() === product.demo_firm.uen.toUpperCase();
  if (!verified) return <div className="max-w-xl space-y-5"><div className="flex items-start gap-3"><IconTile icon={Building2} tone="orange" /><div><h2 className="text-xl font-bold">Start with your UEN</h2><p className="mt-1 text-sm text-muted-foreground">We use your work injury policy details to prefill the crew and site, not a long application form.</p></div></div><div className="space-y-2"><Label htmlFor="uen">Company UEN</Label><Input id="uen" value={uen} onChange={(event) => onUenChange(event.target.value)} className="num" aria-invalid={Boolean(uenError)} aria-describedby="uen-help" />{uenError ? <p className="text-sm text-state-review" role="alert">{uenError}</p> : null}<p id="uen-help" className="text-xs leading-relaxed text-muted-foreground">We check the company register before a live renewal. This walkthrough UEN is ready to use, so no password or worker details are needed.</p></div><Button onClick={onVerify} disabled={!uen.trim()}>{isDemo ? "Check demo WIC details" : "Check my WIC details"}<ChevronRight className="h-4 w-4" /></Button></div>;

  return <div className="space-y-7"><div><p className="flex items-center gap-2 text-sm font-semibold text-state-ok"><BadgeCheck className="h-5 w-5" /> {isDemo ? "WIC details ready" : "WIC details found"}</p><h2 className="mt-2 text-xl font-bold">Your declared crew sets the quote</h2><p className="mt-1 text-sm text-muted-foreground">No worker names, NRICs or phone numbers are needed to price this cover.</p></div>{uenCheck ? <AcraBox check={uenCheck} firm={product.demo_firm.name} /> : null}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Box label="Business" value={product.demo_firm.name} /><Box label="Work injury policy" value={product.demo_firm.wic_policy_no} /><Box label="Trade" value={product.demo_firm.trade} /><Box label="Declared outdoor workers" value={String(product.demo_firm.outdoor_workers)} big /><Box label="Work class" value="Heavy work" /><Box label="Unpaid meal hour" value={`${data.meal_hour}:00 to ${data.meal_hour + 1}:00`} /></div><p className="flex items-start gap-2 rounded-xl bg-paper p-3 text-sm text-muted-foreground"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-income-blue" /> Headcount comes from the work injury policy declaration. Changing it needs a policy re-declaration too.</p><div className="grid gap-5 border-t border-line-soft pt-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><div className="space-y-4"><div><p className="flex items-center gap-2 text-sm font-semibold text-income-blue"><MapPin className="h-4 w-4" /> Your named data source</p><h3 className="mt-1 text-lg font-bold">One site. A clear station rule.</h3></div><p className="text-sm text-ink">{data.site.address}</p><p className="rounded-xl bg-paper p-3 text-sm text-muted-foreground">{data.station_reason}</p>{data.suggestion ? <p className="text-xs text-muted-foreground">Representativeness check: {data.suggestion.reason}</p> : null}<dl className="space-y-2 text-sm"><StationLine label="Heat station" value={lookup[data.primary_station]?.name ?? "Loading station"} /><StationLine label="Backup station" value={lookup[data.backup_station]?.name ?? "Loading station"} /><StationLine label="Rain gauge" value={lookup[data.rain_gauge]?.name ?? "Loading station"} /></dl><p className="text-xs leading-relaxed text-muted-foreground">These stations appear on your schedule. They can differ from your site, so we make that limit clear before you submit.</p></div><div className="lg:hidden"><details className="rounded-xl border border-line-soft bg-paper p-4"><summary className="cursor-pointer text-sm font-semibold text-income-blue">View the named stations</summary><div className="mt-4"><StationMap points={points} zoom={14} center={[data.site.lat, data.site.lon]} height={260} /></div></details></div><div className="hidden lg:block"><StationMap points={points} zoom={14} center={[data.site.lat, data.site.lon]} height={320} /></div></div></div>;
}

function ChooseDeductible({ product, selected, onSelect }: { product: ProductSpec; selected: ProductPlan; onSelect: (plan: ProductPlan) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-income-orange-700">Your deductible</p>
        <h2 className="mt-1 text-xl font-bold">Choose the monthly buffer that stays with your business</h2>
        <p className="mt-1 text-sm text-muted-foreground">A normal month is part of the job. The deductible sets how much above normal Rehat starts to pay.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3" role="radiogroup" aria-label="Choose deductible">
        {product.plans.map((item) => {
          const chosen = item.id === selected.id;
          const quote = productQuote(product, item);
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => onSelect(item)}
              className={cn("rounded-2xl border-2 p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange", chosen ? "border-income-orange bg-income-orange-100/50 shadow-[var(--shadow-card)]" : "border-line hover:border-income-orange-200")}
            >
              <span className="flex items-start justify-between gap-3">
                <span><span className="font-heading text-lg font-bold text-ink">{item.name}</span><span className="mt-1 block text-sm text-muted-foreground">{item.deductible_label}</span></span>
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border", chosen ? "border-income-orange-700 bg-income-orange-700 text-white" : "border-line bg-surface text-transparent")}><Check className="h-3.5 w-3.5" /></span>
              </span>
              <span className="num mt-5 block font-heading text-2xl font-bold text-ink">{sgd(item.per_worker_week, 2)} <span className="font-sans text-sm font-normal text-muted-foreground">a worker a week</span></span>
              <span className="mt-2 block text-xs text-muted-foreground">{sgd(quote.total, 0)} for {product.demo_firm.outdoor_workers} workers with GST</span>
              <span className="mt-3 block text-xs text-income-blue">Pays in {item.months_that_pay} months <span className="rounded-full bg-income-blue-50 px-1.5 py-0.5 text-[11px]" title={`Published ${item.source} result.`}>{item.source}</span></span>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line-soft pt-3 text-xs">
                <div><dt className="text-muted-foreground">Average year</dt><dd className="num mt-1 font-semibold text-ink">{sgd(item.example_20_workers.average_payout_year, 0)}</dd></div>
                <div><dt className="text-muted-foreground">Worst capped year</dt><dd className="num mt-1 font-semibold text-ink">{sgd(item.example_20_workers.worst_year_payout, 0)}</dd></div>
              </dl>
              <span className="mt-2 block text-[11px] leading-relaxed text-muted-foreground">For {product.demo_firm.outdoor_workers} declared workers. <span className="rounded-full bg-income-blue-50 px-1.5 py-0.5 text-[11px]" title={`Published ${item.source} result.`}>{item.source}</span> <span className="rounded-full bg-paper px-1.5 py-0.5 text-[11px]" title="The annual product limit caps the worst-year amount.">plan limit</span></span>
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl border border-line-soft bg-paper p-4"><p className="flex items-center gap-2 text-sm font-semibold text-income-blue"><FileCheck2 className="h-4 w-4" /> How the payment stays simple</p><p className="mt-2 text-sm text-muted-foreground">Insured hours at the named NEA sources × {sgd(product.product.benefit_per_worker_hour, 0)} benefit × declared outdoor headcount. There is no claim form.</p></div>
    </div>
  );
}

function ConfirmTerms({ product, mealHour, ack, warranty, answer, consent, correct, onAck, onWarranty, onAnswer, onConsent }: { product: ProductSpec; mealHour: number; ack: boolean; warranty: boolean; answer: number | null; consent: boolean; correct: boolean; onAck: (value: boolean) => void; onWarranty: (value: boolean) => void; onAnswer: (value: number) => void; onConsent: (value: boolean) => void }) {
  return (
    <div className="max-w-3xl space-y-7">
      <div>
        <p className="text-sm font-semibold text-income-orange-700">Confirm your understanding</p>
        <h2 className="mt-1 text-xl font-bold">A clear limit before you submit</h2>
        <p className="mt-1 text-sm text-muted-foreground">A few quick checks make the schedule clear and keep only the data needed for this cover.</p>
      </div>

      <section className="rounded-2xl border border-income-orange-200 bg-income-orange-100/50 p-5">
        <p className="text-sm font-semibold text-income-orange-700">1. Named-station limit</p>
        <blockquote className="mt-3 text-base leading-relaxed text-ink">{product.copy.may_not_pay}</blockquote>
        <label className="mt-4 flex items-start gap-3 text-sm font-medium text-ink"><Checkbox checked={ack} onCheckedChange={(value) => onAck(Boolean(value))} /><span>I have read and understood this limit.</span></label>
      </section>

      <section className="rounded-2xl border border-line p-5">
        <p className="text-sm font-semibold text-income-blue">2. Quick check</p>
        <h3 className="mt-1 font-heading text-lg font-bold">{product.copy.teach_back_question}</h3>
        <div className="mt-4 space-y-2" role="radiogroup" aria-label={product.copy.teach_back_question}>
          {product.copy.teach_back_options.map((item, index) => {
            const chosen = answer === index;
            return <button key={item.text} type="button" role="radio" aria-checked={chosen} onClick={() => onAnswer(index)} className={cn("w-full rounded-xl border-2 p-4 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-income-orange", chosen && item.correct ? "border-state-ok bg-state-ok-bg" : chosen ? "border-state-pending bg-state-pending-bg" : "border-line hover:border-income-orange-200")}>{item.text}</button>;
          })}
        </div>
        {answer !== null ? <p className={cn("mt-3 rounded-xl p-3 text-sm", correct ? "bg-state-ok-bg text-state-ok" : "bg-state-pending-bg text-state-pending")}>{correct ? "Correct. We have recorded your answer." : product.copy.teach_back_explain}</p> : null}
      </section>

      <section className="rounded-2xl border border-line p-5">
        <p className="text-sm font-semibold text-income-blue">3. Safe work and key terms</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><Term icon={Sun} title="Required rest" text={product.copy.rule_statement} /><Term icon={Clock3} title="Work window" text={`Mon to Sat, ${product.product.window.start} to ${product.product.window.end}. The ${mealHour}:00 to ${mealHour + 1}:00 meal hour is excluded.`} /><Term icon={ShieldCheck} title="Deductible and caps" text={`${product.limits.insured_hours_per_month} insured hours a month and ${product.limits.insured_hours_per_year} a year. Heat and rain use the selected deductible; haze has no deductible.`} /><Term icon={Banknote} title="Payment" text={product.product.payment} /></div>
        <div className={cn("mt-5 rounded-xl border-2 p-4", warranty ? "border-state-ok bg-state-ok-bg" : "border-income-orange-300 bg-income-orange-100/50")}>
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-ink">Required yearly warranty</p><span className="rounded-full bg-income-orange-700 px-2 py-0.5 text-[11px] font-semibold text-white">Required</span></div>
          <p id="rest-break-warranty-help" className="mt-1 text-xs leading-relaxed text-muted-foreground">Tick this before you can add Rehat to the policy.</p>
          <div className="mt-4 flex items-start gap-3"><Checkbox id="rest-break-warranty" checked={warranty} aria-required="true" aria-describedby="rest-break-warranty-help" className="!size-6 !border-2 !border-income-orange-700" onCheckedChange={(value) => onWarranty(Boolean(value))} /><Label htmlFor="rest-break-warranty" className="items-start text-sm leading-relaxed text-ink">{product.copy.warranty}</Label></div>
        </div>
      </section>

      <section className="rounded-2xl border border-line p-5">
        <p className="text-sm font-semibold text-income-blue">4. The data we use</p>
        <dl className="mt-3 divide-y divide-line-soft rounded-xl bg-paper px-4">{product.pdpa_fields_collected.map((field) => <div key={field} className="py-2.5 text-sm text-ink">{field}</div>)}</dl>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">No worker names, NRICs or phone numbers are required to price the cover.</p>
        <label className="mt-4 flex items-start gap-3 text-sm font-medium text-ink"><Checkbox checked={consent} onCheckedChange={(value) => onConsent(Boolean(value))} /><span>I agree to the data use described above.</span></label>
      </section>
    </div>
  );
}

function Schedule({ product, data, lookup, plan, quote, correct, submitted }: { product: ProductSpec; data: OnboardData; lookup: Record<string, Station>; plan: ProductPlan; quote: ReturnType<typeof productQuote>; correct: boolean; submitted: boolean }) {
  const monthlyDeductibles = data.monthly_deductibles?.[plan.id];
  const sourceLabel = monthlyDeductibles?.heat_is_assumption || monthlyDeductibles?.rain_is_assumption ? "assumption" : "station normal";
  const sourceBasis = monthlyDeductibles ? `Heat: ${monthlyDeductibles.heat_basis} Rain: ${monthlyDeductibles.rain_basis}` : "The published station normal is added to the offline schedule during export.";

  return (
    <div className="space-y-7">
      <div className={cn("rounded-2xl p-5", submitted ? "bg-state-ok-bg" : "border border-income-blue-100 bg-income-blue-50")}>
        <p className={cn("flex items-center gap-2 text-sm font-semibold", submitted ? "text-state-ok" : "text-income-blue")}><ShieldCheck className="h-5 w-5" /> {submitted ? "Renewal request received" : "Review before you submit"}</p>
        <h2 className="mt-2 text-xl font-bold text-ink">{submitted ? "Your next step is ready" : "Your Rehat schedule is clear"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{submitted ? "Open the employer workspace to see your operating dashboard, worker notice and monthly receipt." : "Review the named data sources and price below, then submit your renewal request."}</p>
        {submitted ? <div className="mt-4 grid gap-3 border-t border-state-ok/20 pt-4 sm:grid-cols-3"><Box label="Request reference" value={`REHAT-${product.demo_firm.uen}`} /><Box label="Effective date" value="Your next policy renewal" /><Box label="Policy term" value={`${product.product.term_months} months alongside WIC`} /></div> : null}
      </div>

      <div>
        <p className="text-sm font-semibold text-income-blue">Schedule summary</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Box label="Business" value={product.demo_firm.name} /><Box label="Selected plan" value={`${plan.name}, ${plan.deductible_label}`} /><Box label="Insured workers" value={`${product.demo_firm.outdoor_workers} declared outdoor workers`} /><Box label="Named heat station" value={lookup[data.primary_station]?.name ?? "Loading station"} /><Box label="Backup station" value={lookup[data.backup_station]?.name ?? "Loading station"} /><Box label="Rain gauge" value={lookup[data.rain_gauge]?.name ?? "Loading station"} /><Box label="Haze source" value={`NEA 24-hour PSI, ${data.psi_region} region`} /><Box label="Annual price" value={`${sgd(quote.total, 0)} including GST`} /><Box label="Understanding check" value={correct ? "Correct and recorded" : "Explained and recorded"} /></div>
      </div>

      <section className="rounded-2xl border border-line p-5">
        <p className="text-sm font-semibold text-income-blue">Monthly deductible</p>
        <h3 className="mt-1 text-lg font-bold text-ink">Your heat and rain deductible, month by month</h3>
        <p className="mt-1 text-sm text-muted-foreground">These are hours per worker at your named sources. Only hours above each monthly deductible become insured.</p>
        {monthlyDeductibles ? <><div className="mt-4 overflow-x-auto rounded-xl border border-line-soft"><table className="min-w-full text-sm"><thead className="bg-paper text-left text-xs text-muted-foreground"><tr><th scope="col" className="px-3 py-2.5 font-medium">Month</th><th scope="col" className="px-3 py-2.5 text-right font-medium">Heat</th><th scope="col" className="px-3 py-2.5 text-right font-medium">Heavy rain</th></tr></thead><tbody>{monthlyDeductibles.months.map((month) => <tr key={month.month} className="border-t border-line-soft"><th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">{month.month}</th><td className="num px-3 py-2.5 text-right text-ink">{num(month.heat_allowance_h)} h</td><td className="num px-3 py-2.5 text-right text-ink">{num(month.rain_allowance_h)} h</td></tr>)}</tbody></table></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">These monthly deductibles use the selected {plan.name} plan.<AssumptionTag label={sourceLabel} basis={sourceBasis} /></p></> : <p className="mt-4 rounded-xl bg-paper p-4 text-sm text-muted-foreground">Your month-by-month deductible table is preparing with the named-station data.</p>}
      </section>

      <section className="rounded-2xl border border-line p-5">
        <p className="text-sm font-semibold text-income-blue">Limits and first payment</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><ScheduleDetail label="Monthly limit" value={`${product.limits.insured_hours_per_month} insured hours`} /><ScheduleDetail label="Annual limit" value={`${product.limits.insured_hours_per_year} insured hours, ${sgd(product.limits.max_payout_per_worker_year, 0)} a worker`} /><ScheduleDetail label="Haze limit" value={`No deductible, ${product.limits.haze_hours_per_year} hours a year`} /><ScheduleDetail label="First payment date" value={data.first_payout_date ? `By ${dayName(data.first_payout_date)}` : product.product.payment} /></div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Limits and payment timing are published plan terms.<AssumptionTag label="plan" basis="Published product limits and the next-month payment rule." /></p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3"><NextStep icon={HardHat} title="Keep working safely" text={product.copy.warranty} /><NextStep icon={ReceiptText} title="See every hour" text="Your receipt shows what counted and what did not." /><NextStep icon={Banknote} title="Get paid" text={data.first_payout_date ? `The first payment is due by ${dayName(data.first_payout_date)}.` : "A payment, when due, goes to your company UEN before payroll."} /></div>
      <div className="rounded-2xl bg-paper p-4 text-sm"><p className="text-xs font-semibold text-muted-foreground">Your alert</p><p className="mt-1 text-ink">{product.copy.employer_sms}</p></div>
    </div>
  );
}

function ScheduleDetail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line-soft bg-paper p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="num mt-1 font-medium text-ink">{value}</p></div>;
}

function QuotePanel({ plan, quote }: { plan: ProductPlan; quote: ReturnType<typeof productQuote> }) {
  return <div className="overflow-hidden rounded-2xl border border-income-orange-200 bg-surface shadow-[var(--shadow-raised)]"><div className="bg-income-orange-100/70 p-5"><div className="flex items-center gap-2"><IconTile icon={WalletCards} tone="orange" size="sm" /><p className="text-sm font-semibold text-income-orange-700">Your renewal estimate</p></div><p className="num mt-2 font-heading text-3xl font-bold text-ink">{sgd(quote.total, 0)}</p><p className="mt-1 text-sm text-muted-foreground">for {quote.workers} declared outdoor workers, including GST</p></div><div className="space-y-4 p-5"><div className="flex items-start justify-between gap-3 text-sm"><div><p className="font-semibold text-ink">{plan.name}</p><p className="mt-1 text-muted-foreground">{plan.deductible_label}</p></div><p className="num whitespace-nowrap text-right font-semibold text-ink">{sgd(plan.per_worker_week, 2)}/wk<span className="block text-[11px] font-normal text-muted-foreground">before GST</span></p></div><table className="w-full text-sm"><tbody><Row label="Annual premium, before GST" value={sgd(quote.beforeGst, 0)} /><Row label="GST" value={sgd(quote.gst, 0)} /><Row label="Total for the year" value={sgd(quote.total, 0)} strong /></tbody></table><p className="text-xs leading-relaxed text-muted-foreground">Price uses the plan and declared outdoor headcount.<AssumptionTag basis={`Illustrative ${plan.source} calibration.`} label={plan.source} /></p></div></div>;
}

function QuoteStrip({ plan, quote }: { plan: ProductPlan; quote: ReturnType<typeof productQuote> }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl border border-income-orange-200 bg-surface px-4 py-3 shadow-[var(--shadow-raised)]"><div className="min-w-0"><p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><WalletCards className="h-3.5 w-3.5 text-income-orange-700" /> {plan.name} · {quote.workers} declared workers</p><p className="num text-sm font-semibold text-ink">{sgd(plan.per_worker_week, 2)} a worker a week <span className="text-xs font-normal text-muted-foreground">before GST</span></p></div><div className="shrink-0 text-right"><p className="num font-heading text-lg font-bold text-ink">{sgd(quote.total, 0)}</p><p className="text-[11px] text-muted-foreground">including GST</p></div></div>;
}

function Term({ icon: Icon, title, text }: { icon: typeof Clock3; title: string; text: string }) {
  return <div className="surface-inset flex gap-3 p-3"><IconTile icon={Icon} tone="slate" size="sm" /><div><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div></div>;
}

function StationLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 border-b border-line-soft pb-2 last:border-0"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium text-ink">{value}</dd></div>;
}

function NextStep({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return <div className="rounded-xl border border-line-soft bg-paper p-4"><IconTile icon={Icon} tone="blue" size="sm" /><p className="mt-3 text-sm font-semibold text-ink">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div>;
}

function Box({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return <div className="rounded-xl border border-line-soft bg-paper p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={cn("mt-1 font-medium text-ink", big && "num font-heading text-2xl font-bold")}>{value}</p></div>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <tr className="border-b border-line-soft last:border-0"><td className={cn("py-1.5", strong && "font-semibold")}>{label}</td><td className={cn("num py-1.5 text-right", strong && "text-base font-bold")}>{value}</td></tr>;
}

function AcraBox({ check, firm }: { check: UenCheck; firm: string }) {
  const acra = check.acra;
  if (!acra || acra.demo) return <div className="rounded-xl bg-state-ok-bg p-4 text-sm text-state-ok"><p className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" /> Company details ready</p><p className="mt-1">{firm} is prefilled for this walkthrough.</p></div>;
  if (acra.offline) return <div className="rounded-xl bg-state-pending-bg p-4 text-sm text-state-pending"><p className="font-semibold">Company register unavailable</p><p className="mt-1">The UEN format looks right, but a live renewal waits for the register check.</p></div>;
  if (acra.found) return <div className="rounded-xl bg-state-ok-bg p-4 text-sm text-state-ok"><p className="font-semibold">Found on the company register: {acra.name}</p><p className="mt-1">Status {acra.status ?? "unknown"}.</p></div>;
  return <div className="rounded-xl bg-state-review-bg p-4 text-sm text-state-review"><p className="font-semibold">We could not find this UEN</p><p className="mt-1">Check the number before continuing.</p></div>;
}

function createMapPoints(data: OnboardData, stations: Record<string, Station>): MapPoint[] {
  const point = (id: string, label: string, kind: MapPoint["kind"]): MapPoint | null => {
    const station = stations[id];
    return station ? { id, lat: station.lat, lon: station.lon, label, kind } : null;
  };
  return [
    { id: "site", lat: data.site.lat, lon: data.site.lon, label: "Your site", kind: "site" },
    point(data.primary_station, `Named station: ${stations[data.primary_station]?.name ?? data.primary_station}`, "primary"),
    point(data.backup_station, `Backup: ${stations[data.backup_station]?.name ?? data.backup_station}`, "backup"),
    point(data.rain_gauge, `Rain gauge: ${stations[data.rain_gauge]?.name ?? data.rain_gauge}`, "rain"),
  ].filter((item): item is MapPoint => item !== null);
}
