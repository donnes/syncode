import { existsSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { getConfig } from "../../config/manager";
import { contractHome, expandHome, getConfigsDir } from "../../utils/paths";
import {
  getPackageManager,
  getPlatformName,
  isArch,
  isDebian,
  isLinux,
  isMacOS,
} from "../../utils/platform";
import { exec } from "../../utils/shell";

export async function machineStatusCommand(options?: { skipIntro?: boolean }) {
  if (!options?.skipIntro) {
    p.intro("Machine Status");
  }

  let repoPath: string;
  try {
    const config = getConfig();
    repoPath = expandHome(config.repoPath);
  } catch (_error) {
    p.cancel("Configuration not found. Run 'syncode new' first.");
    return;
  }

  p.log.info(`Platform: ${getPlatformName()}`);
  p.log.info(`Repository: ${contractHome(repoPath)}`);

  const packageManager = getPackageManager();
  if (packageManager) {
    p.log.info(`Package manager: ${packageManager}`);
  } else {
    p.log.warning("Package manager: not detected");
  }

  console.log("");

  if (!existsSync(repoPath)) {
    p.log.warning("Repository path not found");
    p.outro("Done");
    return;
  }

  const gitStatus = await exec(`git -C "${repoPath}" status --short`);
  if (!gitStatus.success) {
    p.log.warning("Git: not a repository");
  } else if (gitStatus.stdout.length === 0) {
    p.log.success("Git: clean");
  } else {
    p.log.warning("Git: uncommitted changes");
    console.log(
      gitStatus.stdout
        .split("\n")
        .map((line) => `   ${line}`)
        .join("\n"),
    );
  }

  const dotfilesDir = join(getConfigsDir(), "dotfiles");
  if (existsSync(dotfilesDir)) {
    p.log.info("Dotfiles: present in repo");
  } else {
    p.log.info("Dotfiles: not found in repo");
  }

  console.log("");

  if (isMacOS) {
    reportDependencyFile("Brewfile", repoPath, ["Brewfile"]);
  } else if (isLinux && isArch()) {
    reportDependencyFile("packages-arch.txt", repoPath, [
      "packages-arch.txt",
      "packages.txt",
    ]);
  } else if (isLinux && isDebian()) {
    reportDependencyFile("packages-debian.txt", repoPath, [
      "packages-debian.txt",
    ]);
  }

  p.outro("Done");
}

function reportDependencyFile(
  label: string,
  repoPath: string,
  candidates: string[],
) {
  const filePath = resolveDependencyFile(repoPath, candidates);
  if (filePath) {
    p.log.success(`${label}: ${contractHome(filePath)}`);
  } else {
    p.log.warning(`${label}: not found`);
  }
}

function resolveDependencyFile(
  repoPath: string,
  candidates: string[],
): string | null {
  for (const candidate of candidates) {
    const fullPath = candidate.startsWith("/")
      ? candidate
      : join(repoPath, candidate);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}
