#!/usr/bin/env node
/**
 * Minimal bundle example for mobile offline embedding (replace with DB export in CI).
 */
const bundle = {
  generated_at: new Date().toISOString(),
  jurisdictions: [],
  waste_streams: [],
  source_documents: [],
  items: [],
  item_search_aliases: [],
  disposition_rules: [],
};
process.stdout.write(JSON.stringify(bundle, null, 2));
