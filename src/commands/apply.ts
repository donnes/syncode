import { requireConfig } from "../config.ts";
import { UserError } from "../errors.ts";
import { exists, Files } from "../files.ts";
import { gitOutput } from "../git.ts";
import { apply, enabledAgents } from "../plan.ts";

export function loadRepo() {
  const config = requireConfig();
  if (!exists(config.repo)) {
    throw new UserError(
      `Repo ${config.repo} does not exist. Run \`syncode init\` to set it up again.`,
    );
  }
  return config;
}

export async function applyCommand(options: { dryRun: boolean }) {
  const config = loadRepo();
  const files = new Files({ repo: config.repo, dryRun: options.dryRun });
  await apply(files, enabledAgents(config.agents));
  const kept = files.entries.filter((entry) => entry.action === "keep").length;
  if (kept)
    console.log(
      `\nKept ${kept} differing local file(s). Run \`syncode apply\` in a terminal to resolve them.`,
    );
}

export async function statusCommand(options: { json: boolean }) {
  const config = loadRepo();
  const files = new Files({ repo: config.repo, dryRun: true, quiet: options.json });
  await apply(files, enabledAgents(config.agents));

  const changes = files.entries.filter((entry) => entry.action !== "skip");
  const dirty = gitOutput(config.repo, ["status", "--porcelain"])
    ?.split("\n")
    .filter(Boolean).length;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          repo: config.repo,
          agents: config.agents,
          uncommitted: dirty ?? null,
          entries: files.entries,
        },
        null,
        2,
      ),
    );
    return;
  }
  console.log(
    `\n${changes.length ? `${changes.length} change(s) pending; run \`syncode apply\`.` : "Everything is linked."}`,
  );
  if (dirty)
    console.log(
      `${dirty} uncommitted change(s) in ${config.repo}; run \`syncode push\` to share them.`,
    );
}
