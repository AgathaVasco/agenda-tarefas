-- ============================================================
--  CONTAS A PAGAR  —  boletos/faturas avulsos (com anexo)
--  Cria a tabela + o espaço de arquivos (bucket) pros boletos.
--
--  ⚠️ Rode no projeto agenda-tarefas (confira o nome no topo!)
--  Supabase → SQL Editor → New query → cola tudo → Run
-- ============================================================

-- ---------- Tabela dos lançamentos a pagar ----------
create table if not exists public.contas_pagar (
  id             uuid primary key default gen_random_uuid(),
  empresa        text,
  beneficiario   text,
  descricao      text,
  valor          numeric(12,2),
  vencimento     date,
  pago           boolean default false,
  valor_pago     numeric(12,2),
  pago_em        date,
  linha_digitavel text,
  arquivo_path   text,           -- caminho do boleto guardado
  criado_por     uuid references public.perfis(id) on delete set null,
  criado_em      timestamptz default now()
);
create index if not exists idx_pagar_venc on public.contas_pagar(vencimento);

-- Compartilhada entre as duas (equipe de confiança)
alter table public.contas_pagar enable row level security;
drop policy if exists pagar_tudo on public.contas_pagar;
create policy pagar_tudo on public.contas_pagar for all to authenticated using (true) with check (true);

-- ---------- Espaço de arquivos (bucket) pros boletos ----------
insert into storage.buckets (id, name, public)
values ('boletos', 'boletos', false)
on conflict (id) do nothing;

-- Quem está logado pode enviar/ver/apagar boletos
drop policy if exists boletos_ver    on storage.objects;
drop policy if exists boletos_enviar on storage.objects;
drop policy if exists boletos_editar on storage.objects;
drop policy if exists boletos_apagar on storage.objects;
create policy boletos_ver    on storage.objects for select to authenticated using (bucket_id='boletos');
create policy boletos_enviar on storage.objects for insert to authenticated with check (bucket_id='boletos');
create policy boletos_editar on storage.objects for update to authenticated using (bucket_id='boletos');
create policy boletos_apagar on storage.objects for delete to authenticated using (bucket_id='boletos');

-- Pronto! Agora o app tem onde guardar os boletos e os lançamentos.
