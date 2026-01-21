# Code Style Guidelines

## Formatting and imports
- Use double quotes for strings and semicolons for statements.
- Use trailing commas in object/array literals.
- Use ES module syntax (`import`/`export`). No `require()`.
- Order: external packages first, then relative imports.
- Use `import type` for type-only imports.
- Prefer named imports; use `import * as p` for `@clack/prompts`.

## Casing and naming
- File names: lowercase with dashes (e.g., `agent-adapter.ts`).
- Functions/variables: `camelCase`.
- Classes/interfaces: `PascalCase`.
- Constants: `SCREAMING_SNAKE_CASE` (only for true constants).
- Adapter IDs: lowercase (e.g., "claude").

## Types and error handling
- Prefer interfaces for shared shapes. Use JSDoc for public fields.
- Avoid `any`. Use `unknown` if necessary with type guards.
- Return structured results (`{ success: boolean, message: string }`) instead of throwing when possible in CLI flows.
- Use `try/catch` around filesystem and shell operations.

## Async and filesystem
- Use `async`/`await` for shell calls and long-running operations.
- Use helpers from `src/utils/fs.ts` and `src/utils/git.ts`.
- Always ensure parent directories exist before writing.
- Respect symlinks: avoid overwriting without backups.
