import * as fs from "node:fs";
import * as path from "node:path";
import { type AgentId, isAgentId } from "./agents.ts";
import { UserError } from "./errors.ts";
import { writeAtomic } from "./files.ts";
import { expandHome, syncodeDir } from "./paths.ts";

export interface Config {
  version: 2;
  /** Absolute path of the configs repository. */
  repo: string;
  agents: AgentId[];
}

/** The 1.x config, kept only to migrate from it. */
export interface LegacyConfig {
  repoPath: string;
  agents: string[];
}

export type StoredConfig =
  | { kind: "current"; config: Config }
  | { kind: "legacy"; config: LegacyConfig };

function configFile(): string {
  return path.join(syncodeDir(), "config.json");
}

export function defaultRepo(): string {
  return path.join(syncodeDir(), "repo");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function readConfig(): StoredConfig | undefined {
  const file = configFile();
  if (!fs.existsSync(file)) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw new UserError(`${file} is not valid JSON; fix or delete it, then rerun.`);
  }
  if (!isRecord(value)) throw new UserError(`${file} must contain a JSON object.`);

  if (value.version === 2 && typeof value.repo === "string" && isStringArray(value.agents)) {
    const unknown = value.agents.filter((id) => !isAgentId(id));
    if (unknown.length) {
      console.warn(`Ignoring unknown agents in ${file}: ${unknown.join(", ")}`);
    }
    return {
      kind: "current",
      config: {
        version: 2,
        repo: path.resolve(expandHome(value.repo)),
        agents: value.agents.filter(isAgentId),
      },
    };
  }
  if (typeof value.repoPath === "string" && isStringArray(value.agents)) {
    return {
      kind: "legacy",
      config: { repoPath: path.resolve(expandHome(value.repoPath)), agents: value.agents },
    };
  }
  throw new UserError(`${file} is not a syncode config; fix or delete it, then rerun.`);
}

export function requireConfig(): Config {
  const stored = readConfig();
  if (!stored) throw new UserError("syncode is not set up yet. Run `syncode init` first.");
  if (stored.kind === "legacy") {
    throw new UserError("Found a syncode 1.x setup. Run `syncode init` to migrate it.");
  }
  return stored.config;
}

export function writeConfig(config: Config) {
  writeAtomic(configFile(), `${JSON.stringify(config, null, 2)}\n`);
}
