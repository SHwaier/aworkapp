# Resume Editing Checklist Feature

## Overview

This feature is designed for a job application tracking platform that already includes a built-in resume editor. The goal is to help users tailor their resume for each specific job application without switching between different windows or tools.

The resume editor should include an application-specific checklist/sidebar that helps users track important resume improvements while they edit. The checklist should guide the user through ATS formatting, job keyword matching, section completeness, bullet quality, skill relevance, project relevance, and final submission readiness.

This feature should not simply tell users to add more keywords. Instead, it should help users identify which keywords are important, which ones are already included, which ones are missing but supported by their actual experience, and which ones should not be added unless they are true.

---

# Main Goal

The resume checklist should help users make sure their resume is:

- Tailored to the specific job application
- ATS-friendly
- Easy for recruiters to scan
- Honest and evidence-based
- Focused on relevant skills, projects, education, and experience
- Written with strong action verbs
- Supported by measurable accomplishments where possible
- Connected to the exact application and resume version being used

The feature should live inside the existing resume editor and update based on the current job description, current resume content, and selected application.

---

# Recommended Layout

The resume editor page should have the resume editor on one side and the checklist/sidebar on the other.

```text
Resume Editor Page
------------------------------------------------
| Resume Editor                    | Checklist |
|                                  |           |
| User edits resume here           | Job Match |
|                                  | ATS       |
|                                  | Sections  |
|                                  | Bullets   |
|                                  | Skills    |
|                                  | Final     |
------------------------------------------------
```

The checklist should update based on:

- The current job application
- The job description
- The resume currently being edited
- The selected resume version
- The user’s saved skills, projects, education, and experience
- The current resume text

---

# Checklist Item Statuses

Each checklist item should have a clear status.

| Status           | Meaning                                           |
| ---------------- | ------------------------------------------------- |
| `not_started`    | User has not addressed the item yet               |
| `in_progress`    | Some progress has been made, but it is incomplete |
| `complete`       | The item has been satisfied                       |
| `needs_review`   | The app detected a possible issue                 |
| `ignored`        | User manually chose to ignore the item            |
| `not_applicable` | The item does not apply to this job or resume     |

Example checklist items:

```text
[Needs Review] Resume mentions React, but no project or experience currently proves it.
[Complete] Contact information is included.
[Not Started] Add 2–3 relevant coursework items.
[Ignored] User chose not to include GPA.
```

---

# Checklist Categories

The checklist should be divided into practical categories.

Recommended categories:

- Job Match
- ATS Formatting
- Header
- Education
- Skills
- Projects
- Experience
- Bullet Quality
- Action Verbs
- Final Review

---

# 1. Job Match Checklist

## Purpose

The Job Match checklist helps users compare their resume against the specific job description.

It should answer:

- What keywords does the job description mention?
- Which required skills are already in the resume?
- Which preferred skills are already in the resume?
- Which keywords are missing?
- Which missing keywords are supported by the user’s saved experience?
- Which keywords should not be added because there is no evidence?
- Which resume sections should be adjusted for this job?

---

## Job Match Checklist Items

The system should track whether:

- Job description has been added
- Required skills have been extracted
- Preferred or nice-to-have skills have been extracted
- Important keywords are categorized
- Resume includes the most important required keywords that the user can honestly support
- Resume does not include unsupported skills
- Resume includes relevant domain terms from the job posting
- Resume includes relevant role terms from the job posting
- Resume includes tools, technologies, or platforms from the job description
- Resume uses the same terminology as the job description where appropriate

---

## Example Job Match Checklist

```text
Job Match

☑ Job description imported
☑ Required skills identified
☐ Add “project management” if supported by your experience
☐ Add “telecom” if relevant to your TELUS experience
☑ Resume includes JavaScript
☑ Resume includes customer service
⚠ Jira appears in the job description, but your resume does not show evidence for it
```

---

## Keyword Recommendation Types

The app should not blindly recommend every missing keyword. Each keyword should be classified.

| Keyword Type       | Meaning                                                      |
| ------------------ | ------------------------------------------------------------ |
| `safe_to_add`      | User has proof, but the resume does not mention it           |
| `add_only_if_true` | Possible match, but needs user confirmation                  |
| `unsupported`      | User has no evidence for it                                  |
| `already_included` | Resume already contains it                                   |
| `not_relevant`     | Job mentions it, but it does not matter much for this resume |

---

## Example Keyword Recommendations

```text
Keyword: React
Category: Framework
Requirement: Required
Appears in job: Yes
Appears in resume: Yes
Evidence found: Anime streaming site, portfolio project
Recommendation: Keep
```

```text
Keyword: Jira
Category: Tool
Requirement: Preferred
Appears in job: Yes
Appears in resume: No
Evidence found: No
Recommendation: Do not add unless user has used it
```

```text
Keyword: Telecom
Category: Domain
Requirement: Nice-to-have
Appears in job: Yes
Appears in resume: No
Evidence found: TELUS retail experience
Recommendation: Safe to add naturally
```

---

# 2. ATS Formatting Checklist

## Purpose

The ATS Formatting checklist helps users make sure the resume is likely to be parsed correctly by applicant tracking systems.

The checklist should encourage simple formatting over fancy design.

---

## ATS Formatting Checklist Items

The system should check or remind the user that:

- Resume is one page or close to one page
- Resume uses a simple layout
- Resume uses standard section headers
- Resume avoids tables
- Resume avoids columns
- Resume avoids graphics
- Resume avoids icons as replacements for text
- Resume avoids putting important information in headers or footers
- Resume uses readable fonts
- Resume content is left-aligned
- Contact information is plain text
- Links are readable
- Resume can be exported as DOCX
- PDF export is available, but DOCX may be safer for ATS parsing

---

## Example ATS Formatting Checklist

```text
ATS Formatting

☑ Standard section headers used
☑ Contact info appears as plain text
☐ Resume is currently 1.3 pages; reduce content
⚠ Resume uses a two-column layout; ATS may parse it incorrectly
⚠ Important contact info appears in the header area
```

---

## ATS-Safe Formatting Rules

The app should warn users against:

- Graphics
- Images
- Icons that replace text
- Complex tables
- Multi-column layouts
- Text boxes
- Important information in headers or footers
- Overly designed templates
- Unusual section names
- Inconsistent spacing
- Hard-to-read fonts

---

## Recommended Standard Section Headers

Use recognizable section names such as:

- Education
- Experience
- Projects
- Skills
- Certifications
- Awards
- Volunteer Experience
- Leadership
- Extracurriculars

Avoid unusual section names such as:

- My Journey
- Things I Built
- Where I’ve Been
- Superpowers
- Tech Stack Magic

These may look creative, but they can confuse ATS systems.

---

# 3. Header Checklist

## Purpose

The Header checklist ensures the top of the resume clearly identifies the user and gives recruiters a way to contact them.

---

## Header Checklist Items

The system should check whether:

- Full name is included
- Name is visually prominent
- Email is included
- Phone number is included
- City or region is included
- LinkedIn is included, if available
- GitHub is included, especially for technical roles
- Portfolio or personal website is included, if available
- Links are valid
- Contact information is plain text
- No unnecessary personal information is included

---

## Example Header Checklist

```text
Header

☑ Name included
☑ Email included
☑ Phone number included
☑ LinkedIn included
☐ GitHub missing
☐ Portfolio missing
```

For software roles, GitHub and portfolio links should be recommended more strongly.

---

# 4. Education Checklist

## Purpose

The Education checklist ensures the user includes relevant education details without adding unnecessary information.

---

## Education Checklist Items

The system should check whether:

- University or college is included
- Program name is included
- Expected graduation date is included
- Relevant coursework is included when useful
- GPA is included only if it helps
- High school education is not included
- Coursework matches the target role

---

## Example Education Checklist

```text
Education

☑ University included
☑ Program included
☑ Expected graduation date included
☐ Add relevant coursework for this role
☑ High school education not included
```

---

## Relevant Coursework Examples for Software Jobs

The app should allow users to save coursework once and reuse selected courses depending on the job.

Examples:

- Data Structures and Algorithms
- Software Engineering
- Databases
- Operating Systems
- Web Development
- Computer Networks
- Artificial Intelligence
- Computer Graphics
- Cybersecurity
- Human-Computer Interaction
- Mobile App Development
- Cloud Computing
- Distributed Systems

---

## GPA Rules

The app should treat GPA as optional.

Suggested guidance:

- Include GPA only if it helps the user.
- For percentage-based grading, only include GPA/average if it is very strong.
- For 4.0-scale GPA, avoid showing a weak GPA.
- If GPA is not impressive or not needed, leave it out.
- Never encourage the user to lie about GPA.

---

# 5. Skills Checklist

## Purpose

The Skills checklist ensures that the skills section is relevant, organized, truthful, and aligned with the job description.

---

## Skills Checklist Items

The system should check whether:

- Skills are grouped by category
- Skills match the job description where truthful
- Skills have proficiency levels, if the user uses them
- Skills listed in the resume are backed by projects, experience, coursework, certificates, or other evidence
- Skills are not copied blindly from the job posting
- Skills section is not too long
- Most important job-related skills are visible
- Skills use common industry names and aliases

---

## Suggested Skill Categories

- Programming Languages
- Frameworks & Libraries
- Databases
- Cloud & DevOps
- Tools
- Testing
- APIs
- UI/UX
- Security
- Data & Automation
- Soft Skills
- Domain Knowledge

---

## Example Skills Checklist

```text
Skills

☑ JavaScript appears in resume
☑ React appears in resume
☐ MongoDB appears in job posting but not resume
⚠ Docker is listed, but no project or experience currently supports it
☐ Add proficiency level for Python
```

---

## Skill Evidence

Each skill should be linkable to evidence.

Example:

```text
React

Evidence:
- Anime streaming site
- Portfolio project
- Job application tracker
```

The app should warn users when a skill is listed but has no supporting evidence.

---

## Skill Proficiency Levels

The app can support simple proficiency levels.

Option 1:

- Proficient
- Familiar

Option 2:

- Advanced
- Intermediate
- Basic

Option 3:

- Expert
- Advanced
- Intermediate
- Basic

Option 4:

- Working Knowledge
- Basic Knowledge

The app should not force users to use proficiency levels, but it can support them.

---

# 6. Projects Checklist

## Purpose

The Projects checklist is especially important for software students, new grads, and users without direct software work experience.

Projects can show initiative, technical ability, and passion for programming.

---

## Projects Checklist Items

The system should check whether:

- At least 2 strong projects are included for software roles
- Project names are clear
- Each project includes technologies used
- Each project explains what the project does
- Each project has impact, purpose, or result
- GitHub link is included if available
- Live demo link is included if available
- Projects are relevant to the job
- Projects are not just weak school assignments unless they are strong or relevant
- Projects support the keywords listed in the skills section

---

## Example Projects Checklist

```text
Projects

☑ 3 projects included
☑ Technologies listed for each project
☐ Add GitHub link for ScheduleMe
☐ Add measurable impact to Job Application Tracker project
⚠ Anime site mentions Next.js, but Skills section does not include Next.js
```

---

## Project Bullet Checklist

A strong project bullet should include:

- What was built
- Why it matters
- Technologies used
- Result or impact

Example weak bullet:

```text
Built a job application tracker.
```

Better bullet:

```text
Developed a full-stack job application tracker using Next.js, MongoDB, and TailwindCSS to organize applications by company, resume version, status timeline, and job-specific notes.
```

---

# 7. Experience Checklist

## Purpose

The Experience checklist helps users turn work history into accomplishment-based resume content.

It should also help users decide which experience is relevant for each specific job.

---

## Experience Checklist Items

The system should check whether:

- Experience is relevant to the job
- Most recent experience appears first
- Bullet points focus on accomplishments, not duties
- Bullet points include numbers or metrics when possible
- Bullet points use strong action verbs
- Bullet points mention relevant tools, technologies, or processes
- Non-technical experience is framed using transferable skills when applying to technical jobs
- Each experience has 2–4 strong bullets
- Irrelevant experience is hidden or shortened

---

## Example Experience Checklist

```text
Experience

☑ Most recent experience listed first
☐ Add metrics to TELUS sales experience
☐ Reframe customer service bullet for communication/problem-solving
⚠ Bullet starts with “Responsible for”; use a stronger action verb
```

---

## Accomplishment Formula

The app should encourage the following resume bullet formula:

```text
Accomplished [X] as measured by [Y] by doing [Z]
```

This means the bullet should explain:

- What was accomplished
- How it was measured
- How the user achieved it

Example:

```text
Increased customer plan conversions by identifying customer needs, comparing mobility options, and recommending suitable TELUS/Koodo solutions.
```

With a metric:

```text
Increased monthly mobility activations by 25% by identifying customer needs, comparing plan options, and recommending suitable TELUS/Koodo solutions.
```

---

# 8. Bullet Quality Checklist

## Purpose

The Bullet Quality checklist analyzes individual resume bullets and helps users make them stronger.

---

## Bullet Checklist Items

Each bullet should be checked for whether it:

- Starts with an action verb
- Avoids “responsible for”
- Shows accomplishment, not just task
- Includes a metric if possible
- Includes tools or technologies when relevant
- Is concise
- Uses past tense for past roles
- Uses present tense for current roles
- Does not repeat the same verb too many times
- Is relevant to the target job
- Is honest and accurate

---

## Example Bullet Review

Weak bullet:

```text
Responsible for helping customers with phones.
```

Improved bullet:

```text
Advised customers on mobility plans, devices, and account options to improve customer experience and support sales goals.
```

Technical weak bullet:

```text
Worked on backend API.
```

Improved technical bullet:

```text
Developed REST API endpoints using FastAPI and MongoDB to store job applications, resume versions, and status history.
```

---

# 9. Action Verb Checklist

## Purpose

The Action Verb checklist helps users replace weak or repetitive verbs with stronger, more specific verbs.

---

## Suggested Verb Categories

| Bullet Type          | Suggested Verbs                                         |
| -------------------- | ------------------------------------------------------- |
| Built something      | Built, Developed, Designed, Created, Implemented        |
| Improved something   | Improved, Optimized, Enhanced, Streamlined, Reduced     |
| Researched something | Analyzed, Evaluated, Investigated, Compared             |
| Led something        | Led, Coordinated, Organized, Managed, Oversaw           |
| Helped someone       | Supported, Assisted, Guided, Advised, Collaborated      |
| Taught someone       | Tutored, Trained, Coached, Explained, Mentored          |
| Technical work       | Debugged, Engineered, Programmed, Integrated, Automated |

---

## Repeated Verb Warning

The app should detect repeated weak verbs.

Example:

```text
You used “Developed” 6 times. Consider replacing some with:

- Built
- Implemented
- Designed
- Automated
- Integrated
- Optimized
```

---

# 10. Action Verb Bank

## Created or Wrote Something

- Acted
- Adapted
- Combined
- Composed
- Conceptualized
- Condensed
- Created
- Customized
- Designed
- Developed
- Devised
- Directed
- Displayed
- Established
- Fashioned
- Formulated
- Founded
- Illustrated
- Initiated
- Instituted
- Integrated
- Introduced
- Invented
- Modeled
- Modified
- Originated
- Planned
- Revised
- Revitalized
- Shaped
- Solved

---

## Research and Analysis

- Analyzed
- Clarified
- Collected
- Compared
- Conducted
- Critiqued
- Detected
- Determined
- Diagnosed
- Evaluated
- Examined
- Experimented
- Explored
- Extracted
- Formulated
- Gathered
- Identified
- Inspected
- Interpreted
- Interviewed
- Investigated
- Located
- Measured
- Organized
- Researched
- Reviewed
- Searched
- Solved
- Summarized
- Surveyed
- Systematized

---

## Managed a Project or Group

- Accomplished
- Administered
- Advanced
- Appointed
- Approved
- Assigned
- Attained
- Authorized
- Chaired
- Consolidated
- Contracted
- Controlled
- Converted
- Coordinated
- Decided
- Delegated
- Developed
- Directed
- Eliminated
- Emphasized
- Enforced
- Enhanced
- Established
- Executed
- Generated
- Handled
- Headed
- Hosted
- Improved
- Incorporated
- Increased
- Initiated
- Instituted
- Led
- Managed
- Merged
- Motivated
- Navigated
- Organized
- Overhauled
- Oversaw
- Planned
- Presided
- Prioritized
- Produced
- Recommended
- Reorganized
- Replaced
- Restored
- Reviewed
- Scheduled
- Secured
- Selected
- Streamlined
- Strengthened
- Supervised

---

## Numbers, Metrics, and Finance

- Administered
- Adjusted
- Allocated
- Analyzed
- Appraised
- Assessed
- Audited
- Balanced
- Budgeted
- Calculated
- Computed
- Conserved
- Controlled
- Corrected
- Decreased
- Determined
- Developed
- Estimated
- Forecasted
- Managed
- Marketed
- Measured
- Netted
- Planned
- Prepared
- Programmed
- Projected
- Qualified
- Reconciled
- Reduced
- Researched
- Retrieved

---

## Helped or Supported

- Adapted
- Advocated
- Aided
- Answered
- Arranged
- Assessed
- Assisted
- Clarified
- Coached
- Collaborated
- Contributed
- Cooperated
- Counseled
- Demonstrated
- Diagnosed
- Educated
- Encouraged
- Ensured
- Expedited
- Facilitated
- Familiarized
- Furthered
- Guided
- Helped
- Motivated
- Prevented
- Provided
- Referred
- Represented
- Resolved
- Simplified
- Supplied
- Supported
- Volunteered

---

## Technical Work

- Adapted
- Applied
- Assembled
- Built
- Calculated
- Computed
- Constructed
- Converted
- Debugged
- Designed
- Determined
- Developed
- Engineered
- Fabricated
- Installed
- Maintained
- Operated
- Overhauled
- Programmed
- Rectified
- Regulated
- Remodeled
- Repaired
- Replaced
- Restored
- Solved
- Specialized
- Standardized
- Studied
- Upgraded
- Utilized

---

## Teaching, Mentoring, and Training

- Adapted
- Advised
- Clarified
- Coached
- Communicated
- Conducted
- Coordinated
- Critiqued
- Developed
- Enabled
- Encouraged
- Evaluated
- Explained
- Facilitated
- Focused
- Guided
- Individualized
- Informed
- Instructed
- Motivated
- Persuaded
- Simulated
- Stimulated
- Taught
- Tested
- Trained
- Transmitted
- Tutored

---

# 11. Final Review Checklist

## Purpose

The Final Review checklist helps users confirm that the resume is ready to export and submit.

---

## Final Review Checklist Items

The system should check whether:

- Resume is tailored to this job
- Resume is one page or the user accepted a longer length
- Contact information is correct
- Job title and company are saved with this resume snapshot
- Resume version is linked to the application
- Important job keywords are covered honestly
- Unsupported keywords are removed
- Bullet points are reviewed
- ATS formatting issues are resolved or acknowledged
- Resume snapshot will be saved after export

---

## Example Final Review Checklist

```text
Final Review

☑ Resume linked to application
☑ Contact information checked
☑ Required keywords reviewed
☑ Unsupported skills removed
☐ Export final PDF/DOCX
☐ Save submitted snapshot
```

---

# 12. Application-Specific Checklist Behavior

The checklist should belong to the specific job application, not just the user’s general resume.

Example:

```text
Application:
TELUS Product Coordinator

Resume Version:
Product/Project Resume v2

Checklist:
- Add telecom keyword
- Add loyalty keyword if truthful
- Add project management bullet
- Mention stakeholder communication
- Include Jira only if user has experience
```

Another example:

```text
Application:
Frontend Developer Intern

Resume Version:
Frontend Resume v3

Checklist:
- Add React
- Add TypeScript
- Add responsive UI
- Add API integration
- Add GitHub link
- Remove unrelated sales-heavy bullet
```

This allows every application to have a unique resume-editing workflow.

---

# 13. Manual and Automatic Checklist Items

The app should support both automatic and manual checklist items.

---

## Automatic Checklist Items

These can be detected by the system:

- Contact information missing
- Resume is over one page
- Job keyword missing
- Bullet does not start with an action verb
- Skills section missing
- Project has no technologies listed
- Resume uses non-standard section headings
- Resume contains unsupported keywords
- Resume has repeated action verbs
- Resume has no measurable impact statements
- Resume has broken links

---

## Manual Checklist Items

These should be checked by the user:

- I can explain every skill listed
- This project is relevant to the job
- This bullet accurately represents my work
- I verified the final exported file
- I submitted this exact version
- I intentionally left out GPA
- I intentionally ignored this keyword
- I confirmed the resume is tailored for this application

---

# 14. Smart Suggestions

The checklist/sidebar should provide contextual suggestions while the user edits.

---

## Example Suggestion 1

```text
The job description mentions “project management” 3 times.

You have experience coordinating CSS events and managing job application projects.

Consider adding a bullet showing planning, coordination, or execution.
```

---

## Example Suggestion 2

```text
The job mentions “React” and “TypeScript.”

Your project section includes a Next.js project, but your skills section does not mention TypeScript.

Add it only if you are comfortable discussing it in an interview.
```

---

## Example Suggestion 3

```text
Your TELUS experience may support these keywords:

- Customer experience
- Sales
- Telecom
- Communication
- Problem-solving
```

---

## Example Suggestion 4

```text
This bullet sounds like a duty:

“Responsible for helping customers.”

Try making it accomplishment-based:

“Advised customers on mobility plans and device options to improve customer experience and support monthly activation goals.”
```

---

# 15. Resume Editor Checklist UX

## Sidebar Summary

At the top of the checklist sidebar, show a summary.

Example:

```text
Resume Checklist
73% complete

Critical: 1
Warnings: 4
Suggestions: 8
Completed: 18
```

---

## Checklist Tabs

Recommended tabs:

```text
All
Job Match
ATS
Header
Education
Skills
Projects
Experience
Bullets
Final Review
```

---

## Checklist Item Card

Each checklist item should appear as a card.

Example:

```text
[Warning] Missing required keyword: React

The job description lists React as a required skill, but it does not appear in this resume.

Evidence found:
- Anime streaming site
- Portfolio project

Suggested action:
Add React naturally in your Skills section or project bullet.
```

---

## Checklist Item Actions

Each checklist item should support actions such as:

- Mark Done
- Ignore
- Mark Not Applicable
- Add to Resume
- View Evidence
- Edit Resume Section
- Regenerate Suggestion

---

# 16. Suggested Data Model

The AI agent does not need to use this exact schema, but the feature should store similar information.

---

## ResumeChecklistItem

```ts
type ResumeChecklistItem = {
  id: string;
  applicationId: string;
  resumeVersionId: string;
  category:
    | "job_match"
    | "ats_formatting"
    | "header"
    | "education"
    | "skills"
    | "projects"
    | "experience"
    | "bullet_quality"
    | "action_verbs"
    | "final_review";
  title: string;
  description?: string;
  status:
    | "not_started"
    | "in_progress"
    | "complete"
    | "needs_review"
    | "ignored"
    | "not_applicable";
  severity: "info" | "suggestion" | "warning" | "critical";
  isAutoDetected: boolean;
  isUserDismissible: boolean;
  relatedKeyword?: string;
  relatedResumeSection?: string;
  relatedResumeText?: string;
  suggestion?: string;
  evidenceRequired?: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```

---

## ResumeKeyword

```ts
type ResumeKeyword = {
  id: string;
  applicationId: string;
  resumeVersionId: string;
  keyword: string;
  category:
    | "technical_skill"
    | "tool"
    | "soft_skill"
    | "domain"
    | "role_keyword"
    | "certification"
    | "education"
    | "other";
  requirementLevel: "required" | "preferred" | "nice_to_have" | "unknown";
  appearsInJobDescription: boolean;
  appearsInResume: boolean;
  appearsInUserProfile: boolean;
  evidenceFound: boolean;
  recommendation: "keep" | "safe_to_add" | "add_only_if_true" | "unsupported" | "not_relevant";
  frequency?: number;
  createdAt: Date;
  updatedAt: Date;
};
```

---

## ResumeBulletAnalysis

```ts
type ResumeBulletAnalysis = {
  id: string;
  applicationId: string;
  resumeVersionId: string;
  sectionType: "experience" | "project" | "education" | "volunteering" | "other";
  originalText: string;
  improvedText?: string;
  startsWithActionVerb: boolean;
  actionVerb?: string;
  hasMetric: boolean;
  hasToolsOrTech: boolean;
  soundsLikeDuty: boolean;
  isTooLong: boolean;
  repeatedVerbWarning: boolean;
  relatedKeywords: string[];
  qualityScore?: number;
  createdAt: Date;
  updatedAt: Date;
};
```

---

## ResumeATSCheck

```ts
type ResumeATSCheck = {
  id: string;
  applicationId: string;
  resumeVersionId: string;
  isOnePage: boolean;
  usesStandardHeaders: boolean;
  avoidsTables: boolean;
  avoidsColumns: boolean;
  avoidsGraphics: boolean;
  avoidsHeadersFootersForImportantInfo: boolean;
  contactInfoPlainText: boolean;
  linksReadable: boolean;
  docxExportAvailable: boolean;
  warnings: string[];
  createdAt: Date;
  updatedAt: Date;
};
```

---

# 17. Resume Checklist MVP

For the first version, build these features:

1. Add a resume checklist sidebar inside the resume editor.
2. Let users paste or import the job description.
3. Extract job keywords from the job description.
4. Compare extracted keywords against the current resume text.
5. Show matched, missing, and unsupported keywords.
6. Add ATS formatting checklist.
7. Add section checklist for Header, Education, Skills, Projects, and Experience.
8. Add bullet quality checklist.
9. Allow users to mark checklist items as complete, ignored, or not applicable.
10. Save checklist state per application and resume version.
11. Save a submitted resume snapshot when the user finishes.

---

# 18. Future Enhancements

Later versions can add:

- Resume import from PDF/DOCX
- Resume export to DOCX and PDF
- AI-powered bullet rewriting
- Resume template selector
- Interview prep based on resume claims
- Skill gap roadmap
- Keyword trends across all saved jobs
- “Why this resume fits this job” explanation
- Portfolio/project website generator
- Cover letter alignment using the same job keywords
- Automatic detection of repeated weak verbs
- Resume outcome analytics by company, role, industry, and keyword
- Side-by-side comparison between resume versions
- Suggestions based on successful past resume versions
- Resume scoring by application type

---

# 19. Important Product Rule

The checklist should not encourage users to fake experience.

The wrong approach:

```text
Add every keyword from the job description so you can pass ATS.
```

The correct approach:

```text
This job asks for these keywords. Your resume already supports these ones. These ones are missing but supported by your saved experience. These ones should not be added unless you actually have experience with them.
```

The feature should help users present their real experience more clearly, not invent qualifications.

---

# 20. Final Instruction for the AI Agent

Implement this as an application-specific resume editing checklist inside the existing resume editor.

The checklist should:

- Be tied to a specific application
- Be tied to a specific resume version
- Analyze the job description
- Analyze the current resume text
- Track important job keywords
- Show matched and missing keywords
- Warn about unsupported skills
- Provide ATS formatting guidance
- Review resume sections
- Improve bullet quality
- Suggest stronger action verbs
- Save checklist progress
- Save the final submitted resume snapshot

The user should be able to edit their resume and immediately see what still needs to be fixed before applying.
