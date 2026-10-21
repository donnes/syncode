import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import { type Agent, type AgentId, isAgentId } from "../agents.ts";
import { type LegacyConfig, writeConfig } from "../config.ts";
import { UserError } from "../errors.ts";
import {
  children,
  exists,
  Files,
  linkTarget,
  move,
  prettyPath,
  within,
  writeAtomic,
} from "../files.ts";
import { apply, enabledAgents, GITIGNORE_LINES, repoPaths } from "../plan.ts";

// 1.x ids that changed in 2.0. Agents not listed here or in AGENTS are dropped.
const RENAMED: Record<string, AgentId> = { "gemini-cli": "gemini", "github-copilot": "copilot" };

// Every folder 1.x linked entries in: agent folders, editor User folders and
// dotfiles, on Linux and macOS.
function legacyLinkCandidates(): string[] {
  const home = homedir();
  const config = path.join(home, ".config");
  const support = path.join(home, "Library", "Application Support");
  return [
    home,
    config,
    path.join(config, "Cursor"),
    path.join(config, "Code"),
    path.join(config, "ghostty"),
    path.join(home, ".ssh"),
    path.join(home, ".gemini"),
    path.join(home, ".codeium"),
    path.join(support, "Cursor"),
    path.join(support, "Code"),
    path.join(support, "com.mitchellh.ghostty"),
  ].flatMap(children);
}

/**
 * 1.x symlinked entire agent folders into the repo, which 2.0 no longer
 * does. Swap each link for a real copy so every agent keeps working.
 */
function restoreLegacyLinks(repo: string) {
  for (const file of legacyLinkCandidates()) {
    const target = linkTarget(file);
    if (target === undefined) continue;
    const resolved = path.resolve(path.dirname(file), target);
    const legacyRoots = [path.join(repo, "configs"), path.join(repo, ".agents")];
    if (!legacyRoots.some((root) => within(resolved, root)) || !exists(resolved)) continue;
    const temporary = `${file}.syncode-restore`;
    fs.cpSync(resolved, temporary, {
      recursive: true,
      verbatimSymlinks: true,
      // 1.x added relative links to its shared skills folder, which would
      // dangle outside the repo. 2.0 links skills itself.
      filter: (entry) =>
        !(
          path.dirname(entry) === resolved &&
          path.basename(entry) === "skills" &&
          linkTarget(entry)
        ),
    });
    fs.unlinkSync(file);
    fs.renameSync(temporary, file);
    console.log(`[restore] ${prettyPath(file)} <- ${prettyPath(resolved, repo)}`);
  }
}

function migrateSkills(repo: string) {
  const legacy = path.join(repo, ".agents", "skills");
  for (const dir of children(legacy)) {
    const destination = path.join(repoPaths(repo).skills, path.basename(dir));
    if (exists(destination) || !fs.existsSync(path.join(dir, "SKILL.md"))) continue;
    move(dir, destination);
    console.log(`[move   ] ${prettyPath(dir, repo)} -> ${prettyPath(destination, repo)}`);
  }
}

function migrateInstructions(repo: string, agents: readonly Agent[]) {
  const destination = path.join(repoPaths(repo).instructions, "AGENTS.md");
  if (exists(destination)) return;
  const source =
    ["codex/AGENTS.md", "claude/CLAUDE.md", "opencode/AGENTS.md", "gemini-cli/GEMINI.md"]
      .map((file) => path.join(repo, "configs", file))
      .find((file) => fs.statSync(file, { throwIfNoEntry: false })?.isFile()) ??
    // 1.x copied some agents' folders instead of linking them, so the repo
    // may have no instructions while this machine does.
    agents
      .flatMap((agent) => (agent.instructions ? [path.join(agent.home(), agent.instructions)] : []))
      .find((file) => fs.existsSync(file) && !linkTarget(file));
  if (!source) return;
  writeAtomic(destination, fs.readFileSync(source, "utf8"));
  console.log(`[create ] ${prettyPath(destination, repo)} from ${prettyPath(source, repo)}`);
}

function updateGitignore(repo: string) {
  const file = path.join(repo, ".gitignore");
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const lines = current.split("\n");
  const missing = GITIGNORE_LINES.filter((line) => !lines.includes(line));
  if (missing.length)
    writeAtomic(file, `${current.trimEnd()}\n${missing.join("\n")}\n`.trimStart());
}

export async function migrate(legacy: LegacyConfig, agentsFlag: AgentId[] | undefined) {
  const repo = path.resolve(legacy.repoPath);
  if (!exists(repo))
    throw new UserError(
      `The 1.x repo ${repo} no longer exists; delete ~/.syncode/config.json and run \`syncode init\` again.`,
    );
  console.log(`Migrating syncode 1.x setup in ${prettyPath(repo)}\n`);

  const mapped = legacy.agents.map((id) => RENAMED[id] ?? id);
  const agents = agentsFlag ?? [...new Set(mapped.filter(isAgentId))];
  const dropped = mapped.filter((id) => !isAgentId(id) && id !== "agents");

  restoreLegacyLinks(repo);
  migrateSkills(repo);
  migrateInstructions(repo, enabledAgents(agents));
  updateGitignore(repo);

  writeConfig({ version: 2, repo, agents });
  if (dropped.length) console.log(`\nNo longer managed by syncode: ${dropped.join(", ")}.`);

  console.log("");
  await apply(new Files({ repo, dryRun: false }), enabledAgents(agents));

  console.log(
    `\nMigrated. Your agents now use real folders again; the 1.x copies are still in ${prettyPath(path.join(repo, "configs"), repo)}.\n` +
      "Run `syncode adopt <path>` for each config file you want to keep syncing (for example ~/.claude/settings.json),\n" +
      "then delete configs/ and .agents/ from the repo and commit.",
  );
}
