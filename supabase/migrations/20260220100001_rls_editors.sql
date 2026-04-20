-- Editor/admin access for content tables (authenticated). Service role bypasses RLS.

create or replace function public.is_content_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('editor', 'admin')
  );
$$;

-- Items: editors see all; anon sees published only (handled in prior migration — replace)
drop policy if exists item_read_published on public.item;
create policy item_select on public.item
  for select using (
    status = 'published' or public.is_content_editor()
  );

create policy item_write on public.item
  for all using (public.is_content_editor()) with check (public.is_content_editor());

drop policy if exists item_tag_read on public.item_tag;
create policy item_tag_select on public.item_tag
  for select using (
    exists (
      select 1 from public.item i
      where i.id = item_id and (i.status = 'published' or public.is_content_editor())
    )
  );

create policy item_tag_write on public.item_tag
  for all using (public.is_content_editor()) with check (public.is_content_editor());

drop policy if exists item_alias_read on public.item_search_alias;
create policy item_alias_select on public.item_search_alias
  for select using (
    exists (
      select 1 from public.item i
      where i.id = item_id and (i.status = 'published' or public.is_content_editor())
    )
  );

create policy item_alias_write on public.item_search_alias
  for all using (public.is_content_editor()) with check (public.is_content_editor());

drop policy if exists item_flow_read on public.item_flow;
create policy item_flow_select on public.item_flow
  for select using (status = 'published' or public.is_content_editor());

create policy item_flow_write on public.item_flow
  for all using (public.is_content_editor()) with check (public.is_content_editor());

drop policy if exists disposition_rule_read on public.disposition_rule;
create policy disposition_rule_select on public.disposition_rule
  for select using (status = 'published' or public.is_content_editor());

create policy disposition_rule_write on public.disposition_rule
  for all using (public.is_content_editor()) with check (public.is_content_editor());

create policy jurisdiction_write on public.jurisdiction
  for all using (public.is_content_editor()) with check (public.is_content_editor());

create policy waste_stream_write on public.waste_stream
  for all using (public.is_content_editor()) with check (public.is_content_editor());

create policy source_document_write on public.source_document
  for all using (public.is_content_editor()) with check (public.is_content_editor());

create policy feedback_admin on public.feedback_ticket
  for all using (public.is_content_editor()) with check (public.is_content_editor());

create policy publish_audit_insert on public.publish_audit
  for insert with check (public.is_content_editor());

create policy publish_audit_select on public.publish_audit
  for select using (public.is_content_editor());

-- Auto-create profile on signup (default editor; promote to admin in SQL dashboard)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'editor')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
