import * as fs from "node:fs";
import * as path from "node:path";
import { writeAtomic } from "./files.ts";
import { syncodeDir } from "./paths.ts";
import { canPrompt } from "./prompts.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

interface Cache {
  latest: string;
  checkedAt: number;
}

function cacheFile(): string {
  return path.join(syncodeDir(), "update-check.json");
}

function readCache(): Cache | undefined {
  try {
    const value: unknown = JSON.parse(fs.readFileSync(cacheFile(), "utf8"));
    if (
      typeof value === "object" &&
      value !== null &&
      "latest" in value &&
      typeof value.latest === "string" &&
      "checkedAt" in value &&
      typeof value.checkedAt === "number"
    ) {
      return { latest: value.latest, checkedAt: value.checkedAt };
    }
  } catch {
    // No cache yet.
  }
  return undefined;
}

export function isOutdated(current: string, latest: string): boolean {
  const parse = (version: string) => version.split("-")[0]?.split(".").map(Number) ?? [];
  const [a, b] = [parse(current), parse(latest)];
  for (let i = 0; i < 3; i++) {
    const [x, y] = [a[i] ?? 0, b[i] ?? 0];
    if (x !== y) return y > x;
  }
  return false;
}

/**
 * Prints a notice from the last cached check, and refreshes the cache at most
 * once a day in the background. Never delays a command by more than the
 * request timeout, and stays quiet outside interactive terminals.
 */
export function checkForUpdates(packageName: string, current: string) {
  if (!canPrompt() || process.env.CI || process.env.SYNCODE_NO_UPDATE_CHECK) return;
  const cache = readCache();
  if (cache && isOutdated(current, cache.latest)) {
    console.log(
      `syncode ${cache.latest} is available (you have ${current}). Run: npm install -g ${packageName}@latest\n`,
    );
  }
  if (cache && Date.now() - cache.checkedAt < DAY_MS) return;

  fetch(`https://registry.npmjs.org/${packageName}/latest`, { signal: AbortSignal.timeout(1500) })
    .then((response) => (response.ok ? response.json() : undefined))
    .then((data: unknown) => {
      if (
        typeof data === "object" &&
        data !== null &&
        "version" in data &&
        typeof data.version === "string"
      ) {
        writeAtomic(cacheFile(), JSON.stringify({ latest: data.version, checkedAt: Date.now() }));
      }
    })
    .catch(() => {
      // Offline or slow registry: try again next run.
    });
}
