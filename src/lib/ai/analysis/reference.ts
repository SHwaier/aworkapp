/**
 * Authoritative resume-writing reference sent with every analysis prompt.
 * Verbatim excerpts from Indeed, InterviewPal, Harvard, MIT, AI ResumeGuru,
 * and Enhancv on ATS parsing, contextual keywords, PAR/XYZ bullets, and
 * AI-writing red flags.
 *
 * It sits at the very start of the system prompt so Gemini's implicit prompt
 * caching can reuse it across calls. Editing it changes model behavior:
 * bump PROMPT_VERSION in prompt.ts afterwards so stored analyses go stale.
 */
export const ATS_REFERENCE = `# Reference Information & Verbatim Evaluation Context for the AI Agent

Use the following verbatim reference material as your authoritative knowledge base when evaluating, scoring, and rewriting the resume against the job listing. Every rule on ATS parsing, contextual keyword evaluation, compressed STAR/XYZ/PAR bullet structure, and AI/keyword-stuffing red flags must be enforced strictly from this reference text.

## 1. How Applicant Tracking Systems (ATS) Parse, Categorize, and Rank Resumes
*Source: Indeed Career Guide — 13 Best Practices for Beating an Applicant Tracking System*

> "Within the hiring process, an ATS comes between 'candidates apply' and 'applicants are screened'. See, once you submit your resume, the ATS scans and interprets your information and then categorizes your experience into buckets like education, skills, and experience. And then once your information is sorted, it's instantly compared to the job description. The ATS scans for keywords like areas of experience, skills, and other qualifications like certifications and degrees. It then ranks your resume based on how well your information matches the job description. And the higher your resume is ranked, the more prioritization your resume will get."

> "OK, so there are two main areas where you can optimize your resume for an ATS-- format and content. In regards to format, Applicant Tracking Systems are programmed to scan and parse text, which means that any elements of your resume that are heavily formatted can actually cause readability issues. I'm talking images, icons, tables and columns which are all considered to be heavily formatted. Using these elements can cause all kinds of readability issues like covering or shifting your content, or preventing an ATS from parsing sections of your resume. And that's why complex formatting is not recommended. And that being said, perhaps the reason that you do not get called in for an interview was due to your resume format and not your qualifications at all. And because 75% of qualified job seekers are rejected by an ATS due to readability issues, take our advice-- use a simple format. Now, in addition to simplifying your format, be sure you also have dedicated labeled sections for your experience, skills, and education since this is how an ATS categorizes your content."

> "For skills that you find in the job description, not only do you want to add them to your skills list, but you also want to explain how you use those skills in your experience. Recruiters will verify your qualifications during your interview so be sure to only add qualifications and experience that you have and never misrepresent yourself."

> "3. Use relevant keywords: Look at the job posting, and use the same keywords in your application in a way that naturally highlights your experience and skills. Consider looking up similar jobs to get ideas for other terms you can include that may pique the interest of the applicant tracking system and hiring manager. To determine the most important keywords, make a note of specific software, education, certifications and methodologies that a job posting mentions."

> "4. Connect your keywords to unique experiences: The applicant tracking system is more likely to send your resume through if there are enough mentions of certain keywords relevant to the position, but hiring managers want to see how those keywords connect to real skills and experiences in the workplace. Think about your unique job history, and concisely explain how it makes you the perfect person for the position."

> "5. Include a skills section: A skills section is your chance to include relevant keywords in another location on your resume, especially for assets that didn't naturally fit into your work history section. Including a skills section with keywords makes it easier to scan your application for the terms the hiring manager is looking for."

> "6. Use basic language: It may be tempting to use section headers that are a little less traditional, especially if you're applying for a creative role and want to show your personality, but using uncommon language on a resume can confuse an applicant tracking system. Use basic language and terms that are easy to understand, and mimic how you would address your qualifications during an in-person interview."

> "7. Write out acronyms: Depending on an applicant tracking system's settings, it may either search for acronyms or written-out phrases. It's more likely going to look for the long-form term or phrase, but it's best practice to include both. For example, you could say something like, 'Experienced in Search Engine Optimization (SEO).'"

> "9. Keep your resume simple: You may want to create a resume that's graphically enhanced, especially if you're applying for a graphic design position, but it's best to keep it as simple as possible. An interesting-looking resume may be attractive to the hiring manager, but you need to make it past the applicant tracking system first. Some tracking systems have a hard time processing complicated resumes and may place the content in the wrong places."

> "10. Use basic formatting: Consider using a universally basic font throughout your resume, such as Arial, Times New Roman or Georgia. Also, instead of charts or graphical elements, use bullet points and bolded or underlined words to bring attention to something specific."

> "11. Submit the right type of file: ... Even if there are many acceptable file types listed, try to upload only .pdf or .docx documents. Although both are common, applicant tracking systems typically find it easier to read .docx resumes, so consider using this file if you can."

## 2. Why Keyword Stuffing Backfires and How Contextual ATS Screening Works
*Source: InterviewPal — Your Resume Keywords Are Getting You Rejected. Here's Why.*

> "Keyword stuffing happens when candidates try to force as many job-related keywords as possible into their resume in the hope that an ATS will rank them higher. You often see resumes where the skills section becomes a long list of buzzwords. The document begins to read like a dictionary of industry terms rather than a story about real work experience."

> "In practice, the opposite often happens. Modern ATS systems are not simply looking for isolated words. They analyze how those words appear in context, how frequently they appear across different sections, and whether the experience surrounding those skills actually aligns with the role. A resume that repeats the same terms without meaningful explanations can appear less relevant, not more."

> "Today, most systems evaluate resumes in a more nuanced way. They look at how closely your previous roles match the job title being advertised, how frequently relevant skills appear throughout your work history, and how those skills are described within real achievements. In other words, the software attempts to estimate whether the candidate's experience actually aligns with the job requirements. This means that context matters. A resume that demonstrates how a skill was used in real projects often performs better than one that simply lists the skill repeatedly."

> "Why Keyword Stuffing Backfires:
> First, it damages readability. Recruiters do not spend long evaluating each resume during an initial scan. In fact, many hiring managers spend only a few seconds deciding whether a resume deserves closer attention. ... When a resume is filled with repetitive keywords, it becomes harder to quickly understand the candidate's real contributions. Instead of clarifying experience, the document creates confusion.
> Second, keyword stuffing can undermine credibility. When a resume claims expertise in dozens of skills without providing examples of how those skills were used, recruiters often question whether the candidate actually possesses them.
> Third, keyword stuffing can reduce ATS ranking itself. Modern screening systems often prioritize resumes where keywords appear naturally within work descriptions rather than in disconnected lists."

> "The Right Way to Use Resume Keywords:
> Instead of forcing terms into a skills section, strong resumes integrate them into real experience. They show how the skill was applied, what tools were used, and what results were achieved.
> Consider a vague statement like this:
> 'Used AI tools and data tools to improve productivity.'
> Now compare it with a more specific version:
> 'Built an automated reporting workflow using Python and generative AI tools that reduced weekly reporting time by 35 percent.'
> Both sentences contain keywords, but the second version clearly explains the work and the outcome. That clarity helps both ATS systems and recruiters understand the candidate's value."

> "How to Identify the Keywords That Matter:
> The best source of resume keywords is the job description itself. Hiring managers typically write job listings around the skills they expect candidates to use. These phrases become the terms ATS systems search for when evaluating resumes. When reviewing a job description, pay attention to repeated terminology. Tools, technologies, certifications, and methodologies that appear multiple times often represent the core capabilities the employer cares about. The key is not simply copying those terms into your resume. Instead, they should appear naturally within your experience. For example, rather than listing 'data analysis' in isolation, explain how you used data analysis to drive a measurable outcome in your work."

> "For example, compare these two lines:
> 'Responsible for managing marketing campaigns.'
> Versus:
> 'Led multi-channel marketing campaigns that increased qualified leads by 28 percent.'
> The second description communicates both action and impact, making it far more persuasive to recruiters."

## 3. Core Resume Language, Structure, and Formatting Standards
*Source: Harvard University Mignone Center for Career Success — Harvard College Guide to Creating a Strong Resume*

> "A resume is a concise, informative summary of your abilities, education, and experience. It should highlight your strongest assets and skills, and differentiate you from other candidates seeking similar positions. Although it alone won't get you a job or internship, a good resume is an important factor in obtaining an interview. Tailor your resume to the type of position you're seeking. This doesn't mean that all of your experiences must relate directly, but your resume should reflect the types of skills the employer would value."

> "RESUME LANGUAGE SHOULD BE:
> - Specific rather than general
> - Active rather than passive
> - Written to express not impress
> - Articulate rather than 'flowery'
> - Fact-based (quantify and qualify)
> - Written for people who / systems that scan quickly"

> "TOP FIVE RESUME MISTAKES:
> - Spelling and grammar errors
> - Missing email and phone information
> - Using passive language instead of 'action' words
> - Not well organized, concise, or easy to skim
> - Not demonstrating results"

> "DON'T:
> - Use personal pronouns (such as I or We)
> - Abbreviate
> - Use a narrative style
> - Use slang or colloquialisms
> - Include a picture
> - Include age or gender
> - List references
> - Start each line with a date"

> "DO:
> - Be consistent in format and content
> - Make it easy to read and follow, balancing white space
> - Use consistent spacing, underlining, italics, bold, and capitalization for emphasis
> - List headings (such as Experience) in order of importance
> - Within headings, list information in reverse chronological order (most recent first)
> - Avoid information gaps such as a missing summer
> - Be sure that your formatting will translate properly if converted to a .pdf"

> "Using AI: Your resume and cover letter should authentically represent who you are and what you have to offer. To this end, generative AI can be a useful tool in the editing process. For example, it can help you brainstorm revisions to bullet points, incorporate keywords gleaned from a job description, or otherwise improve what you already have. Generative AI should not be the primary author—not least because its output will likely be very generic."

> "Action Verbs Reference List by Category:
> - LEADERSHIP: Accomplished, Achieved, Administered, Analyzed, Assigned, Attained, Chaired, Consolidated, Contracted, Coordinated, Delegated, Developed, Directed, Earned, Evaluated, Executed, Handled, Headed, Impacted, Improved, Increased, Led, Mastered, Orchestrated, Organized, Oversaw, Planned, Predicted, Prioritized, Produced, Proved, Recommended, Regulated, Reorganized, Reviewed, Scheduled, Spearheaded, Strengthened, Supervised, Surpassed
> - COMMUNICATION: Addressed, Arbitrated, Arranged, Authored, Collaborated, Convinced, Corresponded, Delivered, Developed, Directed, Documented, Drafted, Edited, Energized, Enlisted, Formulated, Influenced, Interpreted, Lectured, Liaised, Mediated, Moderated, Negotiated, Persuaded, Presented, Promoted, Publicized, Reconciled, Recruited, Reported, Rewrote, Spoke, Suggested, Synthesized, Translated, Verbalized, Wrote
> - RESEARCH: Clarified, Collected, Concluded, Conducted, Constructed, Critiqued, Derived, Determined, Diagnosed, Discovered, Evaluated, Examined, Extracted, Formed, Identified, Inspected, Interpreted, Interviewed, Investigated, Modeled, Organized, Resolved, Reviewed, Summarized, Surveyed, Systematized, Tested
> - TECHNICAL: Assembled, Built, Calculated, Computed, Designed, Devised, Engineered, Fabricated, Installed, Maintained, Operated, Optimized, Overhauled, Programmed, Remodeled, Repaired, Solved, Standardized, Streamlined, Upgraded
> - TEACHING: Adapted, Advised, Clarified, Coached, Communicated, Coordinated, Demystified, Developed, Enabled, Encouraged, Evaluated, Explained, Facilitated, Guided, Informed, Instructed, Persuaded, Set Goals, Stimulated, Studied, Taught, Trained
> - QUANTITATIVE: Administered, Allocated, Analyzed, Appraised, Audited, Balanced, Budgeted, Calculated, Computed, Developed, Forecasted, Managed, Marketed, Maximized, Minimized, Planned, Projected, Researched
> - CREATIVE: Acted, Composed, Conceived, Conceptualized, Created, Customized, Designed, Developed, Directed, Established, Fashioned, Founded, Illustrated, Initiated, Instituted, Integrated, Introduced, Invented, Originated, Performed, Planned, Published, Redesigned, Revised, Revitalized, Shaped, Visualized
> - HELPING: Assessed, Assisted, Clarified, Coached, Counseled, Demonstrated, Diagnosed, Educated, Enhanced, Expedited, Facilitated, Familiarized, Guided, Motivated, Participated, Proposed, Provided, Referred, Rehabilitated, Represented, Served, Supported
> - ORGANIZATIONAL: Approved, Accelerated, Added, Arranged, Broadened, Cataloged, Centralized, Changed, Classified, Collected, Compiled, Completed, Controlled, Defined, Dispatched, Executed, Expanded, Gained, Gathered, Generated, Implemented, Inspected, Launched, Monitored, Operated, Organized, Prepared, Processed, Purchased, Recorded, Reduced, Reinforced, Retrieved, Screened, Selected, Simplified, Sold, Specified, Steered, Structured, Systematized, Tabulated, Unified, Updated, Utilized, Validated, Verified"

## 4. PAR Statements and Quantifying Impact
*Source: MIT Career Advising & Professional Development — Resumes: Writing About Your Skills*

> "Your resume provides an overview of your experience and is often an employer's first impression of you. Recruiters spend just a few seconds on average looking at a resume so it is crucial to use a format that makes relevant information immediately visible. A good resume can help you land an interview, but even minor errors can take you out of the running."

> "PAR Statements:
> To demonstrate your skills and achievements, use PAR statements to clearly and concisely describe your experiences:
> - P: Describe the PROJECT, the context, task, or job.
> - A: Start each bullet point statement with a strong action verb (i.e. ACTIVITY), followed by the PROJECT, and then tell the reader the RESULT of your actions. In other words, answer the following questions: 'What did you do?', 'Why did you do it?', and 'What was the outcome?'
> Start with a strong action verb that relates to a skill the employer is seeking. Then, provide context to the reader by adding the relevant task. Reflect keywords, action verbs, and industry-specific language you have found in the job description. Extend this relevant task to an outcome to demonstrate the purpose or the 'why?' behind it. Lastly, include any meaningful or noteworthy accomplishment that came of your actions."

> "Using numbers to show impact:
> Metrics, or quantitative language, helps your reader see the impact and the tangible outcomes of your efforts. There are several ways you can effectively quantify the results of your work:
> 1. Financial performance: Demonstrate financial performance by citing revenue, net profit, or sales generated. Include the specific dollar amount.
>    - 'Designed and executed company's marketing strategies that drove a $500k increase in annual revenue'
>    - 'Organized a series of fundraising events with 150+ attendees; generated $10,000 in donations'
> 2. Increased (or reduced) x by y%: Show how you made a difference, improved processes, productivity, employee satisfaction, and other aspects of the workplace.
>    - 'Performed electromagnetic compatibility testing on medical equipment, reducing RF emissions of equipment by 50%'
>    - 'Improved user experience on client platform, contributing to a 20% increase in subscribers over 6 month period'
> 3. Quantity of work: Make the scale of your accomplishments clear to a hiring manager by including quantifiable metrics like the size of your department, event, budget, or data set.
>    - 'Developed prototype to identify key influencers on Twitter using clustering techniques over 100,000 data points in Python'
>    - 'Managed project re-design process to improve and consolidate end-to-end service; restructured communication flow among 10 departments, and cut down paperwork by 75%'"

> "How to best represent your experiences:
> Remember that an employer is only scanning your resume document for a few seconds. Writing descriptions in paragraph form can make it tricky for the reader to find important information easily. Instead, use bullet points to separate the information into bite-sized chunks, keeping each statement to 1-2 lines.
> Another common mistake to avoid when writing your resume is the use of first-person pronouns. It is understood that everything on your resume is about you and your personal experiences."

## 5. Compressing STAR into XYZ and PAR Resume Bullets
*Source: AI ResumeGuru — STAR Method Resume: How to Write Bullets That Get Interviews*

> "The STAR method on a resume is a thinking framework, not a sentence template. STAR (Situation, Task, Action, Result) is how you plan a strong accomplishment, but a resume isn't the place to narrate all four parts. Recruiters scan in seconds, so on a resume STAR collapses into a tight, results-first bullet."

> "The Short Version:
> STAR = Situation, Task, Action, Result, the framework for thinking through an accomplishment. On a resume, compress STAR into one bullet: lead with the action, end with the result. That compression is basically the XYZ formula ('Accomplished X, by doing Z, measured by Y'). Save the full STAR story for interviews and cover letters."

> "In an interview, you'd narrate all four. On a resume, you keep the Action and Result front and center and let the Situation and Task be implied. That single shift, from describing duties to describing results, is what separates a bullet that gets skimmed from one that gets you the call."

> "STAR vs. XYZ vs. CAR vs. PAR: One Idea, Four Names:
> - STAR (Situation, Task, Action, Result): Best for interviews, cover letters, full storytelling.
> - CAR (Challenge, Action, Result): Best for resume bullets (a tighter STAR).
> - PAR (Problem, Action, Result): Best for resume bullets, problem-to-impact framing.
> - XYZ (Accomplished X, measured by Y, by doing Z): Best for resume bullets, results-first scanning.
> CAR is just STAR with Situation and Task merged into one 'Challenge.' And XYZ, popularized by Laszlo Bock, Google's former head of People Operations, in Work Rules! (2015), is the most resume-native because it front-loads the result. The point: on a resume, all four collapse toward the same thing, a strong verb plus what you did plus a quantified result."

> "Use PAR thinking when the accomplishment is fundamentally a fix: 'Resolved a 30% checkout drop-off by rebuilding the payment flow, recovering ~$120K in monthly revenue.' Use full STAR when you are telling the story out loud, in an interview or a cover letter, where the listener wants the context."

> "How to Compress STAR Into a Resume Bullet:
> - Full STAR (great for an interview, too long for a resume): 'When our support queue was overwhelmed (Situation), I was asked to reduce response times (Task). I built a triage ticketing system and retrained the team (Action), which cut average response time by 20% (Result).'
> - Compressed resume bullet (XYZ order): 'Cut average support response time 20% by designing a new ticket-triage system and retraining a 6-person team.'
> Same accomplishment. The resume version implies the Situation and Task, leads with the Result, and fits in one line.
> Recruiters spend about 7.4 seconds on an initial resume scan (Ladders eye-tracking study, 2018). Give your top two or three career achievements a little more room; keep everything else to single, tight bullets."

> "Turn a Duty Into a STAR Bullet (Step by Step):
> 1. Write the plain duty first: Start where most resumes stop. e.g., 'Responsible for managing social media accounts.'
> 2. Find the Situation/Task, why it mattered: Engagement was flat; the goal was to grow inbound leads. You don't write this on the resume, but it shapes the bullet.
> 3. Pin down your Action with a strong verb: What did YOU do? 'Built and executed a 3-channel content calendar.'
> 4. Quantify the Result: Numbers, %, time, money, or scale. 'Grew engagement 38% in 6 months.'
> 5. Assemble it results-forward: Lead with the verb, end with the metric: 'Grew Instagram engagement 38% in 6 months by launching a 3-channel content calendar.'
> 6. Cut the filler: Delete 'responsible for,' 'duties included,' and weak verbs. Make sure the result is visible at a glance."

> "8 Before/After Examples (by Role):
> - Before: 'Managed company social media accounts' -> After: 'Grew Instagram engagement 38% in 6 months by launching a 3-channel content calendar'
> - Before: 'Worked on backend performance' -> After: 'Reduced API p95 latency from 800ms to 210ms by rewriting the caching layer, supporting 3x traffic'
> - Before: 'Handled customer tickets' -> After: 'Cut average first-response time 20% by designing a ticket-triage workflow for a 6-person team'
> - Before: 'Responsible for hitting sales targets' -> After: 'Exceeded annual quota by 127% ($1.4M closed) by building a referral pipeline of 40+ leads per quarter'
> - Before: 'Managed software projects' -> After: 'Delivered a 5-person Agile project 2 weeks early and 8% under budget by restructuring sprint planning'
> - Before: 'Prepared financial reports' -> After: 'Built quarterly C-suite reports that flagged a $250K margin leak, prompting a 6% COGS saving'
> - Before: 'Improved onboarding process' -> After: 'Raised 90-day new-hire retention 18% by redesigning onboarding into a structured 30-day plan'
> - Before: 'Managed store inventory' -> After: 'Reduced out-of-stock incidents 30% by implementing automated stock tracking and renegotiating vendor lead times'"

> "Common STAR Method Mistakes (and How to Fix Them):
> - Do this: Lead with the Action and Result; imply the Situation. Quantify with a number, scope, or concrete outcome. Reserve full STAR stories for two to four standout bullets. Keep each bullet to one or two lines. Use a distinct strong verb to open each bullet.
> - Avoid this: Spending half the bullet narrating the Situation. Stopping at the Action with no Result attached. Writing a paragraph instead of a scannable line. Forcing a full STAR story onto every single bullet. Repeating 'Managed' or 'Responsible for' down the page.
> The biggest offender is too much Situation. People front-load context ('In a fast-paced environment where the team faced…') and bury the result at the end where a six-second scan never reaches it. Flip it. Lead with the outcome.
> The second is no metrics. A bullet that ends '…which improved the process' is just a duty wearing a costume. If you have no hard number, use scope or a concrete outcome instead."

> "Don't STAR every bullet:
> A resume where every line is a full results story reads as exhausting and slightly unbelievable. Use STAR-shaped bullets for your strongest two to four points per role, then let routine duties stay short. Contrast is what makes the big wins pop."

> "What If You Don't Have Numbers?
> Not every accomplishment has a clean metric, and that's fine. This is also the answer for using STAR with no work experience: scope and outcome do the heavy lifting.
> - Scope: team size, number of clients, frequency, volume ('Trained 12 new hires,' 'Processed 200+ orders weekly').
> - Outcome: a clear result even without a percentage ('Reduced customer complaints,' 'Adopted company-wide,' 'Eliminated a recurring error')."

## 6. Detecting AI-Generated Resumes, LLM Buzzwords, and Authenticity Signals
*Source: Enhancv — How to Tell if a Resume Was Written with AI: 7 Red Flags for 2026*

> "As automation floods the gates, hiring teams have pivoted to forensic evaluation. They aren't just looking for keywords anymore. According to the Greenhouse 2026 AI in Hiring Report, a staggering 91% of U.S. hiring managers have caught or suspected AI-driven candidate misrepresentation. When 'perfect' resumes feel like prompt-engineered illusions, recruiters stop looking for the best talent and start looking for the few things they can verify. They need human-proof signals."

> "7 signs a resume was written with AI:
> 1. Predictable sentence rhythm: A robotic, repetitive cadence where every bullet point follows a repetitive formula without any narrative variation.
> 2. Abstract adjective bloat: The heavy use of filler words like spearheaded, orchestrated, or transformative that mask a lack of specific, lived-in detail.
> 3. Missing contextual anchors: Achievements that claim 'significant growth' or 'enhanced efficiency' but fail to name the specific software versions, internal project titles, or niche obstacles involved.
> 4. Perfect job ad-resume alignment: A summary or skills section that perfectly mimics the job description's keywords while adding zero original information about how you actually did the work.
> 5. Linguistic mismatches: A jarring shift in tone between a highly polished, formal resume and a LinkedIn profile or cover letter that lacks the same voice and depth.
> 6. Hallucinated consistency: A career history that appears suspiciously flawless, with AI-smoothed employment gaps and a linear upward trajectory.
> 7. High-velocity submission signals: A set of highly tailored applications submitted in such quick succession that it becomes mathematically impossible for a human to have performed the research and editing manually."

> "How recruiters spot an AI resume:
> - Sentence leads: What AI does: Every bullet starts with a power verb (e.g., Spearheaded, Orchestrated). What a human does: Mixes verbs with contextual leads (e.g., 'In response to...' or 'By auditing...').
> - Structure and rhythm: What AI does: Every sentence follows the same length and 'Action + Result' template. What a human does: Uses varied cadence—mixing short, punchy results with longer, narrative descriptions.
> - Contextual anchors: What AI does: Claims 'significant growth' without naming the specific tool or obstacle. What a human does: Names the details, like specific software versions or regional hubs.
> - Word choice: What AI does: Relies on 'filler' adjectives like visionary, passionate, or results-driven. What a human does: Uses specific nouns and internal project names to describe the work.
> - Claims inflation: What AI does: Describes the importance of the role in a formal, whitepaper voice. What a human does: Focuses on the lived-in impact and the 'why' behind the decisions."

> "AI vocabulary: 20 buzzwords you don't need on a resume:
> 1. Spearheaded: The absolute favorite verb of every major LLM.
> 2. Orchestrated: Used by AI to describe any coordination, no matter how small.
> 3. Leveraged: A classic filler verb that masks a lack of specific technical detail.
> 4. Synergy/Synergistic: The hallmark of 2000s corporate-speak that AI hasn't let go of.
> 5. Foster: AI loves to 'foster innovation' or 'foster collaboration.'
> 6. Transformative: An over-the-top adjective for routine process improvements.
> 7. Deepdive: Often used when the AI is trying to sound analytical.
> 8. Vibrant: Frequently used to describe 'vibrant company cultures' in summaries.
> 9. Results-oriented professional: The most common, generic opening line in history.
> 10. Game-changer: High-inflation language that rarely has data to back it up.
> 11. Driven by a passion for.../ Passionate: AI defaults to 'passion' when it doesn't have a specific career goal to cite.
> 12. Seamlessly: As in 'seamlessly integrated' or 'seamlessly transitioned.'
> 13. Cutting-edge: A dated term that AI uses for almost any technology.
> 14. Dynamic: Usually paired with 'environment' or 'leader.'
> 15. Empower: Used vaguely to describe management or software implementation.
> 16. Strategic visionary: A massive claim that usually rings hollow without a C-suite title.
> 17. Multifaceted: AI's favorite way to say you have more than one skill.
> 18. Unwavering commitment: Emotional filler that adds zero value to a professional scan.
> 19. Thought leader: Unless you are a published expert, this is a major bot signal.
> 20. At the intersection of…: The go-to AI phrase for explaining a multi-disciplinary background (e.g., 'at the intersection of data and design').
> Remember that none of these phrases are banned. Used sporadically, a word like 'orchestrated' or 'engineered' is harmless. However, AI tends to lean on these as crutches. If you repeat them twice, they transform from standard verbs into a recruiter's primary pet peeve—signaling a lack of original thought and overreliance on prompts."

> "What to do if your resume looks written by AI:
> - Use specifics over synonyms: AI loves action verbs like 'spearheaded' and 'leveraged,' but it's terrible at naming the actual tools or weird obstacles you dealt with on a Tuesday. Recruiters look for the specific tools and niche obstacles that a general AI model wouldn't know to include. To them, a sentence like 'Optimized supply chain efficiency' sounds like a bot. A sentence like 'Fixed the 48-hour lag in our Shopify-to-ERP sync' sounds more like a person who really did the work. Check your bullet points again. If you can swap your job title for another and the sentence still works, it's too generic.
> - Avoid the action-result monotony: If every single bullet point follows the adjective + task + percentage formula, it looks like a template. It produces summaries that sound like a LinkedIn marketing brochure. To break this, use your summary to address the specific environment you work in.
>   - AI template: 'Innovative Marketing Manager with 10+ years of experience in driving $2M in annual revenue through strategic digital campaigns.'
>   - Human signal: 'Ten years in performance marketing, specifically navigating the shift from third-party cookies to privacy-first attribution. Career built on fixing broken lead-gen funnels for SaaS startups where the CAC was outperforming the LTV.'
> - Prioritize readability: AI tends to produce walls of text because it's optimizing for keyword density, not readability. A human-built resume uses white space as a tool. If your experience section looks like a dense block of 10-point Calibri, you've already lost the recruiter.
> - Avoid the modular look: One of the biggest tells of a copy-pasted AI resume is the disjointed, modular feel. The summary sounds like a CEO, the bullet points sound like an intern, and the skills section is a disorganized pile of 50 keywords. A human-driven resume has a narrative thread. Ensure your formatting reflects your seniority.
> - Be careful with bold text and em-dashes: AI doesn't know what's important in your career, so it tends to bold random parts of the text—like dollar amounts or specific keywords it pulled from the job ad—to look impressive. Recruiters have caught on. To avoid the bot look, keep your bolding strictly for section headings. The same goes for the excessive use of em-dashes (—). While both humans and AI use these elements, their oversaturation has become a hallmark of AI-generated prose."

> "Manual tailoring best practices:
> - Check for the 'mirror' effect: If your resume summary uses the exact same three adjectives as the job description, change them. A bot mirrors, a human interprets. Use synonyms that reflect your specific professional voice while keeping the core skill intact.
> - Prioritize the top third: AI often treats every job requirement with equal importance. You know that for this specific role, budget management is 80% of the job. Manually move your most relevant fiscal achievement to the very first bullet point of your most recent role.
> - Add the contextual why: When a builder suggests adding a skill like strategic planning, don't just list it. Add a sub-clause that explains the stakes: 'Strategic planning for a $2M department pivot during the 2024 merger.' That extra bit of grit is something an LLM can't invent.
> - Avoid adjective bloat: AI loves to add 'successful,' 'expert,' and 'dedicated' to every sentence to make it sound professional. Delete them. Let your hard numbers and specific project names provide the authority.
> - Remove the zero-value filter: Scan for any statements the AI added that don't directly answer a requirement in the job ad. If it's just filler to make the page look full, cut it. A shorter, high-impact resume is always better than a long, automated one."

> "Does my seniority level change how I should use AI?
> - For juniors: Avoid competency inflation: AI defaults to high-level leadership language. It will try to make your internship sound like a C-suite role by using words like 'orchestrated' or 'strategized'. Recruiters expect junior applicants to use doing words ('assisted,' 'built,' 'executed'). If an entry-level resume sounds like a Harvard Business Review article, it's an immediate bot flag.
> - For seniors: Avoid history sanitization: AI tends to smooth over the messy parts of a long career—pivots, layoffs, or lateral moves—into a sterile, linear narrative. HR professionals are specifically looking for the difficult decisions you made and the risks you took. If your 20-year career looks like a perfect upward line, you lose credibility."`;
