# Follow-Up Instruction Set: Scalability, Security-First Design, and Clean Code Standards

## Context

The resume checklist feature has already been implemented and then updated to become role-agnostic. The next step is to ensure the feature is scalable, secure, maintainable, and built with clean code practices.

This instruction set does not replace the previous implementation. It extends it.

The feature must continue to support:

* Application-specific resume checklists
* Job-description-based keyword extraction
* Role-agnostic resume guidance
* ATS formatting checks
* Resume bullet quality checks
* Resume version tracking
* Submitted resume snapshots
* Matched, missing, and unsupported keyword tracking

The new requirement is that all of this must be implemented with a security-first and scalable architecture.

---

# Main Objective

Refactor and harden the resume checklist feature so that it can safely and efficiently support many users, many applications, many resume versions, and many checklist items without becoming slow, insecure, or difficult to maintain.

The system should be designed for:

* Scalability
* Security
* Privacy
* Clean code
* Maintainability
* Testability
* Performance
* Data integrity
* Future AI integration
* Safe handling of sensitive user resume data

---

# 1. Security-First Requirements

## Resume Data Is Sensitive

Resume data should be treated as sensitive personal information.

The system may store:

* Full name
* Email address
* Phone number
* City or region
* Work history
* Education history
* Skills
* Certifications
* Links
* Uploaded resume files
* Job applications
* Notes
* Employment history
* Application outcomes

Because of this, the feature must be built with strong security controls.

---

## Access Control

Every resume, checklist, keyword, bullet analysis, snapshot, and uploaded file must belong to a specific authenticated user.

The backend must enforce ownership checks on every read, write, update, and delete operation.

Never rely only on frontend checks.

Required rule:

```text
A user must never be able to access another user's resume, checklist, application, keyword data, file, or snapshot by changing an ID in the URL or request body.
```

Every query should be scoped by `userId`.

Example:

```ts
// Bad
findResumeById(resumeId)

// Good
findResumeByIdAndUserId(resumeId, userId)
```

---

## Authorization Rules

The system should enforce clear authorization rules.

Examples:

* User can only view their own resume checklists.
* User can only edit their own resume versions.
* User can only generate checklist items for their own applications.
* User can only export their own resume snapshots.
* User can only delete their own uploaded resume files.
* Admin/debug routes must not expose resume content unless explicitly authorized.

---

## Input Validation

All user input must be validated on the server.

Validate:

* Job title
* Company name
* Job description
* Resume content
* Checklist item status
* Resume bullet text
* Keywords
* URLs
* File uploads
* Resume version names
* Application IDs
* Snapshot IDs

Use schema validation such as Zod or a similar validation layer.

The API should reject invalid or unexpected fields instead of silently accepting them.

---

## Output Sanitization

Resume content and job descriptions may contain user-generated text.

The app must prevent:

* XSS
* HTML/script injection
* Malicious links
* Unsafe markdown rendering
* Stored malicious content inside resume text, notes, job descriptions, or checklist suggestions

If rich text is supported, sanitize HTML before rendering.

If markdown is supported, render it safely.

Never render raw user input as trusted HTML.

---

## File Upload Security

If users can upload resumes, cover letters, or other documents, the app must validate uploaded files.

Required checks:

* Restrict file types to allowed formats, such as PDF, DOCX, TXT, or supported resume formats.
* Validate MIME type and file extension.
* Set file size limits.
* Store files using private access by default.
* Never expose public file URLs unless intentionally generated as temporary signed URLs.
* Scan or reject suspicious files where possible.
* Do not execute uploaded files.
* Do not trust file metadata.
* Store uploaded files under user-scoped paths.

Example storage path:

```text
/users/{userId}/applications/{applicationId}/resumes/{fileId}
```

Avoid predictable public paths.

---

## Sensitive Logging Rules

Do not log full resume content, job descriptions, phone numbers, emails, or private notes in application logs.

Logs may include:

* Request ID
* User ID
* Application ID
* Resume version ID
* Error type
* Status code
* Timing/performance information

Logs should not include:

* Full resume text
* Full job description
* Personal contact information
* Uploaded file contents
* Private notes
* AI prompts containing resume content

---

## Rate Limiting

Add rate limits to expensive or sensitive actions.

Rate-limit:

* AI checklist generation
* Job description parsing
* Resume analysis
* File uploads
* Resume exports
* Authentication endpoints
* Bulk keyword extraction
* Snapshot generation

This prevents abuse, runaway usage, and accidental high-cost AI calls.

---

## Audit Trail

Important resume and application actions should be auditable.

Track events such as:

* Resume version created
* Resume version updated
* Resume snapshot generated
* Resume exported
* Checklist generated
* Checklist item ignored
* Checklist item marked complete
* File uploaded
* File deleted
* Application submitted/marked as applied

Audit logs should store metadata, not sensitive full content.

Example:

```ts
type AuditEvent = {
  id: string;
  userId: string;
  action: string;
  entityType: "resume" | "application" | "checklist" | "file" | "snapshot";
  entityId: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
};
```

---

# 2. Privacy Requirements

## User Data Isolation

All resume and application data must be isolated per user.

A user’s resume data should not be used to generate suggestions for another user.

Do not train shared suggestion logic directly on private user data unless the user has explicitly consented.

---

## AI Privacy

If AI is used for keyword extraction, bullet rewriting, or checklist generation:

* Send only the minimum necessary content.
* Avoid sending unrelated user profile data.
* Do not include sensitive notes unless needed.
* Do not include authentication tokens or internal IDs.
* Avoid exposing full application history when only one resume/job pair is needed.
* Store AI responses carefully and tie them to the correct user/application.

The system should clearly separate:

* User-provided resume content
* User-provided job description
* AI-generated suggestions
* User-approved resume edits

AI suggestions should not automatically modify the resume without user confirmation.

---

## Data Deletion

When a user deletes an application, resume, file, or account, related data should be handled properly.

Deleting an application should handle:

* Checklist items
* Extracted keywords
* Bullet analysis
* Resume snapshots
* Application-specific notes
* Exported files, depending on product rules

If soft delete is used, make sure deleted data is not shown in the UI or used in recommendations.

---

# 3. Scalability Requirements

## Avoid Reanalyzing Everything

The app should not re-run the entire resume analysis every time the user types one character.

Use efficient update strategies.

Recommended approach:

* Debounce resume analysis while editing.
* Analyze only changed sections when possible.
* Cache extracted job keywords.
* Cache ATS checks.
* Cache bullet analysis results by bullet hash.
* Re-run full analysis only when needed.

Example:

```text
If job description has not changed, do not extract keywords again.
If only one bullet changed, only reanalyze that bullet.
If resume formatting changed, only re-run ATS formatting checks.
```

---

## Background Jobs for Expensive Work

Expensive operations should run as background jobs where possible.

Examples:

* AI keyword extraction
* AI bullet rewriting
* Resume parsing
* Large document import
* Resume export
* Snapshot generation
* Full checklist regeneration

The UI should show progress states such as:

* Pending
* Processing
* Complete
* Failed
* Retry available

Do not block the entire editor while analysis is running.

---

## Database Indexing

Add indexes for common query patterns.

Recommended indexes:

```ts
// Checklist items
{ userId: 1, applicationId: 1, resumeVersionId: 1 }

// Resume keywords
{ userId: 1, applicationId: 1, resumeVersionId: 1 }

// Resume versions
{ userId: 1, updatedAt: -1 }

// Resume snapshots
{ userId: 1, applicationId: 1, createdAt: -1 }

// Applications
{ userId: 1, companyId: 1 }
{ userId: 1, status: 1 }
{ userId: 1, createdAt: -1 }

// Audit events
{ userId: 1, createdAt: -1 }
```

All queries should be scoped by `userId`.

---

## Pagination

Do not load unlimited checklist items, resume versions, applications, or audit events at once.

Use pagination or lazy loading for:

* Applications
* Resume versions
* Resume snapshots
* Checklist history
* Keyword history
* Audit logs
* AI suggestion history

---

## Checklist Generation Strategy

Checklist generation should be modular.

Instead of one giant function, split generation into separate analyzers:

```text
JobDescriptionAnalyzer
KeywordMatcher
ATSAnalyzer
HeaderAnalyzer
EducationAnalyzer
SkillsAnalyzer
ExperienceAnalyzer
ProjectsAnalyzer
CertificationsAnalyzer
BulletQualityAnalyzer
FinalReviewAnalyzer
```

Each analyzer should produce checklist items independently.

This makes the system easier to scale, test, debug, and extend.

---

# 4. Clean Code Architecture

## Recommended Module Structure

Organize the resume checklist logic into clear modules.

Example:

```text
/resume-checklist
  /analyzers
    job-description-analyzer.ts
    keyword-matcher.ts
    ats-analyzer.ts
    header-analyzer.ts
    education-analyzer.ts
    skills-analyzer.ts
    experience-analyzer.ts
    projects-analyzer.ts
    certifications-analyzer.ts
    bullet-quality-analyzer.ts
    final-review-analyzer.ts

  /services
    checklist-generation-service.ts
    keyword-extraction-service.ts
    resume-analysis-service.ts
    resume-snapshot-service.ts

  /schemas
    checklist.schema.ts
    keyword.schema.ts
    resume-analysis.schema.ts

  /types
    checklist.types.ts
    keyword.types.ts
    resume.types.ts

  /utils
    normalize-keyword.ts
    detect-job-category.ts
    compare-keywords.ts
    sanitize-resume-content.ts
    hash-resume-section.ts
```

---

## Separation of Concerns

Do not mix:

* UI rendering
* Database access
* AI calls
* Business logic
* Validation
* Authorization
* Formatting logic

Each should live in its own layer.

Recommended flow:

```text
UI → API Route/Server Action → Validation → Authorization → Service → Repository/Database → Response
```

---

## Avoid Giant Prompt-Only Logic

Do not make the entire feature depend on one large AI prompt.

AI can help with:

* Keyword extraction
* Suggested bullet rewrites
* Job category detection
* Checklist suggestions

But deterministic code should handle:

* Ownership checks
* Validation
* Status updates
* Checklist persistence
* Resume version links
* Snapshot locking
* Basic keyword matching
* Basic ATS formatting checks
* Rate limiting
* Audit logs

AI should assist the system, not replace the system.

---

## Deterministic First, AI Second

Use deterministic logic where possible.

Examples:

Deterministic:

* Does resume include email?
* Does resume include phone number?
* Does keyword appear in resume?
* Is checklist item complete?
* Is resume linked to application?
* Is snapshot locked?
* Is GitHub missing?
* Is certification listed?

AI-assisted:

* Is this bullet strong?
* What job category is this?
* Which keywords are most important?
* How should this bullet be rewritten?
* Is this skill supported by experience?
* What transferable skills are present?

---

# 5. Data Integrity Rules

## Resume Snapshots Must Be Immutable

Once a resume snapshot is saved as submitted, it should not be edited.

If the user wants to change it, create a new snapshot.

Required rule:

```text
Submitted resume snapshots are immutable.
```

A snapshot should preserve:

* Resume content at submission time
* Resume version used
* Application ID
* Exported file reference
* Checklist state
* Keyword match state
* Creation timestamp

---

## Checklist Items Should Be Idempotent

Regenerating a checklist should not create duplicate items every time.

Use stable keys for generated checklist items.

Example stable key:

```text
applicationId + resumeVersionId + category + relatedKeyword + analyzerName
```

If the same issue already exists, update it instead of creating a duplicate.

---

## Preserve User Decisions

If a user marks an item as ignored or not applicable, do not automatically recreate the same warning repeatedly unless the underlying condition changes significantly.

Example:

```text
User ignored “Add GitHub link.”
Do not keep showing it unless the job category changes to technology or the user resets ignored items.
```

---

## Checklist Versioning

When the job description or resume changes significantly, the app should know whether checklist results are stale.

Add fields like:

```ts
type ChecklistRun = {
  id: string;
  userId: string;
  applicationId: string;
  resumeVersionId: string;
  jobDescriptionHash: string;
  resumeContentHash: string;
  status: "pending" | "processing" | "complete" | "failed";
  createdAt: Date;
  completedAt?: Date;
};
```

If the resume content hash changes, show:

```text
Checklist may be outdated. Re-run analysis.
```

Or auto-refresh using debounce/background jobs.

---

# 6. Performance Requirements

## Debouncing

While the user edits the resume, analysis should be debounced.

Suggested behavior:

```text
Run lightweight checks after 500–1000ms of no typing.
Run expensive AI analysis only when the user clicks Analyze, saves, or stops editing for a longer period.
```

---

## Caching

Cache:

* Extracted job keywords
* Job category detection result
* Resume text parsing result
* Bullet analysis by bullet hash
* ATS formatting analysis
* AI responses where safe and useful

Invalidate cache when:

* Job description changes
* Resume content changes
* Resume version changes
* User manually requests regeneration

---

## Partial Analysis

Do not analyze the whole resume every time.

Examples:

* If a skill changes, update skill-related checklist items.
* If a bullet changes, re-run bullet analysis only for that bullet.
* If job description changes, re-run job keyword extraction and job match.
* If formatting changes, re-run ATS checks.

---

# 7. Error Handling

The feature should handle failures gracefully.

Examples:

If AI extraction fails:

```text
We could not generate smart suggestions right now. Basic checklist checks are still available.
```

If file upload fails:

```text
Resume upload failed. Please check the file type and size, then try again.
```

If checklist generation fails:

```text
Checklist generation failed. Your resume was not changed. You can retry analysis.
```

Do not lose user edits if analysis fails.

Do not block resume editing if checklist generation fails.

---

# 8. Testing Requirements

## Unit Tests

Add unit tests for:

* Job category detection
* Keyword normalization
* Keyword matching
* Checklist item generation
* ATS checks
* Bullet action verb detection
* Snapshot immutability
* Authorization helpers
* Input validation schemas

---

## Integration Tests

Add integration tests for:

* Creating checklist for an application
* Updating checklist status
* Regenerating checklist without duplicates
* Saving submitted resume snapshot
* Preventing access to another user’s resume
* Deleting an application and related checklist data
* Uploading valid and invalid resume files

---

## Security Tests

Test that:

* User A cannot access User B’s resume by changing IDs
* User A cannot update User B’s checklist item
* Malicious HTML/script in resume content is sanitized
* Invalid file uploads are rejected
* Oversized payloads are rejected
* Rate limits work
* Private file URLs are not exposed publicly

---

# 9. API Design Requirements

APIs should be predictable and resource-oriented.

Example endpoints:

```text
GET    /api/applications/:applicationId/resume-checklist
POST   /api/applications/:applicationId/resume-checklist/generate
PATCH  /api/resume-checklist/items/:itemId
POST   /api/applications/:applicationId/resume-keywords/extract
POST   /api/applications/:applicationId/resume-snapshots
GET    /api/applications/:applicationId/resume-snapshots
```

Every route must:

* Authenticate the user
* Validate input
* Check ownership
* Apply rate limits where needed
* Return safe errors
* Avoid leaking sensitive data

---

# 10. Clean UI/UX Requirements

The UI should remain responsive even when analysis is running.

Required UI states:

* Loading
* Processing
* Complete
* Failed
* Retry
* Stale checklist
* No job description
* No resume selected
* No checklist items yet

The checklist should clearly distinguish between:

* Critical issues
* Warnings
* Suggestions
* Completed items
* Ignored items
* Not applicable items

The user should always control whether suggestions are applied.

Do not automatically insert AI-generated text into the resume without confirmation.

---

# 11. Observability

Add basic observability for debugging and performance.

Track:

* Checklist generation time
* Keyword extraction time
* AI request success/failure
* Number of checklist items generated
* Number of duplicate items avoided
* Number of stale checklists
* File upload failures
* Export failures
* Rate limit hits

Do not track or log full resume content.

---

# 12. Acceptance Criteria

The feature meets this instruction set when:

1. Every resume checklist query is scoped by authenticated `userId`.
2. Users cannot access other users’ resume data by changing IDs.
3. Resume content and job descriptions are validated and sanitized.
4. Uploaded files are type-limited, size-limited, and privately stored.
5. Expensive analysis is debounced, cached, or moved to background jobs.
6. Checklist generation is modular, not one giant function.
7. Checklist regeneration does not create duplicate items.
8. User decisions such as ignored/not applicable are preserved.
9. Submitted resume snapshots are immutable.
10. The app handles AI failures without losing resume edits.
11. The UI remains usable while checklist analysis runs.
12. Sensitive data is not logged.
13. Role-agnostic behavior remains intact.
14. Tech roles are still supported, but not assumed by default.
15. Tests cover authorization, validation, checklist generation, and snapshot behavior.
16. The code is organized into services, analyzers, schemas, types, and utilities.
17. The feature can support many applications, resumes, checklist items, and users without major rewrites.

---

# Final Instruction

Keep the existing role-agnostic resume checklist feature, but harden it for production.

Build it as a secure, scalable, modular feature.

Do not trust the frontend.

Do not trust user input.

Do not expose private resume data.

Do not make AI responsible for core security or data integrity.

Use clean architecture, strong validation, ownership checks, caching, background processing where appropriate, and immutable submitted snapshots.
