import { defineCommand } from "citty";

export default defineCommand({
  meta: {
    name: "serve",
    description: "Start the crew REST API server",
  },
  args: {
    port: {
      type: "string",
      description: "Port to listen on",
      default: "3117",
    },
    host: {
      type: "string",
      description: "Host to bind to",
      default: "localhost",
    },
  },
  async run({ args }) {
    const { JsonFileConfigStore } = await import("../../adapters/json-file-config-store.ts");
    const { JsonFileInboxStore } = await import("../../adapters/json-file-inbox-store.ts");
    const { YamlBlueprintStore } = await import("../../adapters/yaml-blueprint-store.ts");
    const { FileProcessRegistry } = await import("../../adapters/file-process-registry.ts");
    const { createApp } = await import("../../api/server.ts");

    const ctx = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      blueprintStore: new YamlBlueprintStore(),
      processRegistry: new FileProcessRegistry(),
    };

    const app = createApp(ctx);
    const port = parseInt(args.port, 10);

    Bun.serve({
      fetch: app.fetch,
      port,
      hostname: args.host,
    });

    console.error(`crew API listening on http://${args.host}:${port}`);
  },
});
