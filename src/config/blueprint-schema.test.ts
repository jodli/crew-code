import { describe, expect, test } from "bun:test";
import { BlueprintSchema } from "./blueprint-schema.ts";

describe("BlueprintSchema", () => {
  test("accepts valid blueprint with all fields", () => {
    const result = BlueprintSchema.safeParse({
      name: "review-team",
      description: "Code review team",
      agents: [
        {
          name: "reviewer",
          prompt: "Review code for issues",
          model: "claude-opus-4-6",
          color: "red",
          extraArgs: ["--verbose"],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts minimal blueprint", () => {
    const result = BlueprintSchema.safeParse({
      name: "minimal",
      agents: [{ name: "worker" }],
    });
    expect(result.success).toBe(true);
  });

  test("rejects blueprint without name", () => {
    const result = BlueprintSchema.safeParse({
      agents: [{ name: "worker" }],
    });
    expect(result.success).toBe(false);
  });

  test("rejects blueprint with empty agents", () => {
    const result = BlueprintSchema.safeParse({
      name: "empty",
      agents: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects blueprint without agents", () => {
    const result = BlueprintSchema.safeParse({
      name: "no-agents",
    });
    expect(result.success).toBe(false);
  });

  test("rejects agent without name", () => {
    const result = BlueprintSchema.safeParse({
      name: "bad",
      agents: [{ prompt: "do stuff" }],
    });
    expect(result.success).toBe(false);
  });
});
