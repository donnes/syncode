import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getRepoRoot } from "./paths";

export interface TraceData {
  timestamp: string;
  version: string;
  platform: string;
  command: string | undefined;
  error: {
    message: string;
    stack?: string;
    cause?: unknown;
    name?: string;
  };
  args?: string[];
}

export function logError(
  thrown: unknown,
  command?: string,
  args?: string[],
): string {
  const error = thrown instanceof Error ? thrown : new Error(String(thrown));
  const repoRoot = getRepoRoot();
  const timestamp = Date.now();
  const logDir = join(repoRoot, ".syncode-logs");

  // Ensure log directory exists
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const logFile = join(logDir, `syncode-trace-${timestamp}.log`);

  const traceData: TraceData = {
    timestamp: new Date().toISOString(),
    version: getVersion(),
    platform: `${process.platform} ${process.arch}`,
    command,
    error: {
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      name: error.name,
    },
    args,
  };

  const logContent = formatLog(traceData);
  writeFileSync(logFile, logContent, "utf-8");

  return logFile;
}

export function getErrorLogFile(logFile: string): string {
  return `If this issue persists, open an issue at https://github.com/donnes/syncode/issues and paste the full error trace from file ${logFile}`;
}

function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJson = JSON.parse(
      readFileSync(join(dirname(dirname(__dirname)), "package.json"), "utf-8"),
    );
    return packageJson.version;
  } catch {
    return "unknown";
  }
}

function formatLog(data: TraceData): string {
  const lines: string[] = [];

  lines.push("=== Syncode Error Trace ===");
  lines.push("");
  lines.push(`Timestamp: ${data.timestamp}`);
  lines.push(`Version: ${data.version}`);
  lines.push(`Platform: ${data.platform}`);

  if (data.command) {
    lines.push(`Command: ${data.command}`);
  }

  if (data.args && data.args.length > 0) {
    lines.push(`Arguments: ${data.args.join(" ")}`);
  }

  lines.push("");
  lines.push("=== Error Details ===");
  lines.push(`Type: ${data.error.name || "Unknown"}`);
  lines.push(`Message: ${data.error.message}`);

  if (data.error.stack) {
    lines.push("");
    lines.push("=== Stack Trace ===");
    lines.push(data.error.stack);
  }

  if (data.error.cause) {
    lines.push("");
    lines.push("=== Cause ===");
    lines.push(
      typeof data.error.cause === "string"
        ? data.error.cause
        : JSON.stringify(data.error.cause, null, 2),
    );
  }

  lines.push("");
  lines.push("=== End of Trace ===");

  return lines.join("\n");
}
