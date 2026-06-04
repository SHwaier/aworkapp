#!/usr/bin/env node

/**
 * Pre-commit hook script to detect hardcoded secrets, credentials, 
 * and database connection strings in staged changes.
 * 
 * It runs git diff --cached to analyze only new lines added in this commit,
 * preventing commits containing sensitive data while allowing deletions/modifications.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Define regex patterns to detect secrets
const PATTERNS = [
  {
    name: "MongoDB Connection String with Credentials",
    regex: /mongodb(?:\+srv)?:\/\/[^:\/\s]+:[^@\/\s]+@[a-zA-Z0-9.-]+/i,
    example: "mongodb+srv://user:password@cluster"
  },
  {
    name: "PostgreSQL Connection String with Credentials",
    regex: /postgres(?:ql)?:\/\/[^:\/\s]+:[^@\/\s]+@[a-zA-Z0-9.-]+/i,
    example: "postgres://user:password@host"
  },
  {
    name: "HTTP/HTTPS URL with Credentials",
    regex: /https?:\/\/[^:\/\s]+:[^@\/\s]+@[a-zA-Z0-9.-]+/i,
    example: "https://user:password@api.domain.com"
  },
  {
    name: "Private Key Block",
    regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
    example: "-----BEGIN RSA PRIVATE KEY-----"
  },
  {
    name: "Hardcoded Secret/Token/Key Assignment",
    regex: /(?:jwt_secret|refresh_secret|api_key|private_key|database_url|mongodb_uri|password|passwd|auth_token)\s*[:=]\s*['"`][^'"`\s\$\{]{10,}['"`]/i,
    example: 'JWT_SECRET = "some_secret_key_string"'
  }
];

// Helper to mask secrets in output messages for safety
function maskSecret(text, regex) {
  return text.replace(regex, (match) => {
    if (match.includes("@")) {
      const parts = match.split("@");
      const urlPart = parts[0];
      const hostPart = parts[1] || "";
      const creds = urlPart.split("://");
      if (creds.length > 1) {
        const protocol = creds[0];
        const userPass = creds[1].split(":");
        const user = userPass[0] || "";
        return `${protocol}://${user}:******@${hostPart}`;
      }
    }
    return match.slice(0, 10) + "******" + match.slice(-4);
  });
}

function checkStagedChanges() {
  try {
    // Get list of staged files (excluding deleted files)
    const stagedFilesOutput = execSync("git diff --cached --name-only --diff-filter=d", {
      encoding: "utf-8"
    }).trim();

    if (!stagedFilesOutput) {
      return; // No files staged
    }

    const files = stagedFilesOutput.split("\n");
    let hasSecrets = false;

    for (const file of files) {
      // Exclude check-secrets.js itself, lockfiles, and markdown/docs if desired,
      // but scan everything else.
      if (
        file === "scripts/check-secrets.js" ||
        file.endsWith("package-lock.json") ||
        file.endsWith("yarn.lock") ||
        file.endsWith("pnpm-lock.yaml")
      ) {
        continue;
      }

      // Get diff of staged additions only
      const diffOutput = execSync(`git diff --cached -U0 "${file}"`, {
        encoding: "utf-8"
      });

      // Parse the diff output to scan only the newly added lines (+)
      const lines = diffOutput.split("\n");
      let lineNumOffset = 0;

      for (const line of lines) {
        // Only inspect added lines, exclude the diff metadata headers (+++)
        if (line.startsWith("+") && !line.startsWith("+++")) {
          const content = line.substring(1); // Remove leading '+'

          for (const pattern of PATTERNS) {
            if (pattern.regex.test(content)) {
              // Mask the secret for safe display
              const masked = maskSecret(content, pattern.regex);
              
              console.error(
                `\x1b[41m\x1b[37m[SECURITY EXCEPTION]\x1b[0m Secret detected in staged file: \x1b[36m${file}\x1b[0m`
              );
              console.error(`  --> \x1b[33mPattern Matched:\x1b[0m ${pattern.name}`);
              console.error(`  --> \x1b[31mOffending Line:\x1b[0m  ${masked.trim()}`);
              console.error(`  --> \x1b[32mResolution:\x1b[0m      Move the credential/secret to .env or .env.local and use process.env.\n`);
              
              hasSecrets = true;
            }
          }
        }
      }
    }

    if (hasSecrets) {
      console.error("\x1b[31mCommit blocked. Please remove the secrets listed above and try again.\x1b[0m");
      process.exit(1);
    }
  } catch (error) {
    // If git is not initialized or commands fail, proceed to avoid blocking standard environments
    console.warn(`[Secrets Check Warning] Could not run git check: ${error.message}`);
  }
}

checkStagedChanges();
