# syncode - Agent Configuration Manager

[![npm version](https://badge.fury.io/js/%40donnes%2Fsyncode.svg)](https://www.npmjs.com/package/@donnes/syncode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Stop fighting with AI agent configurations.** Sync your Claude Code, Cursor, Windsurf, OpenCode, and VSCode settings across machines and projects with a single command.

The era of AI-powered coding is here, but managing multiple AI assistants is a mess. `syncode` solves this.

## Why syncode?

**The Problem:** You use Cursor at work, Claude Code for side projects, and want to try Windsurf or Roo Code. Each has its own config format and setup. Keeping 17+ AI agents in sync is manual hell.

**The Solution:** `syncode` is your single source of truth for AI agent configurations.

<img width="770" height="628" alt="image" src="https://github.com/user-attachments/assets/6dc2851c-3b0c-4fba-9d34-5728d055c6a3" />

## Features

- 🤖 **17+ AI Agents** - Claude Code, Cursor, Windsurf, OpenCode, VSCode, GitHub Copilot, Roo Code, Goose, Gemini CLI, Amp, Kilo Code, Kiro CLI, Trae, Codex, Antigravity, Clawdbot, Droid
- 🔄 **Smart Sync** - Automatic detection and sync with smart defaults per agent
- 🔗 **Symlinks & Copy** - Symlinks for live sync, copy for Claude (preserves cache)
- 📦 **Version Control** - Git-based workflow for your AI configurations
- 🛡️ **Safe Operations** - Automatic backups before any changes
- 🖥️ **Machine Setup** - Opinionated development dependencies for macOS/Linux
- 🌍 **Cross-Platform** - macOS, Linux (Windows coming soon)

## Quick Start

### Option 1: npx (No Install Required)

```bash
npx @donnes/syncode new
```

### Already Have a Repo?

```bash
syncode init
```

### Option 2: Global Install

```bash
# Install globally
npm install -g @donnes/syncode

# Or using bun
bun install -g @donnes/syncode

# Initialize
syncode new
```

## Usage

### Initialize a New Repo

```bash
syncode new
```

This will:
- Auto-detect installed AI agents (17+ agents supported)
- Let you select which agents to sync
- Create a git repository for your configs
- Import your existing configs
- Set up smart sync defaults (symlinks for most, copy for Claude, Gemini, etc.)

### Initialize from an Existing Repo

```bash
syncode init
```

This will:
- Prompt for the repo URL and local storage path
- Clone the repo if needed
- Let you choose which agents to sync
- Save configuration to `~/.syncode/config.json`

### Sync Agents Config

```bash
syncode sync
```

Choose direction:
- **Import**: Copy configs from system to repo (before committing changes)
- **Export**: Sync configs from repo to system (on new machines)

### Check Status

```bash
syncode status
```

Shows:
- Which agents are synced
- Sync method (symlink vs copy)
- Git status
- Option to run full machine status

### Machine Dependencies

```bash
syncode machine deps
```

Install opinionated development dependencies for your machine:
- **macOS**: Homebrew packages from `Brewfile`
- **Arch/Omarchy**: Pacman/yay packages from `packages-arch.txt`
- **Debian/Ubuntu**: APT packages from `packages-debian.txt`
- **Universal**: Bun runtime and latest Node.js via fnm

These are boilerplate files that get copied to your repo root during `syncode new`. Edit them to customize the packages for your workflow.

### Machine Status

```bash
syncode machine status
```

Shows comprehensive machine setup status:
- Platform and package manager detection
- Repository and git status
- Dependency file presence
- Quick health check for your development environment

### Push to Remote

```bash
syncode push
```

Push your config changes to the remote repository:
- Detects uncommitted changes
- Optionally commits changes with a message
- Pushes to the configured remote branch

## Supported Agents

| Agent | Config Path | Sync Method | Auto-Detect |
|-------|-------------|-------------|-------------|
| **Amp** | `~/.config/amp` | Symlink | ✅ Yes |
| **Antigravity** | `~/.gemini/antigravity` | Copy | ✅ Yes |
| **Claude Code** | `~/.claude` | Copy | ✅ Yes |
| **Clawdbot** | `~/.clawdbot` | Symlink | ✅ Yes |
| **Codex** | `~/.codex` | Symlink | ✅ Yes |
| **Cursor** | `~/Library/Application Support/Cursor/User` | Symlink | ✅ Yes |
| **Droid** | `~/.factory` | Symlink | ✅ Yes |
| **Gemini CLI** | `~/.gemini` | Copy | ✅ Yes |
| **GitHub Copilot** | `~/.copilot` | Copy | ✅ Yes |
| **Goose** | `~/.config/goose` | Symlink | ✅ Yes |
| **Kilo Code** | `~/.kilocode` | Symlink | ✅ Yes |
| **Kiro CLI** | `~/.kiro` | Symlink | ✅ Yes |
| **OpenCode** | `~/.config/opencode` | Symlink | ✅ Yes |
| **Roo Code** | `~/.roo` | Symlink | ✅ Yes |
| **Trae** | `~/.trae` | Symlink | ✅ Yes |
| **VSCode** | `~/Library/Application Support/Code/User` | Symlink | ✅ Yes |
| **Windsurf** | `~/.codeium/windsurf` | Symlink | ✅ Yes |

## Configuration

Global configuration is stored at `~/.syncode/config.json`:

```json
{
  "version": "1.0.0",
  "repoPath": "~/.syncode/repo",
  "remote": "https://github.com/<username>/configs.git",
  "agents": ["opencode", "claude", "cursor", "windsurf"],
  "features": {
    "autoSync": false,
    "backupBeforeExport": true,
    "smartSyncDefaults": true
  }
}
```

## Repository Structure

```
~/.syncode/repo/
├── .git/
├── .gitignore
├── Brewfile
├── packages-arch.txt
├── packages-debian.txt
├── README.md
├── .agents/            # Shared skills (symlinked)
│   └── skills/
└── configs/
    ├── amp/               # Symlinked
    ├── antigravity/       # Copy sync
    ├── claude/            # Copy sync (preserves cache)
    ├── clawdbot/          # Symlinked
    ├── codex/             # Symlinked
    ├── cursor/            # Symlinked
    ├── droid/             # Symlinked
    ├── gemini-cli/        # Copy sync
    ├── github-copilot/    # Copy sync
    ├── goose/             # Symlinked
    ├── kilo/              # Symlinked
    ├── kiro-cli/          # Symlinked
    ├── opencode/          # Symlinked
    ├── roo/               # Symlinked
    ├── trae/              # Symlinked
    ├── vscode/            # Symlinked
    └── windsurf/          # Symlinked
```

## Usage Examples

### Daily Workflow

```bash
# Edit your AI agent configs normally
# Example: ~/.config/opencode/opencode.json
# Example: ~/.agents/skills/my-helper.md
# Changes are synced via symlinks automatically

# Check what changed
syncode status

# Import changes to repo
syncode sync
# Select "Import"

# Push to remote (commits and pushes in one command)
syncode push
```

## Commands

- `syncode new` - Initialize a new agent config repository
- `syncode init` - Initialize from an existing agent config repository
- `syncode sync` - Sync agent configs (import or export)
- `syncode status` - Show status of synced agents
- `syncode push` - Push config changes to git remote
- `syncode machine deps` - Install machine dependencies (brew/apt packages, bun, node)
- `syncode machine status` - Show full machine setup status
- `syncode --version` - Show version
- `syncode help` - Show help message

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/donnes/syncode.git
cd syncode

# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Link locally
bun link
```

### Running Tests

```bash
# Type check
bun run typecheck

# Build
bun run build
```

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | ✅ Fully Supported | Primary development platform |
| Linux | ✅ Fully Supported | Tested on Ubuntu, Arch |
| Windows | 🚧 Planned | Coming soon |

## Requirements

- Node.js >= 20.0.0 or Bun >= 1.0.0
- Git (for repository management)
- macOS or Linux

## Troubleshooting

### Configuration not found

```bash
# Run initialization
syncode new
# Or connect to an existing repo
syncode init
```

### Symlinks not working

```bash
# Check configuration health
syncode status

# Re-export configs
syncode sync
# Select "Export"
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © Donald Silveira

## Support

- 📖 [Documentation](https://github.com/donnes/syncode#readme)
- 🐛 [Report Issues](https://github.com/donnes/syncode/issues)
- 💬 [Discussions](https://github.com/donnes/syncode/discussions)
- 📦 [npm Package](https://www.npmjs.com/package/@donnes/syncode)

---

**Made with ❤️ for developers**
