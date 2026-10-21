// Packs the npm tarball, installs it globally into a sandbox prefix and runs
// the installed `syncode`, so a broken bin, a missing file or a runtime
// import of a devDependency fails before release.

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(root, ".scratch", "package");
const pkg: unknown = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (typeof pkg !== "object" || pkg === null || !("version" in pkg)) {
  throw new Error("package.json has no version");
}

function parsePack(value: unknown): { filename: string; files: string[] } {
  const [entry]: unknown[] = Array.isArray(value) ? value : [];
  if (
    typeof entry === "object" &&
    entry !== null &&
    "filename" in entry &&
    typeof entry.filename === "string" &&
    "files" in entry &&
    Array.isArray(entry.files)
  ) {
    const files = entry.files.flatMap((file: unknown) =>
      typeof file === "object" && file !== null && "path" in file && typeof file.path === "string"
        ? [file.path]
        : [],
    );
    return { filename: entry.filename, files };
  }
  throw new Error("Unexpected npm pack output");
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", env });
  return { status: result.status, output: `${result.stdout}${result.stderr}`.trim() };
}

function expect(condition: boolean, message: string, output: string) {
  if (!condition) {
    console.error(`✗ ${message}\n${output}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

fs.rmSync(scratch, { recursive: true, force: true });
fs.mkdirSync(scratch, { recursive: true });

const pack = run("npm", ["pack", "--pack-destination", scratch, "--json"]);
expect(pack.status === 0, "npm pack", pack.output);
const packed = parsePack(JSON.parse(pack.output));
const files = packed.files.toSorted();
expect(
  files.join(",") === "LICENSE,README.md,dist/index.mjs,package.json",
  `tarball contains only the CLI (${files.join(", ")})`,
  pack.output,
);

const prefix = path.join(scratch, "prefix");
const install = run("npm", [
  "install",
  "--global",
  "--prefix",
  prefix,
  "--no-audit",
  "--no-fund",
  path.join(scratch, packed.filename),
]);
expect(install.status === 0, "npm install -g from the tarball", install.output);

const bin = path.join(prefix, "bin", "syncode");
const home = path.join(scratch, "home");
fs.mkdirSync(home);
const env = { PATH: process.env.PATH, HOME: home };

const version = run(bin, ["--version"], env);
expect(
  version.output === pkg.version,
  `syncode --version prints ${String(pkg.version)}`,
  version.output,
);

// Loads every command module without touching the real home.
const status = run(bin, ["status"], env);
expect(
  status.status === 1 && status.output.includes("Run `syncode init` first"),
  "syncode status explains that it isn't set up",
  status.output,
);

fs.rmSync(scratch, { recursive: true, force: true });
