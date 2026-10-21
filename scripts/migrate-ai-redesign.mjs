#!/usr/bin/env node

/**
 * One-time migration for the AI resume analysis redesign.
 *
 * 1. Resumes customized in the removed in-app editor (ResumeSnapshot.finalSubmittedFileId)
 *    become normal resume versions named "Tailored for <Company>", assigned to their
 *    application, so nobody loses a tailored resume.
 * 2. The old checklist results (resumechecklists collection) are dropped; the new
 *    analysis format isn't compatible with them.
 *
 * Safe to run more than once. Dry run by default:
 *   npm run migrate:ai-redesign            # show what would change
 *   npm run migrate:ai-redesign -- --apply # make the changes
 */

import mongoose from "mongoose";

const apply = process.argv.includes("--apply");

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const snapshots = db.collection("resumesnapshots");
  const versions = db.collection("resumeversions");
  const applications = db.collection("applications");
  const companies = db.collection("companies");

  console.log(apply ? "Applying migration...\n" : "Dry run (pass --apply to make changes)\n");

  // 1. Customized resumes -> tailored resume versions
  const customized = await snapshots.find({ finalSubmittedFileId: { $ne: null } }).toArray();
  console.log(`Customized resumes to convert: ${customized.length}`);

  for (const snap of customized) {
    const app = await applications.findOne({ _id: snap.applicationId });
    const company = app?.companyId ? await companies.findOne({ _id: app.companyId }) : null;
    const name = `Tailored for ${company?.name || app?.jobTitle || "application"}`.slice(0, 200);
    console.log(`  - ${name} (application ${snap.applicationId})`);

    if (!apply) continue;

    const now = new Date();
    const { insertedId } = await versions.insertOne({
      userId: snap.userId,
      name,
      versionNumber: 1,
      targetRole: app?.jobTitle || "",
      targetIndustry: "",
      skillsEmphasized: [],
      experienceEmphasized: [],
      projectEmphasized: [],
      fileId: snap.finalSubmittedFileId,
      notes: "Created from the resume you customized in the old in-app editor.",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await snapshots.updateOne(
      { _id: snap._id },
      {
        $set: {
          baseResumeVersionId: insertedId,
          finalSubmittedFileId: null,
          manuallyEdited: false,
          updatedAt: now,
        },
      }
    );
  }

  // 2. Old checklist results
  const hasChecklists =
    (await db.listCollections({ name: "resumechecklists" }).toArray()).length > 0;
  const checklistCount = hasChecklists
    ? await db.collection("resumechecklists").countDocuments()
    : 0;
  console.log(`\nOld checklist results to drop: ${checklistCount}`);
  if (apply && hasChecklists) {
    await db.collection("resumechecklists").drop();
  }

  console.log(apply ? "\nDone." : "\nNo changes made.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
