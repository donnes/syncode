import { execSync } from "child_process";

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function exec(command: string): Promise<ExecResult> {
  try {
    const stdout = execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return {
      success: true,
      stdout: stdout.trim(),
      stderr: "",
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout?.toString().trim() ?? "",
      stderr: error.stderr?.toString().trim() ?? error.message,
      exitCode: error.status ?? 1,
    };
  }
}

export async function execLive(command: string): Promise<boolean> {
  try {
    execSync(command, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

export async function commandExists(command: string): Promise<boolean> {
  const result = await exec(`which ${command}`);
  return result.success;
}
