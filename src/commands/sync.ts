/**
 * Sync agent configs between system and repository
 */

import * as p from "@clack/prompts";
import { adapterRegistry } from "../adapters/registry";
import type { Platform } from "../adapters/types";
import { getConfig } from "../config/manager";
import { checkAndMigrateConfig } from "../config/migrations";
import type { GlobalConfig } from "../config/types";

export async function syncCommand() {
  p.intro("Sync Agent Configs");

  await checkAndMigrateConfig();

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

  const platform: Platform =
    process.platform === "darwin"
      ? "macos"
      : process.platform === "win32"
        ? "windows"
        : "linux";

  const agentOptions = config.agents.map((agentId) => {
    const adapter = adapterRegistry.get(agentId);
    const label = adapter?.name || agentId;
    return {
      value: agentId,
      label,
      hint: adapter ? undefined : "No adapter found",
    };
  });

  // Ask if user wants to select all agents
  const selectAll = await p.confirm({
    message: `${direction === "import" ? "Import" : "Export"} all agents?`,
    initialValue: true,
  });

  if (p.isCancel(selectAll)) {
    p.cancel("Cancelled");
    return;
  }

  let selectedAgents: string[] | symbol;

  if (selectAll) {
    selectedAgents = config.agents;
  } else {
    selectedAgents = await p.multiselect({
      message: `Select agents to ${direction === "import" ? "import" : "export"}`,
      options: agentOptions,
      initialValues: [],
      required: false,
    });

    if (p.isCancel(selectedAgents)) {
      p.cancel("Cancelled");
      return;
    }
  }

  if ((selectedAgents as string[]).length === 0) {
    p.cancel("No agents selected");
    return;
  }

  const s = p.spinner();
  s.start(
    `${direction === "import" ? "Importing" : "Exporting"} ${(selectedAgents as string[]).length} agent(s)`,
  );

  const repoPath = config.repoPath.startsWith("~")
    ? config.repoPath.replace("~", process.env.HOME || "")
    : config.repoPath;

  let successCount = 0;
  let failCount = 0;
  const errors: Array<{ agent: string; error: string }> = [];

  for (const agentId of selectedAgents as string[]) {
    const adapter = adapterRegistry.get(agentId);
    if (!adapter) {
      const errorMsg = "Adapter not found";
      s.message(`✗ ${agentId}: ${errorMsg}`);
      errors.push({ agent: agentId, error: errorMsg });
      failCount++;
      continue;
    }

    const systemPath = adapter.getConfigPath(platform);
    const agentRepoPath = adapter.getRepoPath(repoPath);

    try {
      if (direction === "import") {
        const result = await adapter.import(systemPath, agentRepoPath);
        if (result.success) {
          s.message(`✓ Imported ${adapter.name}`);
          successCount++;
        } else {
          s.message(`✗ ${adapter.name}: ${result.message}`);
          errors.push({ agent: adapter.name, error: result.message || "Unknown error" });
          failCount++;
        }
      } else {
        const result = await adapter.export(agentRepoPath, systemPath);
        if (result.success) {
          s.message(`✓ Exported ${adapter.name}`);
          successCount++;
        } else {
          s.message(`✗ ${adapter.name}: ${result.message}`);
          errors.push({ agent: adapter.name, error: result.message || "Unknown error" });
          failCount++;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      s.message(`✗ ${adapter.name}: ${errorMsg}`);
      errors.push({ agent: adapter.name, error: errorMsg });
      failCount++;
    }
  }

  s.stop(`Sync complete: ${successCount} succeeded, ${failCount} failed`);

  if (errors.length > 0) {
    console.log("");
    p.log.error("Failed agents:");
    for (const { agent, error } of errors) {
      p.log.message(`  ✗ ${agent}: ${error}`);
    }
  }

  p.outro(
    direction === "import"
      ? "Configs imported to repository. Commit and push to sync across machines."
      : "Configs exported to system. Your agents are now synced!",
  );
}
