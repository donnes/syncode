import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import * as p from "@clack/prompts";
import { adapterRegistry } from "../adapters/registry";
import type { Platform } from "../adapters/types";
import {
  detectInstalledAgents,
  getAgentMetadata,
  getAgentsWithAdapters,
} from "../agents";
import { configExists, initConfig } from "../config/manager";
import { SUPPORTED_AGENTS } from "../config/types";
import { contractHome, expandHome } from "../utils/paths";

export async function initCommand() {
  p.intro("Initialize from Existing Repo");

  if (configExists()) {
    const overwrite = await p.confirm({
      message:
        "Configuration already exists at ~/.syncode/config.json. Overwrite?",
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Initialization cancelled.");
      return;
    }
  }

  const repoUrlInput = await p.text({
    message: "Repository URL",
    placeholder: "https://github.com/<username>/configs.git",
    validate: (value) => {
      if (!value) return "Repository URL is required";
      return undefined;
    },
  });

  if (p.isCancel(repoUrlInput)) {
    p.cancel("Initialization cancelled.");
    return;
  }

  const repoPathInput = await p.text({
    message: "Where should the agent configs be stored?",
    placeholder: "~/.syncode/repo",
    initialValue: "~/.syncode/repo",
    validate: (value) => {
      if (!value) return "Repository path is required";
      return undefined;
    },
  });

  if (p.isCancel(repoPathInput)) {
    p.cancel("Initialization cancelled.");
    return;
  }

  const repoPath = expandHome(repoPathInput);

  if (existsSync(repoPath)) {
    const useExisting = await p.confirm({
      message: `Directory ${contractHome(repoPath)} already exists. Use it?`,
      initialValue: true,
    });

    if (p.isCancel(useExisting) || !useExisting) {
      p.cancel("Initialization cancelled.");
      return;
    }

    const gitDir = join(repoPath, ".git");
    if (!existsSync(gitDir)) {
      p.cancel("Directory is not a git repository.");
      return;
    }
  } else {
    try {
      mkdirSync(dirname(repoPath), { recursive: true });
    } catch (error) {
      p.cancel(`Failed to create directory: ${error}`);
      return;
    }

    try {
      execSync(`git clone "${repoUrlInput}" "${repoPath}"`, {
        stdio: "pipe",
      });
      p.log.success("✓ Cloned repository");
    } catch (_error) {
      p.cancel("Failed to clone repository.");
      return;
    }
  }

  const platform: Platform =
    process.platform === "darwin"
      ? "macos"
      : process.platform === "win32"
        ? "windows"
        : "linux";
  const detectedAgents = detectInstalledAgents(platform);
  const agentsWithAdapters = getAgentsWithAdapters();

  const repoAgents = SUPPORTED_AGENTS.filter((id) => {
    const adapter = adapterRegistry.get(id);
    if (!adapter) return false;
    return existsSync(adapter.getRepoPath(repoPath));
  });

  const agentOptions = SUPPORTED_AGENTS.map((id) => {
    const detected = detectedAgents.includes(id);
    const hasAdapter = agentsWithAdapters.includes(id);
    const metadata = getAgentMetadata(id);
    const label =
      metadata?.displayName || id.charAt(0).toUpperCase() + id.slice(1);
    const hint = detected
      ? hasAdapter
        ? "Installed • Full sync"
        : "Installed • Metadata only"
      : hasAdapter
        ? "Not found • Full sync available"
        : "Not found";

    return {
      value: id,
      label: detected ? `${label} (detected ✓)` : label,
      hint,
    };
  });

  const agentsInput = await p.multiselect({
    message: "Which AI agents do you want to sync?",
    options: agentOptions,
    initialValues: repoAgents.length > 0 ? repoAgents : detectedAgents,
    required: false,
  });

  if (p.isCancel(agentsInput)) {
    p.cancel("Initialization cancelled.");
    return;
  }

  const selectedAgents = agentsInput as string[];

  if (selectedAgents.length === 0) {
    p.log.warn(
      "No agents selected. You can add them later by editing ~/.syncode/config.json",
    );
  }

  if (selectedAgents.length > 0) {
    const selectedWithAdapters = selectedAgents.filter((id) =>
      agentsWithAdapters.includes(id),
    );
    const selectedWithoutAdapters = selectedAgents.filter(
      (id) => !agentsWithAdapters.includes(id),
    );

    if (selectedWithAdapters.length > 0) {
      p.log.info("Using smart sync defaults:");
      p.log.info(
        "  • Symlinks: Cursor, OpenCode, Windsurf, VSCode (live sync)",
      );
      p.log.info("  • Copy: Claude Code (preserves cache/history)");
    }

    if (selectedWithoutAdapters.length > 0) {
      const agentNames = selectedWithoutAdapters
        .map((id) => getAgentMetadata(id)?.displayName || id)
        .join(", ");
      p.log.warn(`Note: ${agentNames} - metadata only (no sync adapter yet)`);
    }
  }

  try {
    initConfig({
      repoPath: repoPathInput,
      remote: repoUrlInput,
      agents: selectedAgents,
    });

    const agentList =
      selectedAgents.length > 0
        ? selectedAgents
            .map((id) => {
              const adapter = adapterRegistry.get(id);
              return adapter ? adapter.name : id;
            })
            .join(", ")
        : "none";

    p.outro(
      `✓ Existing repository connected!

Repository: ${contractHome(repoPath)}
Configuration: ~/.syncode/config.json
Agents: ${agentList}

Next steps:
  • Run 'syncode sync' and select "Export"
  • Configs in ${contractHome(repoPath)}/configs will apply to this machine`,
    );
  } catch (error) {
    p.cancel(`Failed to create configuration: ${error}`);
  }
}
