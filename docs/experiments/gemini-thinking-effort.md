# Gemini thinking effort: medium vs. high

Date: 2026-10-21. Setting added in `src/lib/ai/client.ts` (`GEMINI_THINKING`, `GEMINI_INSIGHTS_THINKING`).

## How it was tested

- Same fictional resume and job for every run (`src/lib/ai/analysis/__fixtures__/sample.ts`), each setting run twice to check repeatability.
- Measured: time, tokens (thinking tokens separately), and how many of the AI's claims our code checks had to correct: requirements downgraded for missing evidence, suggestions dropped, AI buzzwords, and job keywords the resume lacks that appear in templates without `[brackets]`.
- Re-run any time with `THINKING_SETTINGS=default,medium,high npm run test:thinking` (uses real quota: 2 calls per setting per model).

## How the setting maps to each model

| Model                   | Used for                           | Accepts                                            | `medium`           | `high`                            |
| ----------------------- | ---------------------------------- | -------------------------------------------------- | ------------------ | --------------------------------- |
| `gemini-2.5-flash`      | Main analysis                      | Token budget only (levels are rejected with a 400) | 8,192-token budget | 24,576-token budget (the maximum) |
| `gemini-3.5-flash-lite` | Insights (benchmarks, action plan) | Thinking level                                     | `MEDIUM`           | `HIGH`                            |

## Results: insights (`gemini-3.5-flash-lite`), complete

Both runs of each setting returned identical results (fixed seed), so one row per setting:

| Setting | Time | Output tokens | Thinking tokens | Actions | Benchmark statuses                 | Placeholders in templates | Missing keywords stated as fact | Buzzwords |
| ------- | ---- | ------------- | --------------- | ------- | ---------------------------------- | ------------------------- | ------------------------------- | --------- |
| Default | ~4 s | 1,046         | 0               | 4       | 3 adequate, 2 strong               | 18                        | 0                               | 0         |
| Medium  | ~8 s | 2,694         | 1,657           | 4       | 3 adequate, 2 strong               | 10                        | 3                               | 0         |
| High    | ~9 s | 3,366         | 2,302           | 5       | 2 adequate, 2 needs work, 1 strong | 5                         | 4                               | 0         |

What changed in the text:

- **Default**: solid, generic-leaning plan; templates are cautious (it even brackets tech the resume already has, e.g. `[Node.js]`).
- **Medium**: more specific steps tied to the resume's actual bullets ("Enhance the database experience bullet to highlight data modeling decisions").
- **High**: the strictest assessment (marks two areas as needing work) and catches one more requirement (an event-driven architecture step). But its templates state technology the candidate doesn't have as fact, e.g. "Migrated legacy ingestion workers to AWS SQS and Lambda...". In the app, the bracket backstop turns those into `[placeholders]`, but this is the honesty trade-off to know about.

## Results: main analysis (`gemini-2.5-flash`), incomplete

| Setting           | Result                                                                                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default           | Succeeded in 25 s: 9,262 input, 3,280 thinking, 2,039 answer tokens. Score 54, 7 requirements, 0 downgraded, 9 suggestions, 0 dropped, 0 buzzwords.                                                                   |
| Default, medium   | Earlier attempts timed out at 90 s per attempt or got "temporarily unavailable" (503). A plain "say ok" call answered in 0.7 s at the same time, so this was Gemini being overloaded, not our prompt being too large. |
| Low, medium, high | Not measured: the free tier's 20 requests/day for `gemini-2.5-flash` ran out (failed calls count too).                                                                                                                |

`gemini-3.5-flash` was also tried as a main-analysis model, but every call returned 503 ("high demand") during testing.

## Recommendation

- **Insights: leave `GEMINI_INSIGHTS_THINKING` unset (default).** It is the fastest, cheapest, and most honest about what the resume shows. Use `medium` if you want plans tied more closely to specific bullets; it costs about 2x the time and 2.6x the output tokens. `high` adds little over `medium` beyond a stricter tone and slightly more risk in templates.
- **Main analysis: leave `GEMINI_THINKING` unset for now.** Default works and produced a clean result in 25 s. Medium vs. high still needs measuring once quota allows: run `THINKING_SETTINGS=default,medium,high npm run test:thinking`.
- **Quota is the bigger constraint.** Two analyses' worth of experiments used the day's free `gemini-2.5-flash` requests. A paid tier would also remove the 503/overload failures seen today, which affect real users the same way.
