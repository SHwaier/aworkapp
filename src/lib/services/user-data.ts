import type mongoose from "mongoose";
import User from "@/models/User";
import File from "@/models/File";
import Application from "@/models/Application";
import Company from "@/models/Company";
import Note from "@/models/Note";
import TimelineEvent from "@/models/TimelineEvent";
import ResumeVersion from "@/models/ResumeVersion";
import ResumeSnapshot from "@/models/ResumeSnapshot";
import ResumeAnalysis from "@/models/ResumeAnalysis";
import AiUsage from "@/models/AiUsage";
import AuditLog from "@/models/AuditLog";
import RefreshToken from "@/models/RefreshToken";
import LoginAttempt from "@/models/LoginAttempt";
import { deleteFile } from "@/lib/services/file";

/**
 * Permanently delete a user and everything they own, including stored files.
 *
 * The account is locked first (disabled + sessions ended) so that if a step fails
 * partway, the user stays locked out and the delete can simply be retried.
 * The user document is removed last.
 */
export async function deleteUserAndData(user: {
  _id: mongoose.Types.ObjectId;
  email: string;
}): Promise<{ filesDeleted: number }> {
  const userId = user._id.toString();

  await User.updateOne(
    { _id: user._id },
    { $set: { disabledAt: new Date() }, $inc: { sessionVersion: 1 } }
  );
  await RefreshToken.updateMany({ userId: user._id }, { $set: { isRevoked: true } });

  // Files go through the file service so their S3/local storage objects are removed too
  const files = await File.find({ userId: user._id }).select("_id").lean();
  for (const file of files) {
    await deleteFile(file._id, userId);
  }

  await Promise.all([
    Application.deleteMany({ userId: user._id }),
    Company.deleteMany({ userId: user._id }),
    Note.deleteMany({ userId: user._id }),
    TimelineEvent.deleteMany({ userId: user._id }),
    ResumeVersion.deleteMany({ userId: user._id }),
    ResumeSnapshot.deleteMany({ userId: user._id }),
    ResumeAnalysis.deleteMany({ userId: user._id }),
    AiUsage.deleteMany({ userId: user._id }),
    AuditLog.deleteMany({ userId: user._id }),
    RefreshToken.deleteMany({ userId: user._id }),
    LoginAttempt.deleteMany({ email: user.email }),
  ]);

  await User.deleteOne({ _id: user._id });

  return { filesDeleted: files.length };
}
