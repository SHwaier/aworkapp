import mongoose from "mongoose";
import path from "path";
import Resume, { type IResume } from "@/models/Resume";
import File, { type IFile } from "@/models/File";
import ResumeSnapshot, { type IResumeSnapshot } from "@/models/ResumeSnapshot";
import Application from "@/models/Application";
import { createAuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/api/app-error";
import { deleteFile, uploadFile } from "./file";

/**
 * Resumes are versioned: each version is a File with `resumeId` and a
 * `versionNumber`. New uploads become the next version; older versions are
 * kept. Restoring copies an old version forward as a new one, so history only
 * ever grows. Applications pin the exact version they used.
 */

const ApiError = (message: string, status: number) => new AppError(message, status);

export function versionLabel(resumeName: string, versionNumber: number | null): string {
  return versionNumber ? `${resumeName} v${versionNumber}` : resumeName;
}

function nameFromFile(originalFileName: string): string {
  return (
    path.basename(originalFileName, path.extname(originalFileName)).replace(/[_-]+/g, " ").trim() ||
    "Resume"
  );
}

async function findResume(resumeId: string, userId: string) {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) throw ApiError("Resume not found", 404);
  return resume;
}

/**
 * Upload a file as the next version of `resume`. Identical files are caught:
 * re-uploading the same bytes doesn't create a duplicate version.
 */
async function attachUpload(
  resume: IResume,
  file: Blob,
  originalFileName: string,
  userId: string,
  note: string,
  request?: Request
): Promise<IFile> {
  const { file: doc, duplicate } = await uploadFile({
    file,
    originalFileName,
    userId,
    category: "resume",
    request,
  });

  if (duplicate) {
    // uploadFile returns the existing record when the same bytes were uploaded before
    if (doc.resumeId?.equals(resume._id)) {
      throw ApiError(`This file is identical to v${doc.versionNumber} of this resume.`, 409);
    }
    if (doc.resumeId) {
      const other = await Resume.findById(doc.resumeId).select("name").lean();
      throw ApiError(
        `This file is already v${doc.versionNumber} of "${other?.name ?? "another resume"}".`,
        409
      );
    }
    // A loose copy in Other files: move it into this resume's history
  }

  const versionNumber = resume.latestVersionNumber + (resume.isNew ? 0 : 1);
  doc.set({ resumeId: resume._id, versionNumber, versionNote: note, category: "resume" });
  try {
    await doc.save();
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      // Another upload took this version number first
      if (!duplicate) await deleteFile(doc._id, userId);
      throw ApiError("Another version was just added to this resume. Please try again.", 409);
    }
    throw err;
  }
  return doc;
}

export async function createResume({
  userId,
  file,
  originalFileName,
  name,
  targetRole = "",
  notes = "",
  basedOn = null,
  request,
}: {
  userId: string;
  file: Blob;
  originalFileName: string;
  name?: string;
  targetRole?: string;
  notes?: string;
  basedOn?: { resumeId: mongoose.Types.ObjectId; versionNumber: number } | null;
  request?: Request;
}): Promise<{ resume: IResume; version: IFile }> {
  const resume = new Resume({
    userId,
    name: name?.trim() || nameFromFile(originalFileName),
    targetRole,
    notes,
    basedOn,
    latestVersionNumber: 1,
    // Placeholder until the first version exists; validated on save below
    currentFileId: new mongoose.Types.ObjectId(),
  });

  const version = await attachUpload(resume, file, originalFileName, userId, "", request);
  resume.currentFileId = version._id;
  try {
    await resume.save();
  } catch (err) {
    // Don't leave an orphaned version behind
    version.set({ resumeId: null, versionNumber: null });
    await version.save();
    throw err;
  }

  if (request) {
    await createAuditLog({
      userId,
      action: "resume.created",
      entityType: "resume",
      entityId: resume._id.toString(),
      metadata: { name: resume.name, basedOn: basedOn ? basedOn.resumeId.toString() : null },
      request,
    });
  }
  return { resume, version };
}

export async function addVersion({
  resumeId,
  userId,
  file,
  originalFileName,
  note = "",
  request,
}: {
  resumeId: string;
  userId: string;
  file: Blob;
  originalFileName: string;
  note?: string;
  request?: Request;
}): Promise<{ resume: IResume; version: IFile }> {
  const resume = await findResume(resumeId, userId);
  const version = await attachUpload(resume, file, originalFileName, userId, note, request);

  resume.latestVersionNumber = version.versionNumber!;
  resume.currentFileId = version._id;
  await resume.save();

  if (request) {
    await createAuditLog({
      userId,
      action: "resume.version_added",
      entityType: "resume",
      entityId: resumeId,
      metadata: { versionNumber: version.versionNumber },
      request,
    });
  }
  return { resume, version };
}

/**
 * Make an old version current by copying it forward as a new version.
 * The copy shares the stored file; nothing is overwritten or lost.
 */
export async function restoreVersion({
  resumeId,
  userId,
  versionNumber,
  request,
}: {
  resumeId: string;
  userId: string;
  versionNumber: number;
  request?: Request;
}): Promise<{ resume: IResume; version: IFile }> {
  const resume = await findResume(resumeId, userId);
  const source = await File.findOne({ userId, resumeId: resume._id, versionNumber }).select(
    "+storageKey +extractedText"
  );
  if (!source) throw ApiError("Version not found", 404);
  if (source._id.equals(resume.currentFileId)) {
    throw ApiError(`v${versionNumber} is already the current version.`, 400);
  }

  const nextNumber = resume.latestVersionNumber + 1;
  const copy = await File.create({
    userId,
    originalFileName: source.originalFileName,
    displayName: source.displayName,
    fileType: source.fileType,
    mimeType: source.mimeType,
    fileSize: source.fileSize,
    storageProvider: source.storageProvider,
    storageKey: source.storageKey,
    fileHash: source.fileHash,
    category: "resume",
    resumeId: resume._id,
    versionNumber: nextNumber,
    versionNote: `Restored from v${versionNumber}`,
    restoredFromVersion: versionNumber,
    extractedText: source.extractedText,
    textHash: source.textHash,
    textPageCount: source.textPageCount,
    textExtractedAt: source.textExtractedAt,
    textExtractionError: source.textExtractionError,
  });

  resume.latestVersionNumber = nextNumber;
  resume.currentFileId = copy._id;
  await resume.save();

  if (request) {
    await createAuditLog({
      userId,
      action: "resume.version_restored",
      entityType: "resume",
      entityId: resumeId,
      metadata: { from: versionNumber, to: nextNumber },
      request,
    });
  }
  return { resume, version: copy };
}

/** Delete one version. The current version and versions an application uses can't be deleted. */
export async function deleteVersion({
  resumeId,
  userId,
  versionNumber,
  request,
}: {
  resumeId: string;
  userId: string;
  versionNumber: number;
  request?: Request;
}): Promise<void> {
  const resume = await findResume(resumeId, userId);
  const version = await File.findOne({ userId, resumeId: resume._id, versionNumber }).select("_id");
  if (!version) throw ApiError("Version not found", 404);
  if (version._id.equals(resume.currentFileId)) {
    throw ApiError(
      "You can't delete the current version. Make another version current first.",
      400
    );
  }
  const usedBy = await ResumeSnapshot.countDocuments({ userId, fileId: version._id });
  if (usedBy > 0) {
    throw ApiError(
      `v${versionNumber} is used by ${usedBy} application${usedBy === 1 ? "" : "s"}, so it's kept as a record of what you sent.`,
      409
    );
  }

  await deleteFile(version._id, userId);

  if (request) {
    await createAuditLog({
      userId,
      action: "resume.version_deleted",
      entityType: "resume",
      entityId: resumeId,
      metadata: { versionNumber },
      request,
    });
  }
}

/** Delete a resume with all its versions. Blocked while a submitted application uses it. */
export async function deleteResume(
  resumeId: string,
  userId: string,
  request?: Request
): Promise<void> {
  const resume = await findResume(resumeId, userId);
  const locked = await ResumeSnapshot.countDocuments({
    userId,
    resumeId: resume._id,
    isLocked: true,
  });
  if (locked > 0) {
    throw ApiError(
      `This resume was sent with ${locked} application${locked === 1 ? "" : "s"}, so it's kept as a record. Archive it instead.`,
      409
    );
  }

  await ResumeSnapshot.deleteMany({ userId, resumeId: resume._id });
  const versions = await File.find({ userId, resumeId: resume._id }).select("_id").lean();
  for (const v of versions) await deleteFile(v._id, userId);
  await Resume.deleteOne({ _id: resume._id });

  if (request) {
    await createAuditLog({
      userId,
      action: "resume.deleted",
      entityType: "resume",
      entityId: resumeId,
      metadata: { name: resume.name, versions: versions.length },
      request,
    });
  }
}

// ─── Applications ───

async function findApplication(applicationId: string, userId: string) {
  const app = await Application.findOne({ _id: applicationId, userId }).select("_id jobTitle");
  if (!app) throw ApiError("Application not found", 404);
  return app;
}

async function assertUnlocked(applicationId: string, userId: string) {
  const snapshot = await ResumeSnapshot.findOne({ applicationId, userId })
    .select("isLocked")
    .lean();
  if (snapshot?.isLocked) {
    throw ApiError(
      "This application has been submitted, so its resume is locked as a record of what you sent.",
      409
    );
  }
}

/**
 * Pin an application to a resume version (the resume's current version by
 * default). Replaces any previous assignment unless the application is locked.
 */
export async function assignResumeToApplication({
  applicationId,
  resumeId,
  versionNumber,
  userId,
  request,
}: {
  applicationId: string;
  resumeId: string;
  versionNumber?: number;
  userId: string;
  request?: Request;
}): Promise<IResumeSnapshot> {
  await findApplication(applicationId, userId);
  await assertUnlocked(applicationId, userId);
  const resume = await findResume(resumeId, userId);

  const fileId =
    versionNumber === undefined
      ? resume.currentFileId
      : (await File.findOne({ userId, resumeId: resume._id, versionNumber }).select("_id"))?._id;
  if (!fileId) throw ApiError("Version not found", 404);

  const snapshot = await ResumeSnapshot.findOneAndUpdate(
    { applicationId, userId },
    {
      $set: { resumeId: resume._id, fileId, matchScore: null, keywordsMissing: [] },
      $setOnInsert: { userId, applicationId, isLocked: false },
    },
    { upsert: true, new: true }
  );

  if (request) {
    await createAuditLog({
      userId,
      action: "resume_snapshot.assigned",
      entityType: "resume_snapshot",
      entityId: snapshot._id.toString(),
      metadata: { applicationId, resumeId, fileId: fileId.toString() },
      request,
    });
  }
  return snapshot;
}

export async function unassignResumeFromApplication(
  applicationId: string,
  userId: string,
  request?: Request
): Promise<boolean> {
  await assertUnlocked(applicationId, userId);
  const snapshot = await ResumeSnapshot.findOneAndDelete({ applicationId, userId });
  if (!snapshot) return false;

  if (request) {
    await createAuditLog({
      userId,
      action: "resume_snapshot.unassigned",
      entityType: "resume_snapshot",
      entityId: snapshot._id.toString(),
      metadata: { applicationId },
      request,
    });
  }
  return true;
}

/** Remove an application's assignment regardless of lock (used when the application itself is deleted). */
export async function removeApplicationResume(
  applicationId: string,
  userId: string
): Promise<void> {
  await ResumeSnapshot.deleteMany({ applicationId, userId });
}

/**
 * Upload a tailored resume from an application: either the next version of
 * the assigned resume, or a new resume based on it. Then pin the application to it.
 */
export async function uploadForApplication({
  applicationId,
  userId,
  file,
  originalFileName,
  mode,
  name,
  note,
  request,
}: {
  applicationId: string;
  userId: string;
  file: Blob;
  originalFileName: string;
  mode: "version" | "new";
  name?: string;
  note?: string;
  request?: Request;
}): Promise<{ resume: IResume; version: IFile }> {
  const app = await findApplication(applicationId, userId);
  await assertUnlocked(applicationId, userId);
  const current = await ResumeSnapshot.findOne({ applicationId, userId }).lean();

  let result: { resume: IResume; version: IFile };
  if (mode === "version" && current) {
    result = await addVersion({
      resumeId: current.resumeId.toString(),
      userId,
      file,
      originalFileName,
      note,
      request,
    });
  } else {
    const base = current
      ? await File.findById(current.fileId).select("versionNumber").lean()
      : null;
    result = await createResume({
      userId,
      file,
      originalFileName,
      name: name || `${app.jobTitle} resume`,
      targetRole: app.jobTitle,
      basedOn:
        current && base?.versionNumber
          ? { resumeId: current.resumeId, versionNumber: base.versionNumber }
          : null,
      request,
    });
  }

  await assignResumeToApplication({
    applicationId,
    resumeId: result.resume._id.toString(),
    userId,
    request,
  });
  return result;
}
