import Link from "next/link";
import { ArrowRight, Briefcase, Bike, CloudRain, HardHat, ShieldCheck, Store, Users } from "lucide-react";

import { AssumptionTag, Ellipsis, PageHeader, Section } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadJSON } from "@/lib/data";
import { sgd } from "@/lib/format";
import type { Pricing } from "@/lib/types";

type Onboarding = { firm: { uen: string; name: string; outdoor_workers: number; wage_band: string; wic_policy_no: string; site: { address: string } } };

export default async function IncomeHub() {
  const [ob, pr] = await Promise.all([loadJSON<Onboarding>("onboarding.json"), loadJSON<Pricing>("pricing.json")]);
  const f = ob.firm;
  const std = pr.plans.find((p) => p.plan === "Standard")!;
  const annual = std.year * f.outdoor_workers;
  return (
    <>
      <PageHeader eyebrow="Income Business account (mock)" title={`Good morning, ${f.name}`}>
        Your Income policies in one place. This is a concept mock with a fictional firm; nothing here is connected to Income&apos;s systems.
      </PageHeader>
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <HardHat className="h-5 w-5 text-income-blue" /> Work Injury Compensation
                </CardTitle>
                <Badge className="bg-state-ok-bg text-state-ok">Active</Badge>
              </div>
              <CardDescription>Policy {f.wic_policy_no}. Renews in 30 days.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Field k="Declared outdoor workers" v={String(f.outdoor_workers)} />
              <Field k="Wage band" v={f.wage_band} />
              <Field k="Site" v={f.site.address} />
              <Field k="UEN" v={f.uen} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <Briefcase className="h-5 w-5 text-income-blue" /> SmartBiz 360
                </CardTitle>
                <Badge className="bg-state-ok-bg text-state-ok">Active</Badge>
              </div>
              <CardDescription>Income&apos;s package for small businesses (launched Oct 2026).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Income&apos;s own open question is how to extend a simple package like this to climate income loss without damage: heat, haze and flash floods. Rehat is one answer, offered as a &quot;Weather downtime&quot; section.
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section>
        <div className="relative overflow-hidden rounded-2xl border-2 border-income-orange bg-surface p-6 shadow-[var(--shadow-raised)] sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-sm font-semibold text-income-orange-700">
                <Ellipsis size="sm" /> Offer at your WIC renewal
              </p>
              <h2 className="mt-2 text-2xl font-bold">Add Rehat to your WIC renewal</h2>
              <p className="mt-2 text-muted-foreground">
                When NEA&apos;s heat, rain or haze readings at your named station are worse than a normal month, we pay S$8 a worker for each extra hour, by PayNow, before payroll. Same renewal, no new forms.
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-income-orange-100 p-5 text-center">
              <p className="text-sm text-muted-foreground">For your {f.outdoor_workers} workers</p>
              <p className="num font-heading text-3xl font-bold text-ink">
                {sgd(annual)}
                <span className="text-base font-normal"> a year</span>
              </p>
              <p className="text-xs text-muted-foreground">
                before 9% GST, {sgd(std.week, 2)} a worker a week
                <AssumptionTag basis={pr.expected_insured_h_basis} label="priced from back-test" />
              </p>
              <p className="mt-1 text-xs font-medium text-income-orange-700">30% launch credit in year one, ends 31 Dec 2027</p>
              <Button asChild className="mt-4 w-full">
                <Link href="/onboard">
                  Add Rehat <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <h2 className="mb-4 text-xl font-bold">Coming later (concept)</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Roadmap Icon={Store} t="Stallholder Insurance: haze section" d="Phase 3. Hawker centres are roofed, so rain is weak; a haze section fits better." />
          <Roadmap Icon={Bike} t="Platform worker WIC: riders" d="Phase 2. Income is a designated insurer under the Platform Workers Act; the platform is the natural payer." />
          <Roadmap Icon={CloudRain} t="Droplet heritage" d="Income ran Droplet, a parametric rain cover, in 2018. Rehat builds on that experience with a payer and a channel." />
        </div>
      </Section>
      <Section>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> <Users className="h-4 w-4" /> Fictional firm, policy numbers and UEN. Income products named for context only; integrations are mocked.
        </p>
      </Section>
    </>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className="font-medium text-ink">{v}</p>
    </div>
  );
}

function Roadmap({ Icon, t, d }: { Icon: typeof Store; t: string; d: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <Icon className="h-5 w-5 text-income-blue" /> {t}
        </CardTitle>
        <Badge variant="outline" className="w-fit">
          Concept
        </Badge>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{d}</CardContent>
    </Card>
  );
}
