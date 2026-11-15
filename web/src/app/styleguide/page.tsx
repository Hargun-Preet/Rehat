import { AssumptionTag, Ellipsis, Money, PageHeader, Section, SourceNote, StateBadge, type HourState } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const colours = [
  ["--income-orange", "Primary, Income orange-500"],
  ["--income-orange-600", "Buttons"],
  ["--income-orange-700", "Orange text on white"],
  ["--income-orange-100", "Tint"],
  ["--income-blue", "Secondary, deep blue"],
  ["--income-blue-600", "Links"],
  ["--paper", "Page background"],
  ["--surface", "Cards"],
  ["--ink", "Text"],
  ["--muted", "Secondary text"],
  ["--line", "Borders"],
  ["--state-triggered", "Triggered"],
  ["--state-not", "Not triggered"],
  ["--state-pending", "Pending"],
  ["--state-ok", "Approved"],
  ["--state-review", "Sent for review"],
];
const states: HourState[] = ["TRIGGERED", "NOT_TRIGGERED", "PENDING", "APPROVED", "REVIEW"];

export default function StyleguidePage() {
  return (
    <>
      <PageHeader eyebrow="Design system" title="Styleguide">
        Tokens sampled from income.com.sg on 15 Nov 2026. Ubuntu for headings, Inter for body, tabular figures for numbers.
      </PageHeader>
      <Section>
        <h2 className="mb-4 text-xl font-bold">Colour</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colours.map(([v, use]) => (
            <div key={v} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="h-16 border-b border-line" style={{ background: `var(${v})` }} />
              <div className="p-3 text-xs">
                <p className="font-mono">{v}</p>
                <p className="text-muted-foreground">{use}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section>
        <h2 className="mb-4 text-xl font-bold">Type</h2>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h1 className="text-4xl font-bold">Rest that is paid for gets taken.</h1>
            <h2 className="text-2xl font-medium">Heading two in Ubuntu 500</h2>
            <p>Body copy in Inter. Plain, direct English. Short sentences.</p>
            <p className="num text-2xl font-semibold">S$128.70 · 10.46 h · 3.19 h</p>
          </CardContent>
        </Card>
      </Section>
      <Section>
        <h2 className="mb-4 text-xl font-bold">Components</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ellipsis</CardTitle>
              <CardDescription>Loader, divider and the payout on its way state.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-8">
              <Ellipsis variant="loader" size="lg" />
              <Ellipsis size="md" />
              <span className="flex items-center gap-2 text-sm">
                Payout on its way <Ellipsis variant="loader" size="sm" />
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>State badges</CardTitle>
              <CardDescription>Label, colour and icon. Never colour alone.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {states.map((s) => (
                <StateBadge key={s} state={s} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Money and assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                Standard premium: <Money value={128.7} withGst /> a worker a year
              </p>
              <p>
                Idle-hour cost about <Money value={10.2} />
                <AssumptionTag basis="Work permit declared salary plus levy, spread over working hours. To confirm with Income." />
              </p>
              <SourceNote>NEA WBGT via data.gov.sg, 31 Oct 2025</SourceNote>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Buttons and badges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button>Get covered</Button>
              <Button variant="secondary">See the receipt</Button>
              <Button variant="outline">Back</Button>
              <Badge>Standard</Badge>
              <Badge variant="secondary">WIC active</Badge>
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}
