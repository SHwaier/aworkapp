import ResumeSnapshot, { IResumeSnapshot } from "@/models/ResumeSnapshot";
import ResumeVersion from "@/models/ResumeVersion";
import Application from "@/models/Application";
import { deleteFile } from "./file";
import { createAuditLog } from "@/models/AuditLog";
import mongoose from "mongoose";

export interface AssignResumeOptions {
  applicationId: string;
  resumeVersionId: string;
  userId: string;
  request?: Request;
}

/**
 * Assign a specific ResumeVersion to an Application's ResumeSnapshot
 */
export async function assignResumeToApplication({
  applicationId,
  resumeVersionId,
  userId,
  request,
}: AssignResumeOptions): Promise<IResumeSnapshot> {
  // 1. Verify Application exists and belongs to user
  const app = await Application.findOne({ _id: applicationId, userId });
  if (!app) {
    throw new Error("Application not found");
  }

  // 2. Verify Resume version exists and belongs to user
  const resumeVersion = await ResumeVersion.findOne({ _id: resumeVersionId, userId });
  if (!resumeVersion) {
    throw new Error("Resume version not found");
  }

  // 3. Check if snapshot already exists
  let snapshot = await ResumeSnapshot.findOne({ applicationId, userId });

  if (snapshot) {
    // If there's an existing custom file, clean it up using our file service
    if (snapshot.finalSubmittedFileId && snapshot.baseResumeVersionId.toString() !== resumeVersionId) {
      await deleteFile(snapshot.finalSubmittedFileId, userId);
    }

    // Update base resume
    snapshot.baseResumeVersionId = resumeVersion._id;
    snapshot.finalSubmittedFileId = null;
    snapshot.manuallyEdited = false;
    await snapshot.save();
  } else {
    // Create new snapshot
    snapshot = await ResumeSnapshot.create({
      userId,
      applicationId: app._id,
      baseResumeVersionId: resumeVersion._id,
      finalSubmittedFileId: null,
      manuallyEdited: false,
      tailoringNotes: "",
      aiGeneratedChangeSummary: "",
      keywordsAdded: [],
      keywordsMissing: [],
      matchScore: null,
    });
  }

  if (request) {
    await createAuditLog({
      userId,
      action: "resume_snapshot.assigned",
      entityType: "resume_snapshot",
      entityId: snapshot._id.toString(),
      metadata: { applicationId, resumeVersionId },
      request,
    });
  }

  return snapshot;
}

/**
 * Unassign a resume from an application and clean up customized files
 */
export async function unassignResumeFromApplication(
  applicationId: string,
  userId: string,
  request?: Request
): Promise<boolean> {
  const snapshot = await ResumeSnapshot.findOne({ applicationId, userId });
  if (!snapshot) return false;

  // Clean up custom tailored file if it exists
  if (snapshot.finalSubmittedFileId) {
    await deleteFile(snapshot.finalSubmittedFileId, userId);
  }

  await ResumeSnapshot.deleteOne({ _id: snapshot._id });

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
