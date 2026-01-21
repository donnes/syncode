import * as p from "@clack/prompts";
import { machineDepsCommand } from "./deps";
import { machineStatusCommand } from "./status";

export async function machineCommand() {
  const args = process.argv.slice(2);
  const subcommand = args[1];

  if (subcommand === "deps") {
    await machineDepsCommand();
    return;
  }

  if (subcommand === "status") {
    await machineStatusCommand();
    return;
  }

  if (subcommand === "help") {
    showHelp();
    return;
  }

  if (subcommand) {
    console.error(`Unknown machine command: ${subcommand}`);
    showHelp();
    process.exit(1);
  }

  p.intro("Machine Setup");

  const action = await p.select({
    message: "What would you like to do?",
    options: [
      {
        value: "deps",
        label: "Install dependencies",
        hint: "Homebrew/pacman/apt packages",
      },
      {
        value: "status",
        label: "Machine status",
        hint: "Check packages and repo state",
      },
    ],
  });

  if (p.isCancel(action)) {
    p.cancel("Cancelled");
    return;
  }

  p.outro("");

  if (action === "deps") {
    await machineDepsCommand();
    return;
  }

  await machineStatusCommand();
}

function showHelp() {
  console.log(`
syncode machine

Usage: syncode machine <command>

Commands:
  deps      Install dependencies for this machine
  status    Show machine setup status
  help      Show this help message

Examples:
  syncode machine
  syncode machine deps
  syncode machine status
`);
}
