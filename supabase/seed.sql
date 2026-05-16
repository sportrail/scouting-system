-- S³ Sportrail Scouting — dados de teste para a tabela courses
-- Corre isto no SQL Editor do Supabase para teres um curso de teste.
--
-- ATENÇÃO: só correr uma vez. Se correres duas vezes dá erro de chave duplicada
-- (o código já existe). Usa o INSERT ... ON CONFLICT DO NOTHING se quiseres
-- correr várias vezes sem erros.

insert into courses (code, name)
values
  ('SCOUT2026-A', 'Formação de Scouting 2026 — Turma A'),
  ('SCOUT2026-B', 'Formação de Scouting 2026 — Turma B'),
  ('TESTE',       'Curso de Teste (desenvolvimento)')
on conflict (code) do nothing;
