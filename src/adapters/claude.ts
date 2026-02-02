/**
 * Claude Code adapter
 */

import { copyFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  copyDir,
  ensureDir,
  exists,
  isDirectory,
  isSymlink,
} from "../utils/fs";
import { contractHome } from "../utils/paths";
import type {
  AgentAdapter,
  CanonicalSkill,
  ExportResult,
  ImportResult,
  Platform,
} from "./types";

export class ClaudeAdapter implements AgentAdapter {
  readonly id = "claude";
  readonly name = "Claude Code";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "copy" as const, // Copy instead of symlink (Claude stores cache/history)
  };

  // Files/folders to sync (exclude cache, history, etc.)
  private syncPatterns = ["settings.json", "CLAUDE.md", "commands", "skills"];

  getConfigPath(platform: Platform): string {
    if (platform === "windows") {
      return join(process.env.APPDATA || "", "claude");
    }
    return join(process.env.HOME || "", ".claude");
  }

  getSkillsPath(platform: Platform): string {
    return join(this.getConfigPath(platform), "skills");
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "claude");
  }

  isInstalled(platform: Platform): boolean {
    return exists(this.getConfigPath(platform));
  }

  /**
   * Detect if Claude Code is installed on the current system
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
    // Claude uses copy strategy, not symlinks
    // So we consider it "linked" if the files exist in both places
    // (exact sync verification would require comparing file contents)
    return exists(systemPath) && exists(repoPath);
  }

  async import(systemPath: string, repoPath: string): Promise<ImportResult> {
    if (!exists(systemPath) || !isDirectory(systemPath)) {
      return {
        success: false,
        message: "Claude config not found on system",
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
        message:
          "No Claude configs found to import (settings.json, CLAUDE.md, commands/, skills/)",
      };
    }

    return {
      success: true,
      message: "Imported Claude configs to repo",
      filesImported,
    };
  }

  async export(repoPath: string, systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath) || !isDirectory(repoPath)) {
      return {
        success: false,
        message: "Claude configs not found in repo",
      };
    }

    // For Claude, we copy files rather than symlink the whole directory
    // because Claude stores cache/history there
    ensureDir(systemPath);

    const filesExported: string[] = [];

    for (const pattern of this.syncPatterns) {
      const srcPath = join(repoPath, pattern);
      const destPath = join(systemPath, pattern);

      if (!existsSync(srcPath)) continue;

      if (existsSync(destPath)) continue;

      if (statSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath);
        filesExported.push(`${pattern}/`);
      } else {
        ensureDir(dirname(destPath));
        copyFileSync(srcPath, destPath);
        filesExported.push(pattern);
      }
    }

    return {
      success: true,
      message: `Copied Claude configs to ${contractHome(systemPath)}`,
      linkedTo: filesExported.join(", "),
    };
  }

  // Template conversion methods (Phase 4)
  // Stub implementations for now
  fromCanonical(skill: CanonicalSkill): unknown {
    // TODO: Convert from canonical format to Claude skill format
    return skill;
  }

  toCanonical(agentSkill: unknown): CanonicalSkill {
    // TODO: Convert from Claude skill format to canonical format
    return agentSkill as CanonicalSkill;
  }
}

export const claudeAdapter = new ClaudeAdapter();
