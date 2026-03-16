import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { YamlBlueprintStore } from "./yaml-blueprint-store.ts";
import type { Blueprint } from "../config/blueprint-schema.ts";

let tempDir: string;
let store: YamlBlueprintStore;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "crew-bp-test-"));
  store = new YamlBlueprintStore(tempDir);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

const sampleBlueprint: Blueprint = {
  name: "review-team",
  description: "Code review",
  agents: [
    { name: "reviewer", systemPrompt: "Review code", model: "opus", color: "red" },
    { name: "checker", systemPrompt: "Check style" },
  ],
};

describe("YamlBlueprintStore", () => {
  describe("save + load", () => {
    test("round-trips a blueprint via name", async () => {
      const saveResult = await store.save(sampleBlueprint);
      expect(saveResult.ok).toBe(true);
      if (saveResult.ok) {
        expect(saveResult.value).toContain("review-team.yaml");
      }

      const loadResult = await store.load("review-team");
      expect(loadResult.ok).toBe(true);
      if (loadResult.ok) {
        expect(loadResult.value).toEqual(sampleBlueprint);
      }
    });

    test("saves valid YAML to disk", async () => {
      await store.save(sampleBlueprint);
      const content = await readFile(join(tempDir, "review-team.yaml"), "utf-8");
      expect(content).toContain("name: review-team");
      expect(content).toContain("systemPrompt: Review code");
    });
  });

  describe("load", () => {
    test("loads from absolute file path", async () => {
      await store.save(sampleBlueprint);
      const filePath = join(tempDir, "review-team.yaml");

      const result = await store.load(filePath);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe("review-team");
      }
    });

    test("loads from path with .yaml extension", async () => {
      await store.save(sampleBlueprint);
      const result = await store.load(join(tempDir, "review-team.yaml"));
      expect(result.ok).toBe(true);
    });

    test("returns blueprint_not_found for missing name", async () => {
      const result = await store.load("nonexistent");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("blueprint_not_found");
      }
    });

    test("returns blueprint_not_found for missing file path", async () => {
      const result = await store.load("/tmp/does-not-exist.yaml");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("blueprint_not_found");
      }
    });

    test("returns blueprint_invalid for malformed YAML", async () => {
      await writeFile(join(tempDir, "bad.yaml"), "name: bad\n# no agents\n");
      const result = await store.load("bad");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("blueprint_invalid");
      }
    });
  });

  describe("list", () => {
    test("returns empty list when no blueprints", async () => {
      const result = await store.list();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    test("returns blueprint names without extension", async () => {
      await store.save(sampleBlueprint);
      await store.save({ ...sampleBlueprint, name: "another" });

      const result = await store.list();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sort()).toEqual(["another", "review-team"]);
      }
    });

    test("ignores non-yaml files", async () => {
      await store.save(sampleBlueprint);
      await writeFile(join(tempDir, "notes.txt"), "not a blueprint");

      const result = await store.list();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(["review-team"]);
      }
    });
  });

  describe("exists", () => {
    test("returns false when blueprint does not exist", async () => {
      expect(await store.exists("nope")).toBe(false);
    });

    test("returns true when blueprint exists", async () => {
      await store.save(sampleBlueprint);
      expect(await store.exists("review-team")).toBe(true);
    });
  });
});
