import { copyFileSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import * as p from "@clack/prompts";
import { adapterRegistry } from "../adapters/registry";
import type { Platform } from "../adapters/types";
import { ensureSharedSkillsAgent, usesSharedSkills } from "../agents";
import { getConfig } from "../config/manager";
import type { GlobalConfig } from "../config/types";
import {
  copyDir,
  ensureDir,
  exists,
  isDirectory,
  isSymlink,
  removeDir,
} from "../utils/fs";
import { expandHome } from "../utils/paths";

function copyDirReplacingSymlinks(src: string, dest: string): void {
  ensureDir(dest);
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      if (isSymlink(destPath)) {
        unlinkSync(destPath);
      } else if (exists(destPath) && !isDirectory(destPath)) {
        unlinkSync(destPath);
      }

      ensureDir(destPath);
      copyDirReplacingSymlinks(srcPath, destPath);
      continue;
    }

    if (isSymlink(destPath)) {
      unlinkSync(destPath);
    } else if (exists(destPath) && isDirectory(destPath)) {
      removeDir(destPath);
    }

    ensureDir(dirname(destPath));
    copyFileSync(srcPath, destPath);
  }
}

function unsyncSymlinkedConfig(repoPath: string, systemPath: string): boolean {
  if (!exists(repoPath) || !isDirectory(repoPath)) {
    return false;
  }

  if (isSymlink(systemPath)) {
    unlinkSync(systemPath);
    copyDir(repoPath, systemPath);
    return true;
  }

  ensureDir(systemPath);
  copyDirReplacingSymlinks(repoPath, systemPath);
  return true;
}

export async function unsyncCommand() {
  p.intro("Unsync Agent Configs");

  let config: GlobalConfig;
  try {
    config = getConfig();
  } catch (_error) {
    p.cancel(
      "Configuration not found. Run 'syncode new' or 'syncode init' first.",
    );
    return;
  }

  if (config.agents.length === 0) {
    p.cancel(
      "No agents configured. Run 'syncode new' or 'syncode init' to set up agents.",
    );
    return;
  }

  let agentsToUnsync = config.agents;
  const expandedAgents = ensureSharedSkillsAgent(agentsToUnsync);
  if (
    expandedAgents.length > agentsToUnsync.length &&
    agentsToUnsync.some(usesSharedSkills)
  ) {
    p.log.info("Including Shared Agents (.agents) for shared skills");
  }
  agentsToUnsync = expandedAgents;

  const platform: Platform =
    process.platform === "darwin"
      ? "macos"
      : process.platform === "win32"
        ? "windows"
        : "linux";
  const repoPath = expandHome(config.repoPath);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  const s = p.spinner();
  s.start("Removing config symlinks");

  for (const agentId of agentsToUnsync) {
    const adapter = adapterRegistry.get(agentId);
    if (!adapter) {
      s.message(`Warning: Adapter not found for ${agentId}`);
      failCount++;
      continue;
    }

    if (adapter.syncStrategy.export !== "symlink") {
      s.message(`↷ ${adapter.name} uses copy strategy - skipped`);
      skipCount++;
      continue;
    }

    const systemPath = adapter.getConfigPath(platform);
    const agentRepoPath = adapter.getRepoPath(repoPath);

    if (!adapter.isLinked(systemPath, agentRepoPath)) {
      s.message(`↷ ${adapter.name} is not linked - skipped`);
      skipCount++;
      continue;
    }

    try {
      const success = unsyncSymlinkedConfig(agentRepoPath, systemPath);
      if (success) {
        s.message(`✓ Unsynced ${adapter.name}`);
        successCount++;
      } else {
        s.message(
          `✗ Failed to unsync ${adapter.name}: configs not found in repo`,
        );
        failCount++;
      }
    } catch (error) {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      const { logError } = require("../utils/trace");
      logError(errorObj, "unsync");
      s.message(`✗ Error unsyncing ${adapter.name}: ${error}`);
      failCount++;
    }
  }

  s.stop(
    `Unsync complete: ${successCount} succeeded, ${skipCount} skipped, ${failCount} failed`,
  );

  p.outro("Symlinks removed. Configs now live on your machine.");
}
