import * as p from "@clack/prompts";
import { adapterRegistry } from "../adapters/registry";
import type { Platform } from "../adapters/types";
import { getAgentMetadata, isAgentInstalled } from "../agents";
import { getConfig } from "../config/manager";
import { getNewConfigsAvailable } from "../config/migrations";
import type { GlobalConfig } from "../config/types";
import { exists } from "../utils/fs";
import { getGitStatus, hasChanges } from "../utils/git";
import { contractHome, expandHome } from "../utils/paths";
import { getPlatformName } from "../utils/platform";
import { machineStatusCommand } from "./machine/status";

function createAsciiTable(rows: string[][], headers?: string[]): string {
  const allRows = headers ? [headers, ...rows] : rows;

  // Calculate column widths
  const colWidths = allRows[0].map((_, colIndex) =>
    Math.max(...allRows.map((row) => row[colIndex]?.length || 0))
  );

  // Create separator line
  const separator = `+${colWidths.map((w) => "-".repeat(w + 2)).join("+")}+`;

  // Format rows
  const formattedRows = allRows.map((row, rowIndex) => {
    const cells = row.map((cell, colIndex) =>
      ` ${cell.padEnd(colWidths[colIndex])} `
    );
    const line = `|${cells.join("|")}|`;

    if (headers && rowIndex === 0) {
      return `${separator}\n${line}\n${separator}`;
    }
    return line;
  });

  return `${headers ? "" : separator + "\n"}${formattedRows.join("\n")}\n${separator}`;
}

export async function statusCommand() {
  p.intro("Agent Config Status");

  let config: GlobalConfig;
  try {
    config = getConfig();
  } catch (_error) {
    p.cancel(
      "Configuration not found. Run 'syncode new' or 'syncode init' first.",
    );
    return;
  }

  const repoPath = expandHome(config.repoPath);

  // Repository info table
  const repoInfoRows: string[][] = [
    ["Platform", getPlatformName()],
    ["Repository", contractHome(repoPath)],
  ];

  if (config.remote) {
    repoInfoRows.push(["Remote", config.remote]);
  }

  console.log(createAsciiTable(repoInfoRows));
  console.log("");

  if (config.agents.length === 0) {
    p.log.warn("No agents configured");
  } else {
    const agentRows: string[][] = [];
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
        agentRows.push(["⚠️", agentId, "unknown agent", ""]);
        continue;
      }

      const displayName = metadata?.displayName || adapter?.name || agentId;

      if (!adapter) {
        const installed = isAgentInstalled(agentId, platform);
        const icon = installed ? "📋" : "○";
        const statusText = installed ? "detected" : "not found";
        agentRows.push([icon, displayName, statusText, "metadata only"]);
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
          adapter.syncStrategy.export === "symlink" ? "symlink" : "copy";
      } else if (existsInRepo && existsOnSystem) {
        icon = "✓";
        statusText = "synced";
        syncMethod =
          adapter.syncStrategy.export === "symlink" ? "symlink" : "copy";
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

      agentRows.push([icon, displayName, statusText, syncMethod]);
    }

    console.log(createAsciiTable(agentRows, ["", "Agent", "Status", "Method"]));
  }

  console.log("");

  // Git status table
  if (await hasChanges()) {
    const gitStatus = await getGitStatus();
    const gitStatusRows: string[][] = [["Git", "Uncommitted changes"]];
    console.log(createAsciiTable(gitStatusRows));
    if (gitStatus) {
      console.log(
        gitStatus
          .split("\n")
          .map((line) => `   ${line}`)
          .join("\n"),
      );
      console.log("");
    }
  } else {
    const gitStatusRows: string[][] = [["Git", "Clean"]];
    console.log(createAsciiTable(gitStatusRows));
  }

  const newConfigs = getNewConfigsAvailable();
  if (newConfigs.length > 0) {
    const names = newConfigs
      .map((id) => getAgentMetadata(id)?.displayName || id)
      .join(", ");
    console.log("");
    const newConfigRows: string[][] = [
      ["💡 New config available", names],
      ["Action", "Run 'syncode sync' to add it to your config"],
    ];
    console.log(createAsciiTable(newConfigRows));
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
