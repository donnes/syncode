#!/usr/bin/env tsx

/**
 * Unit tests for fs.ts
 *
 * These tests validate the filesystem helpers used by sync operations.
 *
 * Run with: npx tsx tests/fs.test.ts
 */

import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  backup,
  copyDir,
  copyFile,
  createSymlink,
  ensureDir,
  ensureParentDir,
  exists,
  getFileDiff,
  getSymlinkTarget,
  isDirectory,
  isSymlink,
  readFile,
  removeDir,
} from "../src/utils/fs";

type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

const tests: TestCase[] = [];

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

function makeTempDir(label: string): string {
  return mkdtempSync(join(tmpdir(), `syncode-${label}-`));
}

function cleanupTempDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

test("exists/isDirectory basics", () => {
  const dir = makeTempDir("fs-basic");
  try {
    const missing = join(dir, "missing");
    assert.equal(exists(missing), false);
    assert.equal(isDirectory(missing), false);

    const subdir = join(dir, "subdir");
    ensureDir(subdir);
    assert.equal(exists(subdir), true);
    assert.equal(isDirectory(subdir), true);

    const file = join(dir, "file.txt");
    writeFileSync(file, "data");
    assert.equal(exists(file), true);
    assert.equal(isDirectory(file), false);
    assert.equal(isSymlink(file), false);
  } finally {
    cleanupTempDir(dir);
  }
});

test("ensureParentDir creates parent path", () => {
  const dir = makeTempDir("fs-parent");
  try {
    const filePath = join(dir, "a", "b", "c.txt");
    ensureParentDir(filePath);
    assert.equal(isDirectory(join(dir, "a", "b")), true);
  } finally {
    cleanupTempDir(dir);
  }
});

test("readFile/getFileDiff", () => {
  const dir = makeTempDir("fs-read");
  try {
    const fileA = join(dir, "a.txt");
    const fileB = join(dir, "b.txt");
    writeFileSync(fileA, "same");
    writeFileSync(fileB, "same");

    assert.equal(readFile(fileA), "same");
    assert.equal(readFile(join(dir, "missing.txt")), null);
    assert.equal(getFileDiff(fileA, fileB), false);

    writeFileSync(fileB, "diff");
    assert.equal(getFileDiff(fileA, fileB), true);
  } finally {
    cleanupTempDir(dir);
  }
});

test("copyFile copies content", () => {
  const dir = makeTempDir("fs-copyfile");
  try {
    const src = join(dir, "src.txt");
    const dest = join(dir, "out", "dest.txt");
    writeFileSync(src, "hello");

    copyFile(src, dest);
    assert.equal(readFileSync(dest, "utf-8"), "hello");
  } finally {
    cleanupTempDir(dir);
  }
});

test("copyDir copies nested entries", () => {
  const dir = makeTempDir("fs-copydir");
  try {
    const src = join(dir, "src");
    const dest = join(dir, "dest");
    ensureDir(join(src, "nested"));
    writeFileSync(join(src, "root.txt"), "root");
    writeFileSync(join(src, "nested", "child.txt"), "child");

    copyDir(src, dest);
    assert.equal(readFileSync(join(dest, "root.txt"), "utf-8"), "root");
    assert.equal(
      readFileSync(join(dest, "nested", "child.txt"), "utf-8"),
      "child",
    );
  } finally {
    cleanupTempDir(dir);
  }
});

test("copyDir skips unix sockets", async () => {
  if (process.platform === "win32") {
    console.log("↷ skipped socket test on win32");
    return;
  }

  const dir = makeTempDir("fs-socket");
  const server = createServer();
  const socketPath = join(dir, "src", "agent.sock");

  try {
    const src = join(dir, "src");
    const dest = join(dir, "dest");
    ensureDir(src);
    writeFileSync(join(src, "file.txt"), "ok");

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, () => resolve());
    });

    copyDir(src, dest);
    assert.equal(readFileSync(join(dest, "file.txt"), "utf-8"), "ok");
    assert.equal(existsSync(join(dest, "agent.sock")), false);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (existsSync(socketPath)) {
      rmSync(socketPath, { force: true });
    }
    cleanupTempDir(dir);
  }
});

test("backup moves file to .backup", () => {
  const dir = makeTempDir("fs-backup");
  try {
    const file = join(dir, "config.json");
    writeFileSync(file, "data");

    const backupPath = backup(file);
    assert.equal(backupPath, `${file}.backup`);
    assert.equal(exists(file), false);
    assert.equal(readFileSync(`${file}.backup`, "utf-8"), "data");
  } finally {
    cleanupTempDir(dir);
  }
});

test("createSymlink and getSymlinkTarget", () => {
  if (process.platform === "win32") {
    console.log("↷ skipped symlink test on win32");
    return;
  }

  const dir = makeTempDir("fs-symlink");
  try {
    const target = join(dir, "target.txt");
    const link = join(dir, "link.txt");
    writeFileSync(target, "content");

    createSymlink(target, link);
    assert.equal(isSymlink(link), true);
    assert.equal(getSymlinkTarget(link), target);
  } finally {
    cleanupTempDir(dir);
  }
});

test("removeDir deletes nested directory", () => {
  const dir = makeTempDir("fs-removedir");
  try {
    const nested = join(dir, "nested", "deep");
    ensureDir(nested);
    writeFileSync(join(nested, "file.txt"), "data");

    removeDir(join(dir, "nested"));
    assert.equal(exists(join(dir, "nested")), false);
  } finally {
    cleanupTempDir(dir);
  }
});

async function run() {
  for (const { name, run } of tests) {
    try {
      await run();
      console.log(`✓ ${name}`);
    } catch (error) {
      console.error(`✗ ${name}`);
      console.error(error);
      process.exitCode = 1;
    }
  }

  if (process.exitCode) {
    process.exit(1);
  }
}

await run();
