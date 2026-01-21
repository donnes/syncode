/**
 * Show status of agent configs
 */

import * as p from "@clack/prompts";
import { getConfig } from "../config/manager";
import { getPlatformName } from "../utils/platform";
import { contractHome, expandHome } from "../utils/paths";
import { hasChanges, getGitStatus } from "../utils/git";
import { adapterRegistry } from "../adapters/registry";
import { exists } from "../utils/fs";

export async function statusCommand() {
  p.intro("Agent Config Status");

  // Get configuration
  let config;
  try {
    config = getConfig();
  } catch (error) {
    p.cancel("Configuration not found. Run 'config-sync new' first.");
    return;
  }

  const repoPath = expandHome(config.repoPath);

  // Platform info
  p.log.info(`Platform: ${getPlatformName()}`);
  p.log.info(`Repository: ${contractHome(repoPath)}`);
  if (config.remote) {
    p.log.info(`Remote: ${config.remote}`);
  }

  console.log("");

  // Agent status
  if (config.agents.length === 0) {
    p.log.warn("No agents configured");
  } else {
    const statusLines: string[] = [];
    const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : "linux";

    for (const agentId of config.agents) {
      const adapter = adapterRegistry.get(agentId);
      if (!adapter) {
        statusLines.push(`⚠️  ${agentId.padEnd(12)} adapter not found`);
        continue;
      }

      const systemPath = adapter.getConfigPath(platform as any);
      const agentRepoPath = adapter.getRepoPath(repoPath);

      const existsInRepo = exists(agentRepoPath);
      const existsOnSystem = exists(systemPath);
      const isLinked = adapter.isLinked(systemPath, agentRepoPath);

      let icon: string;
      let statusText: string;
      let syncMethod = "";

      if (isLinked) {
        icon = "🔗";
        statusText = "linked";
        syncMethod = adapter.syncStrategy.export === "symlink" ? "(symlink)" : "(copy)";
      } else if (existsInRepo && existsOnSystem) {
        icon = "✓";
        statusText = "synced";
        syncMethod = adapter.syncStrategy.export === "symlink" ? "(symlink)" : "(copy)";
      } else if (existsInRepo && !existsOnSystem) {
        icon = "📦";
        statusText = "in repo only";
      } else if (!existsInRepo && existsOnSystem) {
        icon = "💻";
        statusText = "on system only";
      } else {
        icon = "○";
        statusText = "not found";
      }

      statusLines.push(`${icon}  ${adapter.name.padEnd(15)} ${statusText.padEnd(16)} ${syncMethod}`);
    }

    p.log.message(statusLines.join("\n"));
  }

  console.log("");

  // Git status
  try {
    // Import REPO_ROOT from paths, but override with config repoPath
    const { REPO_ROOT } = require("../utils/paths");
    // Temporarily set REPO_ROOT for git operations
    if (await hasChanges()) {
      p.log.warning("Git: Uncommitted changes");
      const gitStatus = await getGitStatus();
      if (gitStatus) {
        console.log(gitStatus.split("\n").map(l => `   ${l}`).join("\n"));
      }
    } else {
      p.log.success("Git: Clean");
    }
  } catch (error) {
    p.log.info("Git: Not a repository");
  }

  p.outro("Done");
}
