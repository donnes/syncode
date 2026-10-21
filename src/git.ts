import { spawnSync } from "node:child_process";
import { UserError } from "./errors.ts";

/** Runs git in `repo`, streaming its output to the terminal. */
export function git(repo: string, args: string[]) {
  const result = spawnSync("git", ["-C", repo, ...args], { stdio: "inherit" });
  if (result.error) throw new UserError(`Could not run git: ${result.error.message}`);
  if (result.status !== 0) throw new UserError(`git ${args[0]} failed.`);
}

/** Runs git in `repo` and returns its trimmed stdout, or undefined on failure. */
export function gitOutput(repo: string, args: string[]): string | undefined {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}
