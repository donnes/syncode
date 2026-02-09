/**
 * Devin adapter
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

export class DevinAdapter implements AgentAdapter {
  readonly id = "devin";
  readonly name = "Devin";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "symlink" as const,
  };

  private getConfigPaths(platform: Platform): string[] {
    if (platform === "windows") {
      return [join(process.env.APPDATA || "", "devin")];
    }
    return [
      join(process.env.HOME || "", ".devin"),
      join(process.env.HOME || "", ".config", "devin"),
    ];
  }

  getConfigPath(platform: Platform): string {
    for (const path of this.getConfigPaths(platform)) {
      if (exists(path)) {
        return path;
      }
    }
    return this.getConfigPaths(platform)[0]!;
  }

  getSkillsPath(_platform: Platform): string {
    return getSharedSkillsPath();
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "devin");
  }

  isInstalled(platform: Platform): boolean {
    return this.getConfigPaths(platform).some((path) => exists(path));
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
        message: "Devin config not found on system",
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
      message: "Imported Devin configs to repo",
    };
  }

  async export(repoPath: string, systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath)) {
      return {
        success: false,
        message: "Devin configs not found in repo",
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

    if (exists(systemPath)) {
      if (isSymlink(systemPath)) {
        unlinkSync(systemPath);
      } else {
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

    createSymlink(repoPath, systemPath);

    linkSharedSkillsInRepo(repoPath, getSharedSkillsRepoPath(repoPath));

    return {
      success: true,
      message: `Linked Devin configs to ${contractHome(systemPath)}`,
      linkedTo: repoPath,
    };
  }
}

export const devinAdapter = new DevinAdapter();
