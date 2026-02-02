/**
 * OpenCode adapter
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

export class OpenCodeAdapter implements AgentAdapter {
  readonly id = "opencode";
  readonly name = "OpenCode";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "symlink" as const,
  };

  // Files/folders to sync (exclude node_modules, cache, etc.)
  private syncPatterns = ["opencode.json", "command", "agent", "skill"];

  getConfigPath(platform: Platform): string {
    // OpenCode uses XDG on all platforms
    if (platform === "windows") {
      return join(process.env.APPDATA || "", "opencode");
    }
    return join(process.env.HOME || "", ".config", "opencode");
  }

  getSkillsPath(platform: Platform): string {
    return join(this.getConfigPath(platform), "skill");
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "opencode");
  }

  isInstalled(platform: Platform): boolean {
    return exists(this.getConfigPath(platform));
  }

  /**
   * Detect if OpenCode is installed on the current system
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
    if (!isSymlink(systemPath)) return false;
    const target = getSymlinkTarget(systemPath);
    return target === repoPath;
  }

  async import(systemPath: string, repoPath: string): Promise<ImportResult> {
    if (!exists(systemPath) || !isDirectory(systemPath)) {
      return {
        success: false,
        message: "OpenCode config not found on system",
      };
    }

    // If already linked, no import needed
    if (this.isLinked(systemPath, repoPath)) {
      return {
        success: true,
        message: "Already linked to repo - no import needed",
      };
    }

    if (exists(repoPath)) {
      return {
        success: true,
        message: "Configs already in repo - no import needed",
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

    return {
      success: true,
      message: "Imported OpenCode configs to repo",
      filesImported,
    };
  }

  async export(repoPath: string, systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath) || !isDirectory(repoPath)) {
      return {
        success: false,
        message: "OpenCode configs not found in repo",
      };
    }

    if (isSymlink(systemPath)) {
      const target = getSymlinkTarget(systemPath);
      if (target === repoPath) {
        return {
          success: true,
          message: "Already linked to repo - no export needed",
          linkedTo: contractHome(repoPath),
        };
      }
    }

    // Backup existing directory if it exists and isn't a symlink
    let backedUp: string | undefined;
    if (exists(systemPath) && !isSymlink(systemPath)) {
      const backupPath = `${systemPath}.backup`;
      if (exists(backupPath)) {
        removeDir(backupPath);
      }
      renameSync(systemPath, backupPath);
      backedUp = contractHome(backupPath);
    } else if (isSymlink(systemPath)) {
      unlinkSync(systemPath);
    }

    // Create symlink
    ensureDir(dirname(systemPath));
    symlinkSync(repoPath, systemPath);

    return {
      success: true,
      message: `Linked ${contractHome(systemPath)} → repo`,
      backedUp,
      linkedTo: contractHome(repoPath),
    };
  }

  // Template conversion methods (Phase 4)
  // Stub implementations for now
  fromCanonical(skill: CanonicalSkill): unknown {
    // TODO: Convert from canonical format to OpenCode skill format
    return skill;
  }

  toCanonical(agentSkill: unknown): CanonicalSkill {
    // TODO: Convert from OpenCode skill format to canonical format
    return agentSkill as CanonicalSkill;
  }
}

export const opencodeAdapter = new OpenCodeAdapter();
