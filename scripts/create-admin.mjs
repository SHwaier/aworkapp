#!/usr/bin/env node

/**
 * Bootstrap an admin account. Public signup is disabled, so the first admin
 * must be created from the command line; after that, admins add members from /admin.
 *
 * Usage:
 *   npm run create-admin -- <email>                    Promote (and re-enable) an existing user as admin
 *   npm run create-admin -- <email> "<name>" <password>  Create a new admin account
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

async function main() {
  const [email, name, password] = process.argv.slice(2);

  if (!email) {
    console.error('Usage: npm run create-admin -- <email> ["<name>" <password>]');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection("users");
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await users.findOne({ email: normalizedEmail });

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      { $set: { role: "admin", disabledAt: null, updatedAt: new Date() } }
    );
    console.log(`Promoted ${normalizedEmail} to admin (and re-enabled if disabled).`);
  } else {
    if (!name || !password) {
      console.error(
        `No user with email ${normalizedEmail}. Provide a name and password to create one.`
      );
      process.exit(1);
    }
    if (password.length < 10) {
      console.error("Password must be at least 10 characters.");
      process.exit(1);
    }

    const now = new Date();
    await users.insertOne({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created admin account for ${normalizedEmail}.`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
