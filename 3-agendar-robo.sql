-- ============================================================
--  AGENDAR O ROBÔ DE E-MAIL
--  Roda todo dia às 08:00 da manhã (horário de Brasília).
--
--  ANTES de rodar, troque 2 coisas embaixo:
--   1) SEU-PROJETO  → o "ref" do seu projeto (aparece na URL do Supabase,
--                     ex: se a URL é https://abcd1234.supabase.co, o ref é abcd1234)
--   2) SUA-CHAVE-ANON → a chave "anon public" (Project Settings → API)
--
--  Depois cole no Supabase → SQL Editor → Run.
-- ============================================================

-- Se você já agendou antes e quer refazer, remove o antigo primeiro:
select cron.unschedule('lembretes-diarios')
where exists (select 1 from cron.job where jobname = 'lembretes-diarios');

-- 08:00 Brasília = 11:00 UTC  (por isso o "0 11" abaixo)
select cron.schedule(
  'lembretes-diarios',
  '0 11 * * *',
  $$
  select net.http_post(
    url     := 'https://SEU-PROJETO.supabase.co/functions/v1/robo-lembretes',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer SUA-CHAVE-ANON'
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- Para conferir que ficou agendado:
--   select jobname, schedule, active from cron.job;
