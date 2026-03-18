import { Hono } from "hono";
import type { Env } from "../server.ts";

export function teamRoutes() {
  return new Hono<Env>();
}
