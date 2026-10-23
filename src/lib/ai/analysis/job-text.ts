/**
 * Job description cleanup before it's sent to the AI or fingerprinted.
 * Removes sections and sentences that never contain requirements (company blurb,
 * benefits, equal-opportunity and accommodation statements, how to apply), so
 * the model reads less and cosmetic edits don't count as a new job.
 * Conservative by design: anything not clearly boilerplate is kept.
 */

/** Headings that start a boilerplate section (matched against the whole heading line) */
const BOILERPLATE_HEADINGS = [
  /^about (us|the company|the team at|our company|[\w&.' -]{1,40})$/i,
  /^(who we are|our (story|mission|values|culture)|life at [\w&.' -]{1,40}|why (join|work)( us| at [\w&.' -]{1,40})?)$/i,
  /^(what we offer|benefits|perks|perks (and|&) benefits|benefits (and|&) perks|compensation( (and|&) benefits)?|salary|pay( range)?|our offer|we offer|in return)$/i,
  /^(equal (employment )?opportunity|eeo|diversity( (and|&) inclusion)?|our commitment( to [\w ]{1,40})?|accommodations?|accessibility statement)$/i,
  /^(how to apply|application process|next steps|privacy( notice)?|disclaimer)$/i,
];

/** Headings that start a section we must keep, even right after a boilerplate one */
const KEEP_HEADINGS =
  /^(about (the|this) (role|position|job|opportunity)|about you|what you( will|('|’)ll)? (bring|need)|who we('|’)?re looking for|the role|role|responsibilities|what you('|’)?ll (do|be doing|work on)|in this role|requirements|qualifications|(minimum|basic|required|preferred) qualifications|what (we('|’)?re|we are) looking for|who you are|you have|you are|skills|nice to have|bonus( points)?|must have|key responsibilities|duties|experience)\b/i;

/** Sentences that are boilerplate wherever they appear */
const BOILERPLATE_SENTENCES = [
  /\bequal (employment )?opportunity employer\b/i,
  /\b(regardless of|without regard to|on the basis of)\b.{0,80}\b(race|religion|gender|sex|age|disability|national origin)\b/i,
  /\breasonable accommodations?\b/i,
  /\bE-Verify\b/,
  /\b(we|our company) (do|does) not discriminate\b/i,
];

function headingText(line: string): string | null {
  const t = line
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/[:：]\s*$/, "")
    .replace(/^\*\*(.*)\*\*$/, "$1")
    .trim();
  // A heading is a short line with no sentence punctuation in the middle
  if (!t || t.length > 60 || /[.!?]\s/.test(t) || /^[-•*]/.test(t)) return null;
  return t;
}

export function cleanJobDescription(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let skipping = false;

  for (const raw of lines) {
    const line = raw.replace(/[ \t]+/g, " ").trimEnd();
    const heading = headingText(line);
    if (heading) {
      if (KEEP_HEADINGS.test(heading)) skipping = false;
      else if (BOILERPLATE_HEADINGS.some((re) => re.test(heading))) {
        skipping = true;
        continue;
      }
    }
    if (skipping) continue;

    // Drop boilerplate sentences inside otherwise useful paragraphs
    const sentences = line.split(/(?<=[.!?])\s+/);
    const kept = sentences.filter((s) => !BOILERPLATE_SENTENCES.some((re) => re.test(s)));
    if (sentences.length > 0 && kept.length === 0) continue;
    out.push(kept.join(" "));
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Text used for fingerprinting: cleaned, whitespace-collapsed, case-insensitive */
export function jobFingerprintText(text: string): string {
  return cleanJobDescription(text).toLowerCase().replace(/\s+/g, " ").trim();
}
