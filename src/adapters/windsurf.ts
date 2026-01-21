/**
 * Windsurf adapter
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
import type {
  AgentAdapter,
  CanonicalSkill,
  ExportResult,
  ImportResult,
  Platform,
} from "./types";

export class WindsurfAdapter implements AgentAdapter {
  readonly id = "windsurf";
  readonly name = "Windsurf";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "symlink" as const,
  };

  // Files to sync
  private syncPatterns = [
    "settings.json",
    "mcp_config.json",
    "rules", // .windsurf/rules/ directory
  ];

  getConfigPath(_platform: Platform): string {
    // Windsurf uses ~/.codeium/windsurf on all platforms
    return join(process.env.HOME || "", ".codeium", "windsurf");
  }

  getSkillsPath(platform: Platform): string {
    return join(this.getConfigPath(platform), "rules");
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "windsurf");
  }

  isInstalled(platform: Platform): boolean {
    const configPath = this.getConfigPath(platform);
    return exists(configPath);
  }

  /**
   * Detect if Windsurf is installed on the current system
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
        message: "Windsurf config not found on system",
      };
    }

    ensureDir(repoPath);

    const filesImported: string[] = [];

    for (const pattern of this.syncPatterns) {
      const srcPath = join(systemPath, pattern);
      const destPath = join(repoPath, pattern);

      if (!existsSync(srcPath)) continue;

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
        message: "No Windsurf configs found to import",
      };
    }

    return {
      success: true,
      message: "Imported Windsurf configs to repo",
      filesImported,
    };
  }

  async export(repoPath: string, systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath) || !isDirectory(repoPath)) {
      return {
        success: false,
        message: "Windsurf configs not found in repo",
      };
    }

    ensureDir(systemPath);

    const filesExported: string[] = [];
    let backedUp: string | undefined;

    for (const pattern of this.syncPatterns) {
      const srcPath = join(repoPath, pattern);
      const destPath = join(systemPath, pattern);

      if (!existsSync(srcPath)) continue;

      // Backup existing file/dir if not a symlink
      if (exists(destPath) && !isSymlink(destPath)) {
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
      } else if (isSymlink(destPath)) {
        unlinkSync(destPath);
      }

      // Create symlink
      symlinkSync(srcPath, destPath);
      filesExported.push(pattern);
    }

    return {
      success: true,
      message: `Linked Windsurf configs to ${contractHome(systemPath)}`,
      backedUp,
      linkedTo: contractHome(repoPath),
    };
  }

  // Template conversion methods (Phase 4)
  fromCanonical(skill: CanonicalSkill): unknown {
    // TODO: Convert from canonical format to Windsurf rules format
    return skill;
  }

  toCanonical(agentSkill: unknown): CanonicalSkill {
    // TODO: Convert from Windsurf rules to canonical format
    return agentSkill as CanonicalSkill;
  }
}

export const windsurfAdapter = new WindsurfAdapter();
