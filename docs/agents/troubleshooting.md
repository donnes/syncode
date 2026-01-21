# Common Pitfalls and Troubleshooting

- Missing agents: If an agent is not detected, check `getConfigPath()` in its adapter.
- Permission errors: Filesystem operations (symlinks) may require specific permissions.
- Symlink conflicts: If a file exists where a symlink should be, the CLI prompts for backup/overwrite.
- Claude history: Claude Code uses the `copy` strategy because local sqlite databases do not behave well with symlinks.
