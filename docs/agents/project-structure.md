# Project Structure

- Entry point: `src/index.ts` (shebang: `#!/usr/bin/env node`)
- Build output: `dist/`
- `src/commands/`: User-facing commands (new, sync, status, push).
- `src/adapters/`: Agent adapters implementing `AgentAdapter`.
- `src/config/`: Configuration management (manager.ts, types.ts).
- `src/utils/`: Shared helpers (fs, git, paths, shell, platform).
- `configs/`: In the user's repo, stores tracked agent configs.
