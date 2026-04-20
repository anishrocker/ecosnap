import { parseItemFlowJson, type ItemFlowDefinition } from "@ecosnap/shared";
import type { DispositionRuleDTO, ItemDTO, RulesBundle } from "./types.js";
import { evaluateDispositions } from "./evaluate.js";

export type PublishIssue = { level: "error" | "warning"; code: string; message: string };

function collectQuestionIds(flow: ItemFlowDefinition): Set<string> {
  return new Set(flow.questions.map((q) => q.id));
}

/** DFS from start following optional next_question_id edges */
export function flowGraphIsAcyclic(flow: ItemFlowDefinition): boolean {
  const ids = collectQuestionIds(flow);
  if (!ids.has(flow.start_question_id)) return false;
  const visiting = new Set<string>();
  const done = new Set<string>();

  function dfs(qid: string): boolean {
    if (done.has(qid)) return true;
    if (visiting.has(qid)) return false;
    visiting.add(qid);
    const q = flow.questions.find((x) => x.id === qid);
    if (!q) {
      visiting.delete(qid);
      return false;
    }
    for (const a of q.answers) {
      const next = a.next_question_id;
      if (next) {
        if (!ids.has(next)) return false;
        if (!dfs(next)) return false;
      }
    }
    visiting.delete(qid);
    done.add(qid);
    return true;
  }
  return dfs(flow.start_question_id);
}

export function validateItemFlowJson(json: unknown): { ok: true; flow: ItemFlowDefinition } | { ok: false; issues: PublishIssue[] } {
  const parsed = parseItemFlowJson(json);
  if (!parsed.success) {
    return {
      ok: false,
      issues: [
        {
          level: "error",
          code: "flow_schema",
          message: parsed.error.message,
        },
      ],
    };
  }
  const flow = parsed.data;
  const issues: PublishIssue[] = [];
  if (!flowGraphIsAcyclic(flow)) {
    issues.push({ level: "error", code: "flow_cycle", message: "Flow graph is cyclic or has invalid next_question_id" });
  }
  return issues.length ? { ok: false, issues } : { ok: true, flow };
}

export function validateItemPublish(
  item: ItemDTO,
  rulesForItem: DispositionRuleDTO[],
  bundle: RulesBundle,
  jurisdictionIds: string[],
  flowJson: unknown | null,
): PublishIssue[] {
  const issues: PublishIssue[] = [];

  if (!item.last_reviewed_at) {
    issues.push({
      level: "error",
      code: "trust_last_reviewed",
      message: "last_reviewed_at must be set before publishing",
    });
  }

  const hasCitation =
    item.primary_source_document_id ||
    (item.citation_url && item.citation_url.length > 0);
  if (!hasCitation) {
    issues.push({
      level: "warning",
      code: "item_citation",
      message: "Item has no primary_source_document_id or citation_url",
    });
  }

  for (const jid of jurisdictionIds) {
    const hasRule = rulesForItem.some(
      (r) => r.jurisdiction_id === jid && r.status === "published",
    );
    const covered = hasRule || item.not_covered || item.coming_soon;
    if (!covered) {
      issues.push({
        level: "error",
        code: "coverage",
        message: `No published disposition_rule for jurisdiction ${jid} and item is not marked not_covered/coming_soon`,
      });
    }
  }

  for (const r of rulesForItem) {
    if (r.status !== "published") continue;
    const rc = r.primary_source_document_id || (r.citation_url && r.citation_url.length > 0);
    if (!rc) {
      issues.push({
        level: "error",
        code: "rule_citation",
        message: `Published rule ${r.id} needs primary_source_document_id or citation_url`,
      });
    }
    if (!r.last_reviewed_at) {
      issues.push({
        level: "error",
        code: "rule_trust",
        message: `Published rule ${r.id} missing last_reviewed_at`,
      });
    }
  }

  if (flowJson !== null && flowJson !== undefined) {
    const f = validateItemFlowJson(flowJson);
    if (!f.ok) {
      issues.push(...f.issues);
    } else if (bundle.waste_streams.length > 0) {
      const simBundle: RulesBundle = {
        ...bundle,
        disposition_rules: rulesForItem.filter((x) => x.status === "published"),
      };
      for (const jid of jurisdictionIds) {
        const attrs: Record<string, string> = {};
        const dispositions = evaluateDispositions({
          bundle: simBundle,
          jurisdictionId: jid,
          itemId: item.id,
          attributes: attrs,
        });
        if (dispositions.length === 0 && !f.flow.ask_city_fallback) {
          issues.push({
            level: "error",
            code: "flow_terminal_rules",
            message: `No disposition for jurisdiction ${jid} with empty flow attributes; set ask_city_fallback or add rules`,
          });
        }
      }
    }
  }

  return issues;
}
