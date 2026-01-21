#!/usr/bin/env node

import * as p from "@clack/prompts";
import { syncCommand } from "./commands/sync";
import { statusCommand } from "./commands/status";
import { newCommand } from "./commands/new";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(
    join(dirname(__dirname), "package.json"),
    "utf-8"
  )
);
const VERSION = packageJson.version;

const commands = {
  new: newCommand,
  sync: syncCommand,
  status: statusCommand,
};

async function main() {
  const args = process.argv.slice(2);

  // Handle --version flag
  if (args.includes("--version") || args.includes("-v")) {
    console.log(`config-sync v${VERSION}`);
    return;
  }

  // If a command is passed directly, run it
  if (args.length > 0) {
    const cmd = args[0]!;

    if (cmd === "help" || cmd === "--help" || cmd === "-h") {
      showHelp();
      return;
    }

    if (cmd in commands) {
      await commands[cmd as keyof typeof commands]();
      return;
    }

    console.error(`Unknown command: ${cmd}`);
    showHelp();
    process.exit(1);
  }

  // Interactive mode
  console.clear();
  p.intro("config-sync - Agent Configuration Manager");

  const action = await p.select({
    message: "What would you like to do?",
    options: [
      {
        value: "new",
        label: "Initialize new agent config repo",
        hint: "Set up config sync",
      },
      {
        value: "sync",
        label: "Sync configs",
        hint: "Import or export agent configs",
      },
      {
        value: "status",
        label: "Check status",
        hint: "Show synced agents",
      },
    ],
  });

  if (p.isCancel(action)) {
    p.cancel("Cancelled");
    process.exit(0);
  }

  p.outro(""); // Close intro before running command

  // Run selected command
  const cmd = commands[action as keyof typeof commands];
  if (cmd) {
    await cmd();
  }
}

function showHelp() {
  console.log(`
config-sync - Agent Configuration Manager v${VERSION}

Usage: config-sync [command]

Setup Commands:
  new           Initialize a new agent config repository

Sync Commands:
  sync          Sync agent configs (import or export)
  status        Show status of synced agents

Other Commands:
  --version     Show version
  help          Show this help message

Examples:
  config-sync              # Interactive menu
  config-sync new          # Initialize new agent config repo
  config-sync status       # Show status
  config-sync sync         # Sync agent configs

Quick Start:
  npx @donnes/config-sync new    # Quick setup with npx
  npm i -g @donnes/config-sync   # Or install globally
`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
