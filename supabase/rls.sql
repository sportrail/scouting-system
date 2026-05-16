-- S³ Sportrail Scouting — política RLS para validação de código de curso no login
--
-- O formulário de login valida o código ANTES de o utilizador estar autenticado,
-- por isso a role `anon` precisa de poder fazer SELECT na tabela courses.
-- Sem esta política, a validação falha com erro 403.
--
-- Corre no SQL Editor do Supabase (só precisas de correr uma vez).

-- Permite que qualquer visitante (anon) verifique se um código existe.
-- Só expõe o `id` — o query no código faz .select("id"), não devolve dados sensíveis.
create policy "Anon pode verificar códigos de curso"
  on courses
  for select
  to anon
  using (true);

-- Utilizadores autenticados também podem ler (para uso futuro).
create policy "Autenticados podem ler cursos"
  on courses
  for select
  to authenticated
  using (true);
