import * as p from "@clack/prompts";
import { adapterRegistry } from "../adapters/registry";
import type { Platform } from "../adapters/types";
import { getAgentMetadata, isAgentInstalled } from "../agents";
import { getConfig } from "../config/manager";
import type { GlobalConfig } from "../config/types";
import { exists } from "../utils/fs";
import { getGitStatus, hasChanges } from "../utils/git";
import { contractHome, expandHome } from "../utils/paths";
import { getPlatformName } from "../utils/platform";
import { machineStatusCommand } from "./machine/status";

export async function statusCommand() {
  p.intro("Agent Config Status");

  let config: GlobalConfig;
  try {
    config = getConfig();
  } catch (_error) {
    p.cancel("Configuration not found. Run 'syncode new' first.");
    return;
  }

  const repoPath = expandHome(config.repoPath);

  p.log.info(`Platform: ${getPlatformName()}`);
  p.log.info(`Repository: ${contractHome(repoPath)}`);
  if (config.remote) {
    p.log.info(`Remote: ${config.remote}`);
  }

  console.log("");

  if (config.agents.length === 0) {
    p.log.warn("No agents configured");
  } else {
    const statusLines: string[] = [];
    const platform: Platform =
      process.platform === "darwin"
        ? "macos"
        : process.platform === "win32"
          ? "windows"
          : "linux";

    for (const agentId of config.agents) {
      const adapter = adapterRegistry.get(agentId);
      const metadata = getAgentMetadata(agentId);

      if (!adapter && !metadata) {
        statusLines.push(`⚠️  ${agentId.padEnd(12)} unknown agent`);
        continue;
      }

      const displayName = metadata?.displayName || adapter?.name || agentId;

      if (!adapter) {
        const installed = isAgentInstalled(agentId, platform);
        const icon = installed ? "📋" : "○";
        const statusText = installed ? "detected" : "not found";
        statusLines.push(
          `${icon}  ${displayName.padEnd(15)} ${statusText.padEnd(16)} (metadata only)`,
        );
        continue;
      }

      const systemPath = adapter.getConfigPath(platform);
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
        syncMethod =
          adapter.syncStrategy.export === "symlink" ? "(symlink)" : "(copy)";
      } else if (existsInRepo && existsOnSystem) {
        icon = "✓";
        statusText = "synced";
        syncMethod =
          adapter.syncStrategy.export === "symlink" ? "(symlink)" : "(copy)";
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

      statusLines.push(
        `${icon}  ${displayName.padEnd(15)} ${statusText.padEnd(16)} ${syncMethod}`,
      );
    }

    p.log.message(statusLines.join("\n"));
  }

  console.log("");

  if (await hasChanges()) {
    p.log.warning("Git: Uncommitted changes");
    const gitStatus = await getGitStatus();
    if (gitStatus) {
      console.log(
        gitStatus
          .split("\n")
          .map((line) => `   ${line}`)
          .join("\n"),
      );
    }
  } else {
    p.log.success("Git: Clean");
  }

  const runMachineStatus = await p.confirm({
    message: "Run full machine status?",
    initialValue: false,
  });

  if (!p.isCancel(runMachineStatus) && runMachineStatus) {
    console.log("");
    await machineStatusCommand({ skipIntro: true });
    return;
  }

  p.outro("Done");
}
