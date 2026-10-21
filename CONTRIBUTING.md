# Contributing to syncode

Thanks for helping out. Issues and pull requests are welcome at https://github.com/donnes/syncode.

## Setup

You need Bun and Node.js 22.18 or later.

```bash
bun install
bun run dev -- --help
```

## Before opening a pull request

```bash
bun run check   # lint, typecheck, test, build
```

[AGENTS.md](AGENTS.md) describes the layout and conventions. To support a new agent, add an entry to `src/agents.ts` and the README table, with a link to the docs showing where it reads instructions and skills.
