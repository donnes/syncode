export interface ConfigHandler {
  name: string;
  description: string;
  systemPath: string | string[];
  repoPath: string | string[];
  isDirectory: boolean;

  // Check if config exists on system
  existsOnSystem(): boolean;

  // Check if config exists in repo
  existsInRepo(): boolean;

  // Check if system config is symlinked to repo
  isLinked(): boolean;

  // Import from system to repo
  import(): Promise<ImportResult>;

  // Export from repo to system (create symlink)
  export(): Promise<ExportResult>;

  // Get status/diff info
  getStatus(): ConfigStatus;
}

export interface ConfigStatus {
  name: string;
  existsOnSystem: boolean;
  existsInRepo: boolean;
  isLinked: boolean;
  hasDiff: boolean;
  linkTarget?: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  filesImported?: string[];
}

export interface ExportResult {
  success: boolean;
  message: string;
  backedUp?: string;
  linkedTo?: string;
}

export interface SyncOptions {
  configs: string[];
  direction: "import" | "export";
  dryRun?: boolean;
}

export type ConfigName =
  | "dotfiles"
  | "opencode"
  | "claude"
  | "ghostty"
  | "ssh"
  | "neovim"
  | "packages";

export interface DependencyStatus {
  name: string;
  installed: boolean;
  version?: string;
}
