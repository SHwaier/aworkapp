// Use project models
// Set environmental variables manually for testing if needed, or connect directly
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aworkapp';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  // Import models (use require for simplicity since we are in CJS)
  const File = require('../src/models/File').default;
  const ResumeVersion = require('../src/models/ResumeVersion').default;

  const testFileId = '6a1df921188994a22f402475';
  const userId = '6a1bc9b72b6ff4fdf69c4882';

  // Create a test resume version linked to the file
  const doc = await ResumeVersion.create({
    userId,
    name: "Populate Test Resume",
    versionNumber: 3,
    fileId: testFileId,
  });

  console.log("Created doc with fileId:", doc.fileId);

  // Fetch and populate
  const fetched = await ResumeVersion.findById(doc._id)
    .populate("fileId", "displayName fileType mimeType")
    .lean();
  
  console.log("Fetched with populate:", fetched);

  // Clean up
  await ResumeVersion.deleteOne({ _id: doc._id });
  console.log("Cleaned up successfully!");

  await mongoose.disconnect();
}

run().catch(console.error);
