const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aworkapp';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({}, { strict: false }));
  const logs = await AuditLog.find({ action: { $regex: 'resume', $options: 'i' } }).lean();
  console.log("=== AUDIT LOGS FOR RESUMES ===");
  for (const l of logs) {
    console.log(JSON.stringify(l, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
