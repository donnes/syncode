// Tags the next version and creates its GitHub release with generated notes.
// Versions come from git tags, not commits: nothing is pushed to main (which
// requires reviewed PRs), so the workflow's own GITHUB_TOKEN is enough. The
// publish job stamps the version into package.json at build time.
//
// With PREVIEW=true it runs every check and an npm publish dry run of the
// next version, but creates nothing.

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { run } from "./run.ts";

type Bump = "patch" | "minor" | "major";

function isBump(value: string | undefined): value is Bump {
  return value === "patch" || value === "minor" || value === "major";
}

function output(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

const bump = process.env.BUMP;
if (!isBump(bump)) throw new Error("Set BUMP to patch, minor or major.");
const preview = process.env.PREVIEW === "true";

const latest = output("git", ["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*"]);
const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(latest);
if (!match) throw new Error(`Unexpected latest tag: ${latest}`);
const [major, minor, patch] = [Number(match[1]), Number(match[2]), Number(match[3])];
const version = {
  major: `${major + 1}.0.0`,
  minor: `${major}.${minor + 1}.0`,
  patch: `${major}.${minor}.${patch + 1}`,
}[bump];
const tag = `v${version}`;
console.log(`${preview ? "Preview: " : ""}${latest} -> ${tag}`);

run("bun", ["run", "check"]);

if (preview) {
  const original = fs.readFileSync("package.json", "utf8");
  try {
    run("npm", ["version", version, "--no-git-tag-version"]);
    run("npm", ["publish", "--dry-run", "--access", "public"]);
  } finally {
    fs.writeFileSync("package.json", original);
  }
} else {
  const target = process.env.GITHUB_SHA ?? output("git", ["rev-parse", "HEAD"]);
  run("gh", ["release", "create", tag, "--target", target, "--title", tag, "--generate-notes"]);
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\ntag=${tag}\n`);
}
