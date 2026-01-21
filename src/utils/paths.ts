import { homedir } from "os";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { isMacOS } from "./platform";

// Home directory
export const HOME = homedir();

// Legacy repo root (for backward compatibility during migration)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LEGACY_REPO_ROOT = resolve(dirname(dirname(__dirname)));

/**
 * Get repository root path
 * Tries to read from config, falls back to legacy path for backward compatibility
 */
export function getRepoRoot(): string {
  // Import here to avoid circular dependency
  try {
    const { tryGetRepoRoot } = require("../config/manager");
    const configPath = tryGetRepoRoot();
    if (configPath) {
      return configPath;
    }
  } catch {
    // Config module not available or error reading config
  }

  // Fall back to legacy path
  return LEGACY_REPO_ROOT;
}

/**
 * Get configs directory in repo
 */
export function getConfigsDir(): string {
  return join(getRepoRoot(), "configs");
}

// Deprecated: Use getRepoRoot() instead
// Kept for backward compatibility during migration
export const REPO_ROOT = LEGACY_REPO_ROOT;

// Deprecated: Use getConfigsDir() instead
export const CONFIGS_DIR = join(LEGACY_REPO_ROOT, "configs");

// System paths - where configs live on the system
export const systemPaths = {
  zshrc: join(HOME, ".zshrc"),
  bashrc: join(HOME, ".bashrc"),
  opencode: join(HOME, ".config", "opencode"),
  claude: join(HOME, ".claude"),
  ghostty: isMacOS
    ? join(HOME, "Library", "Application Support", "com.mitchellh.ghostty", "config")
    : join(HOME, ".config", "ghostty", "config"),
  ssh: join(HOME, ".ssh", "config"),
  neovim: join(HOME, ".config", "nvim"),
  ohmyzsh: join(HOME, ".oh-my-zsh"),
  cursor: isMacOS
    ? join(HOME, "Library", "Application Support", "Cursor", "User")
    : join(HOME, ".config", "Cursor", "User"),
  windsurf: join(HOME, ".codeium", "windsurf"),
  vscode: isMacOS
    ? join(HOME, "Library", "Application Support", "Code", "User")
    : join(HOME, ".config", "Code", "User"),
};

/**
 * Get repo paths - where configs are stored in repo
 * Uses dynamic repo root from config
 */
export function getRepoPaths() {
  const configsDir = getConfigsDir();
  return {
    zshrc: join(configsDir, "dotfiles", ".zshrc"),
    bashrc: join(configsDir, "dotfiles", ".bashrc"),
    opencode: join(configsDir, "opencode"),
    claude: join(configsDir, "claude"),
    ghostty: join(configsDir, "ghostty", "config"),
    ssh: join(configsDir, "ssh", "config"),
    neovim: join(configsDir, "nvim"),
    brewfile: join(configsDir, "Brewfile"),
    packages: join(configsDir, "packages.txt"),
    cursor: join(configsDir, "cursor"),
    windsurf: join(configsDir, "windsurf"),
    vscode: join(configsDir, "vscode"),
  };
}

// Deprecated: Use getRepoPaths() instead
// Kept for backward compatibility during migration
export const repoPaths = {
  zshrc: join(CONFIGS_DIR, "dotfiles", ".zshrc"),
  bashrc: join(CONFIGS_DIR, "dotfiles", ".bashrc"),
  opencode: join(CONFIGS_DIR, "opencode"),
  claude: join(CONFIGS_DIR, "claude"),
  ghostty: join(CONFIGS_DIR, "ghostty", "config"),
  ssh: join(CONFIGS_DIR, "ssh", "config"),
  neovim: join(CONFIGS_DIR, "nvim"),
  brewfile: join(CONFIGS_DIR, "Brewfile"),
  packages: join(CONFIGS_DIR, "packages.txt"),
};

// Expand ~ to home directory
export function expandHome(path: string): string {
  if (path.startsWith("~/")) {
    return join(HOME, path.slice(2));
  }
  return path;
}

// Contract home directory to ~
export function contractHome(path: string): string {
  if (path.startsWith(HOME)) {
    return "~" + path.slice(HOME.length);
  }
  return path;
}
