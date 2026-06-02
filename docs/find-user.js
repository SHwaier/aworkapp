const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/aworkapp';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const user = await User.findById('6a1bc9b72b6ff4fdf69c4882').lean();
  console.log("User details:", user);

  await mongoose.disconnect();
}

run().catch(console.error);
