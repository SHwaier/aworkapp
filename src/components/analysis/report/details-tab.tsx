"use client";

import { AlertTriangle, CircleCheck, CircleX } from "lucide-react";
import { COVERAGE_STATES, Meter, TONE_VAR } from "../charts";
import type { Analysis } from "../types";
import { Disclosure } from "./disclosure";
import { Panel } from "./overview-tab";

const CATEGORY_LABEL: Record<string, string> = {
  skill: "Skill",
  experience: "Experience",
  education: "Education",
  responsibility: "Responsibility",
  other: "Other",
};

function CoverageLabel({ coverage }: { coverage: string }) {
  const state = COVERAGE_STATES.find((c) => c.key === coverage)!;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <state.Icon className="h-4 w-4" style={{ color: TONE_VAR[state.tone] }} aria-hidden />
      {state.label}
    </span>
  );
}

export function DetailsTab({ analysis: a }: { analysis: Analysis }) {
  const missing = a.keywords
    .filter((k) => !k.inResume)
    .sort((x, y) => (x.importance === y.importance ? 0 : x.importance === "required" ? -1 : 1));
  const present = a.keywords.filter((k) => k.inResume);
  const warnings = a.formatChecks.filter((c) => c.status === "warn");
  const passed = a.formatChecks.filter((c) => c.status === "pass");

  return (
    <div className="space-y-12">
      <Panel
        title="Requirements"
        hint="Each requirement in the job and the line in your resume that shows it"
      >
        {/* Phones: one card per requirement */}
        <ul className="space-y-3 md:hidden">
          {a.requirements.map((r, i) => (
            <li key={i} className="space-y-2 rounded-xl border border-border/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">{r.text}</p>
                <CoverageLabel coverage={r.coverage} />
              </div>
              <p className="text-xs text-muted-foreground">
                {r.importance === "required" ? "Required" : "Preferred"}
                {r.category && `, ${CATEGORY_LABEL[r.category].toLowerCase()}`}
              </p>
              {r.evidence && (
                <p className="border-l-2 border-border pl-2 text-sm text-muted-foreground">
                  {r.evidence}
                </p>
              )}
              {r.claimedCoverage !== r.coverage && (
                <p className="text-xs text-muted-foreground">
                  Lowered from {r.claimedCoverage}: the evidence wasn&apos;t found in your resume.
                </p>
              )}
            </li>
          ))}
        </ul>

        {/* Wider screens: table */}
        <div className="hidden overflow-x-auto rounded-xl border border-border/70 md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Requirement</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Shown in your resume by</th>
              </tr>
            </thead>
            <tbody>
              {a.requirements.map((r, i) => (
                <tr key={i} className="border-b border-border/50 align-top last:border-0">
                  <td className="w-[40%] px-4 py-3">
                    <p className="font-medium">{r.text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.importance === "required" ? "Required" : "Preferred"}
                      {r.category && `, ${CATEGORY_LABEL[r.category].toLowerCase()}`}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <CoverageLabel coverage={r.coverage} />
                    {r.claimedCoverage !== r.coverage && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Lowered: evidence not found
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.evidence || "Not shown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Keywords"
        hint="Terms applicant tracking systems are likely to match from this job"
      >
        <div className="max-w-xl space-y-1.5">
          <p className="text-sm">
            <span className="font-semibold">{present.length}</span> of {a.keywords.length} are in
            your resume
          </p>
          <Meter
            value={present.length}
            max={a.keywords.length}
            label={`${present.length} of ${a.keywords.length} keywords in your resume`}
          />
        </div>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {missing.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Missing</p>
              <p className="text-xs text-muted-foreground">
                Add one only if it&apos;s true, ideally inside a bullet that shows how you used it.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((k) => (
                  <span
                    key={k.term}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-sm"
                  >
                    <CircleX
                      className="h-3.5 w-3.5"
                      style={{ color: TONE_VAR.critical }}
                      aria-hidden
                    />
                    {k.term}
                    {k.importance === "required" && (
                      <span className="text-xs text-muted-foreground">required</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
          {present.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Already in your resume</p>
              <div className="flex flex-wrap gap-1.5">
                {present.map((k) => (
                  <span
                    key={k.term}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-sm"
                  >
                    <CircleCheck
                      className="h-3.5 w-3.5"
                      style={{ color: TONE_VAR.good }}
                      aria-hidden
                    />
                    {k.term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Panel
        title="Formatting and writing"
        hint="How easily systems can read your resume, and whether it reads as written by you"
      >
        {warnings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every check passed.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
            {warnings.map((c) => (
              <li key={c.id} className="flex gap-3 p-4">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: TONE_VAR.warning }}
                  aria-label="Needs attention"
                />
                <div className="min-w-0">
                  <p className="font-medium">{c.label}</p>
                  <p className="text-sm text-muted-foreground">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {passed.length > 0 && (
          <Disclosure
            className="mt-4"
            summaryClassName="text-sm font-medium text-muted-foreground hover:text-foreground"
            summary={`Show ${passed.length} passed check${passed.length === 1 ? "" : "s"}`}
          >
            <ul className="mt-2 space-y-2">
              {passed.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <CircleCheck
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: TONE_VAR.good }}
                    aria-label="Passed"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-sm text-muted-foreground">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Disclosure>
        )}
      </Panel>
    </div>
  );
}
