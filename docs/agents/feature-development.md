# Feature Development

## New agent adapters
1. Implement `AgentAdapter` in `src/adapters/types.ts`.
2. Register in `src/adapters/registry.ts`.
3. Define platform-specific path resolution in `getConfigPath()`.

## New commands
1. Place in `src/commands/` and export a single async function.
2. Register in `src/index.ts` in the `commands` object and `showHelp()`.
