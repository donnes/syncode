# AGENTS.md

This repository is a Node.js/Bun TypeScript CLI for managing AI agent configurations.
It provides an adapter-based architecture to sync configs for Claude Code, Cursor,
Windsurf, OpenCode, and VSCode across machines using git and symlinks/copies.

## Quick facts
- Runtime: Node.js ≥20 or Bun
- Language: TypeScript (ES modules)
- Entry point: src/index.ts (shebang: `#!/usr/bin/env node`)
- Build: tsup (outputs to dist/)
- OS targets: macOS + Linux (Windows planned)
- Package manager: npm or bun
- Package name: @donnes/config-sync

## Commands (build / lint / test)
- Install dependencies: `bun install` or `npm install`
- Run CLI in dev mode: `bun run dev` (uses tsx)
- Build for production: `bun run build` (uses tsup)
- Type check: `bun run typecheck`
- Link the CLI globally: `bun link` or `npm link`
- CLI usage help: `config-sync help`

Notes
- There is no lint script defined in `package.json`.
- There is no test runner configured in this repo.
- Build outputs to `dist/` directory via tsup.

## Single-test guidance
- No test framework is configured, so there is no "single test" command.
- If you add tests, also add a `package.json` script and document the single-test
  usage here.

## Repository structure
- `src/index.ts` is the CLI entry and interactive menu.
- `src/commands/` contains 3 user-facing commands: new, sync, status
- `src/adapters/` contains agent adapters implementing AgentAdapter interface
- `src/config/` contains configuration management (manager.ts, types.ts)
- `src/utils/` contains shared helpers (fs/git/paths/shell/platform).
- `configs/` (in user's repo) stores tracked agent configs

## Architecture

### Adapter System
The project uses an adapter-based architecture where each AI agent has its own adapter:
- **AgentAdapter interface** (`src/adapters/types.ts`) - defines the contract
- **Built-in adapters** - claude, cursor, windsurf, opencode, vscode
- **AdapterRegistry** (`src/adapters/registry.ts`) - central registry for all adapters
- Each adapter handles platform-specific paths, import/export, and sync strategies

### Sync Strategies
- **Symlink** (default): Live sync, changes reflected immediately
- **Copy**: One-way copy (used for Claude to preserve cache/history)
- Configured per adapter in `syncStrategy.import` and `syncStrategy.export`

### Configuration
- Global config stored at `~/.config-sync/config.json`
- User's agent configs stored in their chosen repo (e.g., `~/agent-configs`)
- Each adapter determines its own system paths per platform

## Code style guidelines

### Formatting
- Use double quotes for strings.
- Use semicolons.
- Use trailing commas in object/array literals.
- One statement per line; avoid clever one-liners.
- Keep functions small and single-purpose.
- Favor explicit spacing for readability.

### Imports
- Use ES module syntax (import/export, not require).
- Order: external packages first, then relative imports.
- Use `import type` for types when possible.
- Prefer named imports; use `import * as p` for @clack/prompts.

### Types and interfaces
- Prefer interfaces for shared shapes (see `src/adapters/types.ts`).
- Keep union types narrow and explicit (e.g. Platform: "macos" | "linux" | "windows").
- Use `Record<string, T>` for indexed dictionaries.
- Avoid `any`; if unavoidable, keep it local and explain with context.
- Keep result types consistent (`success`, `message`, optional fields).

### Naming conventions
- File names are lowercase with dashes only when needed.
- Functions are `camelCase`.
- Classes/Interfaces are `PascalCase` (e.g. `AgentAdapter`, `AdapterRegistry`).
- Constants are `SCREAMING_SNAKE_CASE` only for true constants (e.g. `SUPPORTED_AGENTS`).
- Adapter IDs are lowercase (e.g. "claude", "cursor", "opencode").

### Error handling
- Use `try/catch` around filesystem and shell operations.
- Return structured results (success + message) rather than throwing.
- When catching, surface a clear message for the CLI user.
- In CLI flows, cancel early on prompt cancellations.

### Async / sync usage
- Use async/await for shell calls and long-running operations.
- Synchronous fs calls are acceptable for small, controlled operations.
- Keep CLI output responsive; use spinners for long operations.

### CLI UX
- Use @clack/prompts for interactive flows.
- Always handle cancellations with `p.isCancel`.
- Use `p.intro` / `p.outro` for command boundaries.
- Keep status output short and scannable.

### Filesystem operations
- Use helpers from `src/utils/fs.ts` when available.
- Always ensure parent directories exist before writing.
- Respect symlink behavior: avoid overwriting without backups.
- For config exports, back up existing paths when not symlinked.

### Git operations
- Use helpers from `src/utils/git.ts`.
- Prefer `git -C` with `REPO_ROOT`.
- Keep git output minimal and user-friendly.

### Paths
- Use `systemPaths` and `repoPaths` from `src/utils/paths.ts`.
- Prefer `contractHome` for user-facing paths.
- Avoid hardcoding OS-specific locations.

## Adding new commands
- Place new command files in `src/commands/`.
- Export a single `*Command` function (async, no parameters).
- Import and register in `src/index.ts` in the `commands` object.
- Add to the interactive menu options in the `p.select` call.
- Add to `showHelp()` function for CLI help output.

## Adding new agent adapters
- Implement `AgentAdapter` interface from `src/adapters/types.ts`.
- Create new file in `src/adapters/` (e.g., `newagentagent.ts`).
- Export adapter instance (e.g., `export const newAgentAdapter: AgentAdapter`).
- Import and register in `src/adapters/registry.ts` in `registerBuiltinAdapters()`.
- Add agent ID to `SUPPORTED_AGENTS` in `src/config/types.ts`.
- Define sync strategy (symlink or copy) in adapter definition.
- Implement platform-specific path resolution in `getConfigPath()`.
- Keep import/export logic symmetric and idempotent.

## Agent adapter behavior
- **Import**: Copy files from system to repo (preserves originals).
- **Export**: Create symlink from system to repo OR copy from repo to system.
- **Backup**: Always backup existing system configs before export.
- Avoid destructive operations without user confirmation.

## CLI Commands

### `config-sync new`
- Initialize a new agent config repository
- Auto-detects installed AI agents
- Prompts for repo path, GitHub remote, agent selection
- Creates directory structure and initial git commit
- Imports existing configs from system
- Creates global config at `~/.config-sync/config.json`

### `config-sync sync`
- Sync agent configs between system and repo
- Prompts for direction: import (system → repo) or export (repo → system)
- Import: copies configs from system to repo
- Export: creates symlinks (or copies for Claude) from system to repo
- Automatic backups before destructive operations

### `config-sync status`
- Show status of synced agents
- Lists enabled/detected agents
- Shows sync method (symlink vs copy)
- Shows git status of repo

## Common pitfalls
- Do not use `require()` - this is an ES module project, use `import` instead.
- Do not assume a test runner exists.
- Do not add new scripts without updating this doc.
- Do not add emoji output unless already used in command output.
- Remember that adapters are registered at module load time (see registry.ts).
- Always use platform detection for path resolution (don't hardcode paths).

## When editing AGENTS.md
- Keep it under 200 lines to stay readable.
- Update command sections as scripts or commands change.
- Document any new adapters immediately.
- Document any new lint/test tools immediately.
