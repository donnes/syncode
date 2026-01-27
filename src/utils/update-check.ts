import { clearTimeout, setTimeout } from "node:timers";

export interface UpdateCheckOptions {
  currentVersion: string;
  packageName: string;
}

const UPDATE_TIMEOUT_MS = 2000;

export function isNpxInvocation() {
  const argv1 = process.argv[1] || "";
  const execPath = process.env.npm_execpath || "";
  const userAgent = process.env.npm_config_user_agent || "";
  const npxPathMatch = argv1.includes("/_npx/") || argv1.includes("\\_npx\\");
  const execMatch = execPath.includes("npx") || execPath.includes("npx-cli");
  const agentMatch = userAgent.includes("npx");
  return npxPathMatch || execMatch || agentMatch;
}

export function parseVersion(version: string) {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isOutdated(current: string, latest: string) {
  const currentParts = parseVersion(current);
  const latestParts = parseVersion(latest);
  if (!currentParts || !latestParts) return false;
  for (let i = 0; i < 3; i += 1) {
    const currentValue = currentParts[i];
    const latestValue = latestParts[i];
    if (currentValue === undefined || latestValue === undefined) return false;
    if (latestValue > currentValue) return true;
    if (latestValue < currentValue) return false;
  }
  return false;
}

export function formatUpdateNotice(params: {
  current: string;
  latest: string;
  packageName: string;
}) {
  const updateCommand = `npm install -g ${params.packageName}@latest`;
  const lines = [
    "📦 A new version of Syncode is",
    "available!",
    "",
    `Current: ${params.current}`,
    `Latest:  ${params.latest}`,
    "",
    "Run to update:",
    updateCommand,
  ];

  const contentWidth = Math.max(...lines.map((line) => line.length));
  const top = `┌${"─".repeat(contentWidth + 2)}┐`;
  const bottom = `└${"─".repeat(contentWidth + 2)}┘`;
  const boxed = lines
    .map((line) => `│ ${line.padEnd(contentWidth, " ")} │`)
    .join("\n");
  return `${top}\n${boxed}\n${bottom}`;
}

async function fetchLatestVersion(packageName: string) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const data = (await response.json()) as { version?: string };
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkForUpdates({
  currentVersion,
  packageName,
}: UpdateCheckOptions) {
  if (isNpxInvocation()) return;

  const latest = await fetchLatestVersion(packageName);
  if (!latest) return;

  if (isOutdated(currentVersion, latest)) {
    console.log(
      formatUpdateNotice({
        current: currentVersion,
        latest,
        packageName,
      }),
    );
  }
}
