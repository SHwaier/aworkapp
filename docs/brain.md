# Project Brain & Handoff (AWorkApp)

This document serves as the pairing context and history log for the AI agent context window. Keep this updated as a source of truth for features implemented, architectural changes, database setups, and pending tasks.

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
  - `src/lib/auth/session.ts` — Authentication session and route protection middleware helpers (`requireAuth`).

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

---

## 4. Work State & Handoff Notes

### Dev Environment Status
- Running locally on `http://localhost:3000` (Process ID `11967`).
- All code compilation and static site generation passes Next.js checks cleanly (`npm run build` outputs 0 compilation/type errors).
- Automated browser testing confirms drag-and-drop operations and auto-suggestions function correctly.

### Suggested Next Steps
1. **Analytics Customization**: Build detailed analytics graphs and report summaries in `src/app/(dashboard)/analytics/page.tsx`.
2. **Resume Matching**: Add AI-based or tag-based resume matching tools on the individual application detail page.
3. **Files Space Enhancement**: Build folder organizers or category tagging for uploaded transcripts, cover letters, and references.
