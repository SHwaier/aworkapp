// Client shapes of the resume APIs (dates arrive as ISO strings)

export interface VersionSummary {
  fileId: string;
  versionNumber: number;
  displayName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  note: string;
  restoredFromVersion: number | null;
  uploadedAt: string;
}

export interface ResumeListItem {
  id: string;
  name: string;
  targetRole: string;
  isActive: boolean;
  updatedAt: string;
  latestVersionNumber: number;
  current: VersionSummary | null;
  versionCount: number;
  applicationCount: number;
  bestScore: number | null;
}

export interface VersionUsage {
  applicationId: string;
  jobTitle: string;
  company: string;
  isLocked: boolean;
}

export interface ResumeVersionDetail extends VersionSummary {
  isCurrent: boolean;
  usedBy: VersionUsage[];
  bestScore: number | null;
}

export interface ResumeDetail {
  id: string;
  name: string;
  targetRole: string;
  targetIndustry: string;
  skillsEmphasized: string[];
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currentFileId: string;
  latestVersionNumber: number;
  basedOn: { resumeId: string; name: string; versionNumber: number } | null;
  tailoredInto: { id: string; name: string }[];
  versions: ResumeVersionDetail[];
}

export interface ApplicationResume {
  resume: { id: string; name: string; targetRole: string; notes: string };
  version: VersionSummary;
  isLocked: boolean;
  newerVersion: { versionNumber: number } | null;
  versions: VersionSummary[];
}
