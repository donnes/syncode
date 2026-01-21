# Commands

## Tooling
- Install dependencies: `bun install` or `npm install`
- Run CLI in dev mode: `bun run dev` (uses tsx)
- Build for production: `bun run build` (uses tsup)
- Type check: `bun run typecheck` (uses `tsc --noEmit`)
- Link CLI globally: `bun link` or `npm link`
- CLI usage help: `syncode help`

## Release/build checklist

- [ ] Update version in `package.json`
- [ ] Run `bun run build` to verify production build
- [ ] Run `bun run typecheck` to verify types
- [ ] Test CLI locally: `bun link && syncode status`
- [ ] Create git tag: `git tag v<x.y.z>`
- [ ] Push tag: `git push --tags`
- [ ] Publish to npm (if applicable): `npm publish`

## Notes
- No lint script or test runner currently configured.
- No single-test command available yet. If you add tests, document them here.

## CLI commands

### `syncode new`
- Purpose: Initializes a new agent configuration repository.
- Actions:
  - Detects installed AI agents on the current system.
  - Prompts for a local repository path and an optional GitHub remote.
  - Creates the directory structure, `.gitignore`, and an initial git commit.
  - Imports existing configurations from system paths to the repository.
  - Persists global settings in `~/.syncode/config.json`.

### `syncode init`
- Purpose: Initializes syncode from an existing configuration repository.
- Actions:
  - Prompts for the repo URL and local repository path.
  - Clones the repo if it does not exist locally.
  - Prompts for which agents to sync (preselects agents found in the repo).
  - Persists global settings in `~/.syncode/config.json`.

### `syncode sync`
- Purpose: Synchronizes agent configurations between the system and the repository.
- Modes:
  - Import (System -> Repo): Copies local configuration files into the repository.
  - Export (Repo -> System): Applies repository configurations to the system.
- Safety: Automatically creates backups of existing system configurations.

### `syncode unsync`
- Purpose: Removes symlink-based configs and copies them back to the local machine.
- Actions:
  - Replaces symlinked agent configs with real files in system paths.
  - Skips agents that use copy-based syncing.

### `syncode status`
- Purpose: Displays the current synchronization state.
- Output:
  - List of detected and enabled agents.
  - Active sync method for each agent (symlink vs. copy).
  - Current git status of the configuration repository.

### `syncode push`
- Purpose: Commits and pushes changes to the remote repository.
- Actions:
  - Stages all changes in the configuration directory.
  - Prompts for a commit message.
  - Executes `git push` to the configured remote.
