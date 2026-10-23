# AI efficiency: fewer calls and tokens at the same accuracy

October 2026. Compares the resume match pipeline before and after the efficiency work
(`resume-match.v5` → `v6`).

## What changed

|                                            | v5 (before)                                           | v6 (after)                                                                                 |
| ------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Calls per analysis                         | 2 in parallel (match + role insights)                 | 1                                                                                          |
| Rules sent with each call                  | Verbatim reference, ~9,000 tokens                     | Condensed rulebook, ~900 tokens                                                            |
| Job description                            | Sent in full on every call                            | Boilerplate removed (company blurb, benefits, EEO, how to apply); sent only the first time |
| Re-analysis after a resume change          | Re-reads the job and rebuilds the requirement list    | Sends the saved requirement list; judges only the resume                                   |
| Same resume text + same job analyzed again | Re-run unless it was this application's latest result | Copied from any earlier analysis of yours; no AI call, not charged                         |
| Main model overloaded (503)                | 3 retries, up to 90 s each                            | Hands over to `GEMINI_FALLBACK_MODEL` at once                                              |
| Per-minute rate limit (429)                | Mistaken for the daily quota; failed at once          | Waits the few seconds Gemini asks for, then retries                                        |

## Evaluation

`npm run eval:ai` (`src/lib/ai/analysis/eval.live.test.ts`) runs 4 fictional cases
(backend, frontend, data analyst, digital marketing). Each analyzes resume v1, then an
improved v2, the way users re-analyze after uploading a new version. Ground truth per case
(`__fixtures__/eval-cases.ts`) checks that clearly shown skills are rated met, absent
skills aren't credited, and skills added in v2 move up. All variants ran on
`gemini-3.5-flash-lite` with thinking set to low, so they're directly comparable.

|                             | Calls | Input tokens | Output tokens | Ground truth | Unverified claims | Same requirements v1→v2 | Suggestions / benchmarks / steps (avg per analysis) |
| --------------------------- | ----- | ------------ | ------------- | ------------ | ----------------- | ----------------------- | --------------------------------------------------- |
| v5 baseline                 | 16    | 149,834      | 16,326        | 20/23        | 0                 | 1 of 4                  | 2.8 / 5.0 / 3.5                                     |
| v6, full reference          | 8     | 76,766       | 12,038        | 19/23        | 2                 | 4 of 4                  | 3.1 / 4.3 / 2.9                                     |
| v6, condensed (first try)   | 8     | 19,891       | 11,373        | 21/23        | 1                 | 4 of 4                  | 2.3 / 4.0 / 2.6                                     |
| **v6, condensed (shipped)** | **8** | **20,244**   | **13,706**    | **20/23**    | **0**             | **4 of 4**              | **3.4 / 6.0 / 4.0**                                 |

"Unverified claims" are requirements the model rated met or partial with evidence that wasn't
in the resume; the code downgrades those automatically.

- **87% fewer input tokens and half the calls**, with ground-truth accuracy unchanged (20–21 of 23
  checks across runs; the misses are borderline calls that v5 made too).
- **The condensed rulebook did not cost accuracy.** The full reference used four times the input
  tokens and scored no better, so the condensed rules are the default (`DEFAULT_REFERENCE_MODE`
  in `prompt.ts`; `full` remains available).
- **Scores are comparable across versions.** v5 rebuilt the requirement list on every run, so
  in 3 of 4 cases v2 was scored against different requirements than v1 (one case lost its A/B
  testing requirement entirely). v6 keeps the list fixed, so a score change reflects resume
  edits.
- **The first one-call prompt returned thinner extras** (3 benchmarks, 2 steps). Making the
  minimums explicit fixed it: the shipped prompt returns 6 benchmarks, 4 steps, and 3–4
  suggestions per analysis, more than v5.
- **A single analysis is a little slower** on this model (about 5.3 s vs 3.6 s), because one call
  now writes everything two parallel calls wrote before. Re-clicks and reuse cost no time at all.

### Spot check on the main model

`npm run test:live` on `gemini-3.8-flash` (first analysis, then a re-analysis against the saved
profile): about 2,540 input tokens per call, 0 unverified claims, 6 benchmarks, 4–5 steps, 5
suggestions. One benchmark example opened with "Orchestrated", so example templates that use a
listed AI buzzword are now dropped in code. Scores were 63 and 54 for the same resume: the
difference is one requirement (AWS) rated partial on the first run although its own note said
AWS was absent; the second run's "missing" is correct.

### End-to-end reuse (local test server, in-memory database)

All 18 checks passed: first analysis = 1 call and a saved job profile; clicking Analyze again =
no call; the same resume version in a second application with the same posting (plus extra
boilerplate) = copied, not charged; a new version = 1 smaller call against the same
requirements; switching back to v1 = its earlier result copied. Five analyze clicks cost 2
analyses. Deleting the applications removed the job profile once nothing used it. During one
run the main test model returned 503 and the fallback model answered immediately.

## Found along the way

- **Job descriptions lost their line breaks.** The text sanitizer collapsed all whitespace,
  so postings were stored as one long line (also hurting the Job description tab). Multi-line
  fields (job description, notes, event details, company and resume notes) now keep line breaks.
  Text saved before the fix stays flattened.
- **Per-minute limits looked like the daily quota** (both say "exceeded your current quota"),
  so a few seconds of rate limiting showed "try again later" and failed the analysis.

## Re-running

```bash
npm run eval:ai                                   # all variants (uses quota: 8 calls each)
EVAL_VARIANTS=v6-condensed npm run eval:ai        # one variant
GEMINI_MODEL=gemini-3.5-flash-lite npm run eval:ai  # pin a model
LIVE_OUT=out.json npm run eval:ai                 # save every result
EVAL_RESCORE=out.json LIVE_OUT=truth.json npm run eval:ai  # re-check saved results, no AI calls
```

Free tiers limit tokens per minute; runs pause 30 s between cases (`EVAL_PAUSE_MS`).
