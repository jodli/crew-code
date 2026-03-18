import { Hono } from "hono";
import type { Env } from "../server.ts";

export function doctorRoutes() {
  return new Hono<Env>();
}
