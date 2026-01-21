import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
import {
  BREWFILE_TEMPLATE,
  PACKAGES_ARCH_TEMPLATE,
  PACKAGES_DEBIAN_TEMPLATE,
} from "../templates";
import { contractHome, expandHome } from "../utils/paths";

export async function newCommand() {
  p.intro("Initialize Agent Config Repository");

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
      p.cancel(`Failed to create directory: ${error}`);
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

  const includeDotfiles = await p.confirm({
    message: "Include dotfiles management? (zsh, bash, ghostty, tmux)",
    initialValue: false,
  });

  if (p.isCancel(includeDotfiles)) {
    p.cancel("Initialization cancelled.");
    return;
  }

  const s = p.spinner();
  s.start("Setting up repository structure and importing configs");

  try {
    const configsDir = join(repoPath, "configs");
    mkdirSync(configsDir, { recursive: true });

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
      try {
        writeFileSync(template.target, template.content, "utf-8");
        s.message(`Added ${template.label}`);
      } catch (_error) {
        s.message(`Warning: Failed to add ${template.label}`);
      }
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

    if (includeDotfiles) {
      mkdirSync(join(configsDir, "dotfiles"), { recursive: true });
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

# Clone this repo
git clone ${remote || "<your-repo-url>"} ~/agent-configs

# Sync configs (creates symlinks)
cd ~/agent-configs
syncode sync
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

${includeDotfiles ? "\n## Dotfiles\n\n- Shell configs (.zshrc, .bashrc)\n- Terminal configs (ghostty, tmux)" : ""}

## Usage

\`\`\`bash
# Check status
syncode status

# Sync changes
syncode sync

# Push to remote
git add .
git commit -m "Update configs"
git push
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
    p.cancel(`Error: ${error}`);
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
${includeDotfiles ? "Dotfiles: ✓ Enabled" : ""}

Next steps:
  • Edit configs in ${contractHome(repoPath)}/configs/
  • Changes are synced automatically via symlinks
  • Run 'syncode sync' to apply changes to your system
  ${remote ? `• Push to GitHub: cd ${contractHome(repoPath)} && git push -u origin main` : ""}`,
    );
  } catch (error) {
    p.cancel(`Failed to create configuration: ${error}`);
  }
}
