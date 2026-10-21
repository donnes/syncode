# syncode

[![npm version](https://img.shields.io/npm/v/@donnes/syncode)](https://www.npmjs.com/package/@donnes/syncode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Keep your AI coding agents' instructions, skills and config files in one git repo, and link them into every agent on every machine.

- **One set of instructions** for Claude Code (`CLAUDE.md`), Codex and OpenCode (`AGENTS.md`) and Gemini CLI (`GEMINI.md`), with optional per-OS and per-machine parts.
- **One skills folder** linked into `~/.agents/skills` (Codex, OpenCode, Gemini CLI, Cursor, Copilot CLI) and `~/.claude/skills`.
- **Only what you choose.** Config files are synced only after you `adopt` them, and credentials like `auth.json` are refused, so sessions, caches and tokens never reach git.
- **Safe to rerun.** `apply` is idempotent, `status` previews it exactly, and differing local files are never overwritten without asking.

## Quick start

```bash
npm install -g @donnes/syncode   # or: bun add -g @donnes/syncode

# First machine: start a repo from the instructions and skills you already have
syncode init

# Other machines: clone your repo and link it
syncode init git@github.com:<you>/agent-configs.git
```

Requires Node.js 22.12 or later, git, and macOS or Linux.

## Commands

| Command                   | What it does                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `syncode init [repo]`     | Set up this machine from a git URL or local path, or start a new repo. Migrates a 1.x setup.       |
| `syncode apply`           | Link the repo's instructions, skills and config files into each agent.                             |
| `syncode status`          | Show what `apply` would change, plus uncommitted repo changes. `--json` for scripts.               |
| `syncode adopt <path>...` | Move a local config file or skill folder into the repo and link it back.                           |
| `syncode pull`            | `git pull --ff-only`, then `apply`.                                                                |
| `syncode push`            | Commit any repo changes (`-m` for the message) and push.                                           |
| `syncode unlink`          | Replace every link with a copy of its file, so you can stop using syncode without losing anything. |

`apply` and `unlink` accept `--dry-run`. `init` accepts `--agents claude,codex` to skip the agent picker.

## Repository layout

```
~/.syncode/repo/
├── instructions/
│   ├── AGENTS.md      # shared instructions
│   ├── macos.md       # optional, macOS only
│   ├── linux.md       # optional, Linux only
│   └── local.md       # optional, this machine only (git-ignored)
├── skills/
│   └── <name>/SKILL.md
└── agents/
    ├── claude/settings.json   # linked to ~/.claude/settings.json
    └── codex/config.toml      # linked to ~/.codex/config.toml
```

When `instructions/AGENTS.md` is the only part, every agent links straight to it, so edits made through any agent land in the repo. When there are OS or local parts, syncode composes them into a read-only `.generated/AGENTS.md`. Edit the parts and rerun `syncode apply`.

## Supported agents

| Agent              | Config folder                       | Instructions               | Skills             |
| ------------------ | ----------------------------------- | -------------------------- | ------------------ |
| Claude Code        | `$CLAUDE_CONFIG_DIR` or `~/.claude` | `CLAUDE.md`                | `~/.claude/skills` |
| Codex              | `$CODEX_HOME` or `~/.codex`         | `AGENTS.md`                | `~/.agents/skills` |
| OpenCode           | `~/.config/opencode`                | `AGENTS.md`                | `~/.agents/skills` |
| Gemini CLI         | `~/.gemini`                         | `GEMINI.md`                | `~/.agents/skills` |
| Cursor             | `~/.cursor`                         | (set in Cursor's settings) | `~/.agents/skills` |
| GitHub Copilot CLI | `~/.copilot`                        | none                       | `~/.agents/skills` |

Any file under an agent's config folder can be adopted into `agents/<id>/`.

## Conflicts

If a local file differs from the repo copy, `apply` asks whether to keep it, replace it, update the repo from it, or show the diff. It suggests whichever side is newer. Replaced files are backed up to `~/.syncode/backups/`. Outside a terminal (for example over SSH, or when an agent runs syncode), it keeps the local file and reports it, unless you pass `--on-conflict keep|replace|update` to `apply` or `pull`.

## Upgrading from 1.x

Run `syncode init`. It detects the 1.x config and:

1. Replaces the 1.x whole-folder symlinks (such as `~/.config/opencode`) with real copies, so every agent keeps working.
2. Moves `.agents/skills/*` to `skills/`, and takes the first `AGENTS.md` or `CLAUDE.md` it finds in `configs/` as `instructions/AGENTS.md`.
3. Links everything the 2.0 way.

The 1.x `configs/` folder stays in the repo. `syncode adopt` the files you want to keep syncing, then delete `configs/` and `.agents/` and commit. `syncode machine` and dotfiles syncing were removed in 2.0.

## Development

```bash
bun install
bun run dev -- status   # run from source (Node >= 22.18)
bun run check           # format, lint, typecheck, knip, test, build
```

See [AGENTS.md](AGENTS.md) for how the code is organized.

## License

MIT © Donald Silveira
