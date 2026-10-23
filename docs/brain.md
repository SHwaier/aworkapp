# Project Brain & Handoff (AWorkApp)

This document serves as the pairing context and history log for the AI agent context window. Keep this updated as a source of truth for features implemented, architectural changes, database setups, and pending tasks.

---

## SECURITY GUARDRAILS (CRITICAL)

- **Zero-Secrets Policy**: Never hardcode or write sensitive secrets, connection strings (e.g., MongoDB URI, API keys, password strings) directly into files or commits.
- **Environment Management**: Always reference environment variables dynamically via `process.env.*`.
- **Pre-Commit Gate**: A local validation script (`scripts/check-secrets.js`) runs automatically on every commit to scan and block staged changes containing secrets.
- **Clarification Rules**: If there is any confusion regarding a configuration value, or if you need to set up a new environment variable, _always_ ask the user for explicit permission first.

---

## 1. Context & Architecture

AWorkApp is a modern, premium SaaS platform built on **Next.js** (using App Router and Turbopack compiler) and **MongoDB (Mongoose)** for tracking job applications, resumes, files, and target companies.

### Key Tech Stack

- **Framework**: Next.js 16 (Turbopack, App Router)
- **Database**: MongoDB Atlas via Mongoose
- **Styling**: Tailwind CSS & Vanilla CSS
- **Validation**: Zod (centralized schemas in `src/lib/validators/schemas.ts`)
- **Key Abstractions**:
  - `src/components/app-shell/app-shell.tsx` — Global layout wrapper with theme providers and navigation sidebar.
  - `src/lib/api/response.ts` — Centralized API response format helpers (`successResponse`, `errorResponse`, `handleApiError`).
  - `src/lib/auth/session.ts` — Reads and verifies the session token.
  - `src/lib/auth/guard.ts` — `requireAuth()` for API routes: checks the user still exists, isn't disabled, and that the token's `sessionVersion` matches the database.
  - `src/proxy.ts` — Route protection (Next.js 16 renamed middleware to proxy).

---

## 2. Completed Implementation & Fixes

### A. API Pagination Schema Normalization

- **Issue**: Pagination Zod schema threw `400 Bad Request` validation errors on endpoints (like `/api/companies?limit=1`) if page or limit query parameters were absent.
- **Fix**: Added a preprocessing helper `preprocessEmpty` inside `paginationSchema` to convert null or empty-string values to `undefined` before validation, allowing Zod to apply its safe default values correctly.

### B. Autocomplete Company Flow

- **UX Upgrade**: Replaced the dropdown selection system.
- **Behavior**: Users now type the company name in a single input field. Suggestions are fetched dynamically from existing companies. If the company exists, it is selected. If the name typed is new, the frontend automatically posts to `/api/companies` in the background first, gets the new company's ID, and links it to the new application seamlessly.

### C. Kanban Board View & Drag-and-Drop

- **New Feature**: Added a highly interactive **Board View** beside the traditional List View in `src/app/(dashboard)/applications/page.tsx`.
- **Drag-and-Drop**: Built using native HTML5 Drag and Drop API with robust state and type checking.

### D. Redesigned Premium Dashboard & Aggregated Analytics

- **Performance Fix**: Shifted status calculations to `/api/analytics` endpoint and clean-imported status variant mapping. Overhauled state calculation so that the page now queries only the 5 most recent applications instead of downloading 100 applications to calculate metrics client-side.
- **Aesthetics**: Glassmorphic greeting banner with modern colored overlays, SVG Circular progress indicator displaying the Interview Success Rate, and Quick Commands grid.

### E. Redesigned Companies Panel

- Redesigned `/companies` list with rating stars and distinct badges indicating DND (Do Not Apply) companies.

### F. Security Hardening & Rate Limiting (AOS-Hardening)

- **Rate Limit Headers Config**: Modified `rateLimitHeaders` to correctly pass the configured preset limits instead of showing `remaining` as `limit`.
- **Regex Injection (ReDoS) Protection**: Added `escapeRegex` to all MongoDB search-matching regexes in API handlers (applications, companies, resumes, files).
- **File Upload Type & Extension Allowlist**: Added strict extension and MIME-type checks to the server-side files POST upload route.
- **File Download Security Hardening**: Added `X-Content-Type-Options: nosniff` and a strict sandbox `Content-Security-Policy` header to the file download route to prevent code execution.
- **Unified Rate Limiting**: Added rate limit checks to every single API route: auth, applications, companies, resumes, notes, files, timeline.
- **Input Sanitization**: Integrated the `sanitizeText` and `sanitizeUrl` security filters directly inside the Zod schemas using `.transform()`, ensuring all validated inputs are automatically sanitized.
- **Error Handling Hardening**: Refactored API routes and `requireAuth` to throw custom `AppError` instances with explicit HTTP status codes instead of generic `Error` instances.

### G. Frontend Optimizations & Bug Fixes

- **Status Badge Consolidation**: Deduplicated local status color mappings across dashboard and details views.
- **Search Input Debouncing**: Added `useDebounce` to applications, companies, and files views to optimize backend fetch queries.
- **Monthly Bar Chart Heights**: Fixed visual rendering bug where bar heights were calculated as pixel values instead of percentage values.
- **File Upload Deduplication**: Fixed property access to `data.data.duplicate` in the files upload UI.

### M. Mobile Responsiveness Enhancements

- **Top Navigation Bar**: Introduced a structured header layout for mobile viewports to hold the hamburger menu and app name, completely resolving button/header overlaps.
- **Wizard Grid Stacking**: Refactored rigid two-column layouts in the New Application Wizard (Step 3) to responsive stacked rows (`grid-cols-1 sm:grid-cols-2`), ensuring inputs are fully readable and clickable on mobile screens.
- **Application List Card Overflows**: Cleaned up the nested flexbox truncation hierarchy in the list view card and capped the `companyId.name`, `location`, and `nextAction` tags to prevent long continuous words from stretching layout panels and producing horizontal scrollbars on mobile.
- **Resume Preview Mobile Optimization**: Resolved the responsive display limits of embedded PDF iframes by introducing dynamic viewports (`100dvh` / `100vh`) and checking the viewport width (`isMobile`). Rendered a premium PDF fallback card with direct actions ("Open Viewport" & "Download File") instead of an interactive iframe.
- **DOCX Mobile Page Wrapping**: Appended stylesheet overrides inside `DocxViewer` to force `.docx-rendered section.docx` page outputs to stretch and wrap to `100%` viewport width on small viewports, completely avoiding horizontal overflow and scrolling.
- **Compact Dialog & Wizard Inputs**: Overhauled the form layout in the "Add Resume Version" dialog and "New Application" step wizard. Substituted cluttered descriptive text labels with concise names and moved helper/instruction text into right-aligned metadata elements (`flex justify-between items-baseline mb-1`), producing a clean, premium, and self-documenting interface.

### N. Architectural Refactoring & Security Hardening

- **Centralized Service Layer**: Extracted core business logic out of API controller routes into modular service files in `src/lib/services/`.
  - `src/lib/services/file.ts`: Manages file checksum hashing, MIME validation, storage persistence (S3/local), and duplicate prevention.
  - `src/lib/services/resume.ts`: Manages assignment, snapshot binding, and cleaning up unused customized documents.
- **Composite Upload-Assign Flow** (replaced by `/resume/upload` in section T): Implemented `POST /api/applications/[id]/resume/upload-assign` to ingest, store, deduplicate, and bind customized resumes atomically.
- **Percent-Encoding database URI**: Resolved Mongoose authentication errors caused by special characters (like `@`) in connection string passwords by percent-encoding them.
- **Pre-Commit Secret Hook**: Implemented a local security validator script (`scripts/check-secrets.js`) running on git hooks to block any commits containing plaintext database credentials.
- **Tailwind v4 Styling Compliance**: Cleaned up multiple build warnings by replacing legacy styles (e.g. `break-words` with `wrap-break-word`, `flex-grow` with `grow`, `flex-shrink` with `shrink`, `bg-gradient-to-br` with `bg-linear-to-br`, `bg-gradient-to-r` with `bg-linear-to-r`), formatting radial gradients properly, and updating arbitrary opacity fraction modifiers (`/[0.02]`, `/[0.03]`) to standardized Tailwind v4 percentage indicators (`/2`, `/3`). Removed conflicting padding instructions.
- **ESLint Compliance**: Replaced ambient global `var` declarations in `/src/lib/db/mongoose.ts` with typed global typecasts, allowing us to drop ESLint disable comments completely.
- **Mongoose Index Warning Fix**: Removed redundant `UserSchema.index({ email: 1 })` configuration in `src/models/User.ts` since the field is already declared as `unique: true` inline, resolving duplicate schema index warning.
- **Mongoose MissingSchemaError Resolution**: Imported core models (`User`, `Company`, `Application`, `File`, and `ResumeVersion`) directly inside `src/lib/db/mongoose.ts` to ensure Mongoose pre-registers all relations, preventing lazy-loading schema compilation failures.
- **Google OAuth Integration**: Built production-grade Google Sign-In support via `/api/auth/google` and `/api/auth/google/callback`. Redirects the user directly to the Google Consent screen and exchanges the authorization code for token profiles to log in or register users based on their verified emails. Added premium "Sign in with Google" buttons to login and registration cards. (Since section P, Google sign-in only signs in existing members, and registration is removed.)

### H. Full-Screen Document Previews

> Replaced in section T: previews now live at `/documents/files/[id]` and on the resume page, and the old routes redirect.

- **Route-based Previews**: Added `/files/[id]/preview` and `/resumes/[id]/preview` full-screen routes to preview PDFs (using native browser iframe) and Word documents (rendering client-side via `docx-preview`).
- **Metadata Fetching**: Refactored `/api/files/[id]?metadata=true` to let the viewer load details first without downloading large binary streams upfront.
- **Schema Correction**: Added `fileId` schema mapping to `createResumeVersionSchema` in `src/lib/validators/schemas.ts` to prevent mongoose relation stripping.

### I. Progressive Web App (PWA) Support

- **Manifest Config**: Created `src/app/manifest.ts` defining names, colors, stand-alone display mode, and maskable icons.
- **Service Worker**: Added `public/sw.js` and wrapped layout children inside `PwaProvider` to register worker threads.
- **Custom Icons**: Generated and saved minimalist `icon-192x192.png` and `icon-512x512.png` using a clean abstract letter A combined with a briefcase shape.

### J. Duplicate Application Protection

- **Warning Warning Alert**: Added `/api/applications/check-duplicate` checking for existing matches when completing wizard workflows.
- **UI Dialog Modals**: Integrated a dialog popup warning of duplicate applications allowing users to skip, cancel, or redirect to the existing application.

### K. Build Warning Cleanups & Telemetry Opt-out

- **Turbopack NFT Warnings**: Fixed dynamic path tracing alerts by prefixing `process.cwd()` with `/*turbopackIgnore: true*/` inside files route path resolutions.
- **Telemetry Disabling**: Disabled telemetry locally and set `NEXT_TELEMETRY_DISABLED=1` in environment configuration.

### L. Rebranding to AWorkApp

- Renamed the project from `ApplicationOS` to `AWorkApp` across PRD docs, CSS theme classes, shell layouts, metadata headers, and Nominatim API User-Agents.

### O. Resume Checklist Modularization & DOCX Live Analysis

> Removed in section Q: the checklist and the DOCX editor were replaced by the AI match analysis.

- **Modular Architecture**: Replaced the monolithic checklist logic with a modular `ChecklistGenerationService` containing specialized analyzer classes (`ATSAnalyzer`, `BulletQualityAnalyzer`, etc.) for scalable resume evaluation.
- **DOCX Extraction Fixes**: Resolved text extraction failures in the backend and frontend by implementing `jszip` to properly unzip DOCX binaries and parse `word/document.xml`.
- **Live Version Analysis**: Updated the frontend `ResumeChecklist` component to accept a `getResumeText` callback. The checklist now accurately extracts and analyzes the current, live contents of the `@eigenpal/docx-editor-react` instead of analyzing the stale initial document load.
- **Keyword Matching Upgrades**: Improved keyword detection heuristics (`wordBoundaryMatch`) to support complex multi-word keywords separated by spaces, hyphens, or underscores (e.g., "problem solving").
- **Audit Logging Fixed**: Synchronized `AuditLog` enums with Mongoose schemas and resolved validation errors for new actions (`resume_snapshot.customized`, `checklist.generated`).
- **Notification Deduplication**: Fixed an issue where the native DOCX editor silently mounted its own duplicate `<Toaster />` container. A global CSS override now visually hides any third-party injected bottom-right `sonner` notifications, unifying all alerts to the application's global top-right toaster. (That CSS rule was removed in section T, once the editor was gone; toasts now show bottom-right.)

### P. Admin Dashboard & Invite-Only Sign-In

- **Signup removed**: The register page and API are gone. Admins add members at `/admin`; `npm run create-admin` creates the first admin.
- **Roles**: `User.role` is `user` or `admin`. Admins can add members, change roles, reset passwords, disable or re-enable members, and permanently delete a member with all their data and stored files (typing the email to confirm).
- **Temporary passwords**: Accounts created or reset by an admin must choose a new password at `/change-password` before using the app (`mustChangePassword`).
- **Session control**: Tokens carry a `sessionVersion` that `requireAuth()` checks against the database on every API request. Password changes, admin resets, and disables bump it, which ends existing sessions immediately; role changes apply without signing in again.
- **Client token refresh**: A fetch interceptor refreshes once on a 401 and retries; a "password change required" 403 goes to `/change-password`.
- **Google sign-in**: Only signs in existing members, never creates accounts.
- **Fix**: Proxy JSON error responses used to copy `x-middleware-next`, so Next.js ignored them and API auth checks in the proxy never blocked anything.

### Q. AI Resume Match Analysis (replaces the checklist and the DOCX editor)

- **Design**: See `docs/ai-roadmap.md`. One structured Gemini call (`@google/genai`) compares the attached resume with the job description. Every claim is verified in code: evidence quotes must exist in the resume, keyword presence uses whole-term matching, and the score comes from verified requirement coverage (required counts double, partial counts half).
- **Text extraction**: Resume text is extracted at upload (PDF via `unpdf`, DOCX via `mammoth`) and stored on the File, so files in R2 are analyzed correctly.
- **Runs and limits**: `POST/GET /api/applications/:id/analysis`. Unchanged inputs reuse the last result for free; new runs execute in the background with `after()` and the UI polls. Failed runs never count. A per-user daily limit is stored in MongoDB; admins set the default, per-member overrides, the admin exemption, and can reset a member's usage.
- **Report page**: `/applications/:id/analysis` shows the score, requirement coverage by category, score opportunities, an impact-by-effort action plan, role benchmarks, suggestions, keywords, formatting and writing checks, and score history. Charts are dependency-free SVG with tooltips, table equivalents, and light/dark tokens (`.viz-root`).
- **Insights call**: A second, best-effort Gemini call produces benchmarks and an action plan from general hiring knowledge only (never other members' data). `GEMINI_INSIGHTS_MODEL` can route it to a different model.
- **Writing reference**: Both prompts start with a resume-writing reference (ATS parsing, contextual keywords, PAR/XYZ bullets, AI-writing red flags); `PROMPT_VERSION` is `resume-match.v5`.
- **Export**: Copy or download the report as Markdown, or save it as a PDF (`/print/analysis/:id`), written as a brief for the user's own AI assistant.
- **Removed**: The resume editor (`@eigenpal/docx-editor-react`), the customize page, the checklist services, and the `ResumeChecklist` model. `scripts/migrate-ai-redesign.mjs` converts editor-customized resumes and drops checklist data.

### R. Gemini Model & Thinking Settings

- `GEMINI_MODEL` (default `gemini-2.5-flash`) and `GEMINI_INSIGHTS_MODEL` choose the models.
- `GEMINI_THINKING` and `GEMINI_INSIGHTS_THINKING` (`minimal`, `low`, `medium`, `high`) set how much each call thinks. Gemini 3.x accepts a `thinkingLevel`; Gemini 2.5 rejects levels with a 400, so it gets a `thinkingBudget` instead (medium 8K, high 24K tokens). Thinking tokens are recorded on each analysis.
- Results: `docs/experiments/gemini-thinking-effort.md`. The main-analysis comparison is incomplete because the free daily quota for `gemini-2.5-flash` (20 requests) ran out. Re-run with `npm run test:thinking`.

### S. Versioned Resumes (resumes and files merged)

- **Model**: A `Resume` (`src/models/Resume.ts`) owns its versions. Each version is a `File` with `resumeId`, `versionNumber`, an optional `versionNote`, and `restoredFromVersion`. A partial unique index on `{resumeId, versionNumber}` prevents duplicate numbers. The `ResumeVersion` model is gone.
- **Rules** (`src/lib/services/resume.ts`):
  - Uploading on top of a resume adds the next version; an identical file is refused (409).
  - Restoring copies an old version forward as a new version, so history only grows. Copies share stored bytes; storage is deleted only when no File still references the `storageKey`.
  - The current version, and versions any application uses, can't be deleted.
  - `ResumeSnapshot` pins an application to `{resumeId, fileId}`. It's locked (`isLocked`) once the status reaches Applied or later, set either on the application or through a logged event. A locked application can't switch, unassign, or delete its resume.
  - Uploading from an application: the next version of the attached resume, or a new resume that records `basedOn`.
- **Read models**: `src/lib/services/resume-queries.ts` (`listResumes`, `getResumeDetail`, `getApplicationResume`).
- **APIs**: `/api/resumes` (list, create by upload), `/api/resumes/:id` (detail, edit, delete), `/api/resumes/:id/versions` (add), `/versions/:n` (delete), `/versions/:n/restore`; `/api/applications/:id/resume` (get, assign or switch, unassign) and `/api/applications/:id/resume/upload`. The files API hides resume versions and refuses to delete them.
- **Migration**: `npm run migrate:resume-versioning` (dry run; `-- --apply` to write). Run it after `migrate:ai-redesign`. It keeps the old collection as `resumeversions_backup_YYYYMMDD`.

### T. Documents Section & Application Page Redesign

- **Documents** (`/documents`, components in `src/components/documents/`): Resumes and Other files tabs. Each resume has a detail page (`/documents/resumes/[id]`) with its version history, the applications using each version, make-current, guarded deletes, and a preview. `/resumes` and `/files` redirect here (`next.config.ts`).
- **Application page** (`src/components/application/`, data from `use-application.ts`): a header with a status picker that saves on change, a clickable stage track (a compact progress menu on phones), and tabs for Overview, Resume, Job description, Notes, and Activity. The separate edit dialog was removed; "Edit details" goes to `/applications/[id]/edit`.
- **Fix: partial updates**: `createXSchema.partial()` still applied the create defaults, so every partial `PATCH` reset fields such as status, salary, currency, source, tags, and company rating. Update schemas are now wrapped in `onlyProvided()` (in `schemas.ts`), which keeps only the fields the request sent. Empty dates parse to `null`, so dates can be cleared.
- **Fix: phone layout**: `<main>` in the app shell needed `min-w-0`, and page containers with `mx-auto` need `w-full`; otherwise wide content stretched pages past the screen.
- **Fix: toasts**: Toasts moved to the bottom right, and the old CSS rule that hid bottom toasters (for the removed editor) was deleted.

### U. AI Efficiency (one call, saved job profiles, reuse, fallback)

- **One call per analysis** instead of two. The first analysis of a job also returns its **job profile** (requirements, keywords, role benchmarks), saved in `JobProfile`; later analyses of other resume versions send that saved list instead of the job description, so all versions are scored against the same requirements.
- **Condensed rulebook** (`rulebook.ts`, ~900 tokens) replaces the 9,000-token verbatim reference in prompts. **Boilerplate stripping** (`job-text.ts`) removes company blurbs, benefits, EEO and application text before sending and fingerprinting.
- **Fingerprint reuse**: an analysis is keyed by the resume's text hash plus the job fingerprint (cleaned job text, title, company, prompt version, main model). A fingerprint you've analyzed before, in any application, is copied (`reusedFromId`) instead of re-run and isn't charged. Per user only.
- **Fallback model** (`GEMINI_FALLBACK_MODEL`, or the older `GEMINI_INSIGHTS_MODEL`): overloaded, timed-out, out-of-quota, or bad-output calls hand over at once instead of retrying for minutes. Fallback results are marked `usedFallback`, not copied elsewhere, and can be redone.
- **Fix: per-minute limits** were treated as the daily quota (same "exceeded your current quota" text) and failed the analysis; they're now waited out.
- **Fix: line breaks**: `sanitizeText` collapsed all whitespace, so job descriptions and notes were stored as one line. Multi-line fields now use `sanitizeMultiline`. Older saved text stays flattened.
- Evaluation (`npm run eval:ai`, `docs/experiments/ai-efficiency.md`): 87% fewer input tokens, half the calls, same ground-truth accuracy, stable requirement lists across versions. `PROMPT_VERSION` is `resume-match.v6`, so older results show as out of date once.

---

## 3. Database Schema Overview

### Company Model (`src/models/Company.ts`)

- `userId` (ObjectId, Ref: User)
- `name` (String, Required)
- `website`, `careersUrl`, `linkedinUrl` (Strings)
- `industry`, `location`, `notes` (Strings)
- `rating` (Number, default: 0)
- `doNotApplyAgain` (Boolean, default: false)

### Application Model (`src/models/Application.ts`)

- `userId` (ObjectId, Ref: User)
- `companyId` (ObjectId, Ref: Company, Required)
- `jobTitle` (String, Required)
- `currentStatus` (String, Enum of APPLICATION_STATUSES)
- `lifecycleStage` (String, Enum of LIFECYCLE_STAGES)
- `jobDescription`, `jobUrl`, `location` (Strings)
- `workMode` (remote, hybrid, onsite)
- `employmentType` (full-time, part-time, contract, internship, co-op)
- `priority` (Number, 0-5)
- `nextAction` (String)

### Resume Model (`src/models/Resume.ts`)

- `userId` (ObjectId, Ref: User)
- `name`, `targetRole`, `targetIndustry`, `notes` (Strings), `skillsEmphasized` (String[])
- `isActive` (Boolean; false means archived)
- `currentFileId` (ObjectId, Ref: File) and `latestVersionNumber` (Number)
- `basedOn` (`{ resumeId, versionNumber }` or null): the resume it was tailored from

### File Model (`src/models/File.ts`)

- Any uploaded file. `category` is `resume`, `cover-letter`, `transcript`, `portfolio`, `certificate`, `reference`, or `other`.
- Resume versions also have `resumeId`, `versionNumber`, `versionNote`, and `restoredFromVersion`. Files without a `resumeId` are the "Other files" in Documents.
- `storageKey` (hidden by default) can be shared by restored copies.

### JobProfile Model (`src/models/JobProfile.ts`)

- `userId`, `profileHash` (unique together), `aiModel`, `promptVersion`, `usedFallback`, and `profile` (requirements, keywords, benchmarks, seniority, role summary). Deleted with the last analysis that uses it.

### ResumeSnapshot Model (`src/models/ResumeSnapshot.ts`)

- One per application: `applicationId`, `resumeId`, `fileId` (the pinned version), `isLocked`, plus `matchScore` and `keywordsMissing`.

---

## 4. Work State & Handoff Notes

### Dev Environment Status

- All code compilation, static page production, and TypeScript checks pass Next.js cleanly with **0 compilation errors and 0 warnings**.
- Next.js anonymous telemetry has been completely opted out and deactivated.
- PWA manifests, custom service workers, and visual app icons are integrated and configured.

### Suggested Next Steps

1. **Production migrations**: Run `migrate:ai-redesign`, then `migrate:resume-versioning` (dry run, then `-- --apply`) on the production database.
2. **Thinking comparison**: Re-measure thinking settings on the one-call pipeline with `GEMINI_THINKING=<level> npm run eval:ai`.
3. **Analytics Customization**: Build detailed analytics graphs and report summaries in `src/app/(dashboard)/analytics/page.tsx`, including which resume versions lead to interviews.
4. **Other files on applications**: Let an application record which cover letter or other files were sent with it.
