# config-sync - Agent Configuration Manager

[![npm version](https://badge.fury.io/js/%40donnes%2Fconfig-sync.svg)](https://www.npmjs.com/package/@donnes/config-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Stop fighting with AI agent configurations.** Sync your Claude Code, Cursor, Windsurf, OpenCode, and VSCode settings across machines and projects with a single command.

The era of AI-powered coding is here, but managing multiple AI assistants is a mess. `config-sync` solves this.

## Why config-sync?

**The Problem:** You use Cursor at work, Claude Code for side projects, and want to try Windsurf. Each has its own config format and setup. Keeping them in sync is manual hell.

**The Solution:** `config-sync` is your single source of truth for AI agent configurations.

## Features

- 🤖 **Multi-Agent Support** - Manage Claude Code, Cursor, Windsurf, OpenCode, VSCode from one CLI
- 🔄 **Smart Sync** - Automatic detection and sync with smart defaults per agent
- 🔗 **Symlinks & Copy** - Symlinks for live sync, copy for Claude (preserves cache)
- 📦 **Version Control** - Git-based workflow for your AI configurations
- 🛡️ **Safe Operations** - Automatic backups before any changes
- 🌍 **Cross-Platform** - macOS, Linux (Windows coming soon)

## Quick Start

### Option 1: npx (No Install Required)

```bash
npx @donnes/config-sync new
```

### Option 2: Global Install

```bash
# Install globally
npm install -g @donnes/config-sync

# Or using bun
bun install -g @donnes/config-sync

# Initialize
config-sync new
```

## Usage

### Initialize New Agent Config Repo

```bash
config-sync new
```

This will:
- Auto-detect installed AI agents (Claude Code, Cursor, Windsurf, etc.)
- Let you select which agents to sync
- Create a git repository for your configs
- Import your existing configs
- Set up smart sync defaults (symlinks for most, copy for Claude)

### Sync Agent Configs

```bash
config-sync sync
```

Choose direction:
- **Import**: Copy configs from system to repo (before committing changes)
- **Export**: Sync configs from repo to system (on new machines)

### Check Status

```bash
config-sync status
```

Shows:
- Which agents are synced
- Sync method (symlink vs copy)
- Git status

## Supported Agents

| Agent | Config Path | Sync Method | Auto-Detect |
|-------|-------------|-------------|-------------|
| **Claude Code** | `~/.claude` | Copy | ✅ Yes |
| **Cursor** | `~/Library/Application Support/Cursor/User` | Symlink | ✅ Yes |
| **Windsurf** | `~/.codeium/windsurf` | Symlink | ✅ Yes |
| **OpenCode** | `~/.config/opencode` | Symlink | ✅ Yes |
| **VSCode** | `~/Library/Application Support/Code/User` | Symlink | ✅ Yes |

## Configuration

Global configuration is stored at `~/.config-sync/config.json`:

```json
{
  "version": "1.0.0",
  "repoPath": "~/agent-configs",
  "remote": "git@github.com:username/agent-configs.git",
  "agents": ["claude", "cursor", "windsurf", "opencode"],
  "features": {
    "autoSync": false,
    "backupBeforeExport": true,
    "smartSyncDefaults": true
  }
}
```

## Repository Structure

```
~/agent-configs/
├── .git/
├── .gitignore
├── README.md
└── configs/
    ├── claude/          # Copy sync (preserves cache)
    │   ├── settings.json
    │   ├── CLAUDE.md
    │   ├── commands/
    │   └── skills/
    ├── cursor/          # Symlinked
    │   ├── settings.json
    │   └── .cursorrules
    ├── windsurf/        # Symlinked
    │   └── settings.json
    ├── opencode/        # Symlinked
    │   ├── opencode.json
    │   ├── command/
    │   ├── agent/
    │   └── skill/
    └── vscode/          # Symlinked
        ├── settings.json
        └── keybindings.json
```

## Usage Examples

### Daily Workflow

```bash
# Edit your AI agent configs normally
# Example: ~/.config/opencode/opencode.json
# Example: ~/.claude/skills/my-helper.md
# Changes are synced via symlinks automatically

# Check what changed
config-sync status

# Import changes to repo
config-sync sync
# Select "Import"

# Commit and push
cd ~/agent-configs
git add .
git commit -m "Update configs"
git push
```

### New Machine Setup

```bash
# Install config-sync
npm install -g @donnes/config-sync

# Clone your agent config repo
git clone https://github.com/username/agent-configs.git ~/agent-configs

# Sync configs (creates symlinks)
cd ~/agent-configs
config-sync sync
# Select "Export"

# You're ready - all AI agents configured identically!
```

## Commands

- `config-sync new` - Initialize a new agent config repository
- `config-sync sync` - Sync agent configs (import or export)
- `config-sync status` - Show status of synced agents
- `config-sync --version` - Show version
- `config-sync help` - Show help message

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/donnes/config-sync.git
cd config-sync

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
config-sync new
```

### Symlinks not working

```bash
# Check configuration health
config-sync status

# Re-export configs
config-sync sync
# Select "Export"
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © Donald Silveira

## Support

- 📖 [Documentation](https://github.com/donnes/config-sync#readme)
- 🐛 [Report Issues](https://github.com/donnes/config-sync/issues)
- 💬 [Discussions](https://github.com/donnes/config-sync/discussions)
- 📦 [npm Package](https://www.npmjs.com/package/@donnes/config-sync)

## Related Projects

- [OpenCode](https://github.com/opencode/opencode) - Open source AI coding agent
- [Claude Code](https://www.anthropic.com/claude) - Anthropic's AI coding agent
- [Cursor](https://cursor.sh) - AI-first code editor

---

**Made with ❤️ for developers**

