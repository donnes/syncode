import { homedir } from "node:os";
import { join } from "node:path";
import { exists } from "./files.ts";

export interface Agent {
  id: string;
  name: string;
  /** Config home, honoring the agent's own override variable. */
  home: () => string;
  /** Global instructions file inside `home`, if the agent reads one. */
  instructions?: string;
  /**
   * Claude Code only reads `<home>/skills`. Every other agent here also reads
   * the shared `~/.agents/skills`, so they need no per-agent skill links.
   */
  ownSkills?: boolean;
}

function configHome(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
}

export const AGENTS = [
  {
    id: "claude",
    name: "Claude Code",
    home: () => process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"),
    instructions: "CLAUDE.md",
    ownSkills: true,
  },
  {
    id: "codex",
    name: "Codex",
    home: () => process.env.CODEX_HOME || join(homedir(), ".codex"),
    instructions: "AGENTS.md",
  },
  {
    id: "opencode",
    name: "OpenCode",
    home: () => join(configHome(), "opencode"),
    instructions: "AGENTS.md",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    home: () => join(homedir(), ".gemini"),
    instructions: "GEMINI.md",
  },
  // Cursor keeps global rules in its settings UI, not in a file.
  { id: "cursor", name: "Cursor", home: () => join(homedir(), ".cursor") },
  {
    id: "copilot",
    name: "GitHub Copilot CLI",
    home: () => join(homedir(), ".copilot"),
  },
] as const satisfies readonly Agent[];

export type AgentId = (typeof AGENTS)[number]["id"];

export function findAgent(id: string): Agent | undefined {
  return AGENTS.find((agent) => agent.id === id);
}

export function isAgentId(id: string): id is AgentId {
  return findAgent(id) !== undefined;
}

export function detectAgents(): AgentId[] {
  return AGENTS.filter((agent) => exists(agent.home())).map((agent) => agent.id);
}

export function sharedSkillsDir(): string {
  return join(homedir(), ".agents", "skills");
}

// Credentials that must never be committed, whatever agent they belong to.
const SECRET_NAMES = new Set([
  "auth.json",
  ".credentials.json",
  "credentials.json",
  "oauth_creds.json",
  "google_accounts.json",
  ".env",
]);

export function isSecretFile(name: string): boolean {
  return SECRET_NAMES.has(name) || name.startsWith(".env.") || /\.(pem|key)$/.test(name);
}
