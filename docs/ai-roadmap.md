# AWorkApp AI

## Resume match analysis (shipped)

Compares the resume assigned to an application with that application's job description.
Lives on the application page's **Resume** tab.

**How it works**

1. **Text extraction at upload** (`src/lib/resume-text`): PDF via `unpdf`, DOCX via `mammoth`,
   one line per paragraph/bullet. Stored on the `File` (`extractedText`, `textHash`). Older files
   are extracted on first analysis. Scanned/image-only files are reported as unreadable.
2. **One structured Gemini call per analysis** (`src/lib/ai/analysis`): the resume is sent with
   numbered lines and the job description with boilerplate removed (`job-text.ts`). The first
   analysis of a job returns everything: the **job profile** (requirements, keywords, role
   benchmarks) and the resume match (coverage with evidence line numbers and a short quote,
   suggestions, benchmark status, action plan). The profile is saved (`JobProfile` model) and
   later analyses of other resume versions send that saved requirement list instead of the job
   description, so every version is scored against the same requirements. Job details and
   resume are wrapped in tags and treated as untrusted data.
3. **Deterministic verification** (`verify.ts`):
   - a requirement only counts as met/partial if its quoted evidence is actually in the resume,
     otherwise it is downgraded one level;
   - "keyword in resume" is computed with whole-term matching, not taken from the model;
   - bullet rewrites get their original text from the resume line, never from the model.
4. **Score** = verified requirement coverage; required counts double, partial counts half.
5. **Formatting checks** without AI (contact info, links, standard sections, length).

**Rules** (`rulebook.ts`): a condensed version (~900 tokens) of the verbatim reference in
`reference.ts` (Indeed, InterviewPal, Harvard, MIT, AI ResumeGuru, Enhancv) on ATS parsing,
contextual keywords, PAR/XYZ bullets, and AI-writing red flags, followed by writing rules:
results-first bullets, no invented numbers (use `[placeholders]`), keywords shown in context, no AI
buzzwords, seniority-appropriate verbs. The full reference is still available
(`DEFAULT_REFERENCE_MODE` in `prompt.ts`); the evaluation found no accuracy gain from it at four
times the tokens (`docs/experiments/ai-efficiency.md`). The rules come first and are identical in
both prompts, so Gemini's implicit caching can reuse them. Coverage follows the context rule: a
skill only listed in a skills section is "partial". Deterministic writing checks implement the
measurable parts: first-person pronouns, duty phrasing ("responsible for"), share of bullets with
results, AI buzzwords (`buzzwords.ts`), em-dash overuse, and bullet length. Example templates that
use a listed buzzword are dropped in code. Edit the rules, then bump `PROMPT_VERSION`.

**Report page** (`/applications/:id/analysis`): hero score, stat tiles, requirement coverage by
category, "biggest score opportunities" (deterministic what-if: points gained if each unmet
requirement were met), an action plan with an impact × effort matrix, role benchmarks, suggested
edits, the requirements table, keywords, formatting, and score history across resume versions.
Charts are dependency-free SVG/HTML in `src/components/analysis/charts.tsx`, using the
`.viz-root` color tokens in `globals.css`.

**Role insights**: benchmarks ("what strong candidates for this kind of role typically
include") and the action plan come from the same call, using only the model's general hiring
knowledge, never other members' data. Example phrasing is a template: anything the resume doesn't
show must be a `[placeholder]`, and missing job keywords are bracketed in code as a backstop.

**Runs, reuse, and limits**

- Fingerprints: the job profile is keyed by the cleaned job text (whitespace and boilerplate
  don't count), title, company, prompt version, and main model. An analysis is keyed by the
  resume's extracted-text hash plus the job fingerprint. Both are per user; nothing is shared
  between members.
- `POST /api/applications/:id/analysis` never calls the AI for a fingerprint you've analyzed
  before: it returns this application's result, or copies the result from any of your other
  analyses (marked `reused`; formatting checks are redone for the file; suggestions start open).
  Not charged.
- New runs execute in the background (`after()`); the client polls `GET`.
- One active run per application (partial unique index). Runs stuck > 5 min are failed and refunded.
- **Fallback model**: when the main model is overloaded (5xx), times out, is out of quota, or
  returns bad output twice, the call goes straight to `GEMINI_FALLBACK_MODEL` (or the older
  `GEMINI_INSIGHTS_MODEL`). Such results are marked `usedFallback`, aren't copied to other
  applications, and can be redone with Re-analyze. A fallback-made job profile is replaced the
  next time the main model succeeds.
- A daily quota error fails fast with a clear message. Per-minute limits and short rate limits
  are waited out using the API's own retry hint.
- Daily per-user limit (UTC). Admins set the default and per-member overrides, can exempt admins,
  and can reset a member's usage (`/admin`). Failed runs are refunded.
- Deleting an application deletes its analyses and any job profile no other analysis uses.

**Thinking effort**: `GEMINI_THINKING` (main model) and `GEMINI_FALLBACK_THINKING` set
`minimal`, `low`, `medium`, or `high`; unset keeps the model's default. Gemini 3.x gets a
`thinkingLevel`; Gemini 2.5 rejects levels, so it gets a `thinkingBudget` (medium 8K, high 24K
tokens). Thinking tokens are stored in `usage.thoughtTokens`. Results so far:
`docs/experiments/gemini-thinking-effort.md`.

**Which resume is analyzed**: the version the application pins (see the PRD, section 11.8).
Each analysis records the resume and version label, such as "Backend Resume v2", so score
history stays readable across versions.

**Changing the prompt**: edit `prompt.ts`/`schema.ts` and bump `PROMPT_VERSION`. Gemini rejects
schemas with many length/count bounds, so limits live in the prompt and `clampOutput`.

**Tests**: `npm test` (unit, no network). `npm run test:live` runs a real first analysis and
re-analysis with a fictional resume (2 calls; needs `GEMINI_API_KEY` in `.env.local`).
`npm run eval:ai` measures accuracy and cost on 4 fictional cases with ground truth; results and
how to re-run are in `docs/experiments/ai-efficiency.md`.

## Ideas for later

- **Job import fallback**: when a job URL has no JobPosting structured data, extract fields with Gemini.
- **Cover letter drafts** from the stored resume text and job description.
- **Interview prep**: likely questions and talking points when an application reaches Interview.
- **Email drafts** for follow-ups, thank-yous, and negotiation.

All can reuse `generateStructured` (`src/lib/ai/client.ts`), stored resume text, and the AI quota.
