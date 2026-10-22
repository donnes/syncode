import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import * as p from "@clack/prompts";
import { UserError } from "./errors.ts";
import { syncodeDir } from "./paths.ts";
import { answer, canPrompt } from "./prompts.ts";

export type Action =
  | "skip"
  | "link"
  | "relink"
  | "compose"
  | "differs"
  | "keep"
  | "replace"
  | "update"
  | "prune"
  | "copy";

export interface Entry {
  action: Action;
  path: string;
  detail?: string;
}

export function exists(file: string): boolean {
  return fs.lstatSync(file, { throwIfNoEntry: false }) !== undefined;
}

export function realPath(file: string): string | undefined {
  try {
    return fs.realpathSync(file);
  } catch {
    return undefined;
  }
}

export function within(file: string, root: string): boolean {
  return file === root || file.startsWith(root + path.sep);
}

export function children(directory: string): string[] {
  try {
    return fs.readdirSync(directory).map((name) => path.join(directory, name));
  } catch {
    return [];
  }
}

/** Files and symlinks under `directory`, without following directory links. */
export function walk(directory: string): string[] {
  return children(directory).flatMap((file) => {
    const stat = fs.lstatSync(file);
    if (stat.isDirectory()) return walk(file);
    return stat.isFile() || stat.isSymbolicLink() ? [file] : [];
  });
}

export function linkTarget(file: string): string | undefined {
  return fs.lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink()
    ? fs.readlinkSync(file)
    : undefined;
}

/**
 * The path with its parent folder resolved, so two paths that reach the same
 * entry through a linked folder (~/.claude/skills -> ~/.agents/skills) match.
 */
export function canonicalPath(file: string): string {
  const parent = path.dirname(file);
  return path.join(realPath(parent) ?? parent, path.basename(file));
}

export function prettyPath(file: string, repo?: string): string {
  if (repo && within(file, repo)) return `<repo>${file.slice(repo.length)}`;
  const home = homedir();
  return within(file, home) ? `~${file.slice(home.length)}` : file;
}

/** Writes through a temporary file so readers never see a partial file. */
export function writeAtomic(file: string, content: string, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.syncode-${process.pid}.tmp`;
  fs.writeFileSync(temporary, content, { mode });
  fs.renameSync(temporary, file);
}

/** Moves across filesystems too, where rename fails with EXDEV. */
export function move(from: string, to: string) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EXDEV")) throw error;
    fs.cpSync(from, to, { recursive: true, verbatimSymlinks: true });
    fs.rmSync(from, { recursive: true, force: true });
  }
}

function latestMtime(file: string, seen = new Set<string>()): number {
  const real = realPath(file);
  if (!real || seen.has(real)) return 0;
  seen.add(real);
  const stat = fs.statSync(real);
  if (!stat.isDirectory()) return Math.floor(stat.mtimeMs / 1000) * 1000;
  return Math.max(0, ...children(real).map((child) => latestMtime(child, seen)));
}

function gitDiff(source: string, current: string, quiet: boolean) {
  return spawnSync(
    "git",
    ["diff", "--no-index", ...(quiet ? ["--quiet"] : []), "--", source, current],
    { stdio: quiet ? "ignore" : "inherit" },
  );
}

export interface FilesOptions {
  repo: string;
  dryRun: boolean;
  /** Collect entries without printing them, for `--json`. */
  quiet?: boolean;
}

/**
 * Every filesystem change goes through here, so a dry run of `apply` is an
 * exact preview of it and `status` can never disagree with what apply does.
 */
export class Files {
  readonly repo: string;
  readonly dryRun: boolean;
  readonly quiet: boolean;
  readonly entries: Entry[] = [];
  /** Where replaced local copies go, one folder per run. */
  private readonly backupDir = path.join(
    syncodeDir(),
    "backups",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );

  constructor(options: FilesOptions) {
    this.repo = options.repo;
    this.dryRun = options.dryRun;
    this.quiet = options.quiet ?? false;
  }

  pretty(file: string): string {
    return prettyPath(file, this.repo);
  }

  log(action: Action, file: string, detail?: string) {
    this.entries.push(detail ? { action, path: file, detail } : { action, path: file });
    if (!this.quiet) {
      console.log(`[${action.padEnd(7)}] ${this.pretty(file)}${detail ? ` ${detail}` : ""}`);
    }
  }

  /** A symlink that points into the repo. */
  managed(file: string): boolean {
    const target = linkTarget(file);
    if (target === undefined) return false;
    const resolved = path.resolve(path.dirname(file), target);
    return within(resolved, this.repo) || within(resolved, realPath(this.repo) ?? this.repo);
  }

  // A parent directory link can make the destination the very same entry as
  // the source, e.g. ~/.claude/skills linked to ~/.agents/skills.
  private aliasesSource(source: string, destination: string): boolean {
    const parent = realPath(path.dirname(destination));
    if (
      parent &&
      parent === realPath(path.dirname(source)) &&
      path.basename(destination) === path.basename(source)
    ) {
      return true;
    }
    const current = realPath(destination);
    return !linkTarget(destination) && current !== undefined && current === realPath(source);
  }

  private replaceWithLink(source: string, destination: string) {
    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.symlinkSync(source, destination);
  }

  private differs(source: string, current: string, preview?: string): boolean {
    if (preview !== undefined) {
      return !fs.statSync(current).isFile() || fs.readFileSync(current, "utf8") !== preview;
    }
    const result = gitDiff(source, current, true);
    if (result.error) throw result.error;
    return result.status !== 0;
  }

  private async conflict(source: string, destination: string, current: string) {
    const localTime = latestMtime(current);
    const repoTime = latestMtime(source);
    const newer =
      localTime > repoTime ? "local is newer" : repoTime > localTime ? "repo is newer" : "same age";
    const detail = `differs from ${this.pretty(source)} (${newer})`;
    if (this.dryRun) {
      this.log("differs", destination, detail);
      return;
    }
    if (!canPrompt()) {
      this.log("keep", destination, `${detail}; run in a terminal to resolve`);
      return;
    }
    // Composed instructions must be changed in their source files instead.
    const canUpdate = !within(source, path.join(this.repo, ".generated"));
    p.log.warn(`${this.pretty(destination)} ${detail}`);
    while (true) {
      const choice = answer(
        await p.select({
          message: `Resolve ${this.pretty(destination)}`,
          options: [
            { value: "keep", label: "Keep local copy" },
            { value: "replace", label: "Replace with repo copy" },
            ...(canUpdate ? [{ value: "update", label: "Update repo from local copy" }] : []),
            { value: "diff", label: "Show diff" },
          ],
          initialValue:
            localTime > repoTime && canUpdate
              ? "update"
              : repoTime > localTime
                ? "replace"
                : "keep",
        }),
      );
      if (choice === "diff") {
        gitDiff(source, current, false);
        continue;
      }
      if (choice === "update") {
        fs.rmSync(source, { recursive: true, force: true });
        fs.cpSync(current, source, {
          recursive: true,
          preserveTimestamps: true,
          verbatimSymlinks: true,
        });
      }
      if (choice === "keep") {
        this.log("keep", destination, detail);
        return;
      }
      if (choice === "replace") {
        // Move the destination itself: if it's a link to someone else's file,
        // that file must stay where it is.
        const backup = this.backupPath(destination);
        move(destination, backup);
        this.log("replace", destination, `(backup in ${this.pretty(backup)})`);
      } else {
        this.log("update", destination);
      }
      this.replaceWithLink(source, destination);
      return;
    }
  }

  private backupPath(destination: string): string {
    const relative = path.relative(homedir(), destination);
    return relative.startsWith("..")
      ? path.join(this.backupDir, "abs", destination)
      : path.join(this.backupDir, relative);
  }

  /**
   * Links `destination` to `source`. Identical local copies are replaced
   * silently; differing ones are a conflict for the user to resolve.
   */
  async link(source: string, destination: string, preview?: string) {
    const parent = path.dirname(destination);
    if (linkTarget(parent) !== undefined && !fs.existsSync(parent)) {
      throw new UserError(
        `${this.pretty(parent)} is a broken link. Remove it or recreate its target, then rerun.`,
      );
    }
    if (this.aliasesSource(source, destination) || linkTarget(destination) === source) {
      this.log("skip", destination);
      return;
    }
    const current = this.managed(destination) ? undefined : realPath(destination);
    if (current && this.differs(source, current, preview)) {
      await this.conflict(source, destination, current);
      return;
    }
    this.log(exists(destination) ? "relink" : "link", destination, `-> ${this.pretty(source)}`);
    if (!this.dryRun) this.replaceWithLink(source, destination);
  }

  /** Removes a managed link that is no longer wanted. */
  prune(destination: string) {
    if (!this.managed(destination)) return;
    this.log("prune", destination);
    if (!this.dryRun) fs.unlinkSync(destination);
  }

  /** Replaces a managed link with a copy of its target, so nothing disappears. */
  copyBack(source: string, destination: string) {
    if (linkTarget(destination) !== source) return;
    this.log("copy", destination, `<- ${this.pretty(source)}`);
    if (this.dryRun) return;
    fs.unlinkSync(destination);
    fs.cpSync(source, destination, { recursive: true, verbatimSymlinks: true });
    // Composed instructions are read-only; the copy is the user's to edit.
    if (fs.statSync(destination).isFile()) fs.chmodSync(destination, 0o644);
  }

  /** Writes a generated file, skipping it when the content is unchanged. */
  compose(file: string, content: string, detail: string) {
    const current = exists(file) ? fs.readFileSync(file, "utf8") : undefined;
    this.log(current === content ? "skip" : "compose", file, detail);
    // Read-only, so an agent editing its linked instructions fails loudly
    // instead of writing changes the next apply would overwrite.
    if (!this.dryRun && current !== content) writeAtomic(file, content, 0o444);
  }
}
