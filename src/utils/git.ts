import { getRepoRoot } from "./paths";
import { exec } from "./shell";

export async function isGitRepo(): Promise<boolean> {
  const repoRoot = getRepoRoot();
  const result = await exec(
    `git -C "${repoRoot}" rev-parse --is-inside-work-tree`,
  );
  return result.success;
}

export async function getGitStatus(): Promise<string> {
  const repoRoot = getRepoRoot();
  const result = await exec(`git -C "${repoRoot}" status --short`);
  return result.stdout;
}

export async function hasChanges(): Promise<boolean> {
  const status = await getGitStatus();
  return status.length > 0;
}

export async function getUntrackedFiles(): Promise<string[]> {
  const repoRoot = getRepoRoot();
  const result = await exec(
    `git -C "${repoRoot}" ls-files --others --exclude-standard`,
  );
  if (!result.success || !result.stdout) return [];
  return result.stdout.split("\n").filter(Boolean);
}

export async function getModifiedFiles(): Promise<string[]> {
  const repoRoot = getRepoRoot();
  const result = await exec(`git -C "${repoRoot}" diff --name-only`);
  if (!result.success || !result.stdout) return [];
  return result.stdout.split("\n").filter(Boolean);
}

export async function getStagedFiles(): Promise<string[]> {
  const repoRoot = getRepoRoot();
  const result = await exec(`git -C "${repoRoot}" diff --cached --name-only`);
  if (!result.success || !result.stdout) return [];
  return result.stdout.split("\n").filter(Boolean);
}

export async function stageAll(): Promise<boolean> {
  const repoRoot = getRepoRoot();
  const result = await exec(`git -C "${repoRoot}" add -A`);
  return result.success;
}

export async function stageFiles(files: string[]): Promise<boolean> {
  if (files.length === 0) return true;
  const repoRoot = getRepoRoot();
  const fileList = files.map((f) => `"${f}"`).join(" ");
  const result = await exec(`git -C "${repoRoot}" add ${fileList}`);
  return result.success;
}

export async function commit(message: string): Promise<boolean> {
  const repoRoot = getRepoRoot();
  const result = await exec(`git -C "${repoRoot}" commit -m "${message}"`);
  return result.success;
}

export async function push(): Promise<{ success: boolean; message: string }> {
  const repoRoot = getRepoRoot();
  const result = await exec(`git -C "${repoRoot}" push`);
  if (result.success) {
    return { success: true, message: "Pushed to remote" };
  }
  return { success: false, message: result.stderr || "Push failed" };
}

export async function getCurrentBranch(): Promise<string> {
  const repoRoot = getRepoRoot();
  const result = await exec(`git -C "${repoRoot}" branch --show-current`);
  return result.stdout || "unknown";
}

export async function getRemoteUrl(): Promise<string | null> {
  const repoRoot = getRepoRoot();
  const result = await exec(`git -C "${repoRoot}" remote get-url origin`);
  return result.success ? result.stdout : null;
}

export async function getDiff(file?: string): Promise<string> {
  const repoRoot = getRepoRoot();
  const fileArg = file ? ` -- "${file}"` : "";
  const result = await exec(`git -C "${repoRoot}" diff${fileArg}`);
  return result.stdout;
}

export async function getDiffCached(file?: string): Promise<string> {
  const repoRoot = getRepoRoot();
  const fileArg = file ? ` -- "${file}"` : "";
  const result = await exec(`git -C "${repoRoot}" diff --cached${fileArg}`);
  return result.stdout;
}
