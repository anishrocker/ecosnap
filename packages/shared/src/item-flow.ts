import { z } from "zod";

/** Open key/value attributes merged across flow answers */
export const attributeMapSchema = z.record(z.string(), z.string());
export type AttributeMap = z.infer<typeof attributeMapSchema>;

const flowAnswerSchema = z.object({
  label: z.string().min(1),
  patch_attributes: attributeMapSchema.default({}),
  /** If set, jump to another question id after this answer */
  next_question_id: z.string().optional(),
});

export type FlowAnswer = z.infer<typeof flowAnswerSchema>;

const flowQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  answers: z.array(flowAnswerSchema).min(1),
});

export type FlowQuestion = z.infer<typeof flowQuestionSchema>;

/** Terminal: rules engine should run; optional explicit ask-city copy */
export const itemFlowDefinitionSchema = z.object({
  version: z.number().int().positive().default(1),
  start_question_id: z.string().min(1),
  questions: z.array(flowQuestionSchema).min(1),
  /** When true, publish validation allows empty rule evaluation if user reaches terminal */
  ask_city_fallback: z.boolean().optional(),
  ask_city_message: z.string().optional(),
});

export type ItemFlowDefinition = z.infer<typeof itemFlowDefinitionSchema>;

export function parseItemFlowJson(json: unknown) {
  return itemFlowDefinitionSchema.safeParse(json);
}
