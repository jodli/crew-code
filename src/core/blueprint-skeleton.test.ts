import { describe, expect, test } from "bun:test";
import { parse } from "yaml";
import { BlueprintSchema } from "../config/blueprint-schema.ts";
import { generateSkeleton } from "./blueprint-skeleton.ts";

describe("generateSkeleton", () => {
  test("contains the blueprint name", () => {
    const skeleton = generateSkeleton("my-team");
    expect(skeleton).toContain("name: my-team");
  });

  test("parses as valid YAML", () => {
    const skeleton = generateSkeleton("test");
    const data = parse(skeleton);
    expect(data.name).toBe("test");
    expect(data.agents).toBeArray();
  });

  test("validates against BlueprintSchema", () => {
    const skeleton = generateSkeleton("test");
    const data = parse(skeleton);
    const result = BlueprintSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  test("includes helpful comments", () => {
    const skeleton = generateSkeleton("review");
    expect(skeleton).toContain("# Load with:");
    expect(skeleton).toContain("# model:");
  });
});
