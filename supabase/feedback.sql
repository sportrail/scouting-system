-- S³ Sportrail Scouting — Tabela de feedback do formador
-- Corre no SQL Editor do Supabase (pode correr mais do que uma vez com segurança).

create table if not exists public.report_feedback (
  id          uuid        primary key default gen_random_uuid(),
  report_id   uuid        not null references public.reports(id) on delete cascade,
  formador_id uuid        not null references auth.users(id) on delete cascade,
  grade       integer     check (grade >= 0 and grade <= 20),
  comment     text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique(report_id, formador_id)
);

alter table public.report_feedback enable row level security;

-- Formador gere o feedback que deu
create policy "Formador gere o seu feedback"
  on public.report_feedback for all
  to authenticated
  using  (formador_id = auth.uid())
  with check (formador_id = auth.uid());

-- Alunos lêem o feedback dos seus próprios relatórios
create policy "Alunos lêem feedback dos seus relatórios"
  on public.report_feedback for select
  to authenticated
  using (
    report_id in (
      select id from public.reports where owner_id = auth.uid()
    )
  );
