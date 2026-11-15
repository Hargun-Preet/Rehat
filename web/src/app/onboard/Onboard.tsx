"use client";

import { Building2, Check, ChevronLeft, ChevronRight, Clock, Lock, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AssumptionTag, Ellipsis, PageHeader, Section } from "@/components/brand";
import { StationMap, type MapPoint } from "@/components/rehat/StationMap";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { cn } from "@/lib/utils";
import { sgd } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { ENGINE_URL } from "@/lib/useJSON";

export type OnboardData = {
  firm: {
    uen: string;
    name: string;
    trade: string;
    outdoor_workers: number;
    wage_band: string;
    wic_policy_no: string;
    site: { address: string; lat: number; lon: number };
    primary_station: string;
    backup_station: string;
    rain_gauge: string;
    psi_region: string;
    meal_hour: number;
  };
  station_reason: string;
  suggestion: { reason: string; changed: boolean } | null;
  prices: { plans: Plan[]; rider: { year: number; week: number; basis: string }; gst: number; launch_credit: number; launch_credit_ends: string; basis: string };
  may_not_pay: string;
  sms: string;
};
type St = { station_id: string; name: string; lat: number; lon: number };
export type StationsData = { wbgt: St[]; rain: St[] };

type UenCheck = {
  uen: string;
  format_ok: boolean;
  kind: string | null;
  message: string;
  acra: null | { found?: boolean; demo?: boolean; offline?: boolean; name?: string; status?: string; live?: boolean; entity_type?: string; issue_date?: string; checked_at?: string; source?: string };
};

/** Same shape rules as the engine (rehat/uen.py), used when the engine is not running. */
function localFormat(raw: string): UenCheck {
  const u = raw.replace(/\s+/g, "").toUpperCase();
  if (u.startsWith("T99DM")) return { uen: u, format_ok: true, kind: "demo", message: "Fictional demo UEN. Not looked up.", acra: { demo: true } };
  const ok = /^\d{8}[A-Z]$/.test(u) || /^(19|20)\d{7}[A-Z]$/.test(u) || /^[TSR]\d{2}[A-Z]{2}\d{4}[A-Z]$/.test(u);
  return { uen: u, format_ok: ok, kind: ok ? "unknown" : null, message: ok ? "Format looks right." : "That does not look like a Singapore UEN. A company UEN is 9 digits and a letter, for example 201912345K.", acra: ok ? { offline: true } : null };
}

const STEPS = ["Your business", "Checking records", "Headcount", "Site and station", "Plan", "Before you buy", "Quick check", "Your data", "Done"];
const LOADER = [{ text: "Checking ACRA via Corppass" }, { text: "Reading your WIC policy" }, { text: "Finding your nearest NEA stations" }, { text: "Ready" }];
const TEACH = [
  { id: "a", text: "When NEA's readings at my named station are worse than a normal month", correct: true },
  { id: "b", text: "Whenever my workers stop work because of weather at my site", correct: false },
  { id: "c", text: "When I send a claim form with photos", correct: false },
];
const PDPA = [
  ["UEN", "To identify your business and pay you by PayNow"],
  ["WIC policy number", "Rehat is added to this policy"],
  ["Outdoor headcount", "Sets your premium and payout"],
  ["Wage band", "Checks the benefit stays below your real cost"],
  ["Site addresses", "Picks your named station"],
  ["PayNow (UEN)", "Where we pay you"],
  ["One contact", "For alerts and receipts"],
];

export default function Onboard({ data, stations }: { data: OnboardData; stations: StationsData }) {
  const [step, setStep] = useState(0);
  const [uen, setUen] = useState(data.firm.uen);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<"Lite" | "Standard">("Standard");
  const [rider, setRider] = useState(false);
  const [ack, setAck] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [doneAt, setDoneAt] = useState<number | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.round(((doneAt ?? now) - start) / 1000);

  const f = data.firm;
  const p = data.prices.plans.find((x) => x.plan === plan)!;
  const riderWeek = rider && plan === "Standard" ? data.prices.rider.week : 0;
  const perWorkerYear = p.year + (rider && plan === "Standard" ? data.prices.rider.year : 0);
  const before = perWorkerYear * f.outdoor_workers;
  const credit = before * data.prices.launch_credit;
  const afterCredit = before - credit;
  const gst = afterCredit * data.prices.gst;
  const st = useMemo(() => Object.fromEntries([...stations.wbgt, ...stations.rain].map((s) => [s.station_id, s])), [stations]);
  const points: MapPoint[] = [
    { id: "site", lat: f.site.lat, lon: f.site.lon, label: "Your site", kind: "site" },
    { id: f.primary_station, lat: st[f.primary_station].lat, lon: st[f.primary_station].lon, label: `Named station: ${st[f.primary_station].name}`, kind: "primary" },
    { id: f.backup_station, lat: st[f.backup_station].lat, lon: st[f.backup_station].lon, label: `Backup: ${st[f.backup_station].name}`, kind: "backup" },
    { id: f.rain_gauge, lat: st[f.rain_gauge].lat, lon: st[f.rain_gauge].lon, label: `Rain gauge: ${st[f.rain_gauge].name}`, kind: "rain" },
  ];

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const [uenCheck, setUenCheck] = useState<UenCheck | null>(null);
  const [uenError, setUenError] = useState<string | null>(null);
  const startChecks = async () => {
    setUenError(null);
    const local = localFormat(uen);
    if (!local.format_ok) {
      setUenError(local.message);
      return;
    }
    setLoading(true);
    setStep(1);
    const started = Date.now();
    let result: UenCheck = local;
    if (local.kind !== "demo") {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 6000);
        const r = await fetch(`${ENGINE_URL}/uen/${encodeURIComponent(local.uen)}`, { signal: ctl.signal });
        clearTimeout(t);
        if (r.ok) result = await r.json();
      } catch {
        /* engine or Wi-Fi off: keep the local format check, marked offline */
      }
    }
    await new Promise((res) => setTimeout(res, Math.max(0, 4200 - (Date.now() - started))));
    setUenCheck(result);
    setLoading(false);
    setStep(2);
  };
  const canNext = step === 5 ? ack : step === 6 ? answer !== null : step === 7 ? consent : true;
  const correct = TEACH.find((t) => t.id === answer)?.correct;

  return (
    <>
      <MultiStepLoader loadingStates={LOADER} loading={loading} duration={1100} loop={false} />
      <PageHeader eyebrow="Add Rehat to your WIC" title="Get covered in about a minute">
        Most of it is already on your WIC policy. We only ask what we need.
      </PageHeader>
      <Section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ol className="flex flex-wrap gap-1.5" aria-label="Steps">
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs",
                  i < step ? "bg-state-ok-bg text-state-ok" : i === step ? "bg-income-orange-700 text-white" : "bg-surface text-muted-foreground",
                )}
              >
                {i < step ? <Check className="h-3 w-3" /> : <span className="num">{i + 1}</span>} {s}
              </li>
            ))}
          </ol>
          <span className="num flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-sm" aria-live="polite">
            <Clock className="h-4 w-4 text-income-orange" /> {elapsed} s
          </span>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
          {step === 0 && (
            <div className="max-w-md space-y-4">
              <h2 className="text-xl font-bold">Your business</h2>
              <div className="space-y-2">
                <Label htmlFor="uen">Company UEN</Label>
                <Input id="uen" value={uen} onChange={(e) => { setUen(e.target.value); setUenError(null); }} className="num" aria-invalid={!!uenError} aria-describedby="uen-help" />
                {uenError ? <p className="text-sm text-state-review" role="alert">{uenError}</p> : null}
                <p id="uen-help" className="text-xs text-muted-foreground">
                  We check the UEN on ACRA&apos;s public register. The demo UEN {data.firm.uen} is fictional and is not looked up. Whatever you enter, this prototype continues with the fictional firm {f.name}&apos;s WIC policy. We sign in through Corppass; no password is typed here.
                </p>
              </div>
              <Button onClick={startChecks} disabled={!uen.trim()}>
                Continue with Corppass <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="flex items-center gap-3 py-10">
              <Ellipsis variant="loader" label="Checking your records" /> Checking your records
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {uenCheck ? <AcraBox c={uenCheck} demoName={f.name} /> : null}
              <h2 className="text-xl font-bold">We found this on your WIC policy</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <Box k="Business" v={f.name} />
                <Box k="WIC policy" v={f.wic_policy_no} />
                <Box k="Trade" v={f.trade} />
                <Box k="Declared outdoor workers" v={String(f.outdoor_workers)} big />
                <Box k="Wage band" v={f.wage_band} />
                <Box k="Unpaid meal hour" v={`${f.meal_hour}:00 to ${f.meal_hour + 1}:00`} />
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" /> Headcount and wage band come from your WIC declaration. To change them, re-declare your WIC; it changes your WIC premium too.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="space-y-3 lg:col-span-2">
                <h2 className="text-xl font-bold">Your site and named station</h2>
                <p className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-income-blue" /> {f.site.address}
                </p>
                <div className="rounded-xl bg-paper p-4 text-sm">{data.station_reason}</div>
                {data.suggestion ? <p className="text-xs text-muted-foreground">Representativeness check: {data.suggestion.reason}</p> : null}
                <p className="text-xs text-muted-foreground">Stations are set by rule from your declared address and printed on your schedule. No correction factor is applied. Changes apply from next month.</p>
              </div>
              <div className="lg:col-span-3">
                <StationMap points={points} zoom={14} center={[f.site.lat, f.site.lon]} height={320} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Choose a plan</h2>
              <div className="grid gap-4 md:grid-cols-2" role="radiogroup" aria-label="Plan">
                {data.prices.plans.map((pl) => (
                  <div
                    key={pl.plan}
                    role="radio"
                    tabIndex={0}
                    aria-checked={plan === pl.plan}
                    onClick={() => setPlan(pl.plan as "Lite" | "Standard")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPlan(pl.plan as "Lite" | "Standard");
                      }
                    }}
                    className={cn("cursor-pointer rounded-2xl border-2 p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-income-orange", plan === pl.plan ? "border-income-orange bg-income-orange-100/50" : "border-line hover:border-income-orange-200")}
                  >
                    <p className="font-heading text-lg font-bold">
                      {pl.plan} {plan === pl.plan ? <Check className="inline h-4 w-4 text-income-orange" /> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">S${pl.benefit} a worker for each insured hour</p>
                    <p className="num mt-3 text-2xl font-bold">
                      {sgd(pl.week, 2)}
                      <span className="text-sm font-normal"> a worker a week</span>
                      <AssumptionTag basis={data.prices.basis} label="priced from back-test" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sgd(pl.year, 2)} a year before GST, {sgd(pl.year_gst, 2)} with 9% GST
                    </p>
                  </div>
                ))}
              </div>
              <label className={cn("flex items-start gap-3 rounded-2xl border p-4", plan === "Lite" && "opacity-50")}>
                <Checkbox checked={rider && plan === "Standard"} onCheckedChange={(v) => setRider(!!v)} disabled={plan === "Lite"} aria-label="Add Site Match rider" />
                <span className="text-sm">
                  <span className="font-semibold">Add Site Match</span> (Standard only): upload your site&apos;s heat log for a top-up when your site is hotter than the station. Up to 10 hours a year.{" "}
                  <span className="num font-semibold">+{sgd(data.prices.rider.week, 2)} a worker a week</span>
                  <AssumptionTag basis={data.prices.rider.basis} />
                </span>
              </label>
              <QuoteBox workers={f.outdoor_workers} perWorkerWeek={p.week + riderWeek} before={before} credit={credit} afterCredit={afterCredit} gst={gst} ends={data.prices.launch_credit_ends} />
            </div>
          )}

          {step === 5 && (
            <div className="max-w-2xl space-y-5">
              <h2 className="text-xl font-bold">Please read this before you buy</h2>
              <blockquote className="rounded-2xl border-l-4 border-income-orange bg-income-orange-100/50 p-5 text-lg text-ink">{data.may_not_pay}</blockquote>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} aria-label="I have read this" /> I have read this.
              </label>
            </div>
          )}

          {step === 6 && (
            <div className="max-w-2xl space-y-4">
              <h2 className="text-xl font-bold">Quick check: when does Rehat pay you?</h2>
              <div className="space-y-2" role="radiogroup" aria-label="When does Rehat pay you?">
                {TEACH.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={answer === t.id}
                    onClick={() => setAnswer(t.id)}
                    className={cn(
                      "w-full rounded-xl border-2 p-4 text-left text-sm transition-colors",
                      answer === t.id ? (t.correct ? "border-state-ok bg-state-ok-bg" : "border-state-pending bg-state-pending-bg") : "border-line hover:border-income-orange-200",
                    )}
                  >
                    {t.text}
                  </button>
                ))}
              </div>
              {answer ? (
                <p className={cn("rounded-xl p-4 text-sm", correct ? "bg-state-ok-bg text-state-ok" : "bg-state-pending-bg text-state-pending")} aria-live="polite">
                  {correct
                    ? "Right. We pay from NEA's readings at your named station, not from your site, and you never send a claim form."
                    : "Not quite. Rehat pays from NEA's published readings at your named station when the month is worse than normal. It does not look at your site, and there is no claim form. Your answer is recorded with the explanation."}
                </p>
              ) : null}
            </div>
          )}

          {step === 7 && (
            <div className="max-w-2xl space-y-4">
              <h2 className="text-xl font-bold">The only data we keep</h2>
              <table className="w-full text-sm">
                <tbody>
                  {PDPA.map(([k, why]) => (
                    <tr key={k} className="border-b border-line-soft">
                      <td className="py-2 font-medium">{k}</td>
                      <td className="py-2 text-muted-foreground">{why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm text-muted-foreground">
                No worker names, NRIC or phone numbers. Workers can opt in to heat notices by QR code on their own. We delete your data when the policy ends.
              </p>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} aria-label="I consent" /> I agree Income may use these details for Rehat as described.
              </label>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-state-ok">
                <ShieldCheck className="h-5 w-5" /> Covered from your WIC renewal date. Done in {elapsed} seconds.
              </p>
              <h2 className="text-xl font-bold">Your policy schedule (concept)</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Box k="Business" v={`${f.name} (${f.uen})`} />
                <Box k="Plan" v={`${plan}${rider && plan === "Standard" ? " + Site Match" : ""}, S$${p.benefit} a worker an hour`} />
                <Box k="Insured workers" v={`${f.outdoor_workers} outdoor workers (from WIC)`} />
                <Box k="Named heat station" v={`${st[f.primary_station].name} (${f.primary_station})`} />
                <Box k="Backup station" v={`${st[f.backup_station].name} (${f.backup_station})`} />
                <Box k="Rain gauge" v={`${st[f.rain_gauge].name} (${f.rain_gauge})`} />
                <Box k="Haze" v={`NEA 24-hour PSI, ${f.psi_region} region, at 12:00`} />
                <Box k="Window" v={`Mon to Sat, 08:00 to 18:00, minus ${f.meal_hour}:00 to ${f.meal_hour + 1}:00`} />
                <Box k="Caps" v="20 insured hours a month, 60 a year" />
                <Box k="Premium" v={`${sgd(afterCredit + gst, 2)} incl. 9% GST after launch credit`} />
                <Box k="Teach-back answer" v={correct ? "Correct" : "Explained and recorded"} />
                <Box k="Payment" v="PayNow to your UEN by the 5th working day of next month" />
              </div>
              <div className="rounded-2xl bg-paper p-4 text-sm">
                <p className="text-xs font-semibold text-muted-foreground">SMS you will receive ({data.sms.length} characters)</p>
                <p className="mt-1">{data.sms}</p>
              </div>
            </div>
          )}

          {step !== 0 && step !== 1 && (
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={back} disabled={step <= 2}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => {
                    if (step === STEPS.length - 2) setDoneAt(Date.now());
                    next();
                  }}
                  disabled={!canNext}
                >
                  {step === 7 ? "Confirm and add to WIC" : "Continue"} <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => window.location.assign("/employer/receipt")}>
                  See a sample receipt <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

function Box({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div className="rounded-xl border border-line-soft bg-paper p-3">
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className={cn("font-medium text-ink", big && "num font-heading text-2xl font-bold")}>{v}</p>
    </div>
  );
}

function QuoteBox({ workers, perWorkerWeek, before, credit, afterCredit, gst, ends }: { workers: number; perWorkerWeek: number; before: number; credit: number; afterCredit: number; gst: number; ends: string }) {
  const endsText = new Date(ends).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <p className="text-sm text-muted-foreground">
        Your quote for {workers} workers ({sgd(perWorkerWeek, 2)} a worker a week)
      </p>
      <table className="mt-3 w-full max-w-md text-sm">
        <tbody>
          <Row k="Premium for the year, before GST" v={sgd(before, 2)} />
          <Row k={`Launch credit 30% (year one, ends ${endsText})`} v={`- ${sgd(credit, 2)}`} accent />
          <Row k="After launch credit" v={sgd(afterCredit, 2)} />
          <Row k="GST 9%" v={sgd(gst, 2)} />
          <Row k="You pay for the year" v={sgd(afterCredit + gst, 2)} strong />
          <Row k="Without the launch credit, incl. GST" v={sgd(before * 1.09, 2)} />
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">Price depends only on plan, benefit and headcount.</p>
    </div>
  );
}

function Row({ k, v, strong, accent }: { k: string; v: string; strong?: boolean; accent?: boolean }) {
  return (
    <tr className="border-b border-line-soft last:border-0">
      <td className={cn("py-1.5", strong && "font-semibold")}>{k}</td>
      <td className={cn("num py-1.5 text-right", strong && "text-base font-bold", accent && "text-income-orange-700")}>{v}</td>
    </tr>
  );
}

function AcraBox({ c, demoName }: { c: UenCheck; demoName: string }) {
  const a = c.acra;
  let tone = "bg-paper";
  let title = "";
  let body = "";
  if (!a || a.demo) {
    title = `UEN ${c.uen}: fictional demo firm`;
    body = "Demo UENs start with T99DM and are not sent to ACRA.";
  } else if (a.offline) {
    tone = "bg-state-pending-bg text-state-pending";
    title = `UEN ${c.uen}: ACRA check offline`;
    body = "The format looks right, but the register could not be reached (engine or Wi-Fi off). A real policy would wait for the check.";
  } else if (a.found) {
    tone = a.live ? "bg-state-ok-bg" : "bg-state-pending-bg";
    title = `Found on ACRA's register: ${a.name}`;
    body = `${a.entity_type ?? "Entity"}, status ${a.status ?? "unknown"}, registered ${a.issue_date ?? "unknown"}.${a.live ? "" : " Rehat needs a live company, so a real policy would stop here."}`;
  } else {
    tone = "bg-state-review-bg text-state-review";
    title = `UEN ${c.uen} is not on ACRA's register`;
    body = "Please check the number. A real policy would stop here.";
  }
  return (
    <div className={cn("rounded-xl p-4 text-sm", tone)} aria-live="polite">
      <p className="flex items-center gap-2 font-semibold">
        <Building2 className="h-4 w-4" /> {title}
      </p>
      <p className="mt-1">{body}</p>
      <p className="mt-1 text-xs opacity-80">
        {a && !a.demo && !a.offline ? `Source: ${a.source}${a.checked_at ? `, checked ${a.checked_at.slice(0, 10)}` : ""}. ` : ""}
        {a && !a.demo ? `Concept prototype: the WIC details below belong to the fictional firm ${demoName}, not to this UEN.` : ""}
      </p>
    </div>
  );
}
