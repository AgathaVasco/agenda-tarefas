-- ============================================================
--  AJUSTE DE ACESSO ÀS TAREFAS
--  Regra nova:
--   • Gestora (você)   → vê e mexe em TODAS as tarefas
--   • Estagiária (ela) → vê e mexe SÓ nas tarefas dela
--                        (inclusive as que você criar no nome dela)
--  Anotações e Contas Fixas continuam compartilhadas (não muda nada).
--
--  ⚠️ Rode no projeto agenda-tarefas (confira o nome lá no topo!)
--  Supabase → SQL Editor → New query → cola tudo → Run
-- ============================================================

-- Função que diz se quem está logado é gestora
create or replace function public.eh_gestora()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'gestora'
  );
$$;

-- Remove a regra antiga (que deixava todo mundo ver tudo)
drop policy if exists tarefas_tudo   on public.tarefas;
drop policy if exists tarefas_select on public.tarefas;
drop policy if exists tarefas_insert on public.tarefas;
drop policy if exists tarefas_update on public.tarefas;
drop policy if exists tarefas_delete on public.tarefas;

-- VER: gestora vê tudo; estagiária vê só as tarefas dela
create policy tarefas_select on public.tarefas for select to authenticated
  using ( public.eh_gestora() or responsavel_id = auth.uid() );

-- CRIAR: gestora cria para qualquer pessoa; estagiária só para ela mesma
create policy tarefas_insert on public.tarefas for insert to authenticated
  with check ( public.eh_gestora() or responsavel_id = auth.uid() );

-- EDITAR: gestora edita tudo; estagiária só as dela (sem repassar p/ outro)
create policy tarefas_update on public.tarefas for update to authenticated
  using ( public.eh_gestora() or responsavel_id = auth.uid() )
  with check ( public.eh_gestora() or responsavel_id = auth.uid() );

-- EXCLUIR: gestora exclui tudo; estagiária só as dela
create policy tarefas_delete on public.tarefas for delete to authenticated
  using ( public.eh_gestora() or responsavel_id = auth.uid() );

-- Pronto! A Geovanna passa a ver apenas as tarefas dela.
