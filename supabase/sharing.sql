-- Leve: compartilhamento de líquidos entre amigos.
-- Rode uma vez em Supabase > SQL Editor > New query > cole tudo > Run (depois do schema.sql).
--
-- O que um amigo vê de você: nome, figura, quanto bebeu no dia, a meta e se aceita cutucadas.
-- Nunca as bebidas, os horários nem nada do diário de comida.
-- O compartilhamento tem direção: "dono" mostra o progresso para "quem vê".

-- Resumo do dia que cada pessoa publica para os amigos.
create table if not exists public.share_status (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name        text   not null default '' check (char_length(name) <= 40),
  body        text   not null default 'f' check (body in ('f', 'm')),
  day         date   not null,
  ml          int    not null default 0 check (ml between 0 and 20000),
  goal        int    not null default 2000 check (goal between 500 and 10000),
  allow_pokes boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- Quem vê quem. Os nomes ficam guardados aqui para as duas pontas verem a lista,
-- mesmo quando só uma delas compartilha.
create table if not exists public.share_links (
  owner       uuid not null references auth.users (id) on delete cascade,
  viewer      uuid not null references auth.users (id) on delete cascade,
  owner_name  text not null default '',
  viewer_name text not null default '',
  created_at  timestamptz not null default now(),
  primary key (owner, viewer),
  check (owner <> viewer)
);
create index if not exists share_links_viewer on public.share_links (viewer);

-- Convites: um código que vale 7 dias e pode ser usado por várias pessoas.
create table if not exists public.share_invites (
  code       text primary key check (char_length(code) between 8 and 32),
  owner      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  owner_name text not null default '' check (char_length(owner_name) <= 40),
  expires_at timestamptz not null default now() + interval '7 days'
);

-- Cutucadas e aplausos.
create table if not exists public.share_pokes (
  id         bigint generated always as identity primary key,
  from_id    uuid not null references auth.users (id) on delete cascade,
  to_id      uuid not null references auth.users (id) on delete cascade,
  from_name  text not null default '',
  kind       text not null check (kind in ('cutucada', 'aplauso')),
  created_at timestamptz not null default now(),
  seen       boolean not null default false
);
create index if not exists share_pokes_to on public.share_pokes (to_id, seen);

alter table public.share_status  enable row level security;
alter table public.share_links   enable row level security;
alter table public.share_invites enable row level security;
alter table public.share_pokes   enable row level security;

-- share_status: cada um grava o seu; lê o seu e o de quem compartilha com você.
drop policy if exists "status: ler" on public.share_status;
drop policy if exists "status: criar" on public.share_status;
drop policy if exists "status: alterar" on public.share_status;
create policy "status: ler" on public.share_status for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.share_links l where l.owner = share_status.user_id and l.viewer = auth.uid()));
create policy "status: criar" on public.share_status for insert to authenticated with check (user_id = auth.uid());
create policy "status: alterar" on public.share_status for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- share_links: as duas pontas leem e qualquer uma pode encerrar. Criar só pelo aceite do convite.
drop policy if exists "links: ler" on public.share_links;
drop policy if exists "links: encerrar" on public.share_links;
create policy "links: ler" on public.share_links for select to authenticated using (owner = auth.uid() or viewer = auth.uid());
create policy "links: encerrar" on public.share_links for delete to authenticated using (owner = auth.uid() or viewer = auth.uid());

-- share_invites: o dono cria e apaga os seus. Ler um convite só pela função abaixo.
drop policy if exists "convites: criar" on public.share_invites;
drop policy if exists "convites: apagar" on public.share_invites;
create policy "convites: criar" on public.share_invites for insert to authenticated with check (owner = auth.uid());
create policy "convites: apagar" on public.share_invites for delete to authenticated using (owner = auth.uid());

-- share_pokes: quem recebe lê e marca como vista. Enviar só pela função abaixo.
drop policy if exists "cutucadas: ler" on public.share_pokes;
drop policy if exists "cutucadas: marcar" on public.share_pokes;
create policy "cutucadas: ler" on public.share_pokes for select to authenticated using (to_id = auth.uid());
create policy "cutucadas: marcar" on public.share_pokes for update to authenticated using (to_id = auth.uid()) with check (to_id = auth.uid());

-- Quem convidou, para a tela de aceite mostrar o nome antes de aceitar.
create or replace function public.invite_info(invite text)
returns table (owner_name text, mine boolean, valid boolean)
language sql
security definer
set search_path = public
as $$
  select i.owner_name, i.owner = auth.uid(), i.expires_at > now()
  from public.share_invites i where i.code = invite;
$$;

-- Aceitar: quem aceita passa a ver o dono. Com `back`, o dono também passa a ver quem aceitou.
create or replace function public.accept_invite(invite text, my_name text, back boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare inv public.share_invites;
begin
  if auth.uid() is null then raise exception 'sem sessão'; end if;
  select * into inv from public.share_invites where code = invite;
  if not found or inv.expires_at < now() then raise exception 'convite inválido ou vencido'; end if;
  if inv.owner = auth.uid() then raise exception 'este convite é seu'; end if;
  insert into public.share_links (owner, viewer, owner_name, viewer_name)
    values (inv.owner, auth.uid(), inv.owner_name, left(coalesce(my_name, ''), 40))
    on conflict (owner, viewer) do update set owner_name = excluded.owner_name, viewer_name = excluded.viewer_name;
  if back then
    insert into public.share_links (owner, viewer, owner_name, viewer_name)
      values (auth.uid(), inv.owner, left(coalesce(my_name, ''), 40), inv.owner_name)
      on conflict (owner, viewer) do update set owner_name = excluded.owner_name, viewer_name = excluded.viewer_name;
  end if;
  return inv.owner_name;
end;
$$;

-- Cutucar ou aplaudir alguém que compartilha com você, se a pessoa aceitar, até 3 vezes por dia.
create or replace function public.send_poke(target uuid, poke_kind text, my_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'sem sessão'; end if;
  if poke_kind not in ('cutucada', 'aplauso') then raise exception 'tipo inválido'; end if;
  if not exists (select 1 from public.share_links where owner = target and viewer = auth.uid()) then raise exception 'sem compartilhamento'; end if;
  if exists (select 1 from public.share_status where user_id = target and not allow_pokes) then raise exception 'cutucadas desligadas'; end if;
  if (select count(*) from public.share_pokes where from_id = auth.uid() and to_id = target and created_at > now() - interval '1 day') >= 3 then
    raise exception 'limite de 3 por dia';
  end if;
  insert into public.share_pokes (from_id, to_id, from_name, kind) values (auth.uid(), target, left(coalesce(my_name, ''), 40), poke_kind);
end;
$$;

revoke all on function public.invite_info(text) from public, anon;
revoke all on function public.accept_invite(text, text, boolean) from public, anon;
revoke all on function public.send_poke(uuid, text, text) from public, anon;
grant execute on function public.invite_info(text) to authenticated;
grant execute on function public.accept_invite(text, text, boolean) to authenticated;
grant execute on function public.send_poke(uuid, text, text) to authenticated;
