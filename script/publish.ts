#!/usr/bin/env bun

import { $ } from "bun";

// Get bump type from environment
const bump = process.env.BUMP;
if (!bump || !["patch", "minor", "major"].includes(bump)) {
  console.error(
    "Invalid or missing BUMP environment variable. Must be patch, minor, or major.",
  );
  process.exit(1);
}

// Get current version
const pkg = await Bun.file("package.json").json();
const currentVersion = pkg.version;
console.log(`Current version: ${currentVersion}`);

// Calculate new version
const [major, minor, patch] = currentVersion.split(".").map(Number);
const newVersion: string = (() => {
  switch (bump) {
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "major":
      return `${major + 1}.0.0`;
    default:
      throw new Error(`Invalid bump type: ${bump}`);
  }
})();

console.log(`New version: ${newVersion}`);

// Update package.json
pkg.version = newVersion;
await Bun.file("package.json").write(`${JSON.stringify(pkg, null, 2)}\n`);
console.log("Updated package.json");

// Build the project
console.log("Building project...");
await $`bun run build`;
console.log("Build completed");

// Publish to npm
console.log("Publishing to npm...");
await $`npm publish --access public`;
console.log("Published to npm");

// Git operations
console.log("Committing changes...");
await $`git add package.json`;
await $`git commit -m "release: v${newVersion}"`;
await $`git tag v${newVersion}`;
await $`git push origin main --tags`;
console.log("Git operations completed");

// Generate release notes
console.log("Generating release notes...");

// Get latest tag for comparison
let latestTag = "HEAD~1";
try {
  const result = await $`git describe --tags --abbrev=0 HEAD~1`.text();
  latestTag = result.trim();
} catch (_e) {
  // No previous tags, use first commit
  latestTag = await $`git rev-list --max-parents=0 HEAD`
    .text()
    .then((t) => t.trim());
}

console.log(`Comparing ${latestTag}..HEAD`);

// Get commits since last tag
let commits: string[] = [];
try {
  const result =
    await $`git log --oneline --pretty=format:"%h %s" ${latestTag}..HEAD`;
  commits = result
    .text()
    .split("\n")
    .filter((line) => line.trim());
} catch (_e) {
  // No commits or error
}

console.log(`Found ${commits.length} commits`);

// Get contributors (excluding author "Donald Silveira")
const contributors = new Set<string>();
for (const commit of commits) {
  try {
    const hash = commit.split(" ")[0];
    const author = await $`git show -s --format='%an' ${hash}`.text().trim();
    if (author !== "Donald Silveira") {
      contributors.add(`@${author.replace(/\s+/g, "").toLowerCase()}`);
    }
  } catch (_e) {
    // Skip if can't get author
  }
}

// Format release notes
let notes = `## Changes\n`;
if (commits.length === 0) {
  notes += `- Initial release\n`;
} else {
  for (const commit of commits.slice(0, 10)) {
    // Limit to 10 commits
    const message = commit.split(" ").slice(1).join(" ");
    notes += `- ${message}\n`;
  }
  if (commits.length > 10) {
    notes += `- ... and ${commits.length - 10} more changes\n`;
  }
}

if (contributors.size > 0) {
  notes += `\n## Contributors\n${Array.from(contributors).join(", ")}\n`;
}

// Create GitHub release
console.log("Creating GitHub release...");
await $`gh release create v${newVersion} --title "v${newVersion}" --notes ${notes} --draft=false`;
console.log("Release created");

// Output for GitHub Actions
const output = `version=${newVersion}\ntag=v${newVersion}\n`;
if (process.env.GITHUB_OUTPUT) {
  await Bun.write(process.env.GITHUB_OUTPUT, output);
}

console.log(`Successfully released v${newVersion}!`);
