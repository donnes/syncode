/**
 * Initialize a new agent config repository
 */

import * as p from "@clack/prompts";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { initConfig, configExists } from "../config/manager";
import { expandHome, contractHome } from "../utils/paths";
import { SUPPORTED_AGENTS } from "../config/types";
import { adapterRegistry } from "../adapters/registry";

export async function newCommand() {
  p.intro("Initialize Agent Config Repository");

  // Check if config already exists
  if (configExists()) {
    const overwrite = await p.confirm({
      message:
        "Configuration already exists at ~/.config-sync/config.json. Overwrite?",
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Initialization cancelled.");
      return;
    }
  }

  // 1. Directory Setup
  const repoPathInput = await p.text({
    message: "Where should the agent configs be stored?",
    placeholder: "~/agent-configs",
    initialValue: "~/agent-configs",
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

  // Check if directory exists
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
    // Create directory
    try {
      mkdirSync(repoPath, { recursive: true });
    } catch (error) {
      p.cancel(`Failed to create directory: ${error}`);
      return;
    }
  }

  // 2. Git Initialization
  const gitDir = join(repoPath, ".git");
  let isNewRepo = false;
  if (!existsSync(gitDir)) {
    try {
      execSync("git init", { cwd: repoPath, stdio: "pipe" });
      isNewRepo = true;
      p.log.success("✓ Initialized git repository");
    } catch (error) {
      p.log.warn("Failed to initialize git repository");
    }
  }

  // 3. GitHub Remote (Optional)
  let remote: string | undefined;
  if (isNewRepo) {
    const remoteInput = await p.text({
      message: "Add GitHub remote? (optional, press Enter to skip)",
      placeholder: "git@github.com:username/agent-configs.git",
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
      } catch (error) {
        p.log.warn("Failed to add remote (you can add it later)");
      }
    }
  }

  // 4. Agent Selection with Auto-detection
  const detectedAgents: string[] = [];
  for (const agentId of SUPPORTED_AGENTS) {
    const adapter = adapterRegistry.get(agentId);
    if (adapter && "detect" in adapter && typeof adapter.detect === "function") {
      if (adapter.detect()) {
        detectedAgents.push(agentId);
      }
    }
  }

  const agentOptions = SUPPORTED_AGENTS.map((id) => {
    const detected = detectedAgents.includes(id);
    const adapter = adapterRegistry.get(id);
    const label = adapter ? adapter.name : id.charAt(0).toUpperCase() + id.slice(1);
    return {
      value: id,
      label: detected ? `${label} (detected ✓)` : label,
      hint: detected ? "Installed" : "Not found",
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
    p.log.warn("No agents selected. You can add them later by editing ~/.config-sync/config.json");
  }

  // 5. Sync Strategy Info
  if (selectedAgents.length > 0) {
    p.log.info("Using smart sync defaults:");
    p.log.info("  • Symlinks: Cursor, OpenCode, Windsurf, VSCode (live sync)");
    p.log.info("  • Copy: Claude Code (preserves cache/history)");
  }

  // 6. Dotfiles (Optional)
  const includeDotfiles = await p.confirm({
    message: "Include dotfiles management? (zsh, bash, ghostty, tmux)",
    initialValue: false,
  });

  if (p.isCancel(includeDotfiles)) {
    p.cancel("Initialization cancelled.");
    return;
  }

  // 7. Backup & Import
  const s = p.spinner();
  s.start("Setting up repository structure and importing configs");

  try {
    const configsDir = join(repoPath, "configs");
    mkdirSync(configsDir, { recursive: true });

    // Import agent configs
    for (const agentId of selectedAgents) {
      const adapter = adapterRegistry.get(agentId);
      if (!adapter) continue;

      const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : "linux";
      const systemPath = adapter.getConfigPath(platform as any);
      const agentRepoPath = adapter.getRepoPath(repoPath);

      try {
        const result = await adapter.import(systemPath, agentRepoPath);
        if (result.success) {
          s.message(`Imported ${adapter.name} configs`);
        }
      } catch (error) {
        s.message(`Warning: Failed to import ${adapter.name} configs`);
      }
    }

    // Create dotfiles directory if requested
    if (includeDotfiles) {
      mkdirSync(join(configsDir, "dotfiles"), { recursive: true });
    }

    // Create .gitignore
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
    const { writeFileSync } = require("fs");
    writeFileSync(join(repoPath, ".gitignore"), gitignoreContent);

    // Create README
    const readmeContent = `# Agent Config Repository

Managed by [config-sync](https://github.com/donnes/config-sync)

## Setup on New Machine

\`\`\`bash
# Install config-sync
npm install -g @donnes/config-sync

# Clone this repo
git clone ${remote || "<your-repo-url>"} ~/agent-configs

# Sync configs (creates symlinks)
cd ~/agent-configs
config-sync sync
\`\`\`

## Synced Agents

${selectedAgents.map((id) => {
  const adapter = adapterRegistry.get(id);
  const name = adapter ? adapter.name : id;
  const strategy = adapter?.syncStrategy.export || "symlink";
  return `- **${name}** (${strategy})`;
}).join("\n")}

${includeDotfiles ? "\n## Dotfiles\n\n- Shell configs (.zshrc, .bashrc)\n- Terminal configs (ghostty, tmux)" : ""}

## Usage

\`\`\`bash
# Check status
config-sync status

# Sync changes
config-sync sync

# Push to remote
git add .
git commit -m "Update configs"
git push
\`\`\`
`;
    writeFileSync(join(repoPath, "README.md"), readmeContent);

    // 9. Initial Commit
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

  // 8. Create Configuration
  try {
    const config = initConfig({
      repoPath: repoPathInput, // Store as entered (with ~ if used)
      remote,
      agents: selectedAgents,
    });

    const agentList = selectedAgents.length > 0
      ? selectedAgents.map(id => {
          const adapter = adapterRegistry.get(id);
          return adapter ? adapter.name : id;
        }).join(", ")
      : "none";

    p.outro(
      `✓ Agent config repository initialized!

Repository: ${contractHome(repoPath)}
Configuration: ~/.config-sync/config.json
Agents: ${agentList}
${includeDotfiles ? "Dotfiles: ✓ Enabled" : ""}

Next steps:
  • Edit configs in ${contractHome(repoPath)}/configs/
  • Changes are synced automatically via symlinks
  • Run 'config-sync sync' to apply changes to your system
  ${remote ? `• Push to GitHub: cd ${contractHome(repoPath)} && git push -u origin main` : ""}`
    );
  } catch (error) {
    p.cancel(`Failed to create configuration: ${error}`);
  }
}
