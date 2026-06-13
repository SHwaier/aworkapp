#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Helper to parse .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Error: .env.local file not found in the current directory.");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const env = {};
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        // Remove quotes if present
        env[key] = value.replace(/^['"]|['"]$/g, "");
      }
    }
  });

  return env;
}

// Password validation (aligned with src/lib/auth/password.ts)
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (password.length > 128) {
    errors.push("Password must be at most 128 characters long");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const newPassword = args[1];

  const env = loadEnv();
  const mongoUri = env.MONGODB_URI;

  if (!mongoUri) {
    console.error("Error: MONGODB_URI not found in .env.local");
    process.exit(1);
  }

  if (!email || !newPassword) {
    console.log("\x1b[36mUsage:\x1b[0m node scripts/update-password.js <email> <newPassword>");
    console.log(
      "\x1b[36mExample:\x1b[0m node scripts/update-password.js user@example.com NewPassword123"
    );
    
    console.log("\nConnecting to database to retrieve current users...");
    try {
      await mongoose.connect(mongoUri);
      const usersCollection = mongoose.connection.db.collection("users");
      const allUsers = await usersCollection.find({}, { projection: { email: 1 } }).toArray();
      if (allUsers.length > 0) {
        console.log("Available users in database:");
        allUsers.forEach((u) => console.log(` - ${u.email}`));
      } else {
        console.log("No users found in the database.");
      }
    } catch (err) {
      console.error("Could not fetch user list:", err.message);
    } finally {
      await mongoose.disconnect();
    }
    process.exit(1);
  }

  // Validate password
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    console.error("\x1b[31mInvalid password strength:\x1b[0m");
    validation.errors.forEach((err) => console.error(` - ${err}`));
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected successfully.");

    const usersCollection = mongoose.connection.db.collection("users");

    // Find user by case-insensitive email matching
    const targetEmail = email.toLowerCase().trim();
    const emailRegex = new RegExp("^" + targetEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "$", "i");
    const user = await usersCollection.findOne({ email: emailRegex });

    if (!user) {
      console.error(
        `\x1b[31mError:\x1b[0m User with email "${targetEmail}" not found in database.`
      );
      const allUsers = await usersCollection.find({}, { projection: { email: 1 } }).toArray();
      if (allUsers.length > 0) {
        console.log("Available users in database:");
        allUsers.forEach((u) => console.log(` - ${u.email}`));
      } else {
        console.log("No users found in the database.");
      }
      process.exit(1);
    }

    console.log(`Hashing new password for ${user.email}...`);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    console.log(passwordHash);
    console.log(user.email);
    console.log(user._id);
    console.log(newPassword);
    console.log("Updating password hash in database...");
    const result = await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { 
          passwordHash: passwordHash,
          updatedAt: new Date()
        } 
      }
    );

    if (result.modifiedCount === 0) {
      console.warn("Warning: Database reported 0 documents modified.");
    }

    console.log(`\x1b[32mSuccess:\x1b[0m Password updated successfully for user "${user.email}".`);
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

main();
