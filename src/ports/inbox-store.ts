import type { InboxMessage } from "../types/domain.ts";
import type { CrewError } from "../types/errors.ts";
import type { Result } from "../types/result.ts";

export interface InboxStore {
  createInbox(
    team: string,
    agent: string,
    messages?: InboxMessage[],
  ): Promise<Result<void>>;
}
