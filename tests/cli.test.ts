import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, test } from "vitest";
import { sandbox } from "./harness.ts";

const os = process.platform === "darwin" ? "macos" : "linux";
const otherOs = os === "macos" ? "linux" : "macos";

describe("init", () => {
  test("starts a repo from this machine's instructions and links them into each agent", () => {
    const box = sandbox("init-new");
    box.write({ ".claude/CLAUDE.md": "# mine\n", ".codex/config.toml": "" });

    const init = box.run("init", "--agents", "claude,codex");
    expect(init.status, init.output).toBe(0);

    expect(box.read(".syncode/repo/instructions/AGENTS.md")).toBe("# mine\n");
    expect(box.link(".claude/CLAUDE.md")).toBe(".syncode/repo/instructions/AGENTS.md");
    expect(box.link(".codex/AGENTS.md")).toBe(".syncode/repo/instructions/AGENTS.md");
    expect(box.read(".syncode/repo/.gitignore")).toContain("instructions/local.md");

    // Applying again is a no-op.
    const status = JSON.parse(box.run("status", "--json").output);
    expect(status.entries.map((entry: { action: string }) => entry.action)).toEqual([
      "skip",
      "skip",
    ]);
  });

  test("migrates a 1.x setup without breaking the agents' folders", () => {
    const box = sandbox("init-migrate");
    box.write({
      ".syncode/config.json": JSON.stringify({
        version: "1.0.0",
        repoPath: "~/.syncode/repo",
        agents: ["agents", "claude", "opencode", "gemini-cli", "windsurf"],
      }),
      ".syncode/repo/configs/opencode/opencode.json": "{}",
      ".syncode/repo/configs/claude/CLAUDE.md": "# legacy\n",
      ".syncode/repo/.agents/skills/review/SKILL.md": "review",
    });
    // 1.x linked whole folders into the repo, plus relative skills links.
    fs.symlinkSync("../../.agents/skills", path.join(box.repo, "configs/opencode/skills"));
    fs.mkdirSync(path.join(box.home, ".config"));
    fs.symlinkSync(
      path.join(box.repo, "configs/opencode"),
      path.join(box.home, ".config/opencode"),
    );
    fs.symlinkSync(path.join(box.repo, ".agents"), path.join(box.home, ".agents"));

    const init = box.run("init");
    expect(init.status, init.output).toBe(0);

    expect(box.link(".config/opencode")).toBeUndefined();
    expect(box.read(".config/opencode/opencode.json")).toBe("{}");
    expect(fs.existsSync(path.join(box.home, ".config/opencode/skills"))).toBe(false);
    expect(box.link(".config/opencode/AGENTS.md")).toBe(".syncode/repo/instructions/AGENTS.md");
    expect(box.read(".syncode/repo/instructions/AGENTS.md")).toBe("# legacy\n");
    expect(box.link(".agents/skills/review")).toBe(".syncode/repo/skills/review");
    expect(box.link(".claude/skills/review")).toBe(".syncode/repo/skills/review");
    expect(JSON.parse(box.read(".syncode/config.json"))).toMatchObject({
      version: 2,
      agents: ["claude", "opencode", "gemini"],
    });
    expect(init.output).toContain("No longer managed by syncode: windsurf");
  });
});

describe("apply", () => {
  test("keeps a differing local file when it can't ask", () => {
    const box = sandbox("apply-conflict");
    box.config(["codex"]);
    box.write({
      ".syncode/repo/instructions/AGENTS.md": "repo\n",
      ".codex/AGENTS.md": "local\n",
    });

    const apply = box.run("apply");
    expect(apply.status, apply.output).toBe(0);
    expect(apply.output).toContain("[keep   ] ~/.codex/AGENTS.md differs");
    expect(box.link(".codex/AGENTS.md")).toBeUndefined();
    expect(box.read(".codex/AGENTS.md")).toBe("local\n");
    expect(box.run("status").output).toContain("[differs] ~/.codex/AGENTS.md");
  });

  test("composes OS and local instructions into one read-only file", () => {
    const box = sandbox("apply-compose");
    box.config(["claude"]);
    box.write({
      ".syncode/repo/instructions/AGENTS.md": "shared",
      [`.syncode/repo/instructions/${os}.md`]: "this os",
      [`.syncode/repo/instructions/${otherOs}.md`]: "other os",
      ".syncode/repo/instructions/local.md": "this machine",
    });

    expect(box.run("apply").status).toBe(0);
    expect(box.link(".claude/CLAUDE.md")).toBe(".syncode/repo/.generated/AGENTS.md");
    const composed = box.read(".claude/CLAUDE.md");
    expect(composed).toContain("shared\n\nthis os\n\nthis machine\n");
    expect(composed).not.toContain("other os");
    expect(() =>
      fs.accessSync(path.join(box.repo, ".generated/AGENTS.md"), fs.constants.W_OK),
    ).toThrow();
  });

  test("links skills into the shared and Claude folders, and prunes removed ones", () => {
    const box = sandbox("apply-skills");
    box.config(["claude", "codex"]);
    box.write({
      ".syncode/repo/skills/a/SKILL.md": "a",
      ".syncode/repo/skills/b/SKILL.md": "b",
    });

    expect(box.run("apply").status).toBe(0);
    for (const root of [".agents/skills", ".claude/skills"]) {
      expect(box.link(`${root}/a`)).toBe(".syncode/repo/skills/a");
      expect(box.link(`${root}/b`)).toBe(".syncode/repo/skills/b");
    }

    fs.rmSync(path.join(box.repo, "skills/b"), { recursive: true });
    const apply = box.run("apply");
    expect(apply.output).toContain("[prune  ] ~/.agents/skills/b");
    expect(fs.existsSync(path.join(box.home, ".agents/skills/b"))).toBe(false);
    expect(box.link(".claude/skills/b")).toBeUndefined();
    expect(box.link(".claude/skills/a")).toBe(".syncode/repo/skills/a");
  });
});

describe("adopt", () => {
  test("moves a config file into the repo and links it back", () => {
    const box = sandbox("adopt-file");
    box.config(["claude"]);
    box.write({ ".claude/settings.json": '{"theme":"dark"}' });

    const adopt = box.run("adopt", path.join(box.home, ".claude/settings.json"));
    expect(adopt.status, adopt.output).toBe(0);
    expect(box.read(".syncode/repo/agents/claude/settings.json")).toBe('{"theme":"dark"}');
    expect(box.link(".claude/settings.json")).toBe(".syncode/repo/agents/claude/settings.json");
  });

  test("refuses credentials", () => {
    const box = sandbox("adopt-secret");
    box.config(["codex"]);
    box.write({ ".codex/auth.json": "secret" });

    const adopt = box.run("adopt", path.join(box.home, ".codex/auth.json"));
    expect(adopt.status).toBe(1);
    expect(adopt.output).toContain("Refusing to adopt auth.json");
    expect(box.read(".codex/auth.json")).toBe("secret");
    expect(fs.existsSync(path.join(box.repo, "agents"))).toBe(false);
  });
});

test("unlink swaps links for copies so agents keep their configs", () => {
  const box = sandbox("unlink");
  box.config(["claude"]);
  box.write({
    ".syncode/repo/instructions/AGENTS.md": "shared",
    ".syncode/repo/skills/a/SKILL.md": "a",
  });
  expect(box.run("apply").status).toBe(0);

  expect(box.run("unlink").status).toBe(0);
  expect(box.link(".claude/CLAUDE.md")).toBeUndefined();
  expect(box.read(".claude/CLAUDE.md")).toBe("shared");
  expect(box.link(".claude/skills/a")).toBeUndefined();
  expect(box.read(".claude/skills/a/SKILL.md")).toBe("a");
});
