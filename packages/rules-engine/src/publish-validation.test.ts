import { describe, expect, it } from "vitest";
import { flowGraphIsAcyclic, validateItemFlowJson } from "./publish-validation.js";

describe("flowGraphIsAcyclic", () => {
  it("accepts linear flow", () => {
    const flow = {
      version: 1,
      start_question_id: "q1",
      questions: [
        {
          id: "q1",
          prompt: "A?",
          answers: [{ label: "Yes", patch_attributes: {}, next_question_id: "q2" }],
        },
        {
          id: "q2",
          prompt: "B?",
          answers: [{ label: "Done", patch_attributes: { plasticResin: "PET" } }],
        },
      ],
    };
    const v = validateItemFlowJson(flow);
    expect(v.ok).toBe(true);
    if (v.ok) expect(flowGraphIsAcyclic(v.flow)).toBe(true);
  });

  it("rejects self-loop", () => {
    const flow = {
      version: 1,
      start_question_id: "q1",
      questions: [
        {
          id: "q1",
          prompt: "A?",
          answers: [{ label: "Loop", patch_attributes: {}, next_question_id: "q1" }],
        },
      ],
    };
    expect(flowGraphIsAcyclic(flow as never)).toBe(false);
  });
});
