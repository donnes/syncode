# AGENTS.md

syncode is a TypeScript CLI, published to npm, that links AI coding agents' instructions, skills and adopted config files from one git repo into each agent's config folder.

## Commands

- Package manager: bun. Runtime: Node >= 22.12 for the published CLI, >= 22.18 to run from source.
- `bun run dev -- <command>`: run from source with Node's type stripping.
- `bun run check`: lint (Biome), typecheck (`tsc`), test (Vitest), build (tsdown). Run before pushing.

## Layout

- `src/index.ts`: argument parsing and command dispatch.
- `src/agents.ts`: the supported agents as data: config folder, instructions file, skills behavior. Adding an agent is one entry here, plus the README table.
- `src/plan.ts`: works out every link from the repo and enabled agents. `apply`, `status` and `unlink` all use it.
- `src/files.ts`: all filesystem changes, including conflict handling. Its dry-run mode is what makes `status` an exact preview of `apply`.
- `src/commands/`: one file per command group; `migrate.ts` upgrades 1.x setups.
- `tests/`: end-to-end tests that run the real CLI against a sandbox home under `.scratch/`.

## Conventions

- Only Node built-ins plus `@clack/prompts`. Prefer data over per-agent classes.
- Never prompt when stdin or stdout isn't a TTY; keep the local file and report it instead.
- Expected failures throw `UserError` (printed without a stack). No `require`: the bundle is ESM.
- Test through the CLI boundary in `tests/`. Don't export internals or add flags just for tests.
- Comments explain why, not what.
