/**
 * Configuration manager for ~/.config-sync/config.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import {
  GlobalConfig,
  DEFAULT_CONFIG,
  ConfigValidationResult,
  ConfigValidationError,
} from "./types";
import { expandHome } from "../utils/paths";

/** Path to global config directory */
export const CONFIG_DIR = join(homedir(), ".config-sync");

/** Path to global config file */
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

/**
 * Check if global config exists
 */
export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Read global configuration
 * @throws Error if config doesn't exist or is invalid JSON
 */
export function getConfig(): GlobalConfig {
  if (!configExists()) {
    throw new Error(
      `Configuration not found at ${CONFIG_FILE}. Run 'config-sync new' to set up.`
    );
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(content) as GlobalConfig;
    return config;
  } catch (error) {
    throw new Error(
      `Failed to read configuration from ${CONFIG_FILE}: ${error}`
    );
  }
}

/**
 * Try to get config, return null if doesn't exist
 */
export function tryGetConfig(): GlobalConfig | null {
  try {
    return getConfig();
  } catch {
    return null;
  }
}

/**
 * Write global configuration
 */
export function setConfig(config: GlobalConfig): void {
  ensureConfigDir();

  // Update timestamp
  config.updatedAt = new Date().toISOString();
  if (!config.createdAt) {
    config.createdAt = config.updatedAt;
  }

  const content = JSON.stringify(config, null, 2);
  writeFileSync(CONFIG_FILE, content, "utf-8");
}

/**
 * Update specific config fields
 */
export function updateConfig(
  updates: Partial<GlobalConfig>
): void {
  const config = getConfig();
  const updated = { ...config, ...updates };
  setConfig(updated);
}

/**
 * Get repository root path from config
 */
export function getRepoRoot(): string {
  const config = getConfig();
  return expandHome(config.repoPath);
}

/**
 * Try to get repo root, return null if config doesn't exist
 */
export function tryGetRepoRoot(): string | null {
  const config = tryGetConfig();
  return config ? expandHome(config.repoPath) : null;
}

/**
 * Validate configuration
 */
export function validateConfig(config: GlobalConfig): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];

  // Check version
  if (!config.version) {
    errors.push({
      field: "version",
      message: "Version is required",
    });
  }

  // Check repoPath
  if (!config.repoPath) {
    errors.push({
      field: "repoPath",
      message: "Repository path is required",
    });
  }

  // Check agents is array
  if (!Array.isArray(config.agents)) {
    errors.push({
      field: "agents",
      message: "Agents must be an array",
    });
  }

  // Check features
  if (!config.features) {
    errors.push({
      field: "features",
      message: "Features configuration is required",
    });
  } else {
    if (typeof config.features.autoSync !== "boolean") {
      errors.push({
        field: "features.autoSync",
        message: "autoSync must be a boolean",
      });
    }
    if (typeof config.features.backupBeforeExport !== "boolean") {
      errors.push({
        field: "features.backupBeforeExport",
        message: "backupBeforeExport must be a boolean",
      });
    }
    if (typeof config.features.smartSyncDefaults !== "boolean") {
      errors.push({
        field: "features.smartSyncDefaults",
        message: "smartSyncDefaults must be a boolean",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create initial configuration
 */
export function initConfig(options: {
  repoPath: string;
  remote?: string;
  agents?: string[];
}): GlobalConfig {
  const config: GlobalConfig = {
    ...DEFAULT_CONFIG,
    repoPath: options.repoPath,
    remote: options.remote,
    agents: options.agents || [],
  };

  setConfig(config);
  return config;
}
