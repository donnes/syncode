import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Platform } from "../adapters/types";

export interface AgentMetadata {
  id: string;
  displayName: string;
  configDir: string;
  windowsConfigDir?: string;
  detectInstalled: (platform: Platform) => boolean;
  hasAdapter: boolean;
}

const home = homedir();

export const agentMetadata: Record<string, AgentMetadata> = {
  amp: {
    id: "amp",
    displayName: "Amp",
    configDir: join(home, ".config/amp"),
    detectInstalled: () => existsSync(join(home, ".config/amp")),
    hasAdapter: true,
  },

  antigravity: {
    id: "antigravity",
    displayName: "Antigravity",
    configDir: join(home, ".gemini/antigravity"),
    detectInstalled: () =>
      existsSync(join(process.cwd(), ".agent")) ||
      existsSync(join(home, ".gemini/antigravity")),
    hasAdapter: true,
  },

  claude: {
    id: "claude",
    displayName: "Claude Code",
    configDir: join(home, ".claude"),
    windowsConfigDir: join(process.env.APPDATA || "", "claude"),
    detectInstalled: (platform) => {
      if (platform === "windows") {
        return existsSync(join(process.env.APPDATA || "", "claude"));
      }
      return existsSync(join(home, ".claude"));
    },
    hasAdapter: true,
  },

  clawdbot: {
    id: "clawdbot",
    displayName: "Clawdbot",
    configDir: join(home, ".clawdbot"),
    detectInstalled: () => existsSync(join(home, ".clawdbot")),
    hasAdapter: true,
  },

  codex: {
    id: "codex",
    displayName: "Codex",
    configDir: join(home, ".codex"),
    detectInstalled: () => existsSync(join(home, ".codex")),
    hasAdapter: true,
  },

  cursor: {
    id: "cursor",
    displayName: "Cursor",
    configDir: (() => {
      if (process.platform === "darwin") {
        return join(home, "Library/Application Support/Cursor/User");
      } else if (process.platform === "linux") {
        return join(home, ".config/Cursor/User");
      }
      return join(process.env.APPDATA || "", "Cursor/User");
    })(),
    detectInstalled: (platform) => {
      if (platform === "macos") {
        return existsSync(join(home, "Library/Application Support/Cursor"));
      } else if (platform === "linux") {
        return existsSync(join(home, ".config/Cursor"));
      }
      return existsSync(join(process.env.APPDATA || "", "Cursor"));
    },
    hasAdapter: true,
  },

  droid: {
    id: "droid",
    displayName: "Droid",
    configDir: join(home, ".factory"),
    detectInstalled: () => existsSync(join(home, ".factory/skills")),
    hasAdapter: true,
  },

  "gemini-cli": {
    id: "gemini-cli",
    displayName: "Gemini CLI",
    configDir: join(home, ".gemini"),
    detectInstalled: () => existsSync(join(home, ".gemini")),
    hasAdapter: true,
  },

  "github-copilot": {
    id: "github-copilot",
    displayName: "GitHub Copilot",
    configDir: join(home, ".copilot"),
    detectInstalled: () =>
      existsSync(join(process.cwd(), ".github")) ||
      existsSync(join(home, ".copilot")),
    hasAdapter: true,
  },

  goose: {
    id: "goose",
    displayName: "Goose",
    configDir: join(home, ".config/goose"),
    detectInstalled: () => existsSync(join(home, ".config/goose")),
    hasAdapter: true,
  },

  kilo: {
    id: "kilo",
    displayName: "Kilo Code",
    configDir: join(home, ".kilocode"),
    detectInstalled: () => existsSync(join(home, ".kilocode")),
    hasAdapter: true,
  },

  "kiro-cli": {
    id: "kiro-cli",
    displayName: "Kiro CLI",
    configDir: join(home, ".kiro"),
    detectInstalled: () => existsSync(join(home, ".kiro")),
    hasAdapter: true,
  },

  opencode: {
    id: "opencode",
    displayName: "OpenCode",
    configDir: join(home, ".config/opencode"),
    detectInstalled: () =>
      existsSync(join(home, ".config/opencode")) ||
      existsSync(join(home, ".claude/skills")),
    hasAdapter: true,
  },

  roo: {
    id: "roo",
    displayName: "Roo Code",
    configDir: join(home, ".roo"),
    detectInstalled: () => existsSync(join(home, ".roo")),
    hasAdapter: true,
  },

  trae: {
    id: "trae",
    displayName: "Trae",
    configDir: join(home, ".trae"),
    detectInstalled: () => existsSync(join(home, ".trae")),
    hasAdapter: true,
  },

  vscode: {
    id: "vscode",
    displayName: "Visual Studio Code",
    configDir: (() => {
      if (process.platform === "darwin") {
        return join(home, "Library/Application Support/Code/User");
      } else if (process.platform === "linux") {
        return join(home, ".config/Code/User");
      }
      return join(process.env.APPDATA || "", "Code/User");
    })(),
    detectInstalled: (platform) => {
      if (platform === "macos") {
        return existsSync(join(home, "Library/Application Support/Code"));
      } else if (platform === "linux") {
        return existsSync(join(home, ".config/Code"));
      }
      return existsSync(join(process.env.APPDATA || "", "Code"));
    },
    hasAdapter: true,
  },

  windsurf: {
    id: "windsurf",
    displayName: "Windsurf",
    configDir: join(home, ".codeium/windsurf"),
    detectInstalled: () => existsSync(join(home, ".codeium/windsurf")),
    hasAdapter: true,
  },
};
export function getAllAgentIds(): string[] {
  return Object.keys(agentMetadata);
}
export function getAgentMetadata(agentId: string): AgentMetadata | undefined {
  return agentMetadata[agentId];
}
export function isAgentInstalled(agentId: string, platform: Platform): boolean {
  const metadata = agentMetadata[agentId];
  if (!metadata) return false;
  return metadata.detectInstalled(platform);
}
export function detectInstalledAgents(platform: Platform): string[] {
  const installed: string[] = [];

  for (const [agentId, metadata] of Object.entries(agentMetadata)) {
    if (metadata.detectInstalled(platform)) {
      installed.push(agentId);
    }
  }

  return installed;
}
export function getAgentsWithAdapters(): string[] {
  return Object.entries(agentMetadata)
    .filter(([_, metadata]) => metadata.hasAdapter)
    .map(([agentId]) => agentId);
}
export function getAgentsWithoutAdapters(): string[] {
  return Object.entries(agentMetadata)
    .filter(([_, metadata]) => !metadata.hasAdapter)
    .map(([agentId]) => agentId);
}
