import { z } from "zod";

export const BlueprintAgentSchema = z.object({
  name: z.string(),
  isLead: z.boolean().optional(),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
});

export const BlueprintSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  agents: z.array(BlueprintAgentSchema).min(1),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;
export type BlueprintAgent = z.infer<typeof BlueprintAgentSchema>;
