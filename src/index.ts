#!/usr/bin/env node
import { parseArgs } from "node:util";
import pkg from "../package.json" with { type: "json" };
import { adoptCommand } from "./commands/adopt.ts";
import { applyCommand, statusCommand } from "./commands/apply.ts";
import { pullCommand, pushCommand, unlinkCommand } from "./commands/git.ts";
import { initCommand } from "./commands/init.ts";
import { Cancelled, UserError } from "./errors.ts";
import { RESOLUTIONS, type Resolution } from "./files.ts";
import { checkForUpdates } from "./update-check.ts";

const HELP = `syncode ${pkg.version} - sync AI agent instructions, skills and configs across machines

Usage: syncode <command> [options]

Commands:
  init [repo]       Set up this machine from a git URL or path, or start a new repo
  apply             Link the repo's instructions, skills and configs into each agent
  status            Show what apply would change, and uncommitted repo changes
  adopt <path>...   Move a local config file or skill into the repo and link it back
  pull              Pull the repo and apply it
  push              Commit any repo changes and push them
  unlink            Replace every link with a copy of its file, keeping configs in place

Options:
  --dry-run         Show what apply or unlink would do without changing anything
  --on-conflict <keep|replace|update>
                    Settle differing local files without asking (apply, pull)
  --json            Print status as JSON
  --agents <ids>    Agents to manage with init, comma-separated
  -m, --message     Commit message for push
  -h, --help        Show this help
  -v, --version     Show the version
`;

function parse() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        "dry-run": { type: "boolean", default: false },
        json: { type: "boolean", default: false },
        agents: { type: "string" },
        "on-conflict": { type: "string" },
        message: { type: "string", short: "m" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (error) {
    throw new UserError(
      `${error instanceof Error ? error.message : String(error)}\nRun \`syncode --help\` for usage.`,
    );
  }
}

/** Validates `--on-conflict`, shaped to spread into Files options. */
function parseResolution(value: string | undefined): { onConflict?: Resolution } {
  if (value === undefined) return {};
  const resolution = RESOLUTIONS.find((candidate) => candidate === value);
  if (!resolution) {
    throw new UserError(`--on-conflict must be one of: ${RESOLUTIONS.join(", ")}.`);
  }
  return { onConflict: resolution };
}

async function main() {
  if (process.platform === "win32") throw new UserError("syncode supports macOS and Linux only.");
  const { values, positionals } = parse();
  const [command, ...rest] = positionals;
  if (values.version) {
    console.log(pkg.version);
    return;
  }
  if (values.help || !command || command === "help") {
    console.log(HELP);
    return;
  }

  checkForUpdates(pkg.name, pkg.version);
  const dryRun = values["dry-run"];
  const onConflict = parseResolution(values["on-conflict"]);
  switch (command) {
    case "init":
      return initCommand(rest[0], values.agents === undefined ? {} : { agents: values.agents });
    case "apply":
      return applyCommand({ dryRun, ...onConflict });
    case "status":
      return statusCommand({ json: values.json });
    case "adopt":
      return adoptCommand(rest);
    case "pull":
      return pullCommand(onConflict);
    case "push":
      return pushCommand(values.message === undefined ? {} : { message: values.message });
    case "unlink":
      return unlinkCommand({ dryRun });
    default:
      throw new UserError(`Unknown command: ${command}. Run \`syncode --help\` for usage.`);
  }
}

main().catch((error: unknown) => {
  if (error instanceof Cancelled) process.exit(130);
  if (error instanceof UserError) {
    console.error(error.message);
  } else {
    console.error(
      process.env.SYNCODE_DEBUG && error instanceof Error
        ? error.stack
        : `Error: ${error instanceof Error ? error.message : String(error)}\nSet SYNCODE_DEBUG=1 for the stack trace.`,
    );
  }
  process.exit(1);
});
