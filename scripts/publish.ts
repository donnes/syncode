#!/usr/bin/env bun
// Publishes to npm with trusted publishing (GitHub OIDC), so no npm token is
// stored in the repo. Requires npm >= 11.5.1 and the package's trusted
// publisher set to this repo's "Release & Publish" workflow on npmjs.com.

import { $ } from "bun";

await $`bun run build`;
await $`npm publish --access public --provenance`;

const pkg = await Bun.file("package.json").json();
console.log(`Published ${pkg.name}@${pkg.version}`);
