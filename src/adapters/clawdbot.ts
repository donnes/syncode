/**
 * Clawdbot adapter
 */

import { existsSync } from "node:fs";
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
import type {
  AgentAdapter,
  ExportResult,
  ImportResult,
  Platform,
} from "./types";

export class ClawdbotAdapter implements AgentAdapter {
  readonly id = "clawdbot";
  readonly name = "Clawdbot";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "symlink" as const,
  };

  configPaths = [
    join(process.env.HOME || "", ".clawd"),
    join(process.env.HOME || "", ".clawdbot"),
  ];

  getConfigPath(_platform: Platform): string {
    for (const path of this.configPaths) {
      if (exists(path)) {
        return path;
      }
    }
    return this.configPaths[0]!;
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "clawdbot");
  }

  isInstalled(_platform: Platform): boolean {
    return this.configPaths.some((path) => existsSync(path));
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
        message: "Clawdbot config not found on system",
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
      message: "Imported Clawdbot configs to repo",
    };
  }

  async export(repoPath: string, _systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath)) {
      return {
        success: false,
        message: "Clawdbot configs not found in repo",
      };
    }

    const existingPaths = this.configPaths.filter((p) => existsSync(p));

    if (existingPaths.length > 1) {
      return {
        success: false,
        message:
          "Multiple config paths exist (~/.clawd and ~/.clawdbot). Please manually delete one and retry.",
      };
    }

    return this.performExport(
      repoPath,
      existingPaths[0] || this.configPaths[0]!,
    );
  }

  private async performExport(
    repoPath: string,
    systemPath: string,
  ): Promise<ExportResult> {
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

    if (exists(systemPath) && !isSymlink(systemPath)) {
      const backupPath = `${systemPath}.backup`;
      if (exists(backupPath)) {
        removeDir(backupPath);
      }
      require("node:fs").renameSync(systemPath, backupPath);
    }

    createSymlink(repoPath, systemPath);

    return {
      success: true,
      message: `Linked Clawdbot configs to ${contractHome(systemPath)}`,
      linkedTo: repoPath,
    };
  }
}

export const clawdbotAdapter = new ClawdbotAdapter();
