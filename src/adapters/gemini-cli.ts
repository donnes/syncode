/**
 * Gemini CLI adapter
 */

import { unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  copyDir,
  createSymlink,
  ensureDir,
  exists,
  getSymlinkTarget,
  isSymlink,
  removeDir,
} from "../utils/fs";
import { contractHome } from "../utils/paths";
import {
  getSharedSkillsPath,
  getSharedSkillsRepoPath,
  linkSharedSkillsInRepo,
} from "./shared-skills";
import type {
  AgentAdapter,
  ExportResult,
  ImportResult,
  Platform,
} from "./types";

export class GeminiCliAdapter implements AgentAdapter {
  readonly id = "gemini-cli";
  readonly name = "Gemini CLI";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "symlink" as const,
  };

  getConfigPath(_platform: Platform): string {
    return join(process.env.HOME || "", ".gemini");
  }

  getSkillsPath(_platform: Platform): string {
    return getSharedSkillsPath();
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "gemini-cli");
  }

  isInstalled(platform: Platform): boolean {
    return exists(this.getConfigPath(platform));
  }

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
    if (!exists(systemPath) || !exists(repoPath) || !isSymlink(systemPath)) {
      return false;
    }
    return getSymlinkTarget(systemPath) === repoPath;
  }

  async import(systemPath: string, repoPath: string): Promise<ImportResult> {
    if (!exists(systemPath)) {
      return {
        success: false,
        message: "Gemini CLI config not found on system",
      };
    }

    if (isSymlink(systemPath)) {
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
    copyDir(systemPath, repoPath);

    return {
      success: true,
      message: "Imported Gemini CLI configs to repo",
    };
  }

  async export(repoPath: string, systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath)) {
      return {
        success: false,
        message: "Gemini CLI configs not found in repo",
      };
    }

    if (isSymlink(systemPath)) {
      const target = getSymlinkTarget(systemPath);
      if (target === repoPath) {
        return {
          success: true,
          message: "Already linked to repo - no export needed",
          linkedTo: repoPath,
        };
      }
    }

    // Remove existing (symlink or directory)
    if (exists(systemPath)) {
      if (isSymlink(systemPath)) {
        unlinkSync(systemPath);
      } else {
        // Backup existing config
        const backupPath = `${systemPath}.backup`;
        if (exists(backupPath)) {
          if (isSymlink(backupPath)) {
            unlinkSync(backupPath);
          } else {
            removeDir(backupPath);
          }
        }
        require("node:fs").renameSync(systemPath, backupPath);
      }
    }

    // Create symlink
    createSymlink(repoPath, systemPath);

    linkSharedSkillsInRepo(repoPath, getSharedSkillsRepoPath(repoPath));

    return {
      success: true,
      message: `Linked Gemini CLI configs to ${contractHome(systemPath)}`,
      linkedTo: repoPath,
    };
  }
}

export const geminiCliAdapter = new GeminiCliAdapter();
