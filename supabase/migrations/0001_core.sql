-- RUPTERYA Browser - núcleo inicial.
-- Todos os valores de combate continuam sujeitos ao balanceamento oficial.

create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  global_level integer not null default 1 check (global_level >= 1),
  global_xp bigint not null default 0 check (global_xp >= 0),
  character_slots integer not null default 1 check (character_slots >= 1),
  created_at timestamptz not null default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  class_id text not null,
  kingdom_id text not null,
  lineage_id text,
  school_id text,
  power integer not null default 0,
  hp_current integer not null default 1,
  hp_max integer not null default 1,
  mp_current integer not null default 0,
  mp_max integer not null default 0,
  morale integer not null default 100,
  gold bigint not null default 0,
  physical_damage integer not null default 0,
  magical_damage integer not null default 0,
  physical_defense integer not null default 0,
  magical_defense integer not null default 0,
  critical_chance numeric(6,3) not null default 0,
  dodge_chance numeric(6,3) not null default 0,
  perception integer not null default 0,
  knowledge integer not null default 0,
  strength integer not null default 0,
  agility integer not null default 0,
  created_at timestamptz not null default now(),
  unique(account_id, name)
);

create table if not exists public.abilities (
  id text primary key,
  name text not null,
  slot_kind text not null check (slot_kind in ('skill','ultimate','stance','passive')),
  source text not null check (source in ('class','lineage','school','secret_art','creature')),
  damage_family text check (damage_family in ('physical','magical','hybrid')),
  physical_scaling numeric(8,4) not null default 0,
  magical_scaling numeric(8,4) not null default 0,
  mana_cost integer not null default 0,
  cooldown_turns integer not null default 0,
  definition jsonb not null default '{}'::jsonb
);

create table if not exists public.character_abilities (
  character_id uuid not null references public.characters(id) on delete cascade,
  ability_id text not null references public.abilities(id) on delete cascade,
  learned_at timestamptz not null default now(),
  primary key(character_id, ability_id)
);

create table if not exists public.character_loadouts (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  name text not null,
  skill_1 text references public.abilities(id),
  skill_2 text references public.abilities(id),
  skill_3 text references public.abilities(id),
  skill_4 text references public.abilities(id),
  ultimate text references public.abilities(id),
  stance text references public.abilities(id),
  passive text references public.abilities(id),
  equipped_pet_id uuid,
  equipped_trophy_id uuid,
  is_active boolean not null default false,
  unique(character_id, name)
);

alter table public.accounts enable row level security;
alter table public.characters enable row level security;
alter table public.character_abilities enable row level security;
alter table public.character_loadouts enable row level security;

create policy "account owner reads account"
on public.accounts for select
using (auth.uid() = id);

create policy "account owner reads characters"
on public.characters for select
using (auth.uid() = account_id);

create policy "account owner reads character abilities"
on public.character_abilities for select
using (exists (
  select 1 from public.characters c where c.id = character_id and c.account_id = auth.uid()
));

create policy "account owner reads loadouts"
on public.character_loadouts for select
using (exists (
  select 1 from public.characters c where c.id = character_id and c.account_id = auth.uid()
));
