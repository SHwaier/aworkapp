#!/usr/bin/env node

/**
 * Migrates resumes to the versioned model: a Resume owns its versions, and
 * each version is a File with resumeId + versionNumber.
 *
 * 1. Old resume-version records become resumes. Records auto-named
 *    "<Company> Resume - vN" (from tailored uploads) are grouped into one
 *    resume with versions v1..vN; any other record becomes a one-version resume.
 * 2. Applications are pinned to the exact version they used. A file left over
 *    from the removed in-app editor becomes a new version of that resume.
 * 3. Analyses point at the new resume.
 * 4. Files in the "resume" category that never had a record become resumes.
 * 5. The old collection is kept as a backup (renamed), not dropped.
 *
 * Safe to run more than once. Dry run by default:
 *   npm run migrate:resume-versioning            # show what would change
 *   npm run migrate:resume-versioning -- --apply # make the changes
 */

import mongoose from "mongoose";
import path from "path";

const apply = process.argv.includes("--apply");
const AUTO_NAME = /^(.*) Resume - v(\d+)$/;

function nameFromFile(displayName) {
  return (
    path.basename(displayName, path.extname(displayName)).replace(/[_-]+/g, " ").trim() || "Resume"
  );
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const col = (name) => db.collection(name);
  const has = async (name) => (await db.listCollections({ name }).toArray()).length > 0;
  const now = new Date();
  const stats = {
    resumes: 0,
    versions: 0,
    editorVersions: 0,
    snapshots: 0,
    unassigned: 0,
    analyses: 0,
    looseFiles: 0,
    skipped: [],
  };

  console.log(apply ? "Applying migration...\n" : "Dry run (pass --apply to make changes)\n");

  /** old resume-version id -> { resumeId, fileId } */
  const versionMap = new Map();
  /** resumeId -> { latest, name } for adding editor files as versions */
  const resumeState = new Map();
  /** Files that become versions in this run (so the dry run doesn't also count them as loose) */
  const claimedFiles = new Set();

  // 1. Old resume-version records -> resumes
  if (await has("resumeversions")) {
    const old = await col("resumeversions").find({}).sort({ createdAt: 1 }).toArray();
    const groups = new Map();
    for (const doc of old) {
      const m = AUTO_NAME.exec(doc.name ?? "");
      const key = m ? `${doc.userId}|${m[1].toLowerCase()}` : `single|${doc._id}`;
      const group = groups.get(key) ?? { name: m ? `${m[1]} Resume` : doc.name, docs: [] };
      group.docs.push({ ...doc, autoNumber: m ? Number(m[2]) : 0 });
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      const docs = group.docs.sort(
        (a, b) => a.autoNumber - b.autoNumber || a.createdAt - b.createdAt
      );
      const first = docs[0];
      const resumeId = first._id;
      const withFiles = [];
      for (const d of docs) {
        const file = d.fileId ? await col("files").findOne({ _id: d.fileId }) : null;
        if (!file) {
          stats.skipped.push(`"${d.name}" has no file`);
          continue;
        }
        if (file.resumeId && !file.resumeId.equals(resumeId)) {
          // Same file used by two old records: point this one at the existing version
          versionMap.set(d._id.toString(), { resumeId: file.resumeId, fileId: file._id });
          continue;
        }
        withFiles.push({ doc: d, file });
      }
      if (withFiles.length === 0) continue;

      console.log(`  Resume "${group.name}" with ${withFiles.length} version(s)`);
      stats.resumes++;
      stats.versions += withFiles.length;
      withFiles.forEach(({ doc, file }, i) => {
        versionMap.set(doc._id.toString(), { resumeId, fileId: file._id, versionNumber: i + 1 });
      });
      const latest = withFiles[withFiles.length - 1];
      resumeState.set(resumeId.toString(), { latest: withFiles.length, name: group.name });

      if (!apply) continue;
      for (const [i, { file }] of withFiles.entries()) {
        await col("files").updateOne(
          { _id: file._id },
          {
            $set: {
              resumeId,
              versionNumber: i + 1,
              versionNote: "",
              restoredFromVersion: null,
              category: "resume",
            },
          }
        );
      }
      await col("resumes").updateOne(
        { _id: resumeId },
        {
          $setOnInsert: {
            userId: first.userId,
            name: group.name,
            targetRole: latest.doc.targetRole ?? "",
            targetIndustry: latest.doc.targetIndustry ?? "",
            skillsEmphasized: latest.doc.skillsEmphasized ?? [],
            notes: first.notes ?? "",
            isActive: docs.some((d) => d.isActive !== false),
            currentFileId: latest.file._id,
            latestVersionNumber: withFiles.length,
            basedOn: null,
            createdAt: first.createdAt ?? now,
            updatedAt: now,
          },
        },
        { upsert: true }
      );
    }
  }

  // 2. Applications -> pinned versions
  const snapshots = await col("resumesnapshots")
    .find({ baseResumeVersionId: { $exists: true } })
    .toArray();
  for (const snap of snapshots) {
    const mapped = versionMap.get(snap.baseResumeVersionId?.toString());
    if (!mapped) {
      stats.unassigned++;
      stats.skipped.push(
        `application ${snap.applicationId}: its resume had no file, so it was unassigned`
      );
      if (apply) await col("resumesnapshots").deleteOne({ _id: snap._id });
      continue;
    }

    let fileId = mapped.fileId;
    if (snap.finalSubmittedFileId) {
      const editorFile = await col("files").findOne({ _id: snap.finalSubmittedFileId });
      if (editorFile && !editorFile.resumeId) {
        claimedFiles.add(editorFile._id.toString());
        const state = resumeState.get(mapped.resumeId.toString());
        const next = (state?.latest ?? 1) + 1;
        if (state) state.latest = next;
        const app = await col("applications").findOne({ _id: snap.applicationId });
        stats.editorVersions++;
        if (apply) {
          await col("files").updateOne(
            { _id: editorFile._id },
            {
              $set: {
                resumeId: mapped.resumeId,
                versionNumber: next,
                versionNote: `Customized in the old editor${app?.jobTitle ? ` for ${app.jobTitle}` : ""}`,
                restoredFromVersion: null,
                category: "resume",
              },
            }
          );
          await col("resumes").updateOne(
            { _id: mapped.resumeId },
            { $set: { latestVersionNumber: next } }
          );
        }
        fileId = editorFile._id;
      }
    }

    stats.snapshots++;
    if (apply) {
      await col("resumesnapshots").updateOne(
        { _id: snap._id },
        {
          $set: { resumeId: mapped.resumeId, fileId },
          $unset: {
            baseResumeVersionId: "",
            finalSubmittedFileId: "",
            manuallyEdited: "",
            promotedToBaseVersion: "",
            tailoringNotes: "",
            aiGeneratedChangeSummary: "",
            keywordsAdded: "",
          },
        }
      );
    }
  }

  // 3. Analyses -> resume
  const analyses = await col("resumeanalyses")
    .find({ resumeVersionId: { $exists: true } })
    .toArray();
  for (const a of analyses) {
    const mapped = versionMap.get(a.resumeVersionId.toString());
    if (!mapped) continue;
    stats.analyses++;
    if (apply) {
      await col("resumeanalyses").updateOne(
        { _id: a._id },
        { $set: { resumeId: mapped.resumeId }, $unset: { resumeVersionId: "" } }
      );
    }
  }

  // 4. Loose resume files -> resumes
  const loose = await col("files")
    .find({ category: "resume", resumeId: { $in: [null, undefined] } })
    .toArray();
  for (const file of loose) {
    if (claimedFiles.has(file._id.toString())) continue;
    if ([...versionMap.values()].some((v) => v.fileId.equals(file._id))) continue;
    const name = nameFromFile(file.displayName ?? file.originalFileName ?? "Resume");
    console.log(`  Resume "${name}" from a file in your library`);
    stats.looseFiles++;
    if (!apply) continue;
    const resumeId = new mongoose.Types.ObjectId();
    await col("files").updateOne(
      { _id: file._id },
      { $set: { resumeId, versionNumber: 1, versionNote: "", restoredFromVersion: null } }
    );
    await col("resumes").insertOne({
      _id: resumeId,
      userId: file.userId,
      name,
      targetRole: "",
      targetIndustry: "",
      skillsEmphasized: [],
      notes: "",
      isActive: true,
      currentFileId: file._id,
      latestVersionNumber: 1,
      basedOn: null,
      createdAt: file.createdAt ?? now,
      updatedAt: now,
    });
  }

  // 5. Keep the old collection as a backup
  if (apply && (await has("resumeversions"))) {
    const backup = `resumeversions_backup_${now.toISOString().slice(0, 10).replace(/-/g, "")}`;
    await col("resumeversions").rename(backup);
    console.log(`\nOld records kept in "${backup}".`);
  }

  console.log(`
Resumes created from old records: ${stats.resumes} (${stats.versions} versions)
Editor customizations added as versions: ${stats.editorVersions}
Applications pinned to a version: ${stats.snapshots}
Applications unassigned (resume had no file): ${stats.unassigned}
Analyses re-pointed: ${stats.analyses}
Resumes created from loose resume files: ${stats.looseFiles}`);
  if (stats.skipped.length)
    console.log(`\nNotes:\n${stats.skipped.map((s) => `  - ${s}`).join("\n")}`);
  console.log(apply ? "\nDone." : "\nNo changes made.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
