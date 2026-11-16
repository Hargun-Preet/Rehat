# Version 2 adoption audit (historical R0 baseline)

Audited 2026-11-16 after the v2 context kit was promoted to the repository root. The v1 context is preserved in `docs/CONTEXT_v1.md`.

> This is the R0 migration snapshot, not a statement of the current product state. Use the root `CONTEXT.md`, `data/seed/product.json` and the current worklog for active requirements and readiness. The findings below describe what was present before the refinement work.

## What exists

| Area | Inventory | Status | Notes |
|---|---|---|---|
| Routes | `/`, `/income`, `/onboard`, `/employer`, `/employer/receipt`, `/worker`, `/replay`, `/insurer`, `/pitch` | Partly works | The main employer journey exists, but it still uses v1 plans, launch credit and more than one demo state. |
| Labs candidates | `/backtest`, `/live`, `/compliance`, `/employer/site-match`, `/styleguide` | Partly works | All route files exist. They are exposed as proof rather than grouped under Labs. Site Match is still presented in the employer flow. |
| Shell | `AppShell`, `PageHeader`, icon tiles, state badges, source notes | Partly works | The visual foundation is strong. Navigation says “Proof” rather than Labs and activates Employer on `/income`. |
| Engine | `anomaly`, `api`, `backtest`, `explain`, `export`, `gapfill`, `judgepack`, `ledger`, `liquidity`, `pricing`, `rules`, `sitematch`, `stations`, `uen`, WBGT and ingest modules | Partly works | The v1 deterministic engine and tests work. It has Lite, launch credit, a 300-firm book and the old economics. |
| API | Health, stations, ledger, receipt, quote, backtest, reinsurance, liquidity, Site Match, explain, compliance, live and UEN endpoints | Works | v2 product, economics, compliance-log and would-have-paid endpoints are not present. |
| Offline data | 58 JSON files: anomaly, backtest, grid, book, compliance, fairness, gapfill, liquidity, live, metadata, numbers, onboarding, pricing, 40 receipts, index, replay, Site Match, stations, validation and worker copy | Partly works | Existing files are generated and render offline. They carry v1 plan data and two firms. |
| Tests | `test_backtest`, `test_explain`, `test_ingest`, `test_ledger`, `test_liquidity`, `test_pricing`, `test_rules`, `test_sitematch`, `test_smoke`, `test_uen` | Works | `make test` passes: 126 tests. v2 product, plan, work-class, economics and compliance-log coverage is absent. |
| Links | Header, CTA, replay, pitch and compliance links | Works | Every static internal link resolves to an existing route. Route semantics still need v2 navigation work. |

## Mismatches

| File or area | Found | Should be |
|---|---|---|
| `engine/rehat/{pricing,rules,seedgen,api,judgepack}.py` | Lite benefit, 30% launch credit, 300 firms, 65/12/5/18 split | Essential, Standard and Plus by deductible; no credit; 500-firm pilot; 65/20/5/10. |
| `web/src/app/{page,income/page,onboard/Onboard,employer/page,pitch/page}.tsx` | Lite, launch credit, Site Match in onboarding and the old eight-beat pitch | v2 three plans, no credit, Site Match under Labs, ten-beat pitch. |
| `web/src/components/brand/nav.ts` and `AppShell.tsx` | “Proof”, Site Match in main navigation, Employer active on `/income` | “Labs”, Labs-only technical/pilot routes, correct Income door state. |
| `web/public/data/*` | v1 prices, credit, two default firms, October 2026 receipt status | Re-export v2 product data for one Tanjong Greenworks, Jurong West, May 2026 demo state. |
| `engine/rehat/ledger.py` and receipt JSON | “prototype's data pull” in hour explanations | Clear pending-data wording without demo framing. |
| `web/src/app/{page,worker/Worker}.tsx` | “paid rest”, obsolete rule framing, long landing timeline | Correct 10-at-32 and 60-paid/50-worked wording; concise employer story. |
| Pricing decision | Current engine: S$2.31/wk and about S$1,565 expected payout for 20 workers. | Use S$2.48 as the cautious Standard price, retain the observed S$1,565 payout for 20 workers and label the resulting historical loss ratio as about 61%. Do not claim the 26-year run itself supports 65%. |
| Stop-loss | Current generated history reaches 150% in 0 of 26 years | Explain the layer as protection for the 2015-like haze stress, not as proven historical recovery. |
| Concept language | Non-footer mentions in shell, metadata, onboarding, worker, income, employer and generated JSON | Remove product-facing mentions. Retain the mandatory footer disclosure required by the project rules. |

## Route map

| V2 role | Existing route | Required change |
|---|---|---|
| Story landing | `/` | Replace repeated steps with a “what Rehat would have paid you” calculator and a short story. |
| Story replay | `/replay` | Keep, pin to Tanjong Greenworks and link October 2025 receipt. |
| Employer account | `/income` | Make this the Income account and WIC renewal entry point. |
| Get cover | `/onboard` | Keep four steps; change cover choice to deductible plans and remove rider/credit. |
| Employer home | `/employer` | Open on today’s heat reading, deductible progress, alert and named stations. |
| Receipts | `/employer/receipt` | Keep evidence detail, single firm/default month and clear provisional state. |
| Compliance log | new `/employer/log` | Add in R7. |
| Worker notice | `/worker` | Keep the notice, remove judge-facing rationale and correct copy. |
| Income console | `/insurer` | Reshape into v2 Overview, Cash, Risk, Pricing and Review views. |
| Labs index | new `/labs` | Add cards for Site Match, back-test, live map and law map. |
| Site Match pilot | `/employer/site-match` | Keep route, label pilot rider, remove from the main journey. |
| Technical routes | `/backtest`, `/live`, `/compliance` | Keep existing paths and surface them only from Labs. |
| Pitch | `/pitch` | Replace eight beats with the ten-beat v2 script. |

## Risks and recommended order

1. The current branch is dirty. Preserve the v1 context and existing worklog before migration. This was completed in `docs/CONTEXT_v1.md`.
2. Pricing is now settled: customer price depends only on plan and declared outdoor headcount. Work class changes counted heat hours, never price.
3. The map chunk can fail in development. A local map error boundary now keeps onboarding usable while the map is unavailable.
4. Do not run `next build` beside `next dev`, because both write `.next`. Use TypeScript and lint while the preview is running; restart the preview only after production validation.
5. Implement R1 and R2 first, then R3, R5, R6 and R8. R4 and R7 can follow. Do R9, R10 and R11 after the core product is coherent.
