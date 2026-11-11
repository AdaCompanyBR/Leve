-- Leve: tabela e regras da sincronização no Supabase.
-- Rode uma vez em Supabase > SQL Editor > New query > cole tudo > Run.
-- Cada pessoa só lê e grava as próprias linhas (Row Level Security).

create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  store      text        not null check (store in ('kv', 'entries', 'weights', 'foods', 'templates', 'drinks')),
  key        text        not null,
  value      jsonb,
  deleted    boolean     not null default false,
  updated_at bigint      not null,                         -- hora da mudança no aparelho (ms)
  synced_at  timestamptz not null default clock_timestamp(), -- hora em que chegou à nuvem
  primary key (user_id, store, key)
);

create index if not exists records_user_synced on public.records (user_id, synced_at);

alter table public.records enable row level security;

drop policy if exists "ler os meus" on public.records;
drop policy if exists "criar os meus" on public.records;
drop policy if exists "alterar os meus" on public.records;
create policy "ler os meus"     on public.records for select to authenticated using (user_id = auth.uid());
create policy "criar os meus"   on public.records for insert to authenticated with check (user_id = auth.uid());
create policy "alterar os meus" on public.records for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Grava um lote de mudanças. Só substitui o que estiver na nuvem se a mudança for mais nova.
create or replace function public.push_records(rows jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.records (user_id, store, key, value, deleted, updated_at)
  select auth.uid(), r->>'store', r->>'key', r->'value', coalesce((r->>'deleted')::boolean, false), (r->>'updated_at')::bigint
  from jsonb_array_elements(rows) as r
  on conflict (user_id, store, key) do update
    set value = excluded.value, deleted = excluded.deleted, updated_at = excluded.updated_at, synced_at = clock_timestamp()
    where public.records.updated_at < excluded.updated_at;
$$;

revoke all on function public.push_records(jsonb) from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;
