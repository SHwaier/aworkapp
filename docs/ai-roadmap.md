# AWorkApp AI

## Resume match analysis (shipped)

Compares the resume assigned to an application with that application's job description.
Lives on the application page's **Resume** tab.

**How it works**

1. **Text extraction at upload** (`src/lib/resume-text`): PDF via `unpdf`, DOCX via `mammoth`,
   one line per paragraph/bullet. Stored on the `File` (`extractedText`, `textHash`). Older files
   are extracted on first analysis. Scanned/image-only files are reported as unreadable.
2. **One structured Gemini call** (`src/lib/ai/analysis`): the resume is sent with numbered lines;
   the model returns requirements (with evidence line numbers + a quote), keywords, and suggestions.
   Job description and resume are wrapped in tags and treated as untrusted data.
3. **Deterministic verification** (`verify.ts`):
   - a requirement only counts as met/partial if its quoted evidence is actually in the resume,
     otherwise it is downgraded one level;
   - "keyword in resume" is computed with whole-term matching, not taken from the model;
   - bullet rewrites get their original text from the resume line, never from the model.
4. **Score** = verified requirement coverage; required counts double, partial counts half.
5. **Formatting checks** without AI (contact info, links, standard sections, length).

**Report page** (`/applications/:id/analysis`): hero score, stat tiles, requirement coverage by
category, "biggest score opportunities" (deterministic what-if: points gained if each unmet
requirement were met), an action plan with an impact × effort matrix, role benchmarks, suggested
edits, the requirements table, keywords, formatting, and score history across resume versions.
Charts are dependency-free SVG/HTML in `src/components/analysis/charts.tsx`, using the
`.viz-root` color tokens in `globals.css`.

**Role insights** (`insights.ts`): a second, parallel Gemini call for benchmarks ("what strong
candidates for this kind of role typically include") and the action plan. It uses only the
model's general hiring knowledge — never other members' data. Example phrasing is a template:
anything the resume doesn't show must be a `[placeholder]`, and missing job keywords are bracketed
in code as a backstop. Insights are best-effort: if that call fails, the core analysis still
completes. `GEMINI_INSIGHTS_MODEL` can point it at a different model (free-tier quotas are per model).

**Runs, caching, and limits**

- `POST /api/applications/:id/analysis` returns the existing result when nothing changed
  (resume text, job title/company/description, prompt version, model) — not charged.
- New runs execute in the background (`after()`); the client polls `GET`.
- One active run per application (partial unique index). Runs stuck > 5 min are failed and refunded.
- A Gemini daily/plan quota error fails fast with a clear message; short rate limits are waited
  out using the API's own retry hint.
- Daily per-user limit (UTC). Admins set the default and per-member overrides, can exempt admins,
  and can reset a member's usage (`/admin`). Failed runs are refunded.

**Changing the prompt**: edit `prompt.ts`/`schema.ts` and bump `PROMPT_VERSION`. Gemini rejects
schemas with many length/count bounds, so limits live in the prompt and `clampOutput`.

**Tests**: `npm test` (unit, no network). `npm run test:live` runs one real Gemini call with a
fictional resume (needs `GEMINI_API_KEY` in `.env.local`).

## Ideas for later

- **Job import fallback**: when a job URL has no JobPosting structured data, extract fields with Gemini.
- **Cover letter drafts** from the stored resume text and job description.
- **Interview prep**: likely questions and talking points when an application reaches Interview.
- **Email drafts** for follow-ups, thank-yous, and negotiation.

All can reuse `generateStructured` (`src/lib/ai/client.ts`), stored resume text, and the AI quota.
