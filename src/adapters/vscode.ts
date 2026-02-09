/**
 * VSCode adapter
 */

import {
  copyFileSync,
  existsSync,
  renameSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  copyDir,
  ensureDir,
  exists,
  getSymlinkTarget,
  isDirectory,
  isSymlink,
  removeDir,
} from "../utils/fs";
import { contractHome } from "../utils/paths";
import { getSharedSkillsPath, linkSharedSkillsOnSystem } from "./shared-skills";
import type {
  AgentAdapter,
  CanonicalSkill,
  ExportResult,
  ImportResult,
  Platform,
} from "./types";

export class VSCodeAdapter implements AgentAdapter {
  readonly id = "vscode";
  readonly name = "VSCode";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "symlink" as const,
  };

  // Files to sync
  private syncPatterns = [
    "settings.json",
    "keybindings.json",
    "snippets",
    "tasks.json",
    "launch.json",
  ];

  getConfigPath(platform: Platform): string {
    if (platform === "macos") {
      return join(
        process.env.HOME || "",
        "Library",
        "Application Support",
        "Code",
        "User",
      );
    } else if (platform === "linux") {
      return join(process.env.HOME || "", ".config", "Code", "User");
    } else {
      // Windows
      return join(process.env.APPDATA || "", "Code", "User");
    }
  }

  getSkillsPath(_platform: Platform): string {
    return getSharedSkillsPath();
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "vscode");
  }

  isInstalled(platform: Platform): boolean {
    const configPath = this.getConfigPath(platform);
    // Check if parent directory exists
    const parentDir = dirname(configPath);
    return exists(parentDir);
  }

  /**
   * Detect if VSCode is installed on the current system
   */
  detect(): boolean {
    const platform =
      process.platform === "darwin"
        ? "macos"
        : process.platform === "win32"
          ? "windows"
          : "linux";
    return this.isInstalled(platform);
  }

  isLinked(systemPath: string, repoPath: string): boolean {
    // Check if settings.json is symlinked
    const settingsPath = join(systemPath, "settings.json");
    const repoSettingsPath = join(repoPath, "settings.json");

    if (!isSymlink(settingsPath)) return false;

    const target = getSymlinkTarget(settingsPath);
    return target === repoSettingsPath;
  }

  async import(systemPath: string, repoPath: string): Promise<ImportResult> {
    if (!exists(systemPath) || !isDirectory(systemPath)) {
      return {
        success: false,
        message: "VSCode config not found on system",
      };
    }

    ensureDir(repoPath);

    const filesImported: string[] = [];

    for (const pattern of this.syncPatterns) {
      const srcPath = join(systemPath, pattern);
      const destPath = join(repoPath, pattern);

      if (!existsSync(srcPath)) continue;

      if (isSymlink(srcPath)) continue;

      if (existsSync(destPath)) continue;

      if (statSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath);
        filesImported.push(`${pattern}/`);
      } else {
        ensureDir(dirname(destPath));
        copyFileSync(srcPath, destPath);
        filesImported.push(pattern);
      }
    }

    if (filesImported.length === 0) {
      return {
        success: true,
        message: "No VSCode configs found to import",
      };
    }

    linkSharedSkillsOnSystem(join(systemPath, "skills"));

    return {
      success: true,
      message: "Imported VSCode configs to repo",
      filesImported,
    };
  }

  async export(repoPath: string, systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath) || !isDirectory(repoPath)) {
      return {
        success: false,
        message: "VSCode configs not found in repo",
      };
    }

    ensureDir(systemPath);

    const filesExported: string[] = [];
    let backedUp: string | undefined;

    for (const pattern of this.syncPatterns) {
      const srcPath = join(repoPath, pattern);
      const destPath = join(systemPath, pattern);

      if (!existsSync(srcPath)) continue;

      if (isSymlink(destPath)) {
        const target = getSymlinkTarget(destPath);
        if (target === srcPath) {
          continue;
        }
        unlinkSync(destPath);
      } else if (exists(destPath)) {
        const backupPath = `${destPath}.backup`;
        if (exists(backupPath)) {
          if (isDirectory(backupPath)) {
            removeDir(backupPath);
          } else {
            unlinkSync(backupPath);
          }
        }
        renameSync(destPath, backupPath);
        if (!backedUp) {
          backedUp = contractHome(dirname(backupPath));
        }
      }

      // Create symlink
      symlinkSync(srcPath, destPath);
      filesExported.push(pattern);
    }

    return {
      success: true,
      message: `Linked VSCode configs to ${contractHome(systemPath)}`,
      backedUp,
      linkedTo: contractHome(repoPath),
    };
  }

  // Template conversion methods (Phase 4)
  fromCanonical(skill: CanonicalSkill): unknown {
    // VSCode doesn't have a native skills/commands system like OpenCode
    // This would be used for sharing tasks/launch configs
    return skill;
  }

  toCanonical(agentSkill: unknown): CanonicalSkill {
    return agentSkill as CanonicalSkill;
  }
}

export const vscodeAdapter = new VSCodeAdapter();
