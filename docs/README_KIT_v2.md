# Rehat context kit, version 2: historical installation note

> The kit has already been adopted in this repository. Do not repeat the installation steps below. Use the root `AGENTS.md`, `CONTEXT.md`, `PLAN.md`, `PROMPTS.md` and `data/seed/product.json` as the active sources.

This kit updates the four context files in your repo to match the version 6 deck and pitch, and adds a plan for turning the existing build into one cohesive product. It does not contain code. Codex writes the code from the prompts.

## What is in the kit

| File | Goes to | What it is |
|---|---|---|
| `CONTEXT.md` | repo root (replace) | The single source of truth. Product spec, numbers, law, decisions, status, worklog. Sections 16 to 19 are new |
| `PLAN.md` | repo root (replace) | Screens, journeys, UX standards, engine changes, time plan to the pitch |
| `AGENTS.md` | repo root (replace) | Rules Codex follows in every session |
| `PROMPTS.md` | repo root (replace) | Twelve refinement prompts, R0 to R11, in order |
| `data/seed/product.json` | `data/seed/` (new) | Every plan term, price, split, path figure and verbatim sentence in machine-readable form |
| `docs/pitch-script.md` | `docs/` (new) | The version 6 pitch, 700 words, ten slides |
| `README_KIT.md` | `docs/` or delete | This file |

## Install in five minutes

1. Commit what you have, so the old files are in git history: `git add -A && git commit -m "Before context kit v2"`.
2. Copy the kit over the repo root. The four context files are replaced. The two new files are added.
3. Your old worklog is not lost. Prompt R0 pulls the previous CONTEXT.md out of git, saves it as `docs/CONTEXT_v1.md` and copies every worklog entry into the new file. Do not skip R0.
4. Commit: `git commit -am "Adopt context kit v2"`.
5. Open a new Codex chat and paste prompt R0 from PROMPTS.md.

## Order of work

R0 audit, R1 single source of truth, R2 engine. Then R3 shell. Then R5 and R6 (the employer journey), R8 (Income console), R4 and R7 if there is time, R9 last. R10 is the polish pass. R11 is pitch mode and the freeze. PLAN.md section 9 has this as a time plan with what to cut first.

Stop adding features on Monday evening. Rehearse on Tuesday morning with the engine stopped and Wi-Fi off.

## What changed from version 1, in one screen

- Plans are Essential, Standard and Plus, set by deductible. S$8 an hour on all. Lite is gone. The launch credit is gone.
- Every policy includes an hourly heat alert and a compliance log.
- Site Match moves to Labs as a pilot rider. It is out of onboarding and out of the main demo.
- Premium split is 65 / 20 / 5 / 10. The pilot is 500 firms, S$1.29M premium, S$0.19M expected profit, S$4.8M capped worst case.
- The rule is quoted correctly: 10 minutes at 32 is mandatory, the framework sets 15 at 33. The hook is "pays for 60 minutes and gets 50".
- The app becomes three doors (Employer, Worker, Income) with one demo firm and one demo date on every screen.
- Numbers and legal sentences live in `product.json`. `make check-numbers` fails the build if a screen drifts.
The full table is CONTEXT.md section 16.

## Things the team must decide or check (not Codex)

1. Reachable market. The deck says 3,100 employers are reachable first. An older estimate put Income's share of small-firm WIC near 12%, which is about 1,480 firms. If that is closer to the truth, a 500-firm pilot needs a third of Income's small outdoor WIC customers, or association channels from day one. Ask an Income mentor for the real share before the pitch, and have the answer ready.
2. Is 15 minutes at 33°C mandatory or recommended? Open MOM's heat stress FAQ page and check. Until then keep the current wording.
3. Owner interviews. No owner has been interviewed. The landing block stays hidden until `data/seed/interviews.json` has real entries. Use the last quick prompt in PROMPTS.md to add them.
4. Product name. One mentor session used "HeatGuard". The deck, script and this kit use Rehat. Pick one before the freeze. If it changes, change `product.name` in `product.json`.
5. Demo date. The kit pins the offline demo to 29 May 2026. If your build already pins another month with a payout, keep yours. R2 handles this.
6. Simulated plan prices. Essential and Plus prices come from a simulation calibrated to the back-test, not from the prior engine's price output. Work class changes counted heat hours, never price. Do not let the app and the deck show different prices.
7. Translations of the worker notice need a native speaker for each language.
8. Colours. Sample the exact orange and blue from income.com.sg and replace the placeholders in `tokens.css`.

## Not in the kit

The seed data and source assets from the first kit (`d1031.csv`, `ai_usecases.py`) are already in your repo and are unchanged. The deck is `Rehat_pitch_deck_v6.pptx`, sent separately.
