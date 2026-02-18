/**
 * Global configuration for syncode CLI
 * Stored in ~/.syncode/config.json
 */

export interface GlobalConfig {
  /** Config schema version for migrations */
  version: string;

  /** Path to configs repository */
  repoPath: string;

  /** Git remote URL (optional) */
  remote?: string;

  /** Enabled sync targets (agents and dotfiles) */
  agents: string[];

  /** Feature flags and preferences */
  features: {
    /** Auto-sync on system changes */
    autoSync: boolean;

    /** Create backups before export operations */
    backupBeforeExport: boolean;

    /** Use smart sync defaults per agent */
    smartSyncDefaults: boolean;
  };

  /** When config was created */
  createdAt?: string;

  /** Last modified timestamp */
  updatedAt?: string;
}

export interface ConfigValidationError {
  field: string;
  message: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
}

export const DEFAULT_CONFIG: GlobalConfig = {
  version: "1.0.0",
  repoPath: "~/.syncode/repo",
  agents: [],
  features: {
    autoSync: false,
    backupBeforeExport: true,
    smartSyncDefaults: true,
  },
};

export const SUPPORTED_AGENTS = [
  "agents",
  "amp",
  "antigravity",
  "claude",
  "clawdbot",
  "codex",
  "cursor",
  "devin",
  "dotfiles",
  "droid",
  "gemini-cli",
  "github-copilot",
  "goose",
  "kilo",
  "kimi-cli",
  "kiro-cli",
  "opencode",
  "roo",
  "trae",
  "vscode",
  "windsurf",
] as const;

export type SupportedAgent = (typeof SUPPORTED_AGENTS)[number];
