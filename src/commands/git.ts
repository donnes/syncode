import { Files } from "../files.ts";
import { git, gitOutput } from "../git.ts";
import { apply, enabledAgents, unlinkAll } from "../plan.ts";
import { loadRepo } from "./apply.ts";

export async function pullCommand() {
  const config = loadRepo();
  git(config.repo, ["pull", "--ff-only"]);
  console.log("");
  await apply(new Files({ repo: config.repo, dryRun: false }), enabledAgents(config.agents));
}

export function pushCommand(options: { message?: string }) {
  const config = loadRepo();
  if (gitOutput(config.repo, ["status", "--porcelain"])) {
    git(config.repo, ["add", "-A"]);
    git(config.repo, ["commit", "-q", "-m", options.message ?? "Update agent configs"]);
  }
  git(config.repo, ["push"]);
}

export function unlinkCommand(options: { dryRun: boolean }) {
  const config = loadRepo();
  unlinkAll(new Files({ repo: config.repo, dryRun: options.dryRun }), enabledAgents(config.agents));
}
