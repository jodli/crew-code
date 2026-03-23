import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverAgentTypes } from "./discover-agent-types.ts";

function makeTmpDir(): string {
  const dir = join(tmpdir(), `crew-test-agents-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeAgent(dir: string, filename: string, content: string) {
  writeFileSync(join(dir, filename), content);
}

let tmpDirs: string[] = [];
afterEach(() => {
  for (const dir of tmpDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs = [];
});

function createTmpDir(): string {
  const dir = makeTmpDir();
  tmpDirs.push(dir);
  return dir;
}

describe("discoverAgentTypes", () => {
  test("returns built-ins when agents directory does not exist", async () => {
    const result = await discoverAgentTypes("/nonexistent/path/agents");
    expect(result).toEqual(["general-purpose", "team-lead"]);
  });

  test("returns built-ins when agents directory is empty", async () => {
    const dir = createTmpDir();
    const result = await discoverAgentTypes(dir);
    expect(result).toEqual(["general-purpose", "team-lead"]);
  });

  test("discovers custom types from .md files with name in frontmatter", async () => {
    const dir = createTmpDir();
    writeAgent(dir, "researcher.md", `---\nname: researcher\ndescription: Research agent\n---\nInstructions here.`);
    writeAgent(dir, "reviewer.md", `---\nname: reviewer\ntools: Read, Grep\n---\nReview code.`);

    const result = await discoverAgentTypes(dir);
    expect(result).toContain("researcher");
    expect(result).toContain("reviewer");
  });

  test("uses filename (without .md) as fallback when no name in frontmatter", async () => {
    const dir = createTmpDir();
    writeAgent(dir, "my-custom-agent.md", `---\ndescription: An agent without a name field\n---\nDo stuff.`);

    const result = await discoverAgentTypes(dir);
    expect(result).toContain("my-custom-agent");
  });

  test("uses filename as fallback when file has no frontmatter", async () => {
    const dir = createTmpDir();
    writeAgent(dir, "simple-agent.md", "Just plain markdown, no frontmatter.");

    const result = await discoverAgentTypes(dir);
    expect(result).toContain("simple-agent");
  });

  test("built-ins are always first in the list", async () => {
    const dir = createTmpDir();
    writeAgent(dir, "alpha.md", `---\nname: alpha\n---\n`);
    writeAgent(dir, "beta.md", `---\nname: beta\n---\n`);

    const result = await discoverAgentTypes(dir);
    expect(result[0]).toBe("general-purpose");
    expect(result[1]).toBe("team-lead");
    expect(result.length).toBeGreaterThan(2);
  });

  test("deduplicates: custom type with same name as built-in is not listed twice", async () => {
    const dir = createTmpDir();
    writeAgent(dir, "general-purpose.md", `---\nname: general-purpose\n---\nOverride.`);

    const result = await discoverAgentTypes(dir);
    const count = result.filter((t) => t === "general-purpose").length;
    expect(count).toBe(1);
  });

  test("ignores non-.md files", async () => {
    const dir = createTmpDir();
    writeAgent(dir, "agent.md", `---\nname: real-agent\n---\n`);
    writeAgent(dir, "notes.txt", "not an agent");
    writeAgent(dir, "config.json", "{}");

    const result = await discoverAgentTypes(dir);
    expect(result).toContain("real-agent");
    expect(result).not.toContain("notes");
    expect(result).not.toContain("config");
  });
});
