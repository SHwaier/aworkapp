import { AI_BUZZWORDS } from "./buzzwords";

/**
 * Condensed resume-writing rules, distilled from the verbatim reference in
 * reference.ts (Indeed, InterviewPal, Harvard, MIT, AI ResumeGuru, Enhancv).
 * About a tenth of the tokens; the evaluation in docs/experiments/ai-efficiency.md
 * compares the two. Editing this changes model behavior: bump PROMPT_VERSION.
 */
export const RESUME_RULEBOOK = `## How applicant tracking systems (ATS) read resumes
- An ATS parses text into sections (experience, skills, education), then ranks the resume by how well its skills, tools, certifications, degrees, and methodologies match the job. Labeled standard sections ("Experience", "Skills", "Education") help it categorize content.
- Images, icons, tables, columns, and heavy formatting can break parsing. Prefer a simple layout, a standard font, bullet points, and .pdf or .docx files.
- Use plain, standard section names. Write out acronyms the job uses in long form (or include both, e.g. "Search Engine Optimization (SEO)").

## Keywords
- The job description is the source of keywords. Terms it repeats (tools, technologies, certifications, methodologies) matter most.
- Context beats repetition. Modern screening weighs where and how a skill appears: a skill shown being used in an experience or project bullet, with a result, counts for much more than the same word in a skills list. A skill that only appears in a skills list is weak evidence.
- Keyword stuffing (long buzzword lists, repeating the job ad's terms without examples) hurts readability, credibility, and ranking.
- Never add skills or experience the candidate doesn't have; recruiters verify them in interviews.

## Bullets
- Resume language is specific, active, concise, and fact-based. No personal pronouns, no narrative paragraphs, no "responsible for" or "duties included".
- Write results-first bullets: compress STAR into XYZ/PAR form ("Accomplished X, measured by Y, by doing Z"). Lead with a strong, specific action verb, say what was done and with which tools, end with the result. One to two lines each.
- Quantify with money, percentages, time, or scale (team size, users, volume). With no hard number, use scope or a concrete outcome; never invent a number.
- Give the strongest two to four achievements per role the fullest treatment; routine duties can stay short. Not every bullet needs a metric.
- Prioritize the top third of the resume: the summary and the first bullets of the most recent role should address the job's most important requirements.

## Sounding human, not AI-written
- Signs of AI writing: every bullet in the same "power verb + task + percentage" rhythm; inflated verbs and filler adjectives (${AI_BUZZWORDS.join(", ")}); claims of "significant growth" without naming tools, systems, or projects; a summary that mirrors the job ad's adjectives; bolded keywords; frequent em-dashes.
- Prefer concrete nouns (tool, system, project, and team names) over adjectives, vary sentence openings, and keep bold for headings.
- Match seniority: junior candidates use doing verbs (built, executed, assisted), not leadership inflation; senior candidates show real decisions and trade-offs rather than a sanitized, perfectly linear story.

## Formatting basics
- Include email and phone. Use reverse chronological order within sections and consistent formatting. Avoid photos, age, gender, references, and starting lines with dates. Check spelling and grammar.`;
