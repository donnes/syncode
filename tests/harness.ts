import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src", "index.ts");
const scratch = path.join(root, ".scratch", "tests");

export interface Sandbox {
  home: string;
  repo: string;
  /** Writes files relative to the sandbox home. */
  write: (files: Record<string, string>) => void;
  read: (file: string) => string;
  /** Link target relative to home, or undefined when not a link. */
  link: (file: string) => string | undefined;
  config: (agents: string[]) => void;
  run: (...args: string[]) => { status: number | null; output: string };
}

export function sandbox(name: string): Sandbox {
  const home = path.join(scratch, name.replace(/\W+/g, "-"));
  fs.rmSync(home, { recursive: true, force: true });
  fs.mkdirSync(home, { recursive: true });
  const repo = path.join(home, ".syncode", "repo");
  const at = (file: string) => path.join(home, file);

  return {
    home,
    repo,
    write(files) {
      for (const [file, content] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(at(file)), { recursive: true });
        fs.writeFileSync(at(file), content);
      }
    },
    read: (file) => fs.readFileSync(at(file), "utf8"),
    link(file) {
      const stat = fs.lstatSync(at(file), { throwIfNoEntry: false });
      return stat?.isSymbolicLink() ? path.relative(home, fs.readlinkSync(at(file))) : undefined;
    },
    config(agents) {
      fs.mkdirSync(repo, { recursive: true });
      fs.writeFileSync(at(".syncode/config.json"), JSON.stringify({ version: 2, repo, agents }));
    },
    run(...args) {
      // Not a TTY, so the CLI never prompts. Only allowlisted variables pass
      // through, so the real agent homes can't leak in.
      const result = spawnSync(process.execPath, [cli, ...args], {
        cwd: home,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH,
          HOME: home,
          GIT_CONFIG_GLOBAL: path.join(home, ".gitconfig"),
          GIT_CONFIG_NOSYSTEM: "1",
        },
      });
      return { status: result.status, output: result.stdout + result.stderr };
    },
  };
}
