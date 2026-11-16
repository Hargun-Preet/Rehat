# PLAN.md: how we finish Rehat and win with it (version 2)

Version 2, Sun 15 Nov 2026. The repo is already built. This plan is about turning a set of working screens into one product that a contractor could use without help, and that matches the version 6 deck number for number. Read CONTEXT.md first. Section 16 there lists what changed.

## 1. What wins this room

The room needs a product Income could pilot, not a weather dashboard or chatbot: one tick box, a price a contractor understands, a payout they can check, and a profit line inside Income's 20% expense limit.

Three moments the demo must deliver, in this order:
1. "What Rehat would have paid you", then cover in 60 seconds. The landing page shows Tanjong Greenworks its last 12 months with and without Rehat. One click starts onboarding: firm details pulled from WIC, choose a deductible, read the honest sentence, done. (Employer-friendly. The founder mentor asked for exactly this.)
2. The record day to the receipt. Replay 31 Oct 2025 on real NEA readings. The meter fills, the month closes, the receipt lists every counted hour, and PayNow goes out. (Concrete and true.)
3. The Income console. 65 / 20 / 5 / 10 of every premium dollar, the three-year path, next month's cash call, and a worst case capped in the contract. (What the finance and data judges need.)

Site Match is no longer a demo moment. It sits under Labs as a pilot rider.

## 2. What changed from version 1 and what it means for the code

| Change | Work in the repo |
|---|---|
| Plans are now Essential, Standard, Plus, set by deductible. S$8 on all | Replace the plan model. Remove Lite everywhere |
| No launch credit | Remove the 30% credit from pricing, quotes and copy |
| Work classes A and B | Add a heat factor by class, set from the WIC job class |
| Premium split 65 / 20 / 5 / 10 and a 500-firm pilot | New economics module and console panels. Demo book grows from 300 to 500 firms |
| Free heat alert and compliance log | New employer screen and PDF export |
| Misuse conditions | Warranty tick at purchase; forfeit on first MOM action, cancel heat cover on second; worker QR notice |
| Site Match demoted | Move route under Labs, remove from onboarding, landing and main nav |
| Rule wording fixed | Replace "15 minutes at 33" claims and "45 minutes" with the wording in CONTEXT.md section 3 |
| One source for numbers | `data/seed/product.json` read by engine and web; `make check-numbers` |
| Twelve loose routes | Three doors with a role switcher and one demo firm |

## 3. Information architecture: three doors, one firm

Header: Rehat wordmark, a role switcher (Employer, Worker, Income), a "Story" link and a quiet "Labs" link. The required footer disclosure remains on every page.

| Door | Route | Screen | The one job | Primary button |
|---|---|---|---|---|
| Story | `/` | Landing | Understand Rehat in 30 seconds and see what it would have paid | See what it would have paid you |
| Story | `/replay` | Record day | Watch a real day turn into a payout | Open the receipt |
| Employer | `/income` | Account | See the WIC policy and add Rehat at renewal | Add Rehat |
| Employer | `/onboard` | Get cover | Buy in four steps, 60 seconds | Confirm cover |
| Employer | `/employer` | Home (new) | Know where this month stands | View receipt |
| Employer | `/employer/receipt` | Receipts | Check a payout line by line | Download PDF |
| Employer | `/employer/log` | Compliance log (new) | Show an inspector the hourly record | Export log |
| Worker | `/worker` | Notice | Know pay is not cut and where to report | (none, read only) |
| Income | `/insurer` | Console | Tabs: Overview, Cash, Risk, Pricing lab, Review queue | Per tab |
| Labs | `/labs` | Index (new) | Find the technical detail | |
| Labs | `/employer/site-match` | Site Match pilot | Check a site heat log | Check log |
| Labs | `/backtest` | Back-test detail | Sliders and validation | |
| Labs | `/live` | Live map | Stations and hour states now | |
| Labs | `/compliance` | Brief and law map | Every constraint mapped to a screen | |
| | `/pitch` | Pitch mode | Step through the ten beats | Arrow keys |
| | `/glossary` | Drawer | Twelve terms in plain words | |

Keep every existing route path. Add only `/employer`, `/employer/log`, `/labs` and `/glossary`. `/backtest` keeps working and is also embedded as the console's Pricing lab tab. Do not rename routes this late.

The demo firm on every screen: Tanjong Greenworks Pte Ltd, landscaping, class A, 20 outdoor workers, Jurong West, Standard plan, owner Mr Tan. Read it from `product.json`.

The demo date on every screen: 29 May 2026 in offline mode. The engine computes the demo firm's month at its own station. The S$510 worked month is a Bishan test fixture and can differ from it. The replay is 31 Oct 2025 and opens the October 2025 receipt. Read both from `demo_clock` in `product.json`. If the repo already pins another month with a payout, keep it and update the file.

## 4. Primary journeys

### Employer: from landing to covered (target 60 seconds, 3 clicks to a quote)
1. Landing. Headline: "Rest that is paid for gets taken." Under it, the calculator: workers (default 20), trade, area. Result: "In the last 12 months heat, rain and haze cost a firm like yours about S$12,000. Rehat Standard would have cost S$2,575 and paid S$x." A month-by-month bar strip shows which months paid.
2. Account. WIC card: active, renewal in 30 days, 20 outdoor workers declared. One offer card: "Add Rehat to this renewal. S$2.48 per worker a week."
3. Get cover, four steps:
   - Your firm. UEN, then a three-dot loader for the mock pulls. Headcount, job class and wage band come from WIC and are read only. Station shown on a small map with one line of reason.
   - Choose your deductible. Three PlanCards. Each shows price a week, price a year for this firm before and after GST, "pays in about 1 in 2 months", average year back, worst year back. A 12-month strip under the cards redraws as the plan changes: grey up to the deductible, orange above it.
   - The fine print, honestly. The may-not-pay sentence. The teach-back question. The warranty tick. The PDPA consent listing the eight fields.
   - Your schedule. Named stations, the allowance for each month, limits, first payout date, "Download schedule".
4. Home.

### Employer: a month with Rehat
Home answers four questions top to bottom: Is today a break day? Where does this month stand? What did I get? What must I do?
- Today strip: heat reading at the station, state badge, "Ten-minute breaks this hour" or "No breaks owed". Tomorrow's forecast alert if any.
- This month: one Meter per peril, counted hours against the deductible, with the insured part in orange. One sentence, for example: "3.2 insured hours so far. S$510 on its way by 5 June."
- This year: paid in S$x, back S$y, hours left before the limit.
- Tasks: "Share the worker notice" (QR), "Export this month's compliance log", the Dec 2026 MOM checklist.

### Worker
Phone frame. The notice in five languages. "Your pay is not cut. No break? Scan to tell us." No login, no personal data.

### Income
- Overview: four stat cards (firms, premium, loss ratio year to date, next cash call), the planned 65 / 20 / 5 / 10 allocation and the observed 61% back-test result, the three-year path table, and the pilot card with its S$4.8M cap.
- Cash: fan chart narrowing through the month, P50, P90, P99 for the 5th working day, forecast validation number.
- Risk: yearly loss-ratio distribution, El Niño / neutral / La Niña toggle, stop-loss line at 150%, stress-test table.
- Pricing lab: the "why 65%" table, plan comparison, sliders from the old back-test page.
- Review queue: pending hours past 48 h, MOM-action forfeitures, Site Match pilot flags. A person decides. Audit log.

## 5. UX standards (the per-screen checklist)

Every screen passes all of these before it is called done:
1. One job and one primary button. Other actions are secondary or under "Details".
2. The first line is the answer, in plain words, with one number.
3. Works at 390 px wide (employer and worker screens first) and at 1440 px.
4. Every number has a unit, a period and a SourceTag (back-test, simulation, assumption, published, plan).
5. Every counted hour has a "Why?" that opens the reading, the tier and the deductible.
6. States carry a label and an icon, never colour alone.
7. Empty, loading (three dots) and error states exist.
8. Keyboard reachable, visible focus, labels on inputs, contrast 4.5:1 for text.
9. No number or legal sentence typed into a component. Read from `product.json`.
10. Copy follows AGENTS.md: plain, short, no em dashes, sentence case, none of the "never say" lines.
11. Footer disclaimer present.

Shared components, used everywhere: `Money`, `Hours`, `StateBadge`, `SourceTag`, `PlanCard`, `Meter`, `Ellipsis`, `PageHeader`, `WhyDrawer`, `RoleSwitcher`, `PrototypeFooter`. If two screens show the same thing differently, that is a bug.

Words to use and avoid in employer screens:
| Use | Not |
|---|---|
| Heat reading (WBGT) | Wet bulb, WGTT |
| Deductible (a normal month plus your buffer) | Attachment point, strike |
| Insured hour | Trigger unit |
| Station | Index, reference point |
| Pays in about 1 in 2 months | 48% trigger probability |
| Weather downtime cover | Parametric insurance |

## 6. Visual system

Applied consistently across the product.
- Tokens in `web/src/styles/tokens.css`: `--income-orange #F26722`, `--income-blue #1B3A6B` (placeholders until sampled from income.com.sg), `--paper #FAF7F2`, `--ink #1A1D21`. States: triggered orange, not triggered slate, pending amber with a dashed border.
- Ubuntu for headings, Inter for body, tabular figures for numbers.
- Three orange dots as loader, divider and "payout on its way".
- Cards with a 1 px border and 16 px radius. One accent colour per screen. Orange means "insured" or "act". Do not use it for decoration.
- Motion only to explain: a meter filling, a number counting, a plan strip redrawing. Under 400 ms. Respect reduced-motion.
- Aceternity for the landing hero, the onboarding loader and the replay only. Everything else is shadcn and 21st.dev blocks restyled to tokens.
- Charts: one message per chart, direct labels, no legend when one series, grey for "normal", orange for "above normal".

## 7. Engine changes

| Module | Change |
|---|---|
| `product.py` (new) | Loads and validates `data/seed/product.json`. Every other module imports terms from here |
| `rules.py` | `allowance(normal, multiple)` takes the plan's multiple (1.5, 1.25, 1.0). Add `heat_factor(work_class)`. Forfeit logic: first MOM action forfeits the month's heat payout, second cancels heat cover. Warranty flag on the policy |
| `pricing.py` | Three deductible plans. Remove Lite and the launch credit. GST. Quote depends only on plan and declared outdoor headcount; work class changes counted heat hours, never price. |
| `economics.py` (new) | Premium split, three-year path, pilot card, "why 65%" table, stress tests. Reproduces `product.json` to the dollar |
| `ledger.py` | Receipt lines name the deductible. Add `would_have_paid(firm, last_12_months)` for the landing calculator, per plan |
| `compliance_log.py` (new) | Hourly record per station: reading, source, rest owed, state. PDF and CSV export |
| `liquidity.py` | Book is 500 firms. Otherwise unchanged |
| `sitematch.py` | Unchanged. Flag results as "pilot rider" |
| `api.py` | Add `GET /product`, `POST /quote` (new shape), `GET /would-have-paid`, `GET /economics`, `GET /compliance-log/{firm}/{month}` |
| Seed data | `firms.json`: 500 fictional firms, 20 workers on average, plans 20% Essential, 60% Standard, 20% Plus, classes 80% A, 20% B. Tanjong Greenworks is firm 1 |
| Tests | Each plan multiple, class B heat factor, forfeit escalation, the S$510 worked month, economics totals (S$4,802,375 premium, S$544,613 profit), no Lite and no launch credit anywhere |

Simulated plan prices (Essential, Plus, class B) come from `product.json`, tagged simulation. If the repo's own back-test can price them, show both and say which is which. Do not silently replace a deck number.

## 8. AI: in the interface, never in the payout

| Use | Where | Guardrail |
|---|---|---|
| Read the WIC schedule and quote in minutes | Onboarding step 1 (mocked pull; optional document read) | The user sees and confirms every extracted field |
| Explain every receipt | "Ask about this receipt" | Numbers locked and re-checked against the receipt. Falls back to a template |
| Turn the forecast into a warning | Employer home, worker notice | Never changes a payout or a price |
| Check data and declarations | Gap-fill for pending hours, declaration anomalies, Site Match pilot | Flags only. A person decides. AI never rejects |

Say it in one line everywhere: "Rules decide the payout. AI sits in the interface."

## 9. Time plan from now to the pitch

It is Sunday night. The pitch is Tuesday. Work in this order and stop adding features on Monday evening.

| Block | Must (do these or the demo is wrong) | Should | Could |
|---|---|---|---|
| Sunday night | R0 audit. R1 single source of truth. R2 engine changes with tests | | |
| Monday morning | R3 shell and role switcher. R5 onboarding in four steps. R6 employer home and receipt | R4 landing calculator | |
| Monday midday | Owner calls from the BCA register (product and pitch lead). R8 Income console | R7 compliance log and worker notice | |
| Monday afternoon | R10 polish pass at 390 px and 1440 px. Offline check | R9 Labs tidy | Receipt chat, live map polish |
| Monday evening | R11 pitch mode, numbers freeze. Code freeze | Judge pack | |
| Tuesday morning | Two full rehearsals with a timer. Demo with Wi-Fi off | | |

If time runs short, cut in this order: Labs polish, compliance log PDF, landing calculator animation, receipt chat. Never cut R1, R2, R5, R6 or the offline check.

Roles:
- Engine lead: R1 engine side, R2, exports.
- Web lead: R3, R5, R6, R10.
- Second web or AI lead: R4, R7, R8, R9.
- Product and pitch lead: owner calls, `interviews.json`, deck, rehearsals, judge questions.

## 10. Demo script

The pitch is ten slides in 4 minutes 50 seconds (`docs/pitch-script.md`). The app appears twice.

Cut A, 20 seconds, inside slide 5 ("How Rehat works"):
1. `/replay` already open on Tanjong Greenworks. Press play. The heat meter passes the deductible and turns orange.
2. Click "Open the receipt". Point at one line: hour, reading, station.
3. Point at the payment line: PayNow by the 5th working day. Back to slides.

Cut B, 90 seconds, for questions or a booth:
1. Landing: type 20 workers. "It would have cost S$2,575 and paid S$x."
2. Get cover: pick Standard, read the honest sentence aloud, answer the teach-back, confirm.
3. Home: this month's meters, the alert, the compliance log button.
4. Receipt: one "Why?" drawer.
5. Role switch to Income: the target allocation and observed back-test result, the pilot card, the cash call.

Rehearse both with the engine stopped.

## 11. Risks

| Risk | What we do |
|---|---|
| Numbers differ between deck, script and app | `product.json` and `make check-numbers`. Freeze on Monday evening |
| Old plan names or the launch credit survive on some screen | R1 greps for "Lite", "launch credit", "45 minutes", "one-fourth". The check fails if any remain |
| A judge asks about the rule and we misquote it again | Rule sentence lives in `product.json` and is shown on the landing page and worker notice |
| "A rule is not what owners do" | Monday calls. The block renders only with real entries |
| Venue Wi-Fi | Offline JSON mode, tested Tuesday morning |
| The demo looks like disconnected screens | Role switcher, one firm, shared components, R10 pass |
| "20% expenses is not realistic for a pilot" | Backup answer in CONTEXT.md section 5 and a line in the Pricing lab |
| Looks like impersonating Income | Text wordmark, footer, fictional firms, "proposed" |
| Translations wrong | Badge "Translations pending native-speaker review" |
| A late refactor breaks the demo | Keep route paths. Small commits. Tag `demo-safe` after each passing offline run |
