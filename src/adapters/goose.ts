/**
 * Goose adapter
 */

import { unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  copyDir,
  createSymlink,
  ensureDir,
  exists,
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

export class GooseAdapter implements AgentAdapter {
  readonly id = "goose";
  readonly name = "Goose";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "symlink" as const,
  };

  getConfigPath(_platform: Platform): string {
    return join(process.env.HOME || "", ".config/goose");
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "goose");
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
    return exists(systemPath) && exists(repoPath) && isSymlink(systemPath);
  }

  async import(systemPath: string, repoPath: string): Promise<ImportResult> {
    if (!exists(systemPath)) {
      return {
        success: false,
        message: "Goose config not found on system",
      };
    }

    ensureDir(repoPath);
    copyDir(systemPath, repoPath);

    return {
      success: true,
      message: "Imported Goose configs to repo",
    };
  }

  async export(repoPath: string, systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath)) {
      return {
        success: false,
        message: "Goose configs not found in repo",
      };
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

    return {
      success: true,
      message: `Linked Goose configs to ${contractHome(systemPath)}`,
      linkedTo: repoPath,
    };
  }
}

export const gooseAdapter = new GooseAdapter();
