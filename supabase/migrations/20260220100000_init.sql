-- EcoSnap core schema (public). Service role bypasses RLS for admin writes.

create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table public.jurisdiction (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  timezone text not null default 'America/Chicago',
  official_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.waste_stream (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.source_document (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table public.item (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  category text,
  hazard boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  not_covered boolean not null default false,
  coming_soon boolean not null default false,
  coverage_notes text,
  primary_source_document_id uuid references public.source_document (id),
  citation_url text,
  last_reviewed_at timestamptz,
  content_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.item_tag (
  item_id uuid not null references public.item (id) on delete cascade,
  tag text not null,
  primary key (item_id, tag)
);

create table public.item_search_alias (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.item (id) on delete cascade,
  alias_text text not null,
  alias_normalized text not null,
  locale text not null default 'en',
  weight int not null default 0,
  is_hidden_from_suggest boolean not null default false,
  created_at timestamptz not null default now(),
  unique (locale, alias_normalized)
);

create index item_search_alias_norm_idx on public.item_search_alias using gin (alias_normalized gin_trgm_ops);
create index item_title_trgm_idx on public.item using gin (title gin_trgm_ops);

create table public.item_flow (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.item (id) on delete cascade,
  version int not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  flow_json jsonb not null,
  primary_source_document_id uuid references public.source_document (id),
  citation_url text,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, version)
);

create table public.disposition_rule (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdiction (id) on delete cascade,
  item_id uuid not null references public.item (id) on delete cascade,
  waste_stream_id uuid not null references public.waste_stream (id),
  priority int not null default 100,
  notes text,
  rationale text,
  attributes_json jsonb not null default '{}'::jsonb,
  effective_from date,
  effective_to date,
  citation_url text,
  primary_source_document_id uuid references public.source_document (id),
  last_reviewed_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index disposition_rule_lookup_idx on public.disposition_rule (jurisdiction_id, item_id, status);

-- ---------------------------------------------------------------------------
-- Profiles & feedback
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'admin')),
  preferred_jurisdiction_id uuid references public.jurisdiction (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedback_ticket (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  item_id uuid references public.item (id) on delete set null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'triaged', 'closed')),
  created_at timestamptz not null default now()
);

create table public.publish_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  item_id uuid references public.item (id) on delete set null,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AI-ready (unused in MVP UI)
-- ---------------------------------------------------------------------------

create table public.media_asset (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users (id) on delete set null,
  storage_path text not null,
  mime text not null,
  created_at timestamptz not null default now(),
  sha256 text,
  exif_stripped boolean not null default false
);

create table public.classification_attempt (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  jurisdiction_id uuid references public.jurisdiction (id),
  media_asset_id uuid references public.media_asset (id),
  client_session_id text,
  created_at timestamptz not null default now()
);

create table public.classification_signal (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.classification_attempt (id) on delete cascade,
  source text not null check (source in ('rules', 'manual', 'ai', 'import')),
  item_id uuid references public.item (id),
  confidence double precision,
  model_id text,
  payload jsonb,
  rank int not null default 0
);

-- ---------------------------------------------------------------------------
-- RPC: search_items (deterministic ranking per plan)
-- ---------------------------------------------------------------------------

create or replace function public.search_items(p_query text, p_jurisdiction uuid)
returns table (
  item_id uuid,
  title text,
  snippet text,
  match_type text
)
language plpgsql
stable
as $$
declare
  n text;
begin
  n := nullif(trim(lower(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g'))), '');
  if n is null then
    return query
      select i.id, i.title, left(i.title, 120), 'browse'::text
      from public.item i
      where i.status = 'published'
      order by i.title asc, i.id asc
      limit 50;
    return;
  end if;

  return query
  with alias_hits as (
    select
      a.item_id,
      i.title,
      a.alias_text as matched,
      case when a.alias_normalized = n then 0 else 1 end as exact_rank,
      a.weight,
      length(a.alias_normalized) as alias_len
    from public.item_search_alias a
    join public.item i on i.id = a.item_id
    where i.status = 'published'
      and (
        a.alias_normalized = n
        or a.alias_normalized like n || '%'
        or a.alias_normalized % n
      )
  ),
  title_hits as (
    select
      i.id as item_id,
      i.title,
      i.title as matched,
      2 as exact_rank,
      0 as weight,
      length(i.title) as alias_len
    from public.item i
    where i.status = 'published'
      and (
        lower(i.title) = n
        or lower(i.title) like '%' || n || '%'
      )
      and not exists (select 1 from alias_hits ah where ah.item_id = i.id)
  ),
  unioned as (
    select * from alias_hits
    union all
    select * from title_hits
  )
  select
    u.item_id,
    u.title,
    left(u.matched, 120) as snippet,
    case when u.exact_rank = 0 then 'alias_exact' when u.exact_rank = 1 then 'alias_prefix' else 'title' end as match_type
  from unioned u
  order by
    u.exact_rank asc,
    u.weight desc,
    u.alias_len asc,
    u.item_id asc
  limit 50;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.jurisdiction enable row level security;
alter table public.waste_stream enable row level security;
alter table public.source_document enable row level security;
alter table public.item enable row level security;
alter table public.item_tag enable row level security;
alter table public.item_search_alias enable row level security;
alter table public.item_flow enable row level security;
alter table public.disposition_rule enable row level security;
alter table public.profiles enable row level security;
alter table public.feedback_ticket enable row level security;
alter table public.publish_audit enable row level security;
alter table public.media_asset enable row level security;
alter table public.classification_attempt enable row level security;
alter table public.classification_signal enable row level security;

create policy jurisdiction_read on public.jurisdiction for select using (true);
create policy waste_stream_read on public.waste_stream for select using (true);
create policy source_document_read on public.source_document for select using (true);

create policy item_read_published on public.item
  for select using (status = 'published');

create policy item_tag_read on public.item_tag
  for select using (
    exists (select 1 from public.item i where i.id = item_id and i.status = 'published')
  );

create policy item_alias_read on public.item_search_alias
  for select using (
    exists (select 1 from public.item i where i.id = item_id and i.status = 'published')
  );

create policy item_flow_read on public.item_flow
  for select using (status = 'published');

create policy disposition_rule_read on public.disposition_rule
  for select using (status = 'published');

create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id);

create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);

create policy feedback_insert_own on public.feedback_ticket
  for insert with check (auth.uid() = user_id);

create policy feedback_read_own on public.feedback_ticket
  for select using (auth.uid() = user_id);

-- No anon policies on media / classification (future)
