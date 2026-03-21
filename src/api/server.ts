import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppContext } from "../types/context.ts";
import { agentRoutes } from "./routes/agents.ts";
import { blueprintRoutes } from "./routes/blueprints.ts";
import { doctorRoutes } from "./routes/doctor.ts";
import { messageRoutes } from "./routes/messages.ts";
import { teamRoutes } from "./routes/teams.ts";

export type Env = {
  Variables: {
    ctx: AppContext;
  };
};

export function createApp(ctx: AppContext) {
  const app = new Hono<Env>();

  app.use("*", cors());
  app.use("/api/*", async (c, next) => {
    c.set("ctx", ctx);
    await next();
  });

  app.route("/api", teamRoutes());
  app.route("/api", agentRoutes());
  app.route("/api", messageRoutes());
  app.route("/api", doctorRoutes());
  app.route("/api", blueprintRoutes());

  return app;
}
