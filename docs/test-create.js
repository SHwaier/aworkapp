const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/aworkapp';

// Define models
const FileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalFileName: { type: String, required: true },
    displayName: { type: String, required: true },
    fileType: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storageProvider: { type: String, required: true },
    storageKey: { type: String, required: true, select: false },
    fileHash: { type: String, required: true },
    category: { type: String, default: "other" },
  },
  { timestamps: true }
);

const File = mongoose.models.File || mongoose.model("File", FileSchema);

const ResumeVersionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    versionNumber: { type: Number, default: 1 },
    targetRole: { type: String, default: "" },
    targetIndustry: { type: String, default: "" },
    skillsEmphasized: [{ type: String }],
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File", default: null },
    notes: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ResumeVersion = mongoose.models.ResumeVersion || mongoose.model("ResumeVersion", ResumeVersionSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  const testFileId = '6a1df921188994a22f402475';
  const userId = '6a1bc9b72b6ff4fdf69c4882';

  const doc = await ResumeVersion.create({
    userId,
    name: "Test Resume with File",
    versionNumber: 3,
    fileId: testFileId,
  });

  console.log("Created Doc:", doc.toJSON());

  // Fetch it back and populate
  const fetched = await ResumeVersion.findById(doc._id).populate("fileId", "displayName fileType mimeType").lean();
  console.log("Fetched with populate:", fetched);

  // Clean up test document
  await ResumeVersion.deleteOne({ _id: doc._id });
  console.log("Cleaned up!");

  await mongoose.disconnect();
}

run().catch(console.error);
