#!/usr/bin/env tsx

import assert from "node:assert/strict";
import * as updateCheck from "../src/utils/update-check";

type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

const tests: TestCase[] = [];
const originalArgv1 = process.argv[1];
const originalEnvExecPath = process.env.npm_execpath;
const originalEnvUserAgent = process.env.npm_config_user_agent;

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

function cleanup() {
  process.argv[1] = originalArgv1;
  process.env.npm_execpath = originalEnvExecPath ?? "";
  process.env.npm_config_user_agent = originalEnvUserAgent ?? "";
}

test("parseVersion handles valid versions", () => {
  assert.deepStrictEqual(updateCheck.parseVersion("1.2.3"), [1, 2, 3]);
  assert.deepStrictEqual(updateCheck.parseVersion("0.0.0"), [0, 0, 0]);
  assert.deepStrictEqual(updateCheck.parseVersion("10.20.30"), [10, 20, 30]);
});

test("parseVersion handles invalid versions", () => {
  assert.strictEqual(updateCheck.parseVersion("1.2"), null);
  assert.strictEqual(updateCheck.parseVersion("1.2.3.4"), null);
  assert.strictEqual(updateCheck.parseVersion("v1.2.3"), null);
  assert.strictEqual(updateCheck.parseVersion(""), null);
  assert.strictEqual(updateCheck.parseVersion("invalid"), null);
});

test("isOutdated detects newer versions", () => {
  assert.strictEqual(updateCheck.isOutdated("1.0.0", "1.0.1"), true);
  assert.strictEqual(updateCheck.isOutdated("1.0.0", "1.1.0"), true);
  assert.strictEqual(updateCheck.isOutdated("1.0.0", "2.0.0"), true);
  assert.strictEqual(updateCheck.isOutdated("1.2.3", "1.2.4"), true);
});

test("isOutdated returns false when up to date", () => {
  assert.strictEqual(updateCheck.isOutdated("1.0.0", "1.0.0"), false);
  assert.strictEqual(updateCheck.isOutdated("1.1.0", "1.0.0"), false);
  assert.strictEqual(updateCheck.isOutdated("1.0.1", "1.0.0"), false);
  assert.strictEqual(updateCheck.isOutdated("1.2.4", "1.2.3"), false);
  assert.strictEqual(updateCheck.isOutdated("2.0.0", "1.0.0"), false);
});

test("isOutdated handles invalid versions gracefully", () => {
  assert.strictEqual(updateCheck.isOutdated("invalid", "1.0.0"), false);
  assert.strictEqual(updateCheck.isOutdated("1.0.0", "invalid"), false);
  assert.strictEqual(updateCheck.isOutdated("1.2", "1.2.4"), false);
});

test("formatUpdateNotice creates boxed output", () => {
  const output = updateCheck.formatUpdateNotice({
    current: "1.0.0",
    latest: "1.1.0",
    packageName: "@donnes/syncode",
  });

  assert.ok(output.includes("┌"));
  assert.ok(output.includes("┐"));
  assert.ok(output.includes("└"));
  assert.ok(output.includes("┘"));
  assert.ok(output.includes("│"));
  assert.ok(output.includes("─"));
  assert.ok(output.includes("Current: 1.0.0"));
  assert.ok(output.includes("Latest:  1.1.0"));
  assert.ok(output.includes("npm install -g @donnes/syncode@latest"));
});

test("formatUpdateNotice handles different package names", () => {
  const output = updateCheck.formatUpdateNotice({
    current: "1.0.0",
    latest: "2.0.0",
    packageName: "test-package",
  });

  assert.ok(output.includes("npm install -g test-package@latest"));
});

test("isNpxInvocation detects npx execution", () => {
  const originalArgv1 = process.argv[1];
  try {
    process.argv[1] = "/tmp/_npx/package/lib/index.js";
    assert.strictEqual(updateCheck.isNpxInvocation(), true);

    process.argv[1] = "C:\\Users\\_npx\\package\\lib\\index.js";
    assert.strictEqual(updateCheck.isNpxInvocation(), true);
  } finally {
    process.argv[1] = originalArgv1;
  }
});

test("isNpxInvocation detects npx via npm_execpath", () => {
  const originalEnvNodeExecpath = process.env.npm_execpath;
  try {
    process.env.npm_execpath = "/usr/local/lib/node_modules/npm/bin/npx-cli.js";
    assert.strictEqual(updateCheck.isNpxInvocation(), true);

    process.env.npm_execpath =
      "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js";
    assert.strictEqual(updateCheck.isNpxInvocation(), true);
  } finally {
    process.env.npm_execpath = originalEnvNodeExecpath ?? "";
  }
});

test("isNpxInvocation detects npx via user agent", () => {
  const originalEnvUserAgent = process.env.npm_config_user_agent;
  try {
    process.env.npm_config_user_agent = "npm/9.0.0 node/v18.0.0 npx/9.0.0";
    assert.strictEqual(updateCheck.isNpxInvocation(), true);
  } finally {
    process.env.npm_config_user_agent = originalEnvUserAgent ?? "";
  }
});

test("isNpxInvocation returns false for global install", () => {
  const originalArgv1 = process.argv[1];
  const originalEnvNodeExecpath = process.env.npm_execpath;
  const originalEnvUserAgent = process.env.npm_config_user_agent;

  try {
    process.argv[1] = "/usr/local/bin/syncode";
    process.env.npm_execpath = "";
    process.env.npm_config_user_agent = "";

    assert.strictEqual(updateCheck.isNpxInvocation(), false);
  } finally {
    process.argv[1] = originalArgv1;
    process.env.npm_execpath = originalEnvNodeExecpath ?? "";
    process.env.npm_config_user_agent = originalEnvUserAgent ?? "";
  }
});

test("isOutdated comparison edge cases", () => {
  assert.strictEqual(updateCheck.isOutdated("9.9.9", "10.0.0"), true);
  assert.strictEqual(updateCheck.isOutdated("10.0.0", "9.9.9"), false);
  assert.strictEqual(updateCheck.isOutdated("0.0.0", "0.0.1"), true);
  assert.strictEqual(updateCheck.isOutdated("1.9.9", "2.0.0"), true);
  assert.strictEqual(updateCheck.isOutdated("2.0.0", "2.0.1"), true);
  assert.strictEqual(updateCheck.isOutdated("2.0.0", "2.1.0"), true);
  assert.strictEqual(updateCheck.isOutdated("2.1.0", "3.0.0"), true);
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
    } finally {
      cleanup();
    }
  }

  if (process.exitCode) {
    process.exit(1);
  }
}

await run();
