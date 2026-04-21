export type IsoDateString = string;

export type JurisdictionDTO = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  official_url: string | null;
};

export type WasteStreamDTO = {
  id: string;
  code: string;
  label: string;
  sort_order: number;
};

export type SourceDocumentDTO = {
  id: string;
  title: string;
  url: string | null;
};

export type ItemDTO = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  hazard: boolean;
  status: "draft" | "published";
  published_at: IsoDateString | null;
  not_covered: boolean;
  coming_soon: boolean;
  coverage_notes: string | null;
  primary_source_document_id: string | null;
  citation_url: string | null;
  last_reviewed_at: IsoDateString | null;
  content_updated_at: IsoDateString | null;
};

export type ItemSearchAliasDTO = {
  item_id: string;
  alias_normalized: string;
  weight: number;
  locale: string;
};

export type DispositionRuleDTO = {
  id: string;
  jurisdiction_id: string;
  item_id: string;
  waste_stream_id: string;
  priority: number;
  notes: string | null;
  rationale: string | null;
  /** Rule matches when every key in this object equals `attributes[key]` */
  attributes_json: Record<string, string>;
  effective_from: IsoDateString | null;
  effective_to: IsoDateString | null;
  citation_url: string | null;
  primary_source_document_id: string | null;
  last_reviewed_at: IsoDateString | null;
  status: "draft" | "published";
  published_at: IsoDateString | null;
};

export type RulesBundle = {
  generated_at: IsoDateString;
  jurisdictions: JurisdictionDTO[];
  waste_streams: WasteStreamDTO[];
  source_documents: SourceDocumentDTO[];
  items: ItemDTO[];
  item_search_aliases: ItemSearchAliasDTO[];
  disposition_rules: DispositionRuleDTO[];
};

export type TrustLine = {
  primary_source_document_id: string | null;
  citation_url: string | null;
  source_title: string | null;
  last_reviewed_at: IsoDateString | null;
  published_at: IsoDateString | null;
  content_updated_at: IsoDateString | null;
};

export type Disposition = {
  waste_stream: WasteStreamDTO;
  notes: string | null;
  rationale: string | null;
  trust: TrustLine;
  rule_id: string;
};

export type EvaluateInput = {
  jurisdictionId: string;
  itemId: string;
  attributes: Record<string, string>;
  bundle: RulesBundle;
};
