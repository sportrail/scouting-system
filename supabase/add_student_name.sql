-- S³ Sportrail Scouting — Adicionar colunas de identificação do aluno à tabela reports
-- Corre no SQL Editor do Supabase (seguro correr mais do que uma vez).

alter table public.reports
  add column if not exists student_email text,
  add column if not exists student_name  text;
