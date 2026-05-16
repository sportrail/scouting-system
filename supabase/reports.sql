-- S³ Sportrail Scouting — tabela de relatórios com sync Supabase
--
-- Cada scout guarda os seus relatórios na nuvem.
-- O id mantém o formato local (r_TIMESTAMP_RAND) para compatibilidade com localStorage.
-- A coluna `data` guarda o JSON completo do relatório.
--
-- Se a tabela reports já existir (criada anteriormente), este script:
--   • não a recria (IF NOT EXISTS)
--   • adiciona a coluna course_code se ainda não existir
--   • cria/actualiza as políticas RLS
-- Corre no SQL Editor do Supabase (pode correr mais do que uma vez com segurança).

create table if not exists public.reports (
  id          text        primary key,
  owner_id    uuid        not null references auth.users(id) on delete cascade,
  course_code text,
  data        jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Adicionar course_code se a tabela já existia sem ela.
alter table public.reports
  add column if not exists course_code text;

alter table public.reports enable row level security;

-- Remover política antiga se existir (para poder recriar limpa).
drop policy if exists "Users manage own reports" on public.reports;

-- Cada utilizador só vê e gere os seus próprios relatórios.
create policy "Users manage own reports"
  on public.reports for all
  to authenticated
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Trigger para manter updated_at actualizado automaticamente.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reports_updated_at on public.reports;
create trigger reports_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();
