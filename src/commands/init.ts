import * as fs from "node:fs";
import * as path from "node:path";
import * as p from "@clack/prompts";
import { AGENTS, type AgentId, detectAgents, isAgentId, sharedSkillsDir } from "../agents.ts";
import { type Config, defaultRepo, readConfig, writeConfig } from "../config.ts";
import { UserError } from "../errors.ts";
import { children, exists, Files, linkTarget, prettyPath, writeAtomic } from "../files.ts";
import { git } from "../git.ts";
import { expandHome } from "../paths.ts";
import { apply, enabledAgents, GITIGNORE_LINES, repoPaths } from "../plan.ts";
import { answer, canPrompt } from "../prompts.ts";
import { adopt } from "./adopt.ts";
import { migrate } from "./migrate.ts";

const README = `# Agent configs

Managed by [syncode](https://github.com/donnes/syncode).

- \`instructions/AGENTS.md\`: global instructions, linked as each agent's CLAUDE.md, AGENTS.md or GEMINI.md.
  Add \`macos.md\` or \`linux.md\` for OS-specific parts, and an untracked \`local.md\` for this machine only.
- \`skills/<name>/\`: skills, linked into \`~/.agents/skills\` and \`~/.claude/skills\`.
- \`agents/<agent>/\`: other config files, linked into that agent's config folder.

Run \`syncode adopt <path>\` to add files, and \`syncode apply\` after pulling changes.
`;

const STARTER_INSTRUCTIONS = `# Global agent instructions

Write instructions here that every coding agent should follow on every machine.
`;

function isGitUrl(source: string): boolean {
  return /^(https?|ssh|git):\/\//.test(source) || /^[\w.-]+@[\w.-]+:/.test(source);
}

export function parseAgents(list: string): AgentId[] {
  const ids = list
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const unknown = ids.filter((id) => !isAgentId(id));
  if (unknown.length) {
    throw new UserError(
      `Unknown agent(s): ${unknown.join(", ")}. Supported: ${AGENTS.map((agent) => agent.id).join(", ")}.`,
    );
  }
  return ids.filter(isAgentId);
}

async function chooseAgents(flag: string | undefined, current: AgentId[] | undefined) {
  if (flag !== undefined) return parseAgents(flag);
  const detected = detectAgents();
  if (!canPrompt()) return current ?? detected;
  return answer(
    await p.multiselect<AgentId>({
      message: "Which agents should syncode manage?",
      options: AGENTS.map((agent) => ({
        value: agent.id,
        label: agent.name,
        ...(detected.includes(agent.id) ? { hint: "detected" } : {}),
      })),
      initialValues: current ?? detected,
      required: false,
    }),
  );
}

/** Creates the repo, or clones it, and reports whether it is brand new. */
function prepareRepo(source: string | undefined, current: string | undefined) {
  if (source && isGitUrl(source)) {
    const repo = current ?? defaultRepo();
    if (exists(repo)) {
      throw new UserError(`${prettyPath(repo)} already exists. Move it away to clone ${source}.`);
    }
    fs.mkdirSync(path.dirname(repo), { recursive: true });
    git(path.dirname(repo), ["clone", source, repo]);
    return { repo, created: false };
  }
  const repo = path.resolve(expandHome(source ?? current ?? defaultRepo()));
  if (exists(path.join(repo, ".git"))) return { repo, created: false };
  // Starting a repo writes README.md, .gitignore and instructions/, so only
  // do it in a new or empty folder.
  if (children(repo).length) {
    throw new UserError(
      `${prettyPath(repo)} has files but isn't a git repo. Pick an empty folder, or run \`git init\` there first to use it as is.`,
    );
  }
  fs.mkdirSync(repo, { recursive: true });
  git(repo, ["init", "-q"]);
  return { repo, created: true };
}

/** Starts a new repo from what this machine already has. */
async function seed(config: Config) {
  const agents = enabledAgents(config.agents);
  const paths = repoPaths(config.repo);
  writeAtomic(path.join(config.repo, ".gitignore"), `${GITIGNORE_LINES.join("\n")}\n`);
  writeAtomic(path.join(config.repo, "README.md"), README);

  // Copy rather than adopt: the other agents' files may differ, and apply
  // will offer to resolve those.
  const existing = agents
    .flatMap((agent) => (agent.instructions ? [path.join(agent.home(), agent.instructions)] : []))
    .find((file) => fs.existsSync(file) && !linkTarget(file));
  const main = path.join(paths.instructions, "AGENTS.md");
  if (existing) {
    // Keep its age, so conflicts with other agents' files suggest the newer one.
    fs.mkdirSync(paths.instructions, { recursive: true });
    fs.cpSync(existing, main, { preserveTimestamps: true });
  } else {
    writeAtomic(main, STARTER_INSTRUCTIONS);
  }
  console.log(
    `[create ] ${prettyPath(main, config.repo)}${existing ? ` from ${prettyPath(existing)}` : ""}`,
  );

  const roots = [
    sharedSkillsDir(),
    ...agents.filter((agent) => agent.ownSkills).map((agent) => path.join(agent.home(), "skills")),
  ];
  const found = new Map<string, string>();
  for (const dir of roots.flatMap(children)) {
    const name = path.basename(dir);
    if (!found.has(name) && !linkTarget(dir) && fs.existsSync(path.join(dir, "SKILL.md"))) {
      found.set(name, dir);
    }
  }
  if (!found.size) return;
  if (!canPrompt()) {
    console.log(`Found ${found.size} local skill(s); add them with \`syncode adopt <dir>\`.`);
    return;
  }
  const skills = answer(
    await p.multiselect({
      message: "Move these local skills into the repo?",
      options: [...found.values()].map((dir) => ({
        value: dir,
        label: path.basename(dir),
        hint: prettyPath(dir),
      })),
      initialValues: [...found.values()],
      required: false,
    }),
  );
  adopt(skills, config.repo, agents);
}

export async function initCommand(source: string | undefined, options: { agents?: string }) {
  const stored = readConfig();
  if (stored?.kind === "legacy") {
    await migrate(
      stored.config,
      options.agents === undefined ? undefined : parseAgents(options.agents),
    );
    return;
  }
  const current = stored?.config;
  const { repo, created } = prepareRepo(source, source === undefined ? current?.repo : undefined);
  const config: Config = {
    version: 2,
    repo,
    agents: await chooseAgents(options.agents, current?.agents),
  };
  writeConfig(config);
  console.log(`Using ${prettyPath(repo)} for ${config.agents.join(", ") || "no agents"}.\n`);

  if (created) await seed(config);
  await apply(new Files({ repo, dryRun: false }), enabledAgents(config.agents));

  console.log(
    created
      ? `\nCommit the repo and add a remote to share it:\n  git -C ${prettyPath(repo)} add -A && git -C ${prettyPath(repo)} commit -m "Initial agent configs"\n  git -C ${prettyPath(repo)} remote add origin <url> && syncode push`
      : "\nDone. Run `syncode status` any time to check for drift.",
  );
}
