-- S³ Sportrail Scouting — Adicionar coluna student_email à tabela reports
-- Corre no SQL Editor do Supabase (seguro correr mais do que uma vez).

alter table public.reports
  add column if not exists student_email text;
