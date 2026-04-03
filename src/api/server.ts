import { Hono } from "hono";
import { cors } from "hono/cors";
import pkg from "../../package.json";
import { debug, warn } from "../lib/logger.ts";
import type { AppContext } from "../types/context.ts";
import { agentRoutes } from "./routes/agents.ts";
import { blueprintRoutes } from "./routes/blueprints.ts";
import { doctorRoutes } from "./routes/doctor.ts";
import { messageRoutes } from "./routes/messages.ts";
import { metaRoutes } from "./routes/meta.ts";
import { teamRoutes } from "./routes/teams.ts";

export type Env = {
  Variables: {
    ctx: AppContext;
  };
};

export function createApp(ctx: AppContext) {
  const app = new Hono<Env>();

  app.use("*", cors());

  // Request logging
  app.use("*", async (c, next) => {
    const start = performance.now();
    await next();
    const ms = (performance.now() - start).toFixed(1);
    const status = c.res.status;
    if (status >= 500) {
      warn("api", `${c.req.method} ${c.req.path} ${status} ${ms}ms`);
    } else {
      debug("api", `${c.req.method} ${c.req.path} ${status} ${ms}ms`);
    }
  });

  const startedAt = Date.now();
  app.get("/api/health", (c) =>
    c.json({ status: "ok", version: pkg.version, uptime: Math.floor((Date.now() - startedAt) / 1000) }),
  );

  app.use("/api/*", async (c, next) => {
    c.set("ctx", ctx);
    await next();
  });

  app.route("/api", teamRoutes());
  app.route("/api", agentRoutes());
  app.route("/api", messageRoutes());
  app.route("/api", doctorRoutes());
  app.route("/api", blueprintRoutes());
  app.route("/api", metaRoutes());

  return app;
}
