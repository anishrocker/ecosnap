import { z } from "zod";

export const publishItemPayloadSchema = z.object({
  item_id: z.string().uuid(),
  /** When true, admin with role admin may bypass warnings (server still validates) */
  force_warnings: z.boolean().optional(),
  override_reason: z.string().optional(),
});

export type PublishItemPayload = z.infer<typeof publishItemPayloadSchema>;
