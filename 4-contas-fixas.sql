-- ============================================================
--  CONTAS FIXAS  —  tabelas do módulo financeiro por empresa
--  Cole no Supabase → SQL Editor → New query → Run
--  (roda sem medo, tudo é "IF NOT EXISTS")
-- ============================================================

-- Despesas fixas cadastradas (o "modelo" que se repete todo mês)
create table if not exists public.contas_fixas (
  id                uuid primary key default gen_random_uuid(),
  empresa           text not null,
  nome              text not null,          -- ex: Aluguel, Energia
  dia_vencimento    int  not null check (dia_vencimento between 1 and 31),
  valor_previsto    numeric(12,2),
  categoria         text,
  avisar_dias_antes int  default 3,
  ativo             boolean default true,
  criado_por        uuid references public.perfis(id) on delete set null,
  criado_em         timestamptz default now()
);

-- Pagamentos: 1 registro por conta por mês (guarda o histórico)
create table if not exists public.pagamentos (
  id             uuid primary key default gen_random_uuid(),
  conta_fixa_id  uuid not null references public.contas_fixas(id) on delete cascade,
  competencia    text not null,             -- 'AAAA-MM' (ex: 2026-08)
  valor_pago     numeric(12,2),
  pago_em        date,
  registrado_por uuid references public.perfis(id) on delete set null,
  criado_em      timestamptz default now(),
  unique (conta_fixa_id, competencia)       -- evita pagar 2x o mesmo mês
);

create index if not exists idx_pag_comp on public.pagamentos(competencia);

-- ---------- Segurança (mesma regra das tarefas: equipe de confiança) ----------
alter table public.contas_fixas enable row level security;
alter table public.pagamentos   enable row level security;

drop policy if exists contas_tudo on public.contas_fixas;
create policy contas_tudo on public.contas_fixas for all to authenticated using (true) with check (true);

drop policy if exists pag_tudo on public.pagamentos;
create policy pag_tudo on public.pagamentos for all to authenticated using (true) with check (true);

-- Pronto! Agora é só usar a aba "Contas Fixas" no app.
