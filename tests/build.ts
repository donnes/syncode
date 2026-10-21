import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Tests run the bundle users install, not the TypeScript source, so bundling
// mistakes (like 1.x's dynamic require in ESM) fail here.
export default function setup() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = spawnSync(path.join(root, "node_modules", ".bin", "tsdown"), ["--silent"], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`Build failed:\n${result.stdout}${result.stderr}`);
}
