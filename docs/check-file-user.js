const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/aworkapp';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  const File = mongoose.model('File', new mongoose.Schema({}, { strict: false }));
  const files = await File.find({}).lean();
  console.log("=== FILES WITH USERID ===");
  for (const f of files) {
    console.log({
      _id: f._id,
      displayName: f.displayName,
      userId: f.userId,
      category: f.category
    });
  }

  await mongoose.disconnect();
}

run().catch(console.error);
