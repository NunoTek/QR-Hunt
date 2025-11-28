#!/usr/bin/env node
/* global process, console */
/**
 * Version bump script for CI/CD
 * Usage: node scripts/bump-version.js [patch|minor|major]
 * Default: patch
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packagePath = join(__dirname, "..", "package.json");

// Read package.json
const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
const currentVersion = packageJson.version;

// Parse version
const [major, minor, patch] = currentVersion.split(".").map(Number);

// Determine bump type from argument
const bumpType = process.argv[2] || "patch";

let newVersion;
switch (bumpType) {
  case "major":
    newVersion = `${major + 1}.0.0`;
    break;
  case "minor":
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case "patch":
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update package.json
packageJson.version = newVersion;
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");

console.log(`Version bumped: ${currentVersion} → ${newVersion}`);
