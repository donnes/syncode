/**
 * Codex adapter
 */

import { renameSync, unlinkSync, writeFileSync } from "node:fs";
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

// ~/.codex is symlinked into the repo, so Codex's runtime data (sqlite logs,
// sessions, worktrees, plugin binaries, auth.json) lands in the repo too.
// Track only real config.
const CODEX_GITIGNORE = `# Managed by syncode: only sync Codex config, not runtime data
/*
!/.gitignore
!/AGENTS.md
!/config.toml
!/prompts/
!/rules/
!/skills
/skills/.system/
`;

function writeCodexGitignore(repoPath: string): void {
  writeFileSync(join(repoPath, ".gitignore"), CODEX_GITIGNORE);
}

export class CodexAdapter implements AgentAdapter {
  readonly id = "codex";
  readonly name = "Codex";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "symlink" as const,
  };

  getConfigPath(_platform: Platform): string {
    return join(process.env.HOME || "", ".codex");
  }

  getSkillsPath(_platform: Platform): string {
    return getSharedSkillsPath();
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "codex");
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
        message: "Codex config not found on system",
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
    writeCodexGitignore(repoPath);

    return {
      success: true,
      message: "Imported Codex configs to repo",
    };
  }

  async export(repoPath: string, systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath)) {
      return {
        success: false,
        message: "Codex configs not found in repo",
      };
    }

    writeCodexGitignore(repoPath);

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
        renameSync(systemPath, backupPath);
      }
    }

    // Create symlink
    createSymlink(repoPath, systemPath);

    linkSharedSkillsInRepo(repoPath, getSharedSkillsRepoPath(repoPath));

    return {
      success: true,
      message: `Linked Codex configs to ${contractHome(systemPath)}`,
      linkedTo: repoPath,
    };
  }
}

export const codexAdapter = new CodexAdapter();
