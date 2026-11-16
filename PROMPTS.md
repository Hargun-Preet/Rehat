# PROMPTS.md: Codex prompts for the refinement, in order (version 2)

The repo is built. These prompts do not rebuild it. They bring it in line with CONTEXT.md version 2 and make it one cohesive product.

How to use: start a new Codex chat for each prompt. Paste the prompt as written. Every prompt begins and ends the same way so context is never lost. Do not skip the end-of-session step. If a prompt fails halfway, start the next chat with "Continue prompt RN" and Codex will read the worklog.

Standard opening (already in each prompt): "Read AGENTS.md and CONTEXT.md fully before doing anything."
Standard closing (already in each prompt): "Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires."

Order and priority (see PLAN.md section 9):
- Must: R0, R1, R2, R3, R5, R6, R8, R10, R11.
- Should: R4, R7.
- Could: R9.
R0 to R2 run one after another. After R3, the web prompts R4 to R9 can run in parallel on separate branches if two people are on the web app.

---

## R0. Audit the repo against version 2

Read AGENTS.md and CONTEXT.md fully before doing anything. Read PLAN.md too. Do not change product code in this session.

1. Preserve history. If `docs/CONTEXT_v1.md` does not exist, find the previous CONTEXT.md in git history (`git log --oneline -- CONTEXT.md`, then `git show <commit>:CONTEXT.md > docs/CONTEXT_v1.md`). Copy every worklog entry from its section 15 into the new CONTEXT.md section 15, oldest first, above the "context version 2 adopted" entry. Carry the ticks from its section 13 into the "Already built" list in the new section 13.
2. Map what exists. List every route in `/web`, every module in `/engine/rehat`, every API endpoint, every JSON in `/web/public/data`, and every test file. For each, say: works, partly works, or broken. Run `make test` and record the result.
3. Find every mismatch with version 2. Search the whole repo and list file and line for each hit:
   - Retired terms: "Lite", "launch credit", "30%" near "credit", "S$5" benefit, "Site Match" outside the Site Match files.
   - Old economics: "65 / 12 / 5 / 18", "18%", "300 firms", "300-firm", "2.88", "0.77".
   - Wrong rule wording: "45 minutes", "gets 45", "one-fourth", "must stop", "stop work at 33", "15 minutes" described as required, "30 stations".
   - Old lines: "We don't insure the summer", "insure the bad month".
   - Hard-coded numbers that belong in `product.json`: 2.48, 1.55, 128, 2,575, 2,807, 1,565, 9,600, 480, 0.65, 185,400, 12,400.
4. Map old to new. For each route in PLAN.md section 3, say which existing page becomes it and what must change. Name the pages that do not exist yet.
5. Note the demo date the app currently uses, and the firm it uses on each screen.
6. Write all of this to `docs/audit.md` with four sections: what exists, mismatches (a table with file, line, found, should be), route map, risks. End with a recommended order for R1 to R11 for this repo, and say which prompts can be skipped because the work is already done.

Acceptance: `docs/audit.md` exists; the old worklog is in the new CONTEXT.md; no product code changed.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R1. One source of truth for numbers and copy

Read AGENTS.md and CONTEXT.md fully before doing anything. Read `docs/audit.md` and `data/seed/product.json`.

1. Engine: create `engine/rehat/product.py`. Load `data/seed/product.json`, validate it with pydantic models (plans, triggers, limits, work classes, premium split, three-year path, pilot, copy), and expose typed accessors. Fail loudly on a missing key. Add `GET /product`.
2. Web: `make export` copies `product.json` to `web/public/data/product.json`. Create `web/src/lib/product.ts` with TypeScript types and one loader. Create `web/src/lib/copy.ts` that returns the verbatim strings (tagline, hook, human line, may-not-pay sentence, SMS, warranty, worker notice, footer, rule statement, teach-back).
3. Replace every hard-coded number and legal sentence found in the audit with a read from these modules. Work through the audit table top to bottom.
4. Remove the Lite plan and the launch credit from code, seed data, tests and copy. Replace the old premium split with the one in `product.json`.
5. Fix rule wording everywhere using `copy.rule_statement` and the wording rules in AGENTS.md.
6. Write `scripts/check_numbers.py` and a `make check-numbers` target. It must fail when:
   - any string in `copy.never_say` or any retired term ("Lite plan", "launch credit", "gets 45", "one-fourth") appears in `/web/src` or `/engine/rehat`;
   - a literal plan price, split share, path figure or limit appears outside `product.py`, `product.ts`, tests and fixtures (use a list of the exact figures from `product.json`);
   - `web/public/data/product.json` differs from `data/seed/product.json`;
   - an em dash appears in `/web/src`.
   Print file and line for each hit.
7. Add the five source tags to the shared tag component if it only has "assumption" today: published, back-test, simulation, assumption, plan.

Acceptance: `make check-numbers` passes; `make test` passes; a search for "Lite" and "launch credit" in `/web/src` and `/engine/rehat` returns nothing; changing `per_worker_week` for Standard in `product.json` and running `make export` changes the price on every screen that shows it (try it, then change it back).

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R2. Engine: plans by deductible, work classes, misuse rules, economics

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md sections 4, 5 and 8 and PLAN.md section 7.

1. `rules.py`:
   - `allowance(normal_hours, multiple)` takes the plan's multiple from `product.py` (1.5, 1.25, 1.0). No default that hides the plan.
   - `heat_factor(work_class)`: A = 1.0, B = 0.5. Apply to counted heat hours before the allowance. Rain and haze are unchanged.
   - MOM heat action: the first in a policy year forfeits that month's heat payout only. The second cancels heat cover for the rest of the term. Rain and haze still pay. Each produces an audit event and a receipt line in plain words.
   - Warranty: a policy without the recorded warranty tick cannot be issued.
2. `pricing.py`: quote = plan price per worker a year x headcount. Return per week, per year, with and without GST, average year back, worst year back, and "months that pay". Inputs are plan and headcount only. Work class may change counted heat hours, never eligibility or price. Add a test that the function signature accepts nothing else.
3. `ledger.py`: receipt lines name the deductible ("Your deductible for heat in May: 1.25 hours"). Add `would_have_paid(firm, months=12)` that runs the product rules over the last 12 full months before the demo date for each of the three plans and returns, per month, counted hours, deductible, insured hours and payout, plus totals and the premium. If the repo lacks data for part of that window, return what exists and say which months are missing. Never fill a gap with zero.
4. `economics.py` (new): premium split, three-year path, pilot card, "why 65%" table and stress tests, all read from `product.py`, with a function that recomputes the path from firms x workers x price x shares and asserts it equals the stored figures to the dollar.
5. `compliance_log.py` (new): for a station and month, the hourly record inside the cover window: time, heat reading, source (primary, backup, and so on), rest owed in minutes, rain hours, state. Export CSV. PDF can wait for R7.
6. Seed data: regenerate `data/seed/firms.json` with 500 fictional firms. Firm 1 is the demo firm from `product.json`. Average 20 outdoor workers (range 5 to 60), plans 20% Essential, 60% Standard, 20% Plus, classes 80% A and 20% B, sites spread across Singapore. Remove any Site Match plan flag from firms. Keep a `site_match_pilot` boolean on about 5% for the Labs screen.
7. Demo date: read `demo_clock` from `product.json`. If the audit found the repo already pins a different month with a payout, keep the repo's month, write it into `product.json` and CONTEXT.md, and say so in the worklog.
8. API: `POST /quote` (new shape), `GET /would-have-paid?firm=`, `GET /economics`, `GET /compliance-log/{firm}/{month}`. Update `make export` to write all of them for the demo firm and the book.
9. Tests: each plan multiple; class B halves heat only; forfeit then cancel; the worked month in `product.json` produces S$510 on Standard; economics totals are S$4,802,375 premium and S$544,613 profit; a quote for 20 workers on Standard is S$2,575 before GST and S$2,807 after whole-dollar display rounding; no code path prices by anything except plan and headcount.

If the repo's own back-test gives different prices for Essential, Plus or class B than `product.json`, do not replace them. Report both in the worklog with the difference and let the team decide.

Acceptance: `make test` and `make check-numbers` pass; `make export` writes the new JSON; the old endpoints still respond.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R3. Shell: three doors, one firm, shared components

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md section 17 and PLAN.md sections 3, 5 and 6.

1. `AppShell`: header with the text wordmark from `copy.header_wordmark`, a `RoleSwitcher` (Employer, Worker, Income), a "Story" link, a quiet "Labs" link and a "Glossary" button. The switcher remembers the last screen visited in each door. Sub-navigation per door as in PLAN.md section 3. On mobile the sub-navigation is a bottom bar for Employer and a menu for Income. Footer from `copy.footer` on every page.
2. Routes: keep every existing path. Add `/employer` (stub for R6), `/employer/log` (stub for R7), `/labs` (index of Site Match pilot, back-test detail, live map, brief and law map, styleguide). Remove Site Match, back-test, live and compliance from the main navigation. Old links must still work.
3. One demo firm: create a `DemoFirmProvider` that reads `demo_firm` and `demo_clock` from `product.ts`. Every screen takes the firm and the date from it. Remove any screen-local firm or date. A small "Demo: Tanjong Greenworks, 20 workers, Jurong West" chip sits in the Employer door header.
4. Shared components in one folder, each with a styleguide entry: `PageHeader` (door, title, one-sentence answer, primary button), `Money`, `Hours`, `StateBadge`, `SourceTag`, `PlanCard`, `Meter` (counted hours against the deductible, grey up to it, orange above it, pending shown dashed), `WhyDrawer`, `Ellipsis`, `EmptyState`, `ErrorState`. Replace local copies across the app with these.
5. `/glossary` drawer from `product.json`, opened from the header and from any dotted-underlined term.
6. Apply `PageHeader` to every existing page with a real one-sentence answer for each. No page starts with a chart or a table.
7. A 404 page and a route-level error boundary in the same style.

Acceptance: from any screen a user can reach any other in two clicks; switching role never loses the demo firm; every page shows the same header, footer and firm; `/styleguide` shows every shared component; nothing in the main navigation mentions Site Match.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R4. Landing: the story and "what Rehat would have paid you"

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md sections 1, 17 and 18.

Rebuild `/` as one scroll with five short blocks. Keep the existing hero component if there is one and restyle it.

1. Hero. Headline from `copy.tagline`. Sub-line from `copy.hook`. One primary button, "See what it would have paid you", that scrolls to the calculator. One secondary link, "Watch the record day", to `/replay`.
2. The problem in three facts, each with a SourceTag: the rule (`copy.rule_statement`), the salary rule, and "about two-thirds of lost hours are heavy rain". Under them, the heat-day numbers 37, 21, 29.
3. Calculator. Inputs: outdoor workers (default 20, 5 to 60), trade (sets the class, shown as a read-only note), area (sets the station). Output, from `GET /would-have-paid` or the exported JSON:
   - "Weather downtime cost a firm like yours about S$X in the last 12 months." (model, tagged)
   - "Rehat Standard would have cost S$Y and paid S$Z."
   - A 12-month strip: grey bar up to the deductible, orange above it, months that paid marked. A plan toggle redraws it.
   - One honest line under it from `copy.human_line`, and a link "When Rehat does not pay" that opens the may-not-pay sentence.
   If some months have no data, show them as pending with a note. If the 12-month run is not available at all, show the average-year figures from `product.json` and tag them back-test.
   Primary button: "Get cover in 60 seconds" to `/income`.
4. How it works in four steps with small icons: read, count, compare, pay. One line each. Then "Included with every policy": the hourly heat alert and the compliance log.
5. Keep insurer, KYC and fraud content off the employer landing page. The grouped navigation takes Income users to the console.
6. "What owners told us": render only when `data/seed/interviews.json` exists and has entries with `real: true`. Otherwise render nothing. No placeholder text.

Acceptance: a first-time reader can say what Rehat is, what it costs and when it does not pay after 30 seconds on the page; the calculator answers in under 200 ms offline; works at 390 px.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R5. Get cover in four steps

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md section 4 and PLAN.md section 4.

Refactor `/income` and `/onboard`. Reuse the existing form, loader and map components.

`/income` (Account): the WIC card (active, renewal in 30 days, 20 outdoor workers, job class, wage band) and one highlighted offer: "Add Rehat to this renewal" with the Standard price a week and "pays in about 1 in 2 months". Primary button: "Add Rehat".

`/onboard` (Get cover): a four-step flow with a progress bar and a sticky summary that always shows plan, price a week, and price a year with GST. Back never loses input. State survives a refresh.

1. Your firm. UEN field prefilled with the demo UEN. Three-dot loader for "Checking ACRA", "Reading your WIC policy", "Finding your station" (mocked, under 1 second each, skippable). Then a read-only summary: headcount, job class and work class with one line of why ("Landscaping is heavy work, so heat counts in full"), wage band, site area. A small map with the primary and backup station and one line of reason. Link: "Wrong? Update your WIC declaration."
2. Choose your deductible. One sentence above the cards: `copy.human_line`. Three `PlanCard`s, Standard preselected and marked "Most firms". Each card: deductible in words, price per worker a week, price a year for this firm before and after GST, "pays in about N in M months", average year back, worst year back, SourceTag. Under the cards, the 12-month strip that redraws on selection. A "How is this priced?" link opens the three levers from `product.json`.
3. The fine print, honestly. The may-not-pay sentence in a plain bordered box, not small print. The teach-back question with three options; a wrong answer shows `copy.teach_back_explain` and lets the user answer again; the answer and the number of tries are recorded. The warranty tick with `copy.warranty`. The PDPA consent listing the eight fields and why each is needed. "Confirm cover" is disabled until all three are done, and says what is missing.
4. Your schedule. Policy number, plan, named stations, a table of the deductible for each calendar month for heat and rain, limits, the first payout date, the 14-day wait if mid-term, the misuse conditions in two lines, how to dispute (FIDReC). Buttons: "Download schedule" and "Go to home".

Remove Site Match, Lite and the launch credit from this flow.

Acceptance: a new user completes the flow in under 60 seconds with at most four primary clicks after the UEN; the price never disappears from view; every figure matches `product.json`; the flow works with the keyboard only and at 390 px.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R6. Employer home and receipts

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on PLAN.md section 4.

`/employer` (Home, new). Four blocks, top to bottom, each answering one question:
1. Today. Station name, heat reading, `StateBadge`, and one sentence: "Ten-minute breaks this hour" or "No breaks owed right now". If tomorrow's forecast predicts trigger hours, the alert from `copy.forecast_alert`. If data is pending, say so.
2. This month. One `Meter` each for heat and rain (counted against the deductible) and a haze line. One sentence: "N insured hours so far. S$X on its way by <date>." or "Nothing above a normal month yet. You are carrying N of your M deductible hours." A "Why?" link opens the hour list.
3. This year. Premium paid, paid back so far, insured hours used of 60, a 12-month strip.
4. To do. "Share the worker notice" (opens the QR), "Export this month's compliance log", and the checklist of the four measures mandatory from 1 Dec 2026.
PageHeader answer: the sentence from block 2. Primary button: "View receipt".

`/employer/receipt` (Receipts). Refactor the existing page.
- A month picker listing every month in the term with its payout and state (paid, on its way, nothing above normal, pending).
- The receipt: a summary card (insured hours, payout, payment date, PayNow reference), then a table by day of counted hours per peril, then the arithmetic in four lines: counted, minus deductible, equals insured, times S$8 times workers. Every row has a "Why?" drawer with the reading, the station, the source in the fallback ladder and the tier.
- "What did not count, and why": hours outside the window, hours inside the deductible, pending hours, a forfeited month if any.
- "Ask about this receipt": keep the explainer if it exists. Numbers stay locked to the receipt. Template fallback with no key.
- Dispute link, and "Download PDF".
- Deep link: `/employer/receipt?month=2025-10` opens the October 2025 receipt for the replay.

Acceptance: the home sentence, the receipt total and the console agree for the demo month; the worked-month fixture (Bishan, May 2026) still produces S$510 in tests; a month with nothing above normal reads as normal, not as a failure; works at 390 px.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R7. Compliance log, alerts and the worker notice

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md sections 4 and 7.

1. `/employer/log` (new). PageHeader answer: "Hours this month with a heat reading of 32 or more: N. Rest owed: M minutes." A day list; each day expands to the hourly record from `GET /compliance-log`: time, heat reading, source, rest owed, state. Filters: month, "break hours only". Buttons: "Export PDF" and "Export CSV". The PDF header reads "Hourly heat reading record for <firm>, <station>, <month>. Source: NEA. Generated by Rehat." Add one line: "Firms without an on-site meter must check NEA's reading every hour. This log is that record."
2. Optional break log on the same page: "Break started" and "Break ended" buttons for the current hour, stored locally in the demo. A note: "Optional. It never affects a payout. A full year of logs earns a renewal discount (to be tested in the pilot)."
3. Alerts panel: the last five heat alerts and forecast alerts as they would arrive by SMS or WhatsApp, in a phone-message style. Text from `copy.heat_alert` and `copy.forecast_alert`.
4. `/worker`: refactor. Phone frame, language tabs (English plus the five), the notice from `product.json`, a QR code, the badge from `copy.translation_badge`, and one line: "No login. No personal data." Add a "Report: no break given" screen behind the QR that only asks for the site and the hour.
5. A printable A4 worker notice with the QR, from the employer home "Share the worker notice" task.

Acceptance: the log for the demo month exports as a one-page PDF; the worker screen works at 390 px and holds no personal data; the break log is clearly optional.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R8. Income console

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md sections 5 and 9 and PLAN.md section 4.

Refactor `/insurer` into five tabs. Reuse the existing charts. The tab is in the URL (`/insurer?tab=cash`).

1. Overview. PageHeader answer: "Of every premium dollar: 65 cents back to firms, 20 expenses, 5 reinsurance, 10 profit." Four stat cards: firms and workers in the book, premium, loss ratio year to date, next cash call (P50). A single stacked bar for the split with the notes from `product.json`. The three-year path table with the note that year 2 dips because reinsurance starts. The pilot card: 500 firms, premium, expected profit, capped worst case S$4.8M, "Income keeps the risk in the pilot year".
2. Cash. The existing liquidity view: fan chart narrowing by day, P50, P90, P99 for the 5th working day, buffer, daily accrual, the 1 to 3 day forecast, and the forecast validation number. One sentence on top: "Cash needed on <date>: S$X likely, S$Y in a bad month."
3. Risk. Yearly loss-ratio distribution with the stop-loss line at 150% and the contract cap. Toggle El Niño / neutral / La Niña with the mean loss ratio for each. The probabilities table and the stress-test table. One honest line: "Haze is where the price is most likely to be wrong."
4. Pricing lab. The "why 65%" table with the chosen row marked. The three plans side by side. The sliders from the old back-test page embedded below. A collapsed note: "If a dedicated team costs S$250,000 a year, the pilot is about break-even and 20% is reached near 1,200 firms."
5. Review queue. Three lists: pending hours older than 48 h with the gap-fill proposal, MOM-action forfeitures, Site Match pilot flags. Each item shows the reason. Approve and decline buttons write to an audit log shown below. A fairness panel: the only price inputs (plan and headcount) and payout rate by region and firm size.

Every figure carries a SourceTag. Tables right-align numbers and use tabular figures.

Acceptance: an Income finance judge can read the split, the pilot's profit and worst case, and the next cash call within 10 seconds of landing on Overview; all figures match `product.json`; `/backtest` still opens on its own.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R9. Labs: Site Match pilot, back-test detail, live map, brief and law map

Read AGENTS.md and CONTEXT.md fully before doing anything.

1. `/labs`: an index with four cards and one line each. A banner: "Technical detail and pilot ideas. Not part of the core product."
2. `/employer/site-match`: keep the upload and checker. Add a banner "Pilot rider. Not in the core product." and two lines on why: paperwork and an abuse surface. Results stay APPROVED or REVIEW with reasons. Never REJECTED.
3. `/backtest`: keep. Add PageHeader with the four headline numbers. Label the plan each chart refers to.
4. `/live`: keep. Make sure pending is visibly different from not triggered and the fallback source shows.
5. `/compliance`: update every row to CONTEXT.md section 7 version 2 (warranty, forfeiture escalation, the Dec 2026 measures, 20% expense guideline, intermediaries row). Each row links to the screen that satisfies it.

Acceptance: nothing in Labs is needed to follow the main demo; every Labs page says what it is in its first line.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R10. UX polish pass

Read AGENTS.md and CONTEXT.md fully before doing anything. Read PLAN.md section 5. Add no features in this session.

Go through every route in the main navigation, then Labs, at 390 px and at 1440 px. For each screen, check the eleven points in PLAN.md section 5 and fix what fails. Write the result as a table in `docs/ux-review.md` (screen, check, pass or fixed or open).

Also:
1. Copy pass. Read every visible string. Shorten it. Remove jargon using the word table in PLAN.md section 5. Sentence case. No em dashes. Buttons are verbs.
2. Consistency pass. Same spacing scale, same card style, same table style, same chart colours (grey for normal, orange for above normal) on every screen. Replace any remaining local component with the shared one.
3. States. Force empty, loading and error on every screen and screenshot them into `docs/screens/`.
4. Accessibility. Tab through every flow. Visible focus. Labels. Contrast. `aria-live` on values that count up. Reduced motion.
5. Performance. First load under 2 seconds on a laptop. Lazy-load the map and the charts below the fold. No layout shift when numbers load.
6. Offline. Stop the engine and turn off the network. Run `make export`. Open every route. Fix what breaks.
7. Run `make check-numbers` and `make test`.

Acceptance: `docs/ux-review.md` has no open item on a Must screen; the app runs offline end to end; screenshots exist for each main screen at both widths.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## R11. Pitch mode, demo cuts, freeze

Read AGENTS.md and CONTEXT.md fully before doing anything. Focus on CONTEXT.md section 18, PLAN.md section 10 and `docs/pitch-script.md`.

1. `/pitch`: a full-screen guided mode with ten beats matching the ten slides. Arrow keys move. Each beat shows a title, one line from the script, and where useful a deep link into the live screen in the right state. `?cut=a` runs demo cut A (replay, receipt, payment line) and `?cut=b` runs cut B (landing, get cover, home, receipt, console). A small timer in the corner.
2. Reset. A "Reset demo" action (and `?reset=1`) that clears local state so the onboarding starts clean.
3. Numbers freeze. Compare every number on every screen with `product.json`, `docs/pitch-script.md` and CONTEXT.md section 5. List mismatches in the worklog and fix them. Set `frozen_at` in `product.json`.
4. Interviews. If the team has added `data/seed/interviews.json`, check the landing block renders and that each entry is marked `real: true` with a date. If the file is absent, confirm the block is hidden.
5. `docs/judge-pack.md`: the eight scoring items, each answered in one paragraph with numbers and a link to the screen; the must-haves; the legal map; limits and what the pilot must prove; the ten hardest questions with answers from CONTEXT.md.
6. Tag the commit `demo-final`. Write the run steps for demo day in `README.md`: start commands, offline mode, reset, the two cut URLs.

Acceptance: both cuts run with the network off, cut A in 20 seconds and cut B in 90; `make test` and `make check-numbers` pass; the repo is tagged.

Finish by appending a worklog entry to CONTEXT.md section 15 and updating section 13, as AGENTS.md requires.

---

## Quick prompts for during the build

- "Read AGENTS.md and CONTEXT.md. Run `make test` and `make check-numbers`, list failures, fix the smallest one first. Update the worklog."
- "Read AGENTS.md and CONTEXT.md. Open <route> at 390 px. Check it against the eleven points in PLAN.md section 5. Fix what fails. Change nothing else. Update the worklog."
- "Read AGENTS.md and CONTEXT.md. Compare every number shown in the web app with `data/seed/product.json` and list mismatches with file and line. Update the worklog."
- "Read AGENTS.md and CONTEXT.md. The demo must run offline. Stop the engine, run `make export`, open every route and report what breaks. Update the worklog."
- "Read AGENTS.md and CONTEXT.md. Read every visible string on <route>. Rewrite any that a contractor reading on a phone would not understand at once. Keep legal sentences verbatim. Update the worklog."
- "Read AGENTS.md and CONTEXT.md. We changed <number> to <value>. Change it in `product.json` and CONTEXT.md, run `make export`, `make test` and `make check-numbers`, and list every screen where it shows. Update the worklog."
- "Read AGENTS.md and CONTEXT.md. We interviewed owners. Here are the notes: <paste>. Create `data/seed/interviews.json` with one entry per call (date, trade, crew size, what they do on a hot day, what they do in heavy rain, whether they would pay about S$2.50 a worker a week, one short quote if they agreed to be quoted, `real: true`). Do not add anything they did not say. Update CONTEXT.md section 19 and the worklog."
