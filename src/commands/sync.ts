/**
 * Sync agent configs between system and repository
 */

import * as p from "@clack/prompts";
import { getConfig } from "../config/manager";
import { adapterRegistry } from "../adapters/registry";

export async function syncCommand() {
  p.intro("Sync Agent Configs");

  // Get configuration
  let config;
  try {
    config = getConfig();
  } catch (error) {
    p.cancel("Configuration not found. Run 'config-sync new' first.");
    return;
  }

  if (config.agents.length === 0) {
    p.cancel("No agents configured. Run 'config-sync new' to set up agents.");
    return;
  }

  // Select direction
  const direction = await p.select({
    message: "Sync direction",
    options: [
      {
        value: "import",
        label: "Import (system → repo)",
        hint: "Copy configs from system to repo",
      },
      {
        value: "export",
        label: "Export (repo → system)",
        hint: "Sync configs from repo to system",
      },
    ],
  });

  if (p.isCancel(direction)) {
    p.cancel("Cancelled");
    return;
  }

  // Perform sync
  const s = p.spinner();
  s.start(`${direction === "import" ? "Importing" : "Exporting"} agent configs`);

  const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : "linux";
  const repoPath = config.repoPath.startsWith("~")
    ? config.repoPath.replace("~", process.env.HOME || "")
    : config.repoPath;

  let successCount = 0;
  let failCount = 0;

  for (const agentId of config.agents) {
    const adapter = adapterRegistry.get(agentId);
    if (!adapter) {
      s.message(`Warning: Adapter not found for ${agentId}`);
      failCount++;
      continue;
    }

    const systemPath = adapter.getConfigPath(platform as any);
    const agentRepoPath = adapter.getRepoPath(repoPath);

    try {
      if (direction === "import") {
        const result = await adapter.import(systemPath, agentRepoPath);
        if (result.success) {
          s.message(`✓ Imported ${adapter.name}`);
          successCount++;
        } else {
          s.message(`✗ Failed to import ${adapter.name}: ${result.message}`);
          failCount++;
        }
      } else {
        const result = await adapter.export(agentRepoPath, systemPath);
        if (result.success) {
          s.message(`✓ Exported ${adapter.name}`);
          successCount++;
        } else {
          s.message(`✗ Failed to export ${adapter.name}: ${result.message}`);
          failCount++;
        }
      }
    } catch (error) {
      s.message(`✗ Error syncing ${adapter.name}: ${error}`);
      failCount++;
    }
  }

  s.stop(`Sync complete: ${successCount} succeeded, ${failCount} failed`);

  p.outro(
    direction === "import"
      ? "Configs imported to repository. Commit and push to sync across machines."
      : "Configs exported to system. Your agents are now synced!"
  );
}
