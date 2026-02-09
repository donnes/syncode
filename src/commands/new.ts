import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { adapterRegistry } from "../adapters/registry";
import type { Platform } from "../adapters/types";
import {
  detectInstalledAgents,
  ensureSharedSkillsAgent,
  getAgentMetadata,
  getAgentsWithAdapters,
  usesSharedSkills,
} from "../agents";
import { configExists, getConfig, initConfig } from "../config/manager";
import { SUPPORTED_AGENTS } from "../config/types";
import {
  BREWFILE_TEMPLATE,
  PACKAGES_ARCH_TEMPLATE,
  PACKAGES_DEBIAN_TEMPLATE,
} from "../templates";
import { contractHome, expandHome } from "../utils/paths";

export async function newCommand() {
  p.intro("Initialize Agent Config Repository");

  if (configExists()) {
    const existingConfig = getConfig();
    const overwrite = await p.select({
      message: `Configuration already exists at ~/.syncode/config.json (current repo: ${contractHome(expandHome(existingConfig.repoPath))}).`,
      options: [
        {
          value: "replace",
          label: "Replace and continue",
          hint: "You can choose a new repo path next",
        },
        {
          value: "cancel",
          label: "Cancel",
          hint: "Keep current configuration",
        },
      ],
    });

    if (p.isCancel(overwrite) || overwrite !== "replace") {
      p.cancel("Initialization cancelled.");
      return;
    }
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
  } else {
    try {
      mkdirSync(repoPath, { recursive: true });
    } catch (error) {
      const { logError, getErrorLogFile } = require("../utils/trace");
      const logFile = logError(error);
      p.cancel(
        `Failed to create directory: ${error}\n${getErrorLogFile(logFile)}`,
      );
      return;
    }
  }

  const gitDir = join(repoPath, ".git");
  let isNewRepo = false;
  if (!existsSync(gitDir)) {
    try {
      execSync("git init", { cwd: repoPath, stdio: "pipe" });
      isNewRepo = true;
      p.log.success("✓ Initialized git repository");
    } catch (_error) {
      p.log.warn("Failed to initialize git repository");
    }
  }

  let remote: string | undefined;
  if (isNewRepo) {
    const remoteInput = await p.text({
      message: "Add GitHub remote? (optional, press Enter to skip)",
      placeholder: "https://github.com/<username>/configs.git",
    });

    if (p.isCancel(remoteInput)) {
      p.cancel("Initialization cancelled.");
      return;
    }

    if (remoteInput) {
      remote = remoteInput;
      try {
        execSync(`git remote add origin "${remote}"`, {
          cwd: repoPath,
          stdio: "pipe",
        });
        p.log.success(`✓ Added remote: ${remote}`);
      } catch (_error) {
        p.log.warn("Failed to add remote (you can add it later)");
      }
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
    initialValues: detectedAgents, // Pre-select detected agents
    required: false,
  });

  if (p.isCancel(agentsInput)) {
    p.cancel("Initialization cancelled.");
    return;
  }

  let selectedAgents = agentsInput as string[];
  const expandedAgents = ensureSharedSkillsAgent(selectedAgents);
  if (
    expandedAgents.length > selectedAgents.length &&
    selectedAgents.some(usesSharedSkills)
  ) {
    p.log.info("Including Shared Agents (.agents) for shared skills");
  }
  selectedAgents = expandedAgents;

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

  const s = p.spinner();
  s.start("Setting up repository structure and importing configs");

  try {
    const configsDir = join(repoPath, "configs");
    mkdirSync(configsDir, { recursive: true });

    if (selectedAgents.includes("agents")) {
      mkdirSync(join(repoPath, ".agents", "skills"), { recursive: true });
    }

    const templateFiles = [
      {
        label: "Brewfile",
        target: join(repoPath, "Brewfile"),
        content: BREWFILE_TEMPLATE,
      },
      {
        label: "packages-arch.txt",
        target: join(repoPath, "packages-arch.txt"),
        content: PACKAGES_ARCH_TEMPLATE,
      },
      {
        label: "packages-debian.txt",
        target: join(repoPath, "packages-debian.txt"),
        content: PACKAGES_DEBIAN_TEMPLATE,
      },
    ];

    for (const template of templateFiles) {
      if (existsSync(template.target)) {
        continue;
      }
      writeFileSync(template.target, template.content, "utf-8");
      s.message(`Added ${template.label}`);
    }

    for (const agentId of selectedAgents) {
      const adapter = adapterRegistry.get(agentId);
      if (!adapter) {
        const metadata = getAgentMetadata(agentId);
        if (metadata) {
          s.message(`${metadata.displayName}: metadata only, no import needed`);
        }
        continue;
      }

      const systemPath = adapter.getConfigPath(platform);
      const agentRepoPath = adapter.getRepoPath(repoPath);

      try {
        const result = await adapter.import(systemPath, agentRepoPath);
        if (result.success) {
          s.message(`Imported ${adapter.name} configs`);
        }
      } catch (_error) {
        s.message(`Warning: Failed to import ${adapter.name} configs`);
      }
    }

    const gitignoreContent = `# macOS
.DS_Store

# Editor
.vscode/
.idea/

# Temporary
*.tmp
*.bak
*.backup

# Node modules (if any configs have dependencies)
node_modules/
`;
    writeFileSync(join(repoPath, ".gitignore"), gitignoreContent);

    const readmeContent = `# Agent Config Repository

Managed by [syncode](https://github.com/donnes/syncode)

## Setup on New Machine

\`\`\`bash
# Install syncode
npm install -g @donnes/syncode
# Or using bun
bun install -g @donnes/syncode

# Initialize from existing repo
syncode init
# When prompted, enter repo URL: ${remote || "<your-repo-url>"}

# Sync configs (creates symlinks)
syncode sync
# Select "Export"
\`\`\`

## Synced Agents

${selectedAgents
  .map((id) => {
    const adapter = adapterRegistry.get(id);
    const name = adapter ? adapter.name : id;
    const strategy = adapter?.syncStrategy.export || "symlink";
    return `- **${name}** (${strategy})`;
  })
  .join("\n")}

${selectedAgents.includes("dotfiles") ? "\n## Dotfiles\n\n- Shell configs (.zshrc, .bashrc)\n- Terminal configs (ghostty, tmux)" : ""}

## Usage

\`\`\`bash
# Check status
syncode status

# Sync changes
syncode sync

# Push to remote
syncode push
\`\`\`
`;
    writeFileSync(join(repoPath, "README.md"), readmeContent);

    if (isNewRepo) {
      execSync("git add .", { cwd: repoPath, stdio: "pipe" });
      execSync('git commit -m "Initial commit: Add agent configs"', {
        cwd: repoPath,
        stdio: "pipe",
      });
      s.message("Created initial commit");
    }

    s.stop("Repository structure created");
  } catch (error) {
    s.stop("Failed to create repository structure");
    const { logError, getErrorLogFile } = require("../utils/trace");
    const logFile = logError(error);
    p.cancel(`Error: ${error}\n${getErrorLogFile(logFile)}`);
    return;
  }

  try {
    const _config = initConfig({
      repoPath: repoPathInput, // Store as entered (with ~ if used)
      remote,
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
      `✓ Agent config repository initialized!

Repository: ${contractHome(repoPath)}
Configuration: ~/.syncode/config.json
Agents: ${agentList}
${selectedAgents.includes("dotfiles") ? "Dotfiles: ✓ Enabled" : ""}

Next steps:
  • Edit configs in ${contractHome(repoPath)}/configs/
  • Changes are synced automatically via symlinks
  • Run 'syncode sync' to apply changes to your system
  • Run 'syncode push' to commit and push changes`,
    );
  } catch (error) {
    const { logError, getErrorLogFile } = require("../utils/trace");
    const logFile = logError(error);
    p.cancel(
      `Failed to create configuration: ${error}\n${getErrorLogFile(logFile)}`,
    );
  }
}
