import { homedir } from "node:os";
import { join } from "node:path";

/** syncode's own folder: config, state, backups and the default repo. */
export function syncodeDir(): string {
  return join(homedir(), ".syncode");
}

export function expandHome(file: string): string {
  return file === "~" || file.startsWith("~/") ? join(homedir(), file.slice(1)) : file;
}
