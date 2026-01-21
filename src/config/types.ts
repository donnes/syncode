/**
 * Global configuration for syncode CLI
 * Stored in ~/.syncode/config.json
 */

export interface GlobalConfig {
  /** Config schema version for migrations */
  version: string;

  /** Path to dotfiles repository */
  repoPath: string;

  /** Git remote URL (optional) */
  remote?: string;

  /** Enabled agents */
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

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: GlobalConfig = {
  version: "1.0.0",
  repoPath: "~/agent-configs",
  agents: [],
  features: {
    autoSync: false,
    backupBeforeExport: true,
    smartSyncDefaults: true,
  },
};

/**
 * Available agent IDs
 */
export const SUPPORTED_AGENTS = [
  "amp",
  "antigravity",
  "claude",
  "clawdbot",
  "codex",
  "cursor",
  "droid",
  "gemini-cli",
  "github-copilot",
  "goose",
  "kilo",
  "kiro-cli",
  "opencode",
  "roo",
  "trae",
  "vscode",
  "windsurf",
] as const;

export type SupportedAgent = (typeof SUPPORTED_AGENTS)[number];
