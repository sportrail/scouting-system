-- ══════════════════════════════════════════════════════════════
-- S³ Sportrail Scouting — Setup completo do acesso do Formador
-- Corre no SQL Editor do Supabase (pode correr mais do que uma vez)
-- ══════════════════════════════════════════════════════════════

-- PASSO 1: Garantir que a tabela courses tem a coluna trainer_id
alter table public.courses
  add column if not exists trainer_id uuid references auth.users(id);

-- PASSO 2: Política RLS — formadores lêem relatórios do seu curso
-- (cria apenas se não existir)
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
            select code from public.courses where trainer_id = auth.uid()
          )
        )
    $pol$;
  end if;
end;
$$;

-- PASSO 3: Atribuir um formador a um curso
-- Substitui <UUID_DO_FORMADOR> pelo UUID do utilizador (ver em Authentication → Users)
-- Substitui <CÓDIGO_DO_CURSO>  pelo code da turma (ex: SCOUT2026-A)
--
--   update public.courses
--   set trainer_id = '<UUID_DO_FORMADOR>'
--   where code = '<CÓDIGO_DO_CURSO>';
--
-- Exemplo:
--   update public.courses
--   set trainer_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
--   where code = 'SCOUT2026-A';

-- PASSO 4: Verificar a configuração
select
  c.code,
  c.name,
  c.trainer_id,
  u.email as trainer_email,
  count(r.id) as total_relatorios
from public.courses c
left join auth.users u on u.id = c.trainer_id
left join public.reports r on r.course_code = c.code
group by c.code, c.name, c.trainer_id, u.email
order by c.code;
