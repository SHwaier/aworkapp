const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/aworkapp';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB!");

  const ResumeVersion = mongoose.model('ResumeVersion', new mongoose.Schema({}, { strict: false }));
  const File = mongoose.model('File', new mongoose.Schema({}, { strict: false }));

  const resumes = await ResumeVersion.find({}).lean();
  console.log("=== RESUMES ===");
  for (const r of resumes) {
    console.log({
      _id: r._id,
      name: r.name,
      versionNumber: r.versionNumber,
      fileId: r.fileId,
      userId: r.userId
    });
  }

  const files = await File.find({}).lean();
  console.log("\n=== FILES ===");
  for (const f of files) {
    console.log({
      _id: f._id,
      displayName: f.displayName,
      category: f.category,
      fileType: f.fileType
    });
  }

  await mongoose.disconnect();
}

run().catch(console.error);
