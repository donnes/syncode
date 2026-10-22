import { spawnSync } from "node:child_process";

/** Runs a command with inherited output, failing the script if it fails. */
export function run(command: string, args: string[]) {
  console.log(`$ ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${String(result.status)}`);
}
