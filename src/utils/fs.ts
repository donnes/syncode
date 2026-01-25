import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { REPO_ROOT } from "./paths";

export function exists(path: string): boolean {
  return existsSync(path);
}

export function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function getSymlinkTarget(path: string): string | null {
  try {
    return readlinkSync(path);
  } catch {
    return null;
  }
}

export function isSymlinkToRepo(path: string): boolean {
  const target = getSymlinkTarget(path);
  if (!target) return false;
  return target.startsWith(REPO_ROOT);
}

export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export function ensureParentDir(filePath: string): void {
  ensureDir(dirname(filePath));
}

export function backup(path: string): string | null {
  if (!existsSync(path)) return null;
  const backupPath = `${path}.backup`;

  // If it's a symlink, we just need to remove it (no backup needed)
  if (isSymlink(path)) {
    return null;
  }

  // If backup already exists, remove it
  if (existsSync(backupPath)) {
    if (isDirectory(backupPath)) {
      removeDir(backupPath);
    } else {
      unlinkSync(backupPath);
    }
  }

  renameSync(path, backupPath);
  return backupPath;
}

export function copyFile(src: string, dest: string): void {
  ensureParentDir(dest);
  copyFileSync(src, dest);
}

export function copyDir(src: string, dest: string): void {
  ensureDir(dest);
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      if (
        entry.isSocket() ||
        entry.isFIFO() ||
        entry.isCharacterDevice() ||
        entry.isBlockDevice()
      ) {
        continue;
      }
      copyFileSync(srcPath, destPath);
    }
  }
}

export function removeDir(path: string): void {
  if (!existsSync(path)) return;

  const entries = readdirSync(path, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) {
      removeDir(entryPath);
    } else {
      unlinkSync(entryPath);
    }
  }

  // Remove the directory itself
  const { rmdirSync } = require("node:fs");
  rmdirSync(path);
}

export function createSymlink(target: string, linkPath: string): void {
  ensureParentDir(linkPath);

  // Remove existing file/symlink
  if (existsSync(linkPath) || isSymlink(linkPath)) {
    unlinkSync(linkPath);
  }

  symlinkSync(target, linkPath);
}

export function createSymlinkWithBackup(
  target: string,
  linkPath: string,
): string | null {
  const backupPath = backup(linkPath);
  createSymlink(target, linkPath);
  return backupPath;
}

export function readFile(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

export function getFileDiff(file1: string, file2: string): boolean {
  const content1 = readFile(file1);
  const content2 = readFile(file2);

  if (content1 === null || content2 === null) {
    return content1 !== content2;
  }

  return content1 !== content2;
}

export function getAllSymlinksToRepo(): Array<{
  linkPath: string;
  target: string;
}> {
  const symlinks: Array<{ linkPath: string; target: string }> = [];

  const checkPath = (path: string) => {
    if (isSymlink(path)) {
      const target = getSymlinkTarget(path);
      if (target?.startsWith(REPO_ROOT)) {
        symlinks.push({ linkPath: path, target });
      }
    }
  };

  // Check common config locations
  const { systemPaths } = require("./paths");

  checkPath(systemPaths.zshrc);
  checkPath(systemPaths.bashrc);
  checkPath(systemPaths.ssh);
  checkPath(systemPaths.ghostty);

  // Check if opencode is symlinked
  if (isSymlink(systemPaths.opencode)) {
    const target = getSymlinkTarget(systemPaths.opencode);
    if (target?.startsWith(REPO_ROOT)) {
      symlinks.push({ linkPath: systemPaths.opencode, target });
    }
  }

  // Check if claude is symlinked
  if (isSymlink(systemPaths.claude)) {
    const target = getSymlinkTarget(systemPaths.claude);
    if (target?.startsWith(REPO_ROOT)) {
      symlinks.push({ linkPath: systemPaths.claude, target });
    }
  }

  return symlinks;
}

export function updateSymlinkTarget(
  linkPath: string,
  oldRepoRoot: string,
  newRepoRoot: string,
): void {
  const currentTarget = getSymlinkTarget(linkPath);
  if (!currentTarget) return;

  const newTarget = currentTarget.replace(oldRepoRoot, newRepoRoot);
  createSymlink(newTarget, linkPath);
}
