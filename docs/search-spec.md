# Search ranking (deterministic)

`search_items(q, jurisdiction_id)` and client-side `normalizeSearchQuery()` must stay aligned.

## Tie-break order

1. Exact alias match (`alias_normalized = q`) before prefix/trigram.
2. Higher `item_search_alias.weight` wins.
3. Shorter `length(alias_normalized)` wins.
4. Stable sort by `item_id` ascending.

## Empty query

When `q` is empty after normalization, the RPC returns up to 50 published items ordered by title (browse mode).
