#!/usr/bin/env bun

import { $ } from "bun";

const bump = process.env.BUMP;
if (!bump || !["patch", "minor", "major"].includes(bump)) {
  console.error(
    "Invalid or missing BUMP environment variable. Must be patch, minor, or major.",
  );
  process.exit(1);
}

const pkg = await Bun.file("package.json").json();
const currentVersion = pkg.version;
console.log(`Current version: ${currentVersion}`);

const [major, minor, patch] = currentVersion.split(".").map(Number);
const newVersion = (() => {
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

pkg.version = newVersion;
await Bun.file("package.json").write(`${JSON.stringify(pkg, null, 2)}\n`);
console.log("Updated package.json");

console.log("Building project...");
await $`bun run build`;
console.log("Build completed");

console.log("Authenticating with npm...");
await $`npm config set //registry.npmjs.org/:_authToken ${process.env.NPM_TOKEN}`;

console.log("Publishing to npm...");
await $`npm publish --access public`;
console.log("Published to npm");

const output = `version=${newVersion}\ntag=v${newVersion}\n`;
if (process.env.GITHUB_OUTPUT) {
  await Bun.write(process.env.GITHUB_OUTPUT, output);
}

console.log(`Successfully published v${newVersion}!`);
