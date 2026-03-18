import { Hono } from "hono";
import type { Env } from "../server.ts";

export function messageRoutes() {
  return new Hono<Env>();
}
