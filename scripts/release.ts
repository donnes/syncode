#!/usr/bin/env bun
// Bumps the version, tags it and creates a GitHub release with generated
// notes. Run by the "Release & Publish" workflow; set PREVIEW=true to only
// print the next version.

import { writeFile } from "node:fs/promises";
import { $ } from "bun";

const bump = process.env.BUMP;
if (bump !== "patch" && bump !== "minor" && bump !== "major") {
  console.error("Set BUMP to patch, minor or major.");
  process.exit(1);
}
const preview = process.env.PREVIEW === "true";

const pkg = await Bun.file("package.json").json();
const [major = 0, minor = 0, patch = 0] = String(pkg.version).split(".").map(Number);
const version = {
  major: `${major + 1}.0.0`,
  minor: `${major}.${minor + 1}.0`,
  patch: `${major}.${minor}.${patch + 1}`,
}[bump];
const tag = `v${version}`;
console.log(`Bumping ${pkg.version} -> ${version}`);

await $`bun run check`;

if (!preview) {
  pkg.version = version;
  await writeFile("package.json", `${JSON.stringify(pkg, null, "\t")}\n`);
  await $`git config user.name "github-actions[bot]"`;
  await $`git config user.email "github-actions[bot]@users.noreply.github.com"`;
  await $`git add package.json`;
  await $`git commit -m ${`release: ${tag}`}`;
  await $`git tag ${tag}`;
  await $`git push origin HEAD --tags --no-verify`;
  await $`gh release create ${tag} --title ${tag} --generate-notes`;
}

if (process.env.GITHUB_OUTPUT) {
  await writeFile(process.env.GITHUB_OUTPUT, `version=${version}\ntag=${tag}\n`, { flag: "a" });
}
