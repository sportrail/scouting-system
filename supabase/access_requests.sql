-- S³ Sportrail Scouting — Pedidos de acesso à plataforma
--
-- A app é invite-only. Quem ainda não tem conta submete um pedido (nome + email)
-- pelo ecrã de login. A Sportrail revê os pedidos no Dashboard do Supabase e
-- aprova criando o utilizador em Authentication → Users (Add user, Auto Confirm).
--
-- Sem envio de email (sem Resend): os pedidos ficam nesta tabela.
-- Corre no SQL Editor do Supabase (pode correr mais do que uma vez com segurança).

create table if not exists public.access_requests (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  email      text        not null,
  status     text        not null default 'pending'
             check (status in ('pending', 'approved', 'rejected')),
  note       text,
  created_at timestamptz not null default now()
);

-- Evita vários pedidos pendentes para o mesmo email (case-insensitive).
create unique index if not exists access_requests_pending_email_idx
  on public.access_requests (lower(email))
  where status = 'pending';

alter table public.access_requests enable row level security;

-- Qualquer visitante (não autenticado) pode SUBMETER um pedido.
drop policy if exists "Qualquer um submete pedido de acesso" on public.access_requests;
create policy "Qualquer um submete pedido de acesso"
  on public.access_requests for insert
  to anon, authenticated
  with check (true);

-- Nota: não há política de SELECT/UPDATE/DELETE de propósito — ninguém lê nem
-- edita os pedidos pela API pública. A Sportrail gere-os pelo Dashboard do
-- Supabase (o service role ignora o RLS), evitando expor emails de terceiros.
