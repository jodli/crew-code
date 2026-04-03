import type { Blueprint } from "../config/blueprint-schema.ts";
import type { Result } from "../types/result.ts";

export interface BlueprintStore {
  load(nameOrPath: string): Promise<Result<Blueprint>>;
  save(blueprint: Blueprint): Promise<Result<string>>;
  list(): Promise<Result<string[]>>;
  exists(name: string): Promise<boolean>;
  delete(name: string): Promise<Result<void>>;
}
