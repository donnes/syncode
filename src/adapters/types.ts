/**
 * Adapter system types for multi-editor support
 */

export type Platform = "macos" | "linux" | "windows";

export type SyncStrategy = "symlink" | "copy" | "none";

export interface SyncOptions {
  import: SyncStrategy;
  export: SyncStrategy;
}

/**
 * Validation result for skills/configs
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Core adapter interface for editor/agent integrations
 */
export interface AgentAdapter {
  /** Unique identifier (e.g., "opencode", "claude", "cursor") */
  readonly id: string;

  /** Display name (e.g., "OpenCode", "Claude Code") */
  readonly name: string;

  /** Adapter version */
  readonly version: string;

  /** Sync strategy for this adapter */
  readonly syncStrategy: SyncOptions;

  /**
   * Get the system config path for this adapter
   * @param platform Target platform
   * @returns Path to where configs live on the system
   */
  getConfigPath(platform: Platform): string;

  /**
   * Get the skills/commands path for this adapter
   * @param platform Target platform
   * @returns Path to where skills/commands are stored
   */
  getSkillsPath?(platform: Platform): string;

  /**
   * Get the repository path for this adapter's configs
   * @param repoRoot Root of the dotfiles repository
   * @returns Path within repo where configs should be stored
   */
  getRepoPath(repoRoot: string): string;

  /**
   * Check if adapter is installed on system
   * @param platform Target platform
   * @returns true if editor/agent is installed
   */
  isInstalled(platform: Platform): boolean;

  /**
   * Import configs from system to repo
   * @param systemPath Path on system
   * @param repoPath Path in repo
   * @returns Import result
   */
  import(systemPath: string, repoPath: string): Promise<ImportResult>;

  /**
   * Export configs from repo to system
   * @param repoPath Path in repo
   * @param systemPath Path on system
   * @returns Export result
   */
  export(repoPath: string, systemPath: string): Promise<ExportResult>;

  /**
   * Check if system config is linked/synced with repo
   * @param systemPath Path on system
   * @param repoPath Path in repo
   * @returns true if synced
   */
  isLinked(systemPath: string, repoPath: string): boolean;

  /**
   * Convert from canonical skill format to adapter's format
   * @param skill Canonical skill representation
   * @returns Adapter-specific skill format
   */
  fromCanonical?(skill: CanonicalSkill): unknown;

  /**
   * Convert from adapter's format to canonical skill format
   * @param agentSkill Adapter-specific skill
   * @returns Canonical skill representation
   */
  toCanonical?(agentSkill: unknown): CanonicalSkill;

  /**
   * Validate adapter-specific skill format
   * @param skill Skill to validate
   * @returns Validation result
   */
  validate?(skill: unknown): ValidationResult;
}

/**
 * Import operation result
 */
export interface ImportResult {
  success: boolean;
  message: string;
  filesImported?: string[];
  errors?: string[];
}

/**
 * Export operation result
 */
export interface ExportResult {
  success: boolean;
  message: string;
  backedUp?: string;
  linkedTo?: string;
  errors?: string[];
}

/**
 * Canonical skill format (Phase 4)
 * This is a placeholder - will be fully implemented in Phase 4
 */
export interface CanonicalSkill {
  metadata: {
    id: string;
    name: string;
    version: string;
    type: "skill" | "command" | "agent";
    description: string;
    triggers: string[];
    keywords: string[];
    targets: string[];
    author?: string;
    license?: string;
  };
  content: string; // Markdown body
}

/**
 * Adapter registry entry
 */
export interface AdapterRegistryEntry {
  adapter: AgentAdapter;
  enabled: boolean;
}
