import mongoose from "mongoose";
import Resume from "@/models/Resume";
import File from "@/models/File";
import ResumeSnapshot from "@/models/ResumeSnapshot";
import ResumeAnalysis from "@/models/ResumeAnalysis";
import Application from "@/models/Application";
import { AppError } from "@/lib/api/app-error";
import { escapeRegex } from "@/lib/utils/escape-regex";

/** Read models for the resume pages and an application's Resume tab. */

const VERSION_FIELDS =
  "resumeId versionNumber displayName originalFileName fileType mimeType fileSize versionNote restoredFromVersion createdAt";

export interface VersionSummary {
  fileId: string;
  versionNumber: number;
  displayName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  note: string;
  restoredFromVersion: number | null;
  uploadedAt: Date;
}

type VersionDoc = {
  _id: mongoose.Types.ObjectId;
  versionNumber?: number | null;
  displayName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  versionNote?: string;
  restoredFromVersion?: number | null;
  createdAt: Date;
};

function toVersion(f: VersionDoc): VersionSummary {
  return {
    fileId: f._id.toString(),
    versionNumber: f.versionNumber ?? 0,
    displayName: f.displayName,
    fileType: f.fileType,
    mimeType: f.mimeType,
    fileSize: f.fileSize,
    note: f.versionNote ?? "",
    restoredFromVersion: f.restoredFromVersion ?? null,
    uploadedAt: f.createdAt,
  };
}

export interface ResumeListItem {
  id: string;
  name: string;
  targetRole: string;
  isActive: boolean;
  updatedAt: Date;
  current: VersionSummary | null;
  versionCount: number;
  applicationCount: number;
  bestScore: number | null;
}

export async function listResumes(
  userId: string,
  { includeArchived = false, search = "" }: { includeArchived?: boolean; search?: string } = {}
): Promise<ResumeListItem[]> {
  const query: Record<string, unknown> = { userId };
  if (!includeArchived) query.isActive = true;
  if (search) {
    const re = { $regex: escapeRegex(search), $options: "i" };
    query.$or = [{ name: re }, { targetRole: re }];
  }

  const resumes = await Resume.find(query).sort({ updatedAt: -1 }).lean();
  if (resumes.length === 0) return [];
  const ids = resumes.map((r) => r._id);

  const [currentFiles, versionCounts, appCounts, scores] = await Promise.all([
    File.find({ _id: { $in: resumes.map((r) => r.currentFileId) } })
      .select(VERSION_FIELDS)
      .lean(),
    File.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
      { $match: { resumeId: { $in: ids } } },
      { $group: { _id: "$resumeId", n: { $sum: 1 } } },
    ]),
    ResumeSnapshot.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
      { $match: { resumeId: { $in: ids } } },
      { $group: { _id: "$resumeId", n: { $sum: 1 } } },
    ]),
    ResumeAnalysis.aggregate<{ _id: mongoose.Types.ObjectId; best: number }>([
      { $match: { resumeId: { $in: ids }, status: "complete" } },
      { $group: { _id: "$resumeId", best: { $max: "$score" } } },
    ]),
  ]);

  const byId = <T extends { _id: mongoose.Types.ObjectId }>(rows: T[]) =>
    new Map(rows.map((r) => [r._id.toString(), r]));
  const files = byId(currentFiles as VersionDoc[]);
  const counts = byId(versionCounts);
  const apps = byId(appCounts);
  const best = byId(scores);

  return resumes.map((r) => {
    const id = r._id.toString();
    const current = files.get(r.currentFileId.toString());
    return {
      id,
      name: r.name,
      targetRole: r.targetRole,
      isActive: r.isActive,
      updatedAt: r.updatedAt,
      current: current ? toVersion(current) : null,
      versionCount: counts.get(id)?.n ?? 0,
      applicationCount: apps.get(id)?.n ?? 0,
      bestScore: best.get(id)?.best ?? null,
    };
  });
}

export interface VersionUsage {
  applicationId: string;
  jobTitle: string;
  company: string;
  isLocked: boolean;
}

export interface ResumeDetail {
  id: string;
  name: string;
  targetRole: string;
  targetIndustry: string;
  skillsEmphasized: string[];
  notes: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  currentFileId: string;
  basedOn: { resumeId: string; name: string; versionNumber: number } | null;
  tailoredInto: { id: string; name: string }[];
  versions: (VersionSummary & {
    isCurrent: boolean;
    usedBy: VersionUsage[];
    bestScore: number | null;
  })[];
}

export async function getResumeDetail(resumeId: string, userId: string): Promise<ResumeDetail> {
  const resume = await Resume.findOne({ _id: resumeId, userId }).lean();
  if (!resume) throw new AppError("Resume not found", 404);

  const [versions, snapshots, scores, basedOn, tailoredInto] = await Promise.all([
    File.find({ userId, resumeId: resume._id })
      .sort({ versionNumber: -1 })
      .select(VERSION_FIELDS)
      .lean(),
    ResumeSnapshot.find({ userId, resumeId: resume._id })
      .select("applicationId fileId isLocked")
      .lean(),
    ResumeAnalysis.aggregate<{ _id: mongoose.Types.ObjectId; best: number }>([
      { $match: { resumeId: resume._id, status: "complete" } },
      { $group: { _id: "$fileId", best: { $max: "$score" } } },
    ]),
    resume.basedOn?.resumeId
      ? Resume.findOne({ _id: resume.basedOn.resumeId, userId }).select("name").lean()
      : null,
    Resume.find({ userId, "basedOn.resumeId": resume._id }).select("name").lean(),
  ]);

  const apps = await Application.find({
    _id: { $in: snapshots.map((s) => s.applicationId) },
    userId,
  })
    .select("jobTitle companyId")
    .populate("companyId", "name")
    .lean();
  const appById = new Map(apps.map((a) => [a._id.toString(), a]));
  const usageByFile = new Map<string, VersionUsage[]>();
  for (const s of snapshots) {
    const app = appById.get(s.applicationId.toString());
    if (!app) continue;
    const list = usageByFile.get(s.fileId.toString()) ?? [];
    list.push({
      applicationId: app._id.toString(),
      jobTitle: app.jobTitle,
      company: (app.companyId as unknown as { name?: string } | null)?.name ?? "",
      isLocked: s.isLocked,
    });
    usageByFile.set(s.fileId.toString(), list);
  }
  const bestByFile = new Map(scores.map((s) => [s._id.toString(), s.best]));

  return {
    id: resume._id.toString(),
    name: resume.name,
    targetRole: resume.targetRole,
    targetIndustry: resume.targetIndustry,
    skillsEmphasized: resume.skillsEmphasized,
    notes: resume.notes,
    isActive: resume.isActive,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
    currentFileId: resume.currentFileId.toString(),
    basedOn:
      resume.basedOn && basedOn
        ? {
            resumeId: basedOn._id.toString(),
            name: basedOn.name,
            versionNumber: resume.basedOn.versionNumber,
          }
        : null,
    tailoredInto: tailoredInto.map((t) => ({ id: t._id.toString(), name: t.name })),
    versions: (versions as VersionDoc[]).map((v) => ({
      ...toVersion(v),
      isCurrent: v._id.equals(resume.currentFileId),
      usedBy: usageByFile.get(v._id.toString()) ?? [],
      bestScore: bestByFile.get(v._id.toString()) ?? null,
    })),
  };
}

export interface ApplicationResume {
  resume: { id: string; name: string; targetRole: string; notes: string };
  version: VersionSummary;
  isLocked: boolean;
  /** Set when the resume has a newer current version than the pinned one */
  newerVersion: { versionNumber: number } | null;
  versions: VersionSummary[];
}

export async function getApplicationResume(
  applicationId: string,
  userId: string
): Promise<ApplicationResume | null> {
  const snapshot = await ResumeSnapshot.findOne({ applicationId, userId }).lean();
  if (!snapshot) return null;

  const [resume, versions] = await Promise.all([
    Resume.findOne({ _id: snapshot.resumeId, userId }).lean(),
    File.find({ userId, resumeId: snapshot.resumeId })
      .sort({ versionNumber: -1 })
      .select(VERSION_FIELDS)
      .lean(),
  ]);
  const pinned = (versions as VersionDoc[]).find((v) => v._id.equals(snapshot.fileId));
  if (!resume || !pinned) return null;

  const current = (versions as VersionDoc[]).find((v) => v._id.equals(resume.currentFileId));
  const newer =
    current &&
    !current._id.equals(pinned._id) &&
    (current.versionNumber ?? 0) > (pinned.versionNumber ?? 0)
      ? { versionNumber: current.versionNumber! }
      : null;

  return {
    resume: {
      id: resume._id.toString(),
      name: resume.name,
      targetRole: resume.targetRole,
      notes: resume.notes,
    },
    version: toVersion(pinned),
    isLocked: snapshot.isLocked,
    newerVersion: newer,
    versions: (versions as VersionDoc[]).map(toVersion),
  };
}
