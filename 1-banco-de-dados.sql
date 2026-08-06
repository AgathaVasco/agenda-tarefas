-- ============================================================
--  AGENDA + TAREFAS  —  Estrutura do banco de dados (Supabase)
--  Cole TODO este conteúdo no Supabase → SQL Editor → New query → Run
--  Pode rodar de novo sem medo: tudo é "IF NOT EXISTS".
-- ============================================================

-- ---------- Extensões usadas ----------
create extension if not exists pgcrypto;   -- gera IDs
create extension if not exists pg_cron;    -- agenda o robô de e-mail
create extension if not exists pg_net;      -- deixa o banco chamar o robô

-- ============================================================
--  TABELA 1: perfis  (as pessoas que usam o app)
-- ============================================================
create table if not exists public.perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text,
  email      text,
  papel      text default 'estagiaria' check (papel in ('gestora','estagiaria')),
  recebe_email boolean default true,
  criado_em  timestamptz default now()
);

-- Quando alguém é criado no Authentication, cria o perfil automaticamente
create or replace function public.criar_perfil()
returns trigger language plpgsql security definer as $$
begin
  insert into public.perfis (id, email, nome)
  values (new.id, new.email, split_part(new.email,'@',1))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_criar_perfil on auth.users;
create trigger trg_criar_perfil
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- ============================================================
--  TABELA 2: tarefas
-- ============================================================
create table if not exists public.tarefas (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null,
  descricao      text,
  cliente        text,
  responsavel_id uuid references public.perfis(id) on delete set null,
  criado_por     uuid references public.perfis(id) on delete set null,
  status         text default 'a_fazer'  check (status in ('a_fazer','fazendo','concluida')),
  prioridade     text default 'media'    check (prioridade in ('alta','media','baixa')),
  prazo          date,
  hora           time,
  recorrencia    text default 'nenhuma'  check (recorrencia in ('nenhuma','diaria','semanal','mensal','anual')),
  concluida_em   timestamptz,
  criado_em      timestamptz default now(),
  atualizado_em  timestamptz default now()
);

create index if not exists idx_tarefas_prazo on public.tarefas(prazo);
create index if not exists idx_tarefas_resp  on public.tarefas(responsavel_id);

-- ============================================================
--  TABELA 3: anotações (dossiê de clientes, passo-a-passo, etc.)
-- ============================================================
create table if not exists public.notas (
  id             uuid primary key default gen_random_uuid(),
  cliente        text,
  titulo         text,
  conteudo       text,
  privada        boolean default false,   -- true = só você vê
  autor_id       uuid references public.perfis(id) on delete set null,
  atualizado_em  timestamptz default now(),
  criado_em      timestamptz default now()
);

create index if not exists idx_notas_cliente on public.notas(cliente);

-- ============================================================
--  SEGURANÇA (RLS) — quem pode ver/mexer em quê
--  Regra: as duas pessoas do escritório compartilham as tarefas;
--  anotações são compartilhadas, mas dá pra marcar como privada.
-- ============================================================
alter table public.perfis  enable row level security;
alter table public.tarefas enable row level security;
alter table public.notas   enable row level security;

-- PERFIS: todo mundo logado enxerga os nomes; cada um edita só o seu
drop policy if exists perfis_ver     on public.perfis;
drop policy if exists perfis_editar  on public.perfis;
create policy perfis_ver    on public.perfis for select to authenticated using (true);
create policy perfis_editar on public.perfis for update to authenticated using (id = auth.uid());

-- TAREFAS: equipe de confiança — quem está logado pode tudo
drop policy if exists tarefas_tudo on public.tarefas;
create policy tarefas_tudo on public.tarefas for all to authenticated using (true) with check (true);

-- NOTAS: vê as compartilhadas + as suas privadas; edita compartilhadas e as suas
drop policy if exists notas_ver     on public.notas;
drop policy if exists notas_criar   on public.notas;
drop policy if exists notas_editar  on public.notas;
drop policy if exists notas_apagar  on public.notas;
create policy notas_ver    on public.notas for select to authenticated
  using (privada = false or autor_id = auth.uid());
create policy notas_criar  on public.notas for insert to authenticated
  with check (autor_id = auth.uid());
create policy notas_editar on public.notas for update to authenticated
  using (privada = false or autor_id = auth.uid());
create policy notas_apagar on public.notas for delete to authenticated
  using (autor_id = auth.uid());

-- ============================================================
--  Pronto! Depois de rodar isto, vá em Authentication → Users
--  e crie 2 usuários (você e a estagiária). O perfil de cada um
--  aparece sozinho na tabela "perfis". Aí é só ajustar o papel:
--
--    update public.perfis set papel = 'gestora'    where email = 'SEU-EMAIL';
--    update public.perfis set papel = 'estagiaria' where email = 'EMAIL-DELA';
-- ============================================================
