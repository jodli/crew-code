import { describe, expect, test } from "bun:test";
import { parsePassthroughArgs } from "./parse-passthrough-args.ts";

describe("parsePassthroughArgs", () => {
  test("returns empty array when no -- separator", () => {
    expect(parsePassthroughArgs(["create", "my-team"])).toEqual([]);
  });

  test("returns args after -- separator", () => {
    expect(
      parsePassthroughArgs(["create", "my-team", "--", "--verbose", "--effort", "high"]),
    ).toEqual(["--verbose", "--effort", "high"]);
  });

  test("returns empty array when -- is last element", () => {
    expect(parsePassthroughArgs(["create", "--"])).toEqual([]);
  });

  test("uses first -- occurrence", () => {
    expect(
      parsePassthroughArgs(["create", "--", "--foo", "--", "--bar"]),
    ).toEqual(["--foo", "--", "--bar"]);
  });

  test("returns empty array for empty input", () => {
    expect(parsePassthroughArgs([])).toEqual([]);
  });
});
