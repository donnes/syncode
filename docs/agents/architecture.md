# Architecture and Sync Logic

## Adapter system
- Each agent has an adapter in `src/adapters/` registered in `registry.ts`.

## Sync strategies
- `symlink` (default): Live sync between system and repo.
- `copy`: One-way copy (used for Claude to preserve cache).

## Global config
- `~/.syncode/config.json` tracks the repository location.

## Core interface: `AgentAdapter`
- `id`: Unique lowercase identifier.
- `getConfigPath(platform)`: Resolves the system path for the agent's config.
- `getRepoPath(repoRoot)`: Determines where the config is stored in the sync repository.
- `import(system, repo)`: Logic to bring configs into the repository.
- `export(repo, system)`: Logic to apply configs to the system.
- `isInstalled(platform)`: Detection logic for the agent.

## How to add a new adapter

1. Create `src/adapters/<name>.ts` implementing `AgentAdapter`
2. Export the adapter in `src/adapters/index.ts`
3. Register it in `src/registry.ts`
4. Add platform detection in `src/platforms/` if needed
5. Test with `syncode status` to verify detection
