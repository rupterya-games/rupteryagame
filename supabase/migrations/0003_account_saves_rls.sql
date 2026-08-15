create table if not exists public.account_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  game_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.account_saves enable row level security;

create policy "players read own save" on public.account_saves
for select to authenticated using ((select auth.uid()) = user_id);

create policy "players create own save" on public.account_saves
for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "players update own save" on public.account_saves
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.account_saves from anon;
grant select, insert, update on public.account_saves to authenticated;
