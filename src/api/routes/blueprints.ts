import { Hono } from "hono";
import type { Env } from "../server.ts";

export function blueprintRoutes() {
  return new Hono<Env>();
}
