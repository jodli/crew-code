import { Hono } from "hono";
import type { Env } from "../server.ts";

export function agentRoutes() {
  return new Hono<Env>();
}
