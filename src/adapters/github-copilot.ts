/**
 * GitHub Copilot adapter
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

export class GithubCopilotAdapter implements AgentAdapter {
  readonly id = "github-copilot";
  readonly name = "GitHub Copilot";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "symlink" as const,
  };

  getConfigPath(_platform: Platform): string {
    return join(process.env.HOME || "", ".copilot");
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "github-copilot");
  }

  isInstalled(platform: Platform): boolean {
    const homePath = this.getConfigPath(platform);
    const projectPath = join(process.cwd(), ".github");
    return exists(homePath) || exists(projectPath);
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
        message: "GitHub Copilot config not found on system",
      };
    }

    ensureDir(repoPath);
    copyDir(systemPath, repoPath);

    return {
      success: true,
      message: "Imported GitHub Copilot configs to repo",
    };
  }

  async export(repoPath: string, systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath)) {
      return {
        success: false,
        message: "GitHub Copilot configs not found in repo",
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
      message: `Linked GitHub Copilot configs to ${contractHome(systemPath)}`,
      linkedTo: repoPath,
    };
  }
}

export const githubCopilotAdapter = new GithubCopilotAdapter();
