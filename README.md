# AWorkApp

A private job search tracker. Track applications through each stage, keep every resume with its full version history, record exactly which version you sent where, and check how well a resume matches a job with an AI analysis.

Sign-in is invite-only: an admin adds members from the admin dashboard.

## Features

- **Applications.** Track each application in a list or a Kanban board. The application page has the status, a clickable stage track (Saved, Applied, Screening, Interviews, Final round, Offer, or closed as Rejected/Withdrawn), the next step with a due date, notes, an activity log, and the job description.
- **Documents.** One place for resumes and other files (cover letters, transcripts, certificates, references).
  - Each resume keeps every version (v1, v2, ...). Uploading on top of a resume adds the next version, and restoring an old version copies it forward as the newest one, so history only grows.
  - Each application pins the exact version it uses. When a newer version exists, the application offers to switch. Once an application is marked Applied, its version is locked as a record of what you sent.
  - Uploading from an application asks whether the file is the next version of the attached resume or a new resume tailored from it.
- **Resume match analysis.** Compares the attached resume with the job description using Gemini, in one AI call. The job's requirements are read once and reused for every later resume version, and a resume and job pair you've analyzed before is never sent to the AI again (in any of your applications), so it doesn't count against your daily limit. Every claim is checked against the resume text, and the score comes from verified requirement coverage. A full report page shows requirement coverage, keywords, formatting and writing checks, an action plan, benchmarks for the role, and score history. The report can be exported as Markdown or PDF to use with any AI assistant.
- **Companies.** Rate companies and keep a do-not-apply list.
- **Analytics.** Interview rates, active applications, and stage conversions.
- **Admin dashboard** (`/admin`, admins only). Add members, change roles, reset passwords, disable or delete members, and set the daily AI analysis limit (globally or per member, with an option to exempt admins).

## Tech stack

Next.js 16 (App Router, `src/proxy.ts` for route protection), React 19, MongoDB with Mongoose, Zod, Tailwind CSS with base-ui components, Google Gemini via `@google/genai`, and local disk or S3-compatible storage (such as Cloudflare R2) for files. Tests use Vitest.

> This Next.js version has breaking changes from older releases. Read the guides in `node_modules/next/dist/docs/` before changing framework code.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and fill in the values (see [Environment variables](#environment-variables)).

3. Create the first admin:

   ```bash
   npm run create-admin -- you@example.com "Your Name" 'a-strong-password'
   ```

4. Start the dev server and sign in at [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

Add other members from `/admin`. Members created or reset by an admin must choose their own password the first time they sign in.

## Environment variables

| Variable                                                                                                                             | Required          | What it does                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`                                                                                                                        | Yes               | MongoDB connection string.                                                                                                                                                                                                         |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`                                                                                                   | Yes               | Signing secrets for access and refresh tokens. Generate each with `openssl rand -base64 64`.                                                                                                                                       |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`                                                                                           | No                | Token lifetimes (defaults `15m` and `7d`).                                                                                                                                                                                         |
| `NEXT_PUBLIC_APP_URL`                                                                                                                | Yes in production | The app's public URL, used for redirects and Google sign-in.                                                                                                                                                                       |
| `GEMINI_API_KEY`                                                                                                                     | For AI analysis   | Gemini API key. Without it, the analysis is unavailable.                                                                                                                                                                           |
| `GEMINI_MODEL`                                                                                                                       | No                | Model for the main match analysis (default `gemini-2.5-flash`).                                                                                                                                                                    |
| `GEMINI_FALLBACK_MODEL`                                                                                                              | No                | Backup model used at once when the main one is overloaded, out of quota, or returns bad output. Free-tier quotas are per model, so it has its own headroom. The older `GEMINI_INSIGHTS_MODEL` setting is read as the fallback too. |
| `GEMINI_THINKING`, `GEMINI_FALLBACK_THINKING`                                                                                        | No                | How much the main and fallback models think: `minimal`, `low`, `medium`, or `high`. Unset uses the model's default.                                                                                                                |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                                                                           | No                | Enables "Sign in with Google" for existing members (see below).                                                                                                                                                                    |
| `FILE_STORAGE_PROVIDER`                                                                                                              | No                | `local` (default), or `s3`/`r2` for S3-compatible storage.                                                                                                                                                                         |
| `FILE_STORAGE_PATH`                                                                                                                  | With `local`      | Folder for uploaded files (default `./uploads`).                                                                                                                                                                                   |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`                                                  | With `s3`/`r2`    | Bucket settings. `S3_REGION` defaults to `auto`.                                                                                                                                                                                   |
| `MAX_FILE_SIZE`                                                                                                                      | No                | Upload limit in bytes (default 10 MB).                                                                                                                                                                                             |
| `SECURITY_MAX_IP_FAILURES`, `SECURITY_IP_BAN_DURATION_MINUTES`, `SECURITY_MAX_EMAIL_FAILURES`, `SECURITY_EMAIL_BAN_DURATION_MINUTES` | No                | Sign-in lockout thresholds (defaults 10 failures per IP for 15 minutes, 5 per email for 15 minutes).                                                                                                                               |

Never commit `.env.local` or any secret. A pre-commit hook (`scripts/check-secrets.js`) blocks commits that contain secrets.

### Google sign-in (optional)

Google sign-in only signs in people who are already members; it never creates accounts.

1. In the [Google Cloud Console](https://console.cloud.google.com), create a project and configure the OAuth consent screen with the `openid`, `userinfo.email`, and `userinfo.profile` scopes.
2. Under **APIs & Services > Credentials**, create an **OAuth client ID** of type **Web application**.
3. Add `http://localhost:3000` (and your production URL) as authorized JavaScript origins.
4. Add `http://localhost:3000/api/auth/google/callback` and `https://yourdomain.com/api/auth/google/callback` as authorized redirect URIs.
5. Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Scripts

| Command                                                 | What it does                                                                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                           | Start the dev server.                                                                                                               |
| `npm run build`, `npm start`                            | Production build and server.                                                                                                        |
| `npm run lint`                                          | ESLint.                                                                                                                             |
| `npm run format:check`, `npm run format:write`          | Prettier.                                                                                                                           |
| `npm test`                                              | Unit tests (no network or database needed).                                                                                         |
| `npm run test:live`                                     | A real first analysis and re-analysis on sample data (2 Gemini calls).                                                              |
| `npm run eval:ai`                                       | Accuracy and cost evaluation on 4 fictional cases with ground truth (8 calls per variant). See `docs/experiments/ai-efficiency.md`. |
| `npm run create-admin -- <email> ["<name>" <password>]` | With a name and password, create an admin. With only an email, promote (and re-enable) an existing member.                          |
| `npm run migrate:ai-redesign`                           | One-time data migration (see below).                                                                                                |
| `npm run migrate:resume-versioning`                     | One-time data migration (see below).                                                                                                |

## Deploying and migrating existing data

Databases created before these changes need two one-time migrations, in this order. Both are dry runs by default: they print what they would change and change nothing. Add `-- --apply` to make the changes. Both are safe to run again.

1. **`npm run migrate:ai-redesign`.** Converts resumes customized in the old in-app editor into their own versions and removes the old checklist data.
2. **`npm run migrate:resume-versioning`.** Moves resumes to the versioned model:
   - Old "Company Resume - vN" records become one resume with versions v1 to vN.
   - Each application is pinned to the version it used.
   - Analyses are pointed at the new resumes.
   - Loose files in the "resume" category become resumes.
   - The old collection is kept as `resumeversions_backup_YYYYMMDD`, not deleted.

```bash
npm run migrate:resume-versioning            # review the output
npm run migrate:resume-versioning -- --apply # then apply
```

The scripts read `MONGODB_URI` from `.env.local`. Back up the database first, and run them right after deploying the new code. Until the resume migration runs, the Documents pages don't show existing resumes.

Old `/resumes` and `/files` links redirect to `/documents`.

## Project layout

- `src/app/(dashboard)/`: pages (applications, documents, companies, analytics, admin, settings).
- `src/app/api/`: route handlers. Partial updates (`PATCH`) only change the fields sent.
- `src/components/application/`, `src/components/documents/`, `src/components/analysis/`: the application page, Documents, and the AI report.
- `src/lib/services/`: business logic (resumes and versions, files, analysis, user data).
- `src/lib/ai/`: Gemini client, prompts, and analysis verification.
- `src/models/`: Mongoose models.
- `src/lib/validators/schemas.ts`: Zod schemas for every API input.
- `scripts/`: admin bootstrap, migrations, and the secrets check.
- `docs/`: the product spec (`prd.md`), the AI design (`ai-roadmap.md`), the change log (`brain.md`), and experiments.

## Contributing

Work on `feature/*` branches. Commits run a pre-commit hook (secrets check, ESLint, Prettier). Fix what it reports rather than skipping it with `--no-verify`.
