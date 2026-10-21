// Publishes the tagged version to npm with trusted publishing (GitHub OIDC),
// so no npm token is stored in the repo. Requires npm >= 11.5.1 and the
// package's trusted publisher set to this repo's publish.yml on npmjs.com.

import { run } from "./run.ts";

const version = process.env.VERSION;
if (!version) throw new Error("Set VERSION to the version being published.");

// The repo's package.json carries a placeholder; the tag is the version.
run("npm", ["version", version, "--no-git-tag-version"]);
run("bun", ["run", "build"]);
run("npm", ["publish", "--access", "public", "--provenance"]);
