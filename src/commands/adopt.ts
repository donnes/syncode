import * as fs from "node:fs";
import * as path from "node:path";
import { type Agent, isSecretFile } from "../agents.ts";
import { UserError } from "../errors.ts";
import { exists, Files, linkTarget, move, prettyPath, realPath, walk, within } from "../files.ts";
import { apply, enabledAgents, repoPaths } from "../plan.ts";
import { loadRepo } from "./apply.ts";

/** Where an adopted path belongs in the repo. */
function adoptTarget(file: string, repo: string, agents: readonly Agent[]): string {
  const paths = repoPaths(repo);
  if (fs.statSync(file).isDirectory() && fs.existsSync(path.join(file, "SKILL.md"))) {
    return path.join(paths.skills, path.basename(file));
  }
  const agent = agents.find((candidate) => within(file, candidate.home()));
  if (!agent) {
    throw new UserError(
      `${prettyPath(file)} is not a skill or inside an enabled agent's config folder.`,
    );
  }
  const relative = path.relative(agent.home(), file);
  if (!relative) {
    throw new UserError(`Adopt individual files from ${prettyPath(file)}, not the whole folder.`);
  }
  if (relative === agent.instructions) {
    return path.join(paths.instructions, "AGENTS.md");
  }
  const inside = fs.statSync(file).isDirectory()
    ? walk(file).map((entry) => path.relative(agent.home(), entry))
    : [relative];
  const secret = inside.flatMap((entry) => entry.split(path.sep)).find(isSecretFile);
  if (secret) throw new UserError(`Refusing to adopt ${secret}: it holds credentials.`);
  return path.join(paths.agents, agent.id, relative);
}

/** Moves local files into the repo, then links them back into place. */
export function adopt(targets: string[], repo: string, agents: readonly Agent[]) {
  const moves = targets.map((input) => {
    const file = path.resolve(input);
    if (!exists(file)) throw new UserError(`${input} does not exist.`);
    if (within(realPath(file) ?? file, repo)) {
      throw new UserError(`${prettyPath(file)} is already in the repo.`);
    }
    const target = linkTarget(file);
    if (target) {
      throw new UserError(
        `${prettyPath(file)} is a link to ${target}; adopt the real file instead.`,
      );
    }
    const destination = adoptTarget(file, repo, agents);
    if (exists(destination)) {
      throw new UserError(
        `${prettyPath(destination, repo)} already exists. Run \`syncode apply\` to link or resolve it instead.`,
      );
    }
    return { file, destination };
  });
  // Check every path before moving anything.
  for (const { file, destination } of moves) {
    move(file, destination);
    console.log(`[adopt  ] ${prettyPath(file)} -> ${prettyPath(destination, repo)}`);
  }
}

export async function adoptCommand(targets: string[]) {
  if (!targets.length) throw new UserError("Usage: syncode adopt <path>...");
  const config = loadRepo();
  const agents = enabledAgents(config.agents);
  adopt(targets, config.repo, agents);
  await apply(new Files({ repo: config.repo, dryRun: false }), agents);
  console.log("\nCommit the new files with `syncode push`.");
}
