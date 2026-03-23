import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const BUILTIN_AGENT_TYPES = ["general-purpose", "team-lead"];

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const NAME_RE = /^name:\s*(.+)$/m;

function parseAgentName(content: string, filename: string): string {
  const match = content.match(FRONTMATTER_RE);
  if (match) {
    const nameMatch = match[1].match(NAME_RE);
    if (nameMatch) return nameMatch[1].trim();
  }
  return basename(filename, ".md");
}

export async function discoverAgentTypes(agentsDir?: string): Promise<string[]> {
  const dir = agentsDir ?? join(homedir(), ".claude", "agents");

  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [...BUILTIN_AGENT_TYPES];
  }

  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const customNames: string[] = [];
  for (const file of mdFiles) {
    try {
      const content = await readFile(join(dir, file), "utf-8");
      customNames.push(parseAgentName(content, file));
    } catch {
      customNames.push(basename(file, ".md"));
    }
  }

  const seen = new Set(BUILTIN_AGENT_TYPES);
  const result = [...BUILTIN_AGENT_TYPES];
  for (const name of customNames) {
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }

  return result;
}
