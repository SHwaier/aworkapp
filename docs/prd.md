# PRD: Job Application CRM & Resume Versioning Platform

## 1. Product Overview

### Product Name

Working title: **ApplicationOS**

### Product Type

A security-first job application tracking platform that functions as a personal job-search CRM, document/versioning system, timeline tracker, and application evidence archive.

### Core Idea

The platform helps users track job applications by company, resume version, cover letter version, application status, timeline events, notes, files submitted, contacts, and outcomes.

The main differentiator is not simply tracking applications. The platform should preserve the full historical record of each application:

* What job the user applied to
* Which company it belonged to
* Which resume was submitted
* Which cover letter was submitted
* Which additional files were submitted
* What application questions and answers were used
* What status changes happened over time
* What interviews, screenings, follow-ups, and outcomes occurred
* What notes and reminders were attached

The system should answer:

> Where did I apply, what exactly did I submit, when did I submit it, and what happened after?

---

## 2. Goals

### Primary Goals

1. Allow users to track all job applications in one place.
2. Group applications by company.
3. Group applications by resume version and submitted file versions.
4. Store complete application packages, including resume, cover letter, and other files.
5. Track application statuses as a timeline instead of a single overwritten value.
6. Allow users to add notes, reminders, contacts, interview details, and follow-up actions.
7. Allow users to paste/drop in a job posting URL and have the system extract as much information as possible.
8. Provide analytics about which resume versions, job sources, roles, and companies perform best.
9. Use a clean, modern UI with strong UX and no glassmorphism.
10. Follow a security-first architecture from day one.

### Secondary Goals

1. Help users tailor resumes per job application while preserving resume version history.
2. Store application-specific resume snapshots connected to reusable base resume versions.
3. Create a reusable answer bank from application questions and answers.
4. Provide future AI features such as resume-to-job matching, tailored cover letter drafts, missing keyword detection, and follow-up email suggestions.
5. Support future browser extension capture for job portals that are hard to scrape server-side.

---

## 3. Non-Goals for MVP

The MVP should avoid overbuilding. Do not start with:

* Auto-applying to jobs
* Full LinkedIn automation
* Aggressive scraping of protected job platforms
* Full email inbox integration
* Full browser automation
* Team/collaboration features
* Public sharing/social features
* Complex AI resume rewriting before the core tracking workflow is stable

The MVP must focus on excellent tracking, file organization, status history, notes, and document lineage.

---

## 4. Target User

### Primary User

A job seeker applying to many roles who wants to stay organized and know exactly what was submitted to each application.

### User Needs

The user needs to:

* Track many applications without relying on spreadsheets.
* Know which resume and cover letter were used for each job.
* Understand which resume versions perform best.
* Keep notes about companies, recruiters, interviews, and follow-ups.
* Avoid forgetting important dates and next actions.
* Save job descriptions before postings disappear.
* Tailor resumes without creating chaotic file names.
* Search and filter applications quickly.

---

## 5. Core Product Concept

### Key Product Principle

Applications are not just rows in a table. Each application is a complete historical record.

Each application should include:

* Job details
* Company relationship
* Resume snapshot used
* Cover letter snapshot used
* Other files submitted
* Status timeline
* Notes
* Contacts
* Interviews
* Reminders
* Application questions and answers
* Outcome data

---

## 6. Recommended Tech Stack

### Frontend and Backend

* **Next.js 16+**
* **App Router**
* **Route Handlers** for backend endpoints
* **Server Components** where appropriate
* **Client Components** only for interactive UI

### Request Boundary

* Use **`proxy.ts`** following the Next.js 16+ Proxy convention.
* Do not use the older `middleware.ts` convention.

### Database

* **MongoDB**, preferably MongoDB Atlas.
* Use MongoDB for application data, metadata, version records, notes, statuses, timelines, and references to files.

### File Storage

* Do not store large files directly in MongoDB.
* Store uploaded resumes, cover letters, transcripts, portfolios, certificates, and other files in object storage.
* Recommended options:

  * Cloudflare R2
  * AWS S3
  * Other S3-compatible object storage

### Styling and UI

* **TailwindCSS**
* **shadcn/ui**
* No glassmorphism
* Clean, professional SaaS-style interface

### Validation

* Use **Zod** or equivalent schema validation.
* Validate both client-side and server-side.

### Authentication

* Use secure session-based authentication or a trusted auth provider.
* Prefer HTTP-only cookies.
* Do not store auth tokens in localStorage.

### Deployment

* Vercel is acceptable if the app design fits serverless constraints.
* Self-hosted Node runtime is also acceptable.

---

## 7. High-Level App Sections

The app should be divided into these main modules:

1. Dashboard
2. Applications
3. Companies
4. Resume Library
5. Cover Letter Library
6. Files
7. Contacts
8. Timeline / Reminders
9. Analytics
10. Settings

---

## 8. Recommended Project Structure

```txt
src/
  app/
    (auth)/
      login/
      register/

    (dashboard)/
      dashboard/
      applications/
      applications/[applicationId]/
      companies/
      companies/[companyId]/
      resumes/
      cover-letters/
      files/
      contacts/
      analytics/
      settings/

    api/
      applications/
      companies/
      resumes/
      cover-letters/
      files/
      import-job/
      timeline/
      notes/
      contacts/
      reminders/
      analytics/

  components/
    app-shell/
    applications/
    companies/
    resumes/
    cover-letters/
    timeline/
    notes/
    files/
    contacts/
    analytics/
    ui/

  lib/
    auth/
    db/
    security/
    validators/
    storage/
    scraper/
    rate-limit/
    permissions/
    analytics/

  models/
    Application.ts
    Company.ts
    TimelineEvent.ts
    ResumeVersion.ts
    ResumeSnapshot.ts
    CoverLetterVersion.ts
    CoverLetterSnapshot.ts
    File.ts
    Note.ts
    Contact.ts
    Reminder.ts
    ApplicationQuestionAnswer.ts

  proxy.ts
```

---

## 9. Authentication and Authorization Requirements

### Authentication Requirements

* Users must be authenticated to access dashboard routes.
* Unauthenticated users should be redirected away from private routes.
* Authenticated users should not be able to access login/register pages unless they log out.
* Use HTTP-only cookies for session/token storage.
* Use `Secure` cookies in production.
* Use `SameSite=Lax` or stricter where appropriate.
* Support optional 2FA in a future release.

### Authorization Requirements

Every user-owned query must be scoped by `userId`.

Bad pattern:

```ts
Application.findById(id)
```

Required pattern:

```ts
Application.findOne({ _id: id, userId: session.user.id })
```

This applies to:

* Applications
* Companies
* Files
* Notes
* Timeline events
* Resume versions
* Resume snapshots
* Cover letter versions
* Cover letter snapshots
* Contacts
* Reminders
* Application questions and answers

---

## 10. `proxy.ts` Requirements

### Purpose

Use `proxy.ts` for request-boundary behavior only.

### Responsibilities

`proxy.ts` should handle:

* Redirecting unauthenticated users away from dashboard routes
* Redirecting authenticated users away from login/register pages
* Basic route protection
* Basic request filtering where appropriate
* Adding lightweight security headers if suitable

### Protected Route Examples

```txt
/dashboard/*        requires authentication
/applications/*    requires authentication
/companies/*       requires authentication
/resumes/*         requires authentication
/cover-letters/*   requires authentication
/files/*           requires authentication
/contacts/*        requires authentication
/analytics/*       requires authentication
/settings/*        requires authentication
/api/private/*     requires authentication
```

### Avoid in `proxy.ts`

Do not perform:

* Heavy database operations
* Job scraping
* File processing
* AI processing
* Long-running tasks
* Complex business logic

Proxy should be fast, boring, and focused on guarding request flow.

---

## 11. Core Data Model

## 11.1 User

The User model may be provided by an auth provider, but the app should have access to a stable user ID.

```ts
User {
  _id
  name
  email
  createdAt
  updatedAt
}
```

---

## 11.2 Company

Companies should be first-class objects. Multiple applications can belong to one company.

```ts
Company {
  _id
  userId
  name
  website
  careersUrl
  linkedinUrl
  industry
  location
  notes
  rating
  tags[]
  doNotApplyAgain
  createdAt
  updatedAt
}
```

### Company Page Should Show

* Company name
* Website
* Career page URL
* LinkedIn/company profile URL
* Industry
* Location
* Notes about the company
* All applications to that company
* Contacts/recruiters connected to that company
* Previous outcomes with that company
* Company priority/rating
* Do-not-apply-again flag

### Example Company Insight

```txt
TELUS
- 4 applications
- 2 screenings
- 1 interview
- 0 offers
- Last applied: May 2026
```

---

## 11.3 Application

The Application model is the main entity.

```ts
Application {
  _id
  userId
  companyId

  jobTitle
  jobDescription
  jobUrl
  applicationUrl
  source // LinkedIn, Indeed, company site, referral, recruiter, school board, etc.

  location
  workMode // remote, hybrid, onsite
  employmentType // full-time, part-time, contract, internship, co-op
  seniorityLevel

  salaryMin
  salaryMax
  currency

  datePosted
  applicationDeadline
  appliedAt
  lastCheckedAt

  currentStatus
  lifecycleStage
  nextAction
  nextActionDueAt

  priority
  tags[]

  archivedJobPostSnapshotId

  outcome
  rejectionReason

  createdAt
  updatedAt
}
```

### Important Status Design

Do not treat status as only one overwritten field.

The app should use:

```ts
currentStatus: "Follow-up needed"
lifecycleStage: "Screening completed"
nextAction: "Send follow-up email"
```

This means the dashboard can show the immediate status, but the app still knows the user has already reached important milestones.

---

## 11.4 Application Timeline Event

Status must be stored as a timeline/history of events.

```ts
ApplicationTimelineEvent {
  _id
  userId
  applicationId

  type
  title
  description

  statusAfterEvent
  lifecycleStageAfterEvent

  eventDate
  relatedContactId
  relatedFileIds[]
  reminderAt

  source // manual, email-import, calendar-import, system, ai

  createdAt
  updatedAt
}
```

### Example Timeline

```txt
May 1 — Applied
May 4 — Screening email received
May 6 — Screening completed
May 10 — Follow-up needed
May 12 — Follow-up sent
May 18 — Interview scheduled
```

### Timeline Event Fields

Each timeline event should store:

* Event type
* Event title
* Event date
* Optional time
* Description/notes
* Related contact
* Related files
* Reminder
* Source of event

---

## 11.5 Application Status Model

### Status Should Have Two Layers

1. **Current Status**

   * What the dashboard shows right now.
   * Example: `Follow-up needed`

2. **Lifecycle Stage**

   * The furthest meaningful progress reached.
   * Example: `Screening completed`

### Suggested Current Statuses

* Saved
* Interested
* Preparing documents
* Applied
* Waiting for response
* Follow-up needed
* Follow-up sent
* Recruiter contacted
* Screening scheduled
* Screening completed
* Interview scheduled
* Interview completed
* Technical assessment pending
* Technical assessment completed
* Final round
* Offer received
* Offer accepted
* Offer declined
* Rejected
* Ghosted
* Withdrawn
* Closed / posting removed

### Suggested Lifecycle Milestones

* Saved
* Applied
* Screening received
* Screening completed
* Interview scheduled
* Interview completed
* Technical assessment completed
* Final round completed
* Offer received
* Rejected
* Withdrawn

### Temporary Status Examples

Temporary statuses should not erase lifecycle progress.

Examples:

* Follow-up needed
* Waiting for reply
* Need to prepare
* Need to send documents
* Need to complete assessment

### Dashboard Example

Instead of showing only:

```txt
TELUS — Follow-up Needed
```

Show:

```txt
TELUS — Software Developer
Current: Follow-up Needed
Progress: Applied → Screening Completed
Next Action: Send follow-up by May 12
```

---

## 11.6 Notes

Applications should have multiple notes, not only one text box.

```ts
ApplicationNote {
  _id
  userId
  applicationId

  type // general, prep, recruiter, interview, rejection, salary, private, red-flag
  title
  body
  pinned

  createdAt
  updatedAt
}
```

### Note Types

1. General application notes
2. Interview prep notes
3. Recruiter notes
4. Salary notes
5. Follow-up notes
6. Rejection notes
7. Red flags
8. Private thoughts

### Application-Level Notes

For broad notes about the whole application:

```txt
Company seems interesting. Role focuses heavily on React, TypeScript, and REST APIs.
Salary range looks acceptable. Applied using Frontend Resume v3.
```

### Timeline-Specific Notes

Timeline events should also have notes/descriptions:

```txt
Screening completed. Recruiter asked about availability, salary expectations, and whether I am open to hybrid work.
```

### Pinned Note Example

```txt
Remember: recruiter said the role is hybrid 2 days/week and focused mostly on React + internal tooling.
```

---

## 11.7 File

Files should be stored in object storage. MongoDB stores metadata only.

```ts
File {
  _id
  userId

  originalFileName
  displayName
  fileType
  mimeType
  fileSize
  storageProvider // r2, s3, etc.
  storageKey
  fileHash

  category // resume, cover-letter, transcript, portfolio, certificate, reference, other

  uploadedAt
  createdAt
  updatedAt
}
```

### File Requirements

* Store original filename.
* Store user-friendly display name.
* Store MIME type.
* Store file size.
* Store hash/fingerprint for duplicate detection.
* Store object storage key.
* Never expose raw storage path publicly.
* Downloads should use signed URLs.

### Duplicate Detection

If the user uploads a duplicate file, the app should warn:

```txt
You already uploaded this resume as Resume v3. Do you want to reuse it instead of uploading a duplicate?
```

---

## 11.8 Resume Versioning System

Resume versioning should not be defeated by tailoring resumes per application.

Use three concepts:

1. Master Resume
2. Base Resume Version
3. Application Resume Snapshot

### Concept Explanation

A base resume is reusable across many jobs.

An application resume snapshot is the exact tailored resume submitted to one job.

This allows both:

* Tracking which general resume versions perform best
* Preserving the exact tailored resume submitted to each job

### Resume Version

```ts
ResumeVersion {
  _id
  userId

  name
  versionNumber
  targetRole
  targetIndustry
  skillsEmphasized[]
  experienceEmphasized[]
  projectEmphasized[]

  fileId
  notes
  isActive

  createdAt
  updatedAt
}
```

### Application Resume Snapshot

```ts
ApplicationResumeSnapshot {
  _id
  userId
  applicationId

  baseResumeVersionId
  finalSubmittedFileId

  tailoringNotes
  aiGeneratedChangeSummary
  keywordsAdded[]
  keywordsMissing[]
  matchScore

  manuallyEdited
  promotedToBaseVersion

  createdAt
  updatedAt
}
```

### Example Resume Lineage

```txt
Software Engineer Resume v3
│
├── Tailored for TELUS - Software Developer
├── Tailored for RBC - Frontend Developer
├── Tailored for Shopify - Junior Engineer
└── Tailored for Bell - Web Developer
```

### Resume Analytics

The app should eventually show:

* Base Resume v3 was used for 18 jobs
* 11 were lightly tailored
* 7 were heavily tailored
* 4 led to interviews
* Tailored resumes had a better response rate than untailored ones

### Promote Snapshot to Base Version

If a tailored resume performs well, allow:

```txt
Promote this tailored resume to a new base resume version?
```

---

## 11.9 Cover Letter Versioning System

Cover letters should follow the same pattern as resumes.

```ts
CoverLetterVersion {
  _id
  userId

  name
  versionNumber
  targetRole
  targetIndustry

  fileId
  textContent
  notes
  isActive

  createdAt
  updatedAt
}
```

```ts
ApplicationCoverLetterSnapshot {
  _id
  userId
  applicationId

  baseCoverLetterVersionId
  finalSubmittedFileId

  tailoringNotes
  manuallyEdited

  createdAt
  updatedAt
}
```

The app should track whether a cover letter is:

* General reusable
* Company-specific
* Job-specific
* Application-specific snapshot

---

## 11.10 Application File Package

Each application may include several submitted files.

```ts
ApplicationFile {
  _id
  userId
  applicationId

  fileId
  label // Resume, Cover Letter, Transcript, Portfolio, References, Certificate, Other
  submitted
  submittedAt
  notes

  createdAt
  updatedAt
}
```

### Supported File Types

* Resume
* Cover letter
* Transcript
* Portfolio
* References
* Certificates
* Writing sample
* Work sample
* Other requested files

The goal is to let the user prove exactly what was submitted.

---

## 11.11 Application Questions and Answers

Many job portals ask custom questions. Store them.

```ts
ApplicationQuestionAnswer {
  _id
  userId
  applicationId

  question
  answer
  reusable
  tags[]

  createdAt
  updatedAt
}
```

### Examples

```txt
Question: Why do you want to work here?
Answer: ...

Question: Are you legally eligible to work in Canada?
Answer: Yes.

Question: What are your salary expectations?
Answer: ...
```

### Future Feature

Reusable answer bank:

* Show all previous answers.
* Let user reuse or adapt an answer.
* Tag answers by topic.
* Track which answers were used for which applications.

---

## 11.12 Contacts

Contacts should be linked to companies and applications.

```ts
Contact {
  _id
  userId

  companyId
  applicationIds[]

  name
  title
  email
  phone
  linkedinUrl
  relationshipType // recruiter, hiring-manager, referral, employee, interviewer, other

  notes
  lastContactedAt
  nextFollowUpAt

  createdAt
  updatedAt
}
```

### Contact Use Cases

* Recruiter tracking
* Referral tracking
* Hiring manager notes
* Interviewer notes
* Follow-up reminders

---

## 11.13 Interviews

Interviews can be modeled as timeline events or as a separate collection. For MVP, timeline events may be enough. For a richer implementation, use an Interview model.

```ts
Interview {
  _id
  userId
  applicationId

  type // phone, video, technical, behavioral, final, onsite
  scheduledAt
  durationMinutes
  location
  meetingUrl

  interviewerContactIds[]

  preparationNotes
  questionsAsked[]
  userReflection
  followUpSent
  result

  createdAt
  updatedAt
}
```

### Interview Tracking Should Include

* Interview date/time
* Interview type
* Interviewers
* Meeting link
* Notes
* Questions asked
* Reflections
* Follow-up sent flag
* Result

---

## 11.14 Reminders

```ts
Reminder {
  _id
  userId
  applicationId
  timelineEventId
  contactId

  title
  description
  dueAt
  completedAt
  type // follow-up, interview, deadline, check-posting, custom

  createdAt
  updatedAt
}
```

### Reminder Types

* Follow-up reminder
* Interview reminder
* Application deadline reminder
* Check posting again reminder
* No response after X days reminder
* Send thank-you message reminder
* Complete assessment reminder

---

## 12. Job URL Import / Scraping Feature

### Goal

The user should be able to paste a job posting URL and have the platform extract as much useful information as possible.

### Extracted Fields

Attempt to extract:

* Job title
* Company name
* Job description
* Job posting URL
* Application URL
* Location
* Remote/hybrid/on-site
* Employment type
* Salary range
* Currency
* Date posted
* Application deadline
* Skills and requirements
* Responsibilities
* Benefits
* Source platform

### Extraction Strategy

Use a layered approach.

#### 1. Known ATS / Public Job APIs

Where possible, detect job boards such as:

* Greenhouse
* Lever
* Ashby
* Workable
* Other ATS platforms with accessible public job data

Use official/public endpoints when available.

#### 2. Structured Page Data

Try extracting:

* JSON-LD
* Schema.org JobPosting markup
* Open Graph metadata
* Meta tags
* Semantic HTML

#### 3. Regular HTML Scraping

If structured data is unavailable, parse visible HTML text.

#### 4. Browser Extension Capture

For future release, build a browser extension that captures job details from the page the user is viewing.

This is safer and more reliable for platforms that block server-side scraping.

#### 5. Manual Fallback

If extraction fails, prefill whatever is found and let the user complete the rest.

### Scraping Security Requirements

The job URL import feature must protect against SSRF and malicious inputs.

Required protections:

* Validate URL format.
* Only allow `http` and `https` schemes.
* Block localhost.
* Block private IP ranges.
* Block internal network ranges.
* Block metadata service IPs.
* Set request timeout.
* Limit response size.
* Do not execute remote JavaScript server-side.
* Sanitize extracted HTML.
* Store raw scraped HTML only if safe and necessary.
* Rate-limit imports.

### Scraping Legal / Safety Direction

Avoid aggressive server-side scraping of protected platforms. Prefer:

* Public APIs
* Structured data
* User-driven browser extension capture
* Manual entry

Do not build auto-apply behavior in MVP.

---

## 13. AI Features

AI should be used in focused, practical areas. Do not make the entire product depend on AI.

### MVP-Compatible AI Features

1. Extract fields from a pasted job description.
2. Summarize a long job description.
3. Identify required skills from a job posting.
4. Compare selected resume version against job description.
5. Suggest missing keywords.
6. Recommend the best resume version for a job.
7. Generate tailoring suggestions.
8. Generate cover letter draft based on resume and job description.
9. Generate follow-up email drafts.
10. Detect red flags in job postings.

### Future AI Features

* Resume-to-job match score
* Resume tailoring assistant
* Cover letter generator
* Application question answer helper
* Interview prep generator
* Company research summary
* Application outcome analysis
* Suggestions based on previous successful applications

### Important AI Design Principle

AI should suggest. The user should approve.

Do not silently modify submitted records, resumes, or application statuses without user confirmation.

---

## 14. Analytics Dashboard

### Goal

Help the user understand how their job search is performing.

### Metrics

Track:

* Total applications
* Applications per week
* Applications per month
* Response rate
* Interview rate
* Rejection rate
* Ghost rate
* Offer rate
* Best-performing resume version
* Best-performing cover letter version
* Best-performing job source
* Best-performing company type
* Average time from applied to response
* Average time from applied to screening
* Average time from interview to decision
* Roles with highest success rate
* Most common skills in saved jobs
* Salary range distribution
* Follow-ups due
* Applications stuck in waiting state

### Resume Analytics

For each resume version:

* Number of applications used
* Number of interviews generated
* Number of screenings generated
* Number of offers generated
* Response rate
* Interview rate

### Company Analytics

For each company:

* Number of applications
* Status distribution
* Outcome history
* Last application date
* Contacts

---

## 15. Search and Filtering Requirements

The user must be able to search and filter applications quickly.

### Search Across

* Job title
* Company name
* Job description
* Notes
* Tags
* Application questions
* Contacts
* Resume version name
* Cover letter version name

### Filters

Support filtering by:

* Company
* Resume version
* Cover letter version
* Status
* Lifecycle stage
* Date applied
* Job source
* Location
* Remote/hybrid/on-site
* Employment type
* Salary range
* Tags
* Skills
* Application outcome
* File used
* Recruiter/contact
* Follow-up due date
* Priority

### Saved Views

Future feature:

* “Follow-ups due this week”
* “Applications waiting over 14 days”
* “Interview stage”
* “Software engineering applications”
* “Applied with Resume v3”

---

## 16. UI / UX Requirements

### Design Direction

The UI should be:

* Clean
* Professional
* Modern
* Calm
* Data-friendly
* Easy to scan
* No glassmorphism
* No excessive gradients
* No overly decorative effects

### Visual Style

Use:

* White or neutral backgrounds
* Strong typography
* Subtle borders
* Minimal shadows
* Clear spacing
* Clean cards
* Tables with good filtering
* High-contrast buttons
* Accessible color contrast

Design inspiration:

* Notion-like organization
* Linear-like polish
* CRM-like clarity

### Dashboard UX

Dashboard should show:

* Applications this month
* Interview rate
* Follow-ups due
* Best-performing resume
* Pending screenings
* Recent company activity
* Applications needing attention

### Application Detail Page Layout

Recommended layout:

```txt
Header:
Job title, company, current status, lifecycle stage, next action

Left / Main column:
Timeline
Notes
Interviews
Questions/answers

Right sidebar:
Resume used
Cover letter used
Other files
Job URL
Application URL
Company info
Contacts
Metadata
```

### Application Page Should Answer

1. What is this job?
2. Where am I in the process?
3. What did I submit?
4. What happened so far?
5. What do I need to do next?

---

## 17. Important User Flows

## 17.1 Create Application Manually

1. User clicks “New Application.”
2. User selects or creates company.
3. User enters job title, job URL, description, location, and source.
4. User selects resume version.
5. User optionally creates tailored resume snapshot.
6. User selects cover letter version.
7. User uploads/attaches other files.
8. User sets applied date and initial status.
9. System creates initial timeline event.
10. User lands on application detail page.

---

## 17.2 Create Application from Existing Company

1. User opens a company page.
2. User clicks “Add Application.”
3. Company is preselected.
4. User enters/imports job details.
5. User attaches files and statuses.
6. Application appears under that company.

---

## 17.3 Import Job from URL

1. User clicks “Import Job.”
2. User pastes job posting URL.
3. System validates URL.
4. System attempts extraction.
5. System displays extracted fields for review.
6. User edits incorrect/missing fields.
7. User saves as application.
8. System stores job post snapshot.

---

## 17.4 Tailor Resume for Application

1. User selects a base resume version.
2. System compares resume against job description.
3. System suggests changes.
4. User edits or uploads final tailored resume.
5. System creates an Application Resume Snapshot.
6. Snapshot is linked to application and base resume version.

---

## 17.5 Update Status with Timeline

1. User opens application.
2. User clicks “Add Timeline Event.”
3. User selects event type/status.
4. User adds notes.
5. User optionally adds reminder or contact.
6. System updates timeline.
7. System may update current status and lifecycle stage.

Example:

```txt
Event: Screening completed
Current status after event: Waiting for response
Lifecycle stage after event: Screening completed
Reminder: Follow up in 5 days
```

---

## 17.6 Add Notes

1. User opens application.
2. User clicks “Add Note.”
3. User chooses note type.
4. User enters note title/body.
5. User optionally pins note.
6. Note appears on application page.

---

## 17.7 Follow-Up Reminder

1. User adds reminder manually or through timeline event.
2. Reminder appears on dashboard.
3. User completes reminder.
4. Completion creates or links to a timeline event.

---

## 18. API Design Guidelines

### General API Requirements

* Use REST-like route handlers unless project later chooses RPC/server actions for specific cases.
* Validate all input with schemas.
* Scope all data by user ID.
* Return safe error messages.
* Rate-limit sensitive routes.
* Do not expose internal IDs unnecessarily to the UI if not needed.

### Suggested API Routes

```txt
POST   /api/applications
GET    /api/applications
GET    /api/applications/:id
PATCH  /api/applications/:id
DELETE /api/applications/:id

POST   /api/companies
GET    /api/companies
GET    /api/companies/:id
PATCH  /api/companies/:id
DELETE /api/companies/:id

POST   /api/resumes
GET    /api/resumes
GET    /api/resumes/:id
PATCH  /api/resumes/:id
DELETE /api/resumes/:id

POST   /api/cover-letters
GET    /api/cover-letters
GET    /api/cover-letters/:id
PATCH  /api/cover-letters/:id
DELETE /api/cover-letters/:id

POST   /api/files/upload
GET    /api/files
GET    /api/files/:id/download
DELETE /api/files/:id

POST   /api/applications/:id/timeline
GET    /api/applications/:id/timeline
PATCH  /api/timeline/:eventId
DELETE /api/timeline/:eventId

POST   /api/applications/:id/notes
GET    /api/applications/:id/notes
PATCH  /api/notes/:noteId
DELETE /api/notes/:noteId

POST   /api/import-job

GET    /api/analytics/overview
GET    /api/analytics/resumes
GET    /api/analytics/companies
```

---

## 19. MongoDB Indexing Recommendations

Add indexes for common access patterns.

### Applications

```ts
{ userId: 1, createdAt: -1 }
{ userId: 1, companyId: 1 }
{ userId: 1, currentStatus: 1 }
{ userId: 1, lifecycleStage: 1 }
{ userId: 1, appliedAt: -1 }
{ userId: 1, nextActionDueAt: 1 }
{ userId: 1, tags: 1 }
```

### Companies

```ts
{ userId: 1, name: 1 }
{ userId: 1, createdAt: -1 }
```

### Timeline Events

```ts
{ userId: 1, applicationId: 1, eventDate: -1 }
```

### Files

```ts
{ userId: 1, fileHash: 1 }
{ userId: 1, category: 1 }
{ userId: 1, uploadedAt: -1 }
```

### Notes

```ts
{ userId: 1, applicationId: 1, createdAt: -1 }
{ userId: 1, applicationId: 1, pinned: 1 }
```

---

## 20. Security Requirements

This platform stores sensitive personal and career information. Security is a core product requirement.

### Authentication Security

* Use HTTP-only cookies.
* Use secure cookies in production.
* Use CSRF protection where appropriate.
* Rotate sessions where appropriate.
* Do not store auth tokens in localStorage.
* Support optional 2FA later.

### Authorization Security

* Every database query must be scoped by user ID.
* Never trust client-provided `userId`.
* Derive user ID from the authenticated session.
* Prevent IDOR vulnerabilities.

### File Security

* Store files in private object storage.
* Use signed URLs for downloads.
* Validate file types.
* Limit file sizes.
* Scan files for malware in a future release.
* Never expose raw object storage keys publicly.
* Prevent users from accessing files they do not own.

### Input Validation

Validate:

* Job URLs
* Company data
* Notes
* Status updates
* Timeline events
* Resume metadata
* File uploads
* Scraped content
* Contact data
* Application questions and answers

### Rate Limiting

Rate-limit:

* Login attempts
* Registration attempts
* Job URL imports
* File uploads
* AI endpoints
* Expensive analytics endpoints

### Scraping Security

Required:

* SSRF protection
* Timeout limits
* Response size limits
* URL scheme validation
* Private network blocking
* HTML sanitization

### Audit Logging

Add audit logs for sensitive actions:

* File uploaded
* File downloaded
* Application deleted
* Resume snapshot created
* Cover letter snapshot created
* Status changed
* Account settings changed
* Job imported from URL

```ts
AuditLog {
  _id
  userId
  action
  entityType
  entityId
  metadata
  ipAddress
  userAgent
  createdAt
}
```

---

## 21. Accessibility Requirements

The app should be accessible from the start.

Requirements:

* Keyboard navigable UI
* Visible focus states
* Proper labels for form fields
* Semantic HTML
* Accessible dialogs/dropdowns
* High contrast text
* Screen-reader friendly status labels
* Avoid color-only status communication
* Support reduced motion preferences

---

## 22. Error Handling Requirements

The app should handle errors clearly.

### Examples

If job import fails:

```txt
We could not extract all details from this job posting. Some fields were filled automatically, but you can complete the rest manually.
```

If file upload fails:

```txt
The file could not be uploaded. Please check the file type and size, then try again.
```

If access is denied:

```txt
You do not have permission to access this item.
```

Avoid exposing stack traces or sensitive backend information.

---

## 23. MVP Scope

### Phase 1: Core Tracking MVP

Build first:

1. Authentication
2. Protected dashboard routes with `proxy.ts`
3. Companies
4. Applications
5. Timeline statuses
6. Notes
7. Resume versions
8. File uploads
9. Application resume snapshots
10. Basic search/filtering

### Phase 1 Acceptance Criteria

The user can:

* Create an account and log in.
* Create companies.
* Create applications.
* Attach an application to a company.
* Upload resume files.
* Create resume versions.
* Attach a resume snapshot to an application.
* Add timeline events.
* Add notes.
* Filter applications by company/status/resume version.
* View an application detail page with timeline, notes, files, and metadata.

---

## 24. Phase 2 Scope

Build second:

1. Cover letter versions
2. Application cover letter snapshots
3. Other application files
4. Application questions and answers
5. Follow-up reminders
6. Contacts/recruiter CRM
7. Interview tracking
8. Basic analytics dashboard

### Phase 2 Acceptance Criteria

The user can:

* Track cover letter versions.
* Attach cover letter snapshots to applications.
* Attach other submitted files.
* Store job application questions and answers.
* Create reminders.
* Track contacts connected to companies/applications.
* Track interviews.
* View analytics for applications, resume versions, and outcomes.

---

## 25. Phase 3 Scope

Build third:

1. Job URL import
2. Job description parser
3. AI extraction from pasted job descriptions
4. Resume-to-job matching
5. Tailoring suggestions
6. Cover letter draft generation
7. Follow-up email draft generation
8. Browser extension proof of concept

### Phase 3 Acceptance Criteria

The user can:

* Paste a job URL and import available job details.
* Paste a job description and have the system extract structured fields.
* Compare a resume version against a job description.
* Receive tailoring suggestions.
* Generate draft follow-up messages.
* Use imported data to create an application faster.

---

## 26. Future Features

Possible future additions:

* Browser extension for job capture
* Calendar integration
* Email integration
* AI interview prep
* AI company research summaries
* Saved custom views
* Advanced reporting
* Data export
* Account deletion / privacy controls
* Mobile app
* Team/career coach sharing

---

## 27. Privacy Requirements

The app must treat user data as private and sensitive.

Required:

* Private-by-default applications
* User-owned files
* Data export feature in future release
* Account deletion feature in future release
* Clear data ownership model
* No sharing without explicit user action
* No public profile by default

---

## 28. Data Export Requirements

Future feature but should be planned early.

Allow users to export:

* Applications as CSV/JSON
* Companies as CSV/JSON
* Notes as JSON/Markdown
* Timeline history as JSON
* Resume/cover letter metadata
* Original files as downloadable archive

---

## 29. Definition of Done

A feature is complete only when:

1. It is authenticated/protected where required.
2. It scopes data by user ID.
3. It validates input server-side.
4. It handles loading, empty, success, and error states.
5. It works with keyboard navigation where applicable.
6. It has clear UI feedback.
7. It does not expose private data.
8. It has basic tests where appropriate.
9. It follows the app’s visual style.
10. It is documented enough for future maintainers.

---

## 30. Final Product Positioning

The product should be positioned as:

> A job application operating system that tracks every company, application, document, timeline event, note, and submitted file in one secure place.

The core differentiator:

```txt
Every application has a complete historical record:
- what job you applied to
- when you applied
- what resume you used
- what cover letter you used
- what files you submitted
- what questions you answered
- what happened after
- what follow-ups/interviews/outcomes happened
```

This is stronger than a normal job tracker because it tracks both the application process and the evidence behind each application.
