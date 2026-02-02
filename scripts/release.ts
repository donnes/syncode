#!/usr/bin/env bun

import { writeFile } from "node:fs/promises";
import { $ } from "bun";
import { buildNotes, getLatestRelease } from "./changelog";

// 1. Validation
const bump = process.env.BUMP;
if (!bump || !["patch", "minor", "major"].includes(bump)) {
  console.error("Missing BUMP env. Use patch, minor, or major.");
  process.exit(1);
}

const preview = process.env.PREVIEW === "true";

// 2. Version Calculation
const pkgFile = Bun.file("package.json");
const pkg = await pkgFile.json();
const currentVersion = pkg.version;

const [major, minor, patch] = currentVersion.split(".").map(Number);
const newVersion = (() => {
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      return currentVersion;
  }
})();

console.log("=== syncode release ===\n");
console.log(`Bumping ${currentVersion} -> ${newVersion}`);

// 3. Generate changelog notes
let notes: string[] = [];
if (!preview) {
  try {
    const previous = await getLatestRelease();
    notes = await buildNotes(previous, "HEAD");
  } catch (_error) {
    console.log("Could not generate changelog, using default notes");
    notes = ["No notable changes"];
  }
}

// 4. Update package.json
pkg.version = newVersion;
await writeFile("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
console.log("Updated package.json");

await $`bun check:unsafe`;

// 5. Git operations
const tag = `v${newVersion}`;
let output = `version=${newVersion}\ntag=${tag}\n`;

if (!preview) {
  console.log("\nCreating git commit and tag...");
  await $`git config user.name "github-actions[bot]"`;
  await $`git config user.email "github-actions[bot]@users.noreply.github.com"`;
  await $`git add package.json`;
  await $`git commit -m "release: ${tag}"`;
  await $`git tag ${tag}`;
  await $`git push origin HEAD --tags --no-verify`;

  // Wait for tag to propagate
  await new Promise((resolve) => setTimeout(resolve, 3_000));

  // Create GitHub release
  console.log("\nCreating GitHub release...");
  await $`gh release create ${tag} --title "${tag}" --notes ${notes.join("\n") || "No notable changes"}`;

  const release = await $`gh release view ${tag} --json id,tagName`.json();
  output += `release=${release.id}\n`;

  console.log(`\nRelease ${tag} created successfully!`);
}

// 6. GitHub Outputs
if (process.env.GITHUB_OUTPUT) {
  await writeFile(process.env.GITHUB_OUTPUT, output, { flag: "a" });
}

console.log(`\nProcess complete for ${tag}`);
