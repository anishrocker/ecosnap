import type { ItemFlowDefinition } from "@ecosnap/shared";

export type FlowStep =
  | { kind: "question"; questionId: string; prompt: string; answers: { label: string }[] }
  | { kind: "terminal"; attributes: Record<string, string> };

export function getFlowStep(
  flow: ItemFlowDefinition,
  currentQuestionId: string | null,
  accumulated: Record<string, string>,
): FlowStep | null {
  if (currentQuestionId === null) {
    const q = flow.questions.find((x) => x.id === flow.start_question_id);
    if (!q) return null;
    return {
      kind: "question",
      questionId: q.id,
      prompt: q.prompt,
      answers: q.answers.map((a) => ({ label: a.label })),
    };
  }
  const q = flow.questions.find((x) => x.id === currentQuestionId);
  if (!q) return null;
  return {
    kind: "question",
    questionId: q.id,
    prompt: q.prompt,
    answers: q.answers.map((a) => ({ label: a.label })),
  };
}

/** Apply answer label at current question; returns next question id or null if terminal */
export function applyFlowAnswer(
  flow: ItemFlowDefinition,
  currentQuestionId: string,
  answerLabel: string,
  accumulated: Record<string, string>,
): { nextQuestionId: string | null; merged: Record<string, string> } {
  const q = flow.questions.find((x) => x.id === currentQuestionId);
  if (!q) throw new Error(`Unknown question: ${currentQuestionId}`);
  const ans = q.answers.find((a) => a.label === answerLabel);
  if (!ans) throw new Error(`Unknown answer: ${answerLabel}`);
  const merged = { ...accumulated, ...ans.patch_attributes };
  const next = ans.next_question_id ?? null;
  return { nextQuestionId: next, merged };
}
