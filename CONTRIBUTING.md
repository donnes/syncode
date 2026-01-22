# Contributing to syncode

Thank you for your interest in contributing to syncode!

## Development Setup

This project requires Node.js ≥20 or Bun. Install dependencies with:

```bash
bun install
```

## Development Workflow

- Run in dev mode: `bun run dev`
- Build for production: `bun run build`
- Type check: `bun run typecheck`
- Link globally: `bun link`

## Code Style

Follow the guidelines in [AGENTS.md](AGENTS.md). Key points:

- Use double quotes for strings
- ES module syntax (import/export)
- Prefer interfaces for shared shapes
- Async/await for shell calls
- Keep functions small and single-purpose

## Testing

No test framework is currently configured. If you add tests, update this section and document in AGENTS.md.

## Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes following the code style
4. Test your changes
5. Submit a pull request with a clear description

## Reporting Issues

Report issues at https://github.com/anomalyco/opencode/issues

For questions, use the help command: `syncode help`