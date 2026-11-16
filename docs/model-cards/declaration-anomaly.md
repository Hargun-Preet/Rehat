# Model card: declaration anomaly flags

**What it does.** Flags WIC declarations that look unusual: outdoor headcount above total employees, sudden headcount jumps at renewal, top wage band for a tiny firm, very low paid-up capital for the headcount, or an unusual mix found by an isolation forest.

**What it never does.** It never changes a price or a payout and never rejects. A flag asks a person to check the declaration. Inputs are firm-level only: no nationality, age, health, gender or worker data.

**Historical baseline only.** The last run used the pre-v2 300-firm demo book with 8 seeded anomalies (fictional ACRA size and capital): 12 flagged, 8 true, 4 false, 0 missed (precision 67%, recall 100%). Re-run it against the current book before showing these figures in Labs or the console.
