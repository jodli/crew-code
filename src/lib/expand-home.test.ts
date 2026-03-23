import { homedir } from "node:os";
import { describe, expect, test } from "bun:test";
import { expandHome } from "./expand-home.ts";

describe("expandHome", () => {
  const home = homedir();

  test("expands ~ alone", () => {
    expect(expandHome("~")).toBe(home);
  });

  test("expands ~/path", () => {
    expect(expandHome("~/repos/crew")).toBe(`${home}/repos/crew`);
  });

  test("leaves absolute paths unchanged", () => {
    expect(expandHome("/tmp/project")).toBe("/tmp/project");
  });

  test("leaves relative paths unchanged", () => {
    expect(expandHome("./src")).toBe("./src");
  });

  test("does not expand ~ in the middle of a path", () => {
    expect(expandHome("/home/~user")).toBe("/home/~user");
  });
});
