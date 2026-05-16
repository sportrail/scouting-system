-- ══════════════════════════════════════════════════════════════
-- S³ Sportrail Scouting — Suporte a múltiplos formadores por turma
-- Corre no SQL Editor do Supabase (pode correr mais do que uma vez)
-- ══════════════════════════════════════════════════════════════

-- PASSO 1: Tabela de junção (N formadores por turma)
create table if not exists public.course_trainers (
  id          uuid default gen_random_uuid() primary key,
  course_code text not null references public.courses(code) on delete cascade,
  trainer_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(course_code, trainer_id)
);

alter table public.course_trainers enable row level security;

-- Formadores vêem apenas as suas próprias linhas
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'course_trainers'
      and policyname = 'Trainers read own rows'
  ) then
    execute $pol$
      create policy "Trainers read own rows"
        on public.course_trainers for select
        to authenticated
        using (trainer_id = auth.uid())
    $pol$;
  end if;
end;
$$;

-- PASSO 2: Migrar formadores já existentes (trainer_id na tabela courses)
insert into public.course_trainers (course_code, trainer_id)
select code, trainer_id
from public.courses
where trainer_id is not null
on conflict (course_code, trainer_id) do nothing;

-- PASSO 3: Actualizar política RLS dos relatórios para usar course_trainers
drop policy if exists "Formadores lêem relatórios do seu curso" on public.reports;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'reports'
      and policyname = 'Formadores lêem relatórios do seu curso'
  ) then
    execute $pol$
      create policy "Formadores lêem relatórios do seu curso"
        on public.reports for select
        to authenticated
        using (
          course_code in (
            select course_code from public.course_trainers where trainer_id = auth.uid()
          )
        )
    $pol$;
  end if;
end;
$$;

-- PASSO 4: Adicionar segundo formador a uma turma
-- Substitui os valores abaixo e executa:
--
--   insert into public.course_trainers (course_code, trainer_id)
--   values ('<CÓDIGO_DO_CURSO>', '<UUID_DO_FORMADOR>');
--
-- Exemplo:
--   insert into public.course_trainers (course_code, trainer_id)
--   values ('SCOUT2026-A', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- PASSO 5: Verificar configuração
select
  ct.course_code,
  c.name as curso,
  u.email as formador_email,
  ct.created_at
from public.course_trainers ct
join public.courses c on c.code = ct.course_code
left join auth.users u on u.id = ct.trainer_id
order by ct.course_code, ct.created_at;
