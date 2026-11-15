# Model card: receipt explainer

**What it does.** Turns a monthly receipt into plain language in English, Malay, Mandarin, Tamil, Bengali and Burmese, and answers "why wasn't I paid this month?" from the receipt only.

**Numbers are locked.** A template is always built first. If an LLM is configured (`OPENAI_API_KEY`, model from `OPENAI_MODEL`, unverified default), it may rephrase. Every number in its output is parsed and compared with the template's numbers (same multiset). Any change, drop or addition returns the template. Tests: `engine/tests/test_explain.py`.

**Limits.** Translations are drafts pending native-speaker review (shown on screen). Without a key the template is always used. The LLM never sees worker personal data; receipts hold firm-level numbers only.
