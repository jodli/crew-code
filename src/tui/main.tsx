import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./app.tsx";
import { createLauncher, type BackendType } from "./launcher/detect.ts";

export async function startTui(backendOverride?: BackendType) {
  const launcher = createLauncher(backendOverride);
  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  createRoot(renderer).render(<App launcher={launcher} />);
}
