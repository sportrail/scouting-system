-- S³ Sportrail Scouting — acesso do formador aos relatórios dos formandos
--
-- Corre DEPOIS de reports.sql ter sido aplicado.
-- Corre no SQL Editor do Supabase (só uma vez).

-- 1. Adicionar coluna trainer_id à tabela courses
--    (identifica o utilizador Supabase que é formador de cada curso)
alter table public.courses
  add column if not exists trainer_id uuid references auth.users(id);

-- 2. Política RLS: formadores podem ler os relatórios dos formandos do seu curso.
--    Um utilizador é formador de um curso se o seu owner_id está em courses.trainer_id.
create policy "Formadores lêem relatórios do seu curso"
  on public.reports for select
  to authenticated
  using (
    course_code in (
      select code from public.courses where trainer_id = auth.uid()
    )
  );

-- 3. Para definir o formador de um curso, corre:
--    update public.courses set trainer_id = '<UUID do teu utilizador>' where code = 'SCOUT2026-A';
--
--    Podes encontrar o teu UUID em: Supabase Dashboard → Authentication → Users → copia o UUID.
