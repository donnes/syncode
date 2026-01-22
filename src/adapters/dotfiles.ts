/**
 * Dotfiles adapter
 */

import {
  chmodSync,
  copyFileSync,
  existsSync,
  renameSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  copyDir,
  ensureDir,
  exists,
  getSymlinkTarget,
  isDirectory,
  isSymlink,
  removeDir,
} from "../utils/fs";
import { contractHome, HOME } from "../utils/paths";
import { isMacOS } from "../utils/platform";
import type {
  AgentAdapter,
  ExportResult,
  ImportResult,
  Platform,
} from "./types";

interface DotfileMapping {
  repoPath: string;
  systemPath: string;
  isDir: boolean;
  optional: boolean;
}

export class DotfilesAdapter implements AgentAdapter {
  readonly id = "dotfiles";
  readonly name = "Dotfiles";
  readonly version = "1.0.0";
  readonly syncStrategy = {
    import: "copy" as const,
    export: "symlink" as const,
  };

  private getGhosttyPath(): string {
    return isMacOS
      ? join(
          HOME,
          "Library",
          "Application Support",
          "com.mitchellh.ghostty",
          "config",
        )
      : join(HOME, ".config", "ghostty", "config");
  }

  private get dotfilesList(): DotfileMapping[] {
    return [
      {
        repoPath: ".zshrc",
        systemPath: join(HOME, ".zshrc"),
        isDir: false,
        optional: false,
      },
      {
        repoPath: ".bashrc",
        systemPath: join(HOME, ".bashrc"),
        isDir: false,
        optional: false,
      },
      {
        repoPath: ".tmux.conf",
        systemPath: join(HOME, ".tmux.conf"),
        isDir: false,
        optional: true,
      },
      {
        repoPath: ".ssh/config",
        systemPath: join(HOME, ".ssh", "config"),
        isDir: false,
        optional: false,
      },
      {
        repoPath: ".config/ghostty/config",
        systemPath: this.getGhosttyPath(),
        isDir: false,
        optional: true,
      },
      {
        repoPath: ".config/nvim",
        systemPath: join(HOME, ".config", "nvim"),
        isDir: true,
        optional: true,
      },
    ];
  }

  getConfigPath(_platform: Platform): string {
    return HOME;
  }

  getRepoPath(repoRoot: string): string {
    return join(repoRoot, "configs", "dotfiles");
  }

  isInstalled(_platform: Platform): boolean {
    return true;
  }

  detect(): boolean {
    return true;
  }

  isLinked(_systemPath: string, repoPath: string): boolean {
    for (const mapping of this.dotfilesList) {
      const systemFile = mapping.systemPath;
      const repoFile = join(repoPath, mapping.repoPath);

      if (!isSymlink(systemFile)) continue;

      const target = getSymlinkTarget(systemFile);
      if (target === repoFile) {
        return true;
      }
    }
    return false;
  }

  async import(_systemPath: string, repoPath: string): Promise<ImportResult> {
    ensureDir(repoPath);

    const filesImported: string[] = [];
    const errors: string[] = [];

    for (const mapping of this.dotfilesList) {
      const srcPath = mapping.systemPath;
      const destPath = join(repoPath, mapping.repoPath);

      if (!existsSync(srcPath)) {
        if (!mapping.optional) {
          errors.push(`${mapping.repoPath} not found on system`);
        }
        continue;
      }

      try {
        if (mapping.isDir) {
          if (!statSync(srcPath).isDirectory()) {
            errors.push(`${mapping.repoPath} expected to be directory`);
            continue;
          }
          copyDir(srcPath, destPath);
          filesImported.push(`${mapping.repoPath}/`);
        } else {
          if (statSync(srcPath).isDirectory()) {
            errors.push(`${mapping.repoPath} expected to be file`);
            continue;
          }
          ensureDir(dirname(destPath));
          copyFileSync(srcPath, destPath);
          filesImported.push(mapping.repoPath);
        }
      } catch (error) {
        errors.push(`Failed to import ${mapping.repoPath}: ${error}`);
      }
    }

    if (filesImported.length === 0 && errors.length === 0) {
      return {
        success: true,
        message: "No dotfiles found to import",
      };
    }

    if (filesImported.length === 0) {
      return {
        success: false,
        message: "Failed to import dotfiles",
        errors,
      };
    }

    return {
      success: true,
      message: `Imported ${filesImported.length} dotfile(s) to repo`,
      filesImported,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async export(repoPath: string, systemPath: string): Promise<ExportResult> {
    if (!exists(repoPath) || !isDirectory(repoPath)) {
      return {
        success: false,
        message: "Dotfiles not found in repo",
      };
    }

    const filesExported: string[] = [];
    const errors: string[] = [];
    let backedUp: string | undefined;

    for (const mapping of this.dotfilesList) {
      const srcPath = join(repoPath, mapping.repoPath);
      const destPath = mapping.systemPath;

      if (!existsSync(srcPath)) {
        continue;
      }

      try {
        ensureDir(dirname(destPath));

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

        symlinkSync(srcPath, destPath);

        // Handle SSH config permissions
        if (
          mapping.repoPath === ".ssh/config" &&
          basename(destPath) === "config"
        ) {
          try {
            chmodSync(srcPath, 0o600);
          } catch (error) {
            errors.push(
              `Warning: Could not set SSH config permissions: ${error}`,
            );
          }
        }

        filesExported.push(mapping.repoPath);
      } catch (error) {
        errors.push(`Failed to export ${mapping.repoPath}: ${error}`);
      }
    }

    if (filesExported.length === 0) {
      return {
        success: false,
        message: "No dotfiles found in repo to export",
        errors,
      };
    }

    return {
      success: true,
      message: `Linked ${filesExported.length} dotfile(s) to ${contractHome(systemPath)}`,
      backedUp,
      linkedTo: contractHome(repoPath),
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export const dotfilesAdapter = new DotfilesAdapter();
