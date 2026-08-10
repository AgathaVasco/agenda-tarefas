# 📋 Agenda & Tarefas — Guia do Projeto

App de agenda com **lembretes por e-mail** + **controle de tarefas da estagiária** + **anotações compartilhadas de clientes**, para a Sallus Assessoria Contábil.

É parecido com o seu app Acelera Cartões: um arquivo `index.html`, banco no **Supabase**, publicado no **GitHub Pages**. A novidade é um "robô" no Supabase que envia os e-mails sozinho.

---

## O que tem nesta pasta

| Arquivo | Para que serve | O que fazer com ele |
|---|---|---|
| `index.html` | O app em si (a tela) | Vai pro GitHub, igual ao Acelera |
| `1-banco-de-dados.sql` | Cria as tabelas no Supabase | Colar no Supabase (Etapa 1) |
| `4-contas-fixas.sql` | Cria as tabelas das Contas Fixas | Colar no Supabase (Etapa 1-B) |
| `2-robo-lembretes.ts` | O robô que manda os e-mails | Colar no Supabase (Etapa 3) |
| `3-agendar-robo.sql` | Faz o robô rodar todo dia | Colar no Supabase (Etapa 3) |
| `GUIA-DO-PROJETO.md` | Este guia | Ler 🙂 |

> Sugestão: faça primeiro as **Etapas 1 e 2** (o app já fica 100% funcional pra você e a estagiária usarem). A **Etapa 3** (e-mails automáticos) você faz depois, com calma.

---

## ETAPA 1 — Criar o banco de dados (Supabase)

1. Entre em **https://supabase.com** → botão **New project**.
   - Nome: `agenda-tarefas`
   - Crie uma senha para o banco (anote em algum lugar) e escolha a região **South America (São Paulo)**.
   - Clique em **Create new project** e espere ~2 minutos.

2. No menu da esquerda, abra **SQL Editor** → **New query**.
   - Abra o arquivo `1-banco-de-dados.sql`, copie **tudo** e cole ali.
   - Clique em **Run** (canto inferior direito). Deve aparecer "Success".

3. Agora crie os dois usuários (você e a estagiária):
   - Menu esquerdo → **Authentication** → **Users** → **Add user** → **Create new user**.
   - Coloque **o seu e-mail** e uma senha → **Create user**.
   - Repita para o **e-mail da estagiária** com uma senha para ela.
   - ⚠️ Marque a opção **"Auto Confirm User"** ao criar (assim não precisa confirmar por e-mail).

4. Diga quem é a gestora (você) e quem é a estagiária:
   - Volte no **SQL Editor** → **New query**, cole isto trocando os e-mails e clique **Run**:
   ```sql
   update public.perfis set papel='gestora',    nome='Agatha'      where email='SEU-EMAIL@conflex.com.br';
   update public.perfis set papel='estagiaria', nome='NOME DELA'   where email='EMAIL-DELA@...';
   ```

✅ Pronto, o banco está montado.

---

## ETAPA 2 — Publicar o app (GitHub + GitHub Pages)

### 2.1 — Pegar as chaves do Supabase
No Supabase: menu esquerdo → **Project Settings** (engrenagem) → **API**. Anote:
- **Project URL** (ex: `https://abcd1234.supabase.co`)
- **anon public** (uma chave longa que começa com `eyJ...`)

### 2.2 — Colar as chaves no app
Abra o `index.html` (pode ser no Bloco de Notas) e, lá no comecinho do `<script>`, troque:
```js
const SUPABASE_URL  = "COLE_AQUI_A_URL";        // → sua Project URL
const SUPABASE_ANON = "COLE_AQUI_A_CHAVE_ANON"; // → sua chave anon public
```
Salve o arquivo.

### 2.3 — Subir pro GitHub (igual ao Acelera)
1. No **GitHub Desktop**: **File → New repository**, nome `agenda-tarefas`, e escolha esta pasta.
   (Ou crie o repositório no site do GitHub e clone.)
2. Copie o `index.html` para dentro da pasta do repositório (se ainda não estiver).
3. Escreva um resumo em **Summary** (ex: "primeira versão") → **Commit to main** → **Push origin**.
4. No site **github.com**, entre no repositório → **Settings** → **Pages** →
   em *Branch* escolha **main** / **/(root)** → **Save**.
5. Espere ~1 minuto. O app fica no ar em:
   `https://SEU-USUARIO.github.io/agenda-tarefas/`

### 2.4 — Testar
Abra o link, entre com seu e-mail e senha. Crie uma tarefa de teste. 🎉
Mande o link e o login da estagiária pra ela também.

> 💡 **Dica de celular:** abra o link no navegador do celular e use "Adicionar à tela de início" — vira um ícone igual a um aplicativo.

---

## ETAPA 3 — Ligar os e-mails automáticos (opcional, faça depois)

Aqui a gente configura o "robô" que manda o e-mail resumo todo dia de manhã. São 3 partes.

### 3.1 — Criar conta de e-mail grátis (Brevo)
O app precisa de um serviço que dispare os e-mails. O **Brevo** é grátis (até 300 e-mails/dia — muito mais que o suficiente) e não exige mexer em domínio.

1. Crie conta em **https://www.brevo.com** (pode usar o login do Google).
2. **Confirme seu e-mail remetente:** menu → **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender**.
   - Coloque **seu nome** e **seu e-mail** (o mesmo que vai aparecer como remetente).
   - O Brevo manda um e-mail de confirmação — abra e clique em confirmar.
3. **Pegue a chave de API:** menu (canto superior direito, seu nome) → **SMTP & API** → aba **API Keys** → **Generate a new API key**. Copie e guarde (começa com `xkeysib-...`).

### 3.2 — Criar o robô no Supabase
1. No Supabase: menu esquerdo → **Edge Functions** → **Create a function**.
   - Nome exatamente: `robo-lembretes`
2. Vai abrir um editor de código. **Apague** o que estiver lá, abra o arquivo
   `2-robo-lembretes.ts`, copie **tudo** e cole. Clique em **Deploy**.
3. Guardar os "segredos" (a chave do Brevo e seu e-mail). No Supabase:
   **Edge Functions** → **Secrets** (ou *Manage secrets*) → adicione estes 3:
   | Nome | Valor |
   |---|---|
   | `BREVO_API_KEY` | a chave `xkeysib-...` do Brevo |
   | `REMETENTE_EMAIL` | o e-mail que você confirmou no Brevo |
   | `REMETENTE_NOME` | `Agenda & Tarefas` (ou o que quiser) |

   > As chaves `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem sozinhas, não precisa criar.

### 3.3 — Agendar para rodar todo dia
1. **SQL Editor** → **New query**.
2. Abra `3-agendar-robo.sql`, copie tudo e cole. **Antes de rodar**, troque no texto:
   - `SEU-PROJETO` → o pedacinho da sua URL (ex: em `https://abcd1234.supabase.co`, é `abcd1234`)
   - `SUA-CHAVE-ANON` → a chave **anon public** (a mesma da Etapa 2.1)
3. Clique em **Run**.

### 3.4 — Testar o robô agora (sem esperar amanhã)
Crie uma tarefa com prazo **para hoje**, atribuída a você. Depois, no Supabase:
**Edge Functions** → `robo-lembretes` → botão **Invoke** (ou *Run/Test*). Confira seu e-mail
(inclusive a caixa de **Spam/Lixo eletrônico** na primeira vez — marque como "não é spam").

✅ A partir daí, todo dia às **08:00** você e a estagiária recebem o resumo do dia por e-mail.

---

## Como usar o app no dia a dia

- **Nova tarefa:** botão *+ Nova tarefa*. Escolha responsável (você ou a estagiária), prioridade, prazo e, se for rotina, marque **Repetir** (ex: "Todo mês" para algo do dia 5).
- **Tarefa que se repete:** quando você marca como *Concluída*, ela **não some** — ela reaparece já com a próxima data. 🔁
- **Filtros de cima:** *Hoje & atrasadas* / *Esta semana* / *Todas* / *Concluídas*.
- **Filtros de baixo:** *Minhas* / *Da equipe* — pra separar o que é seu do que é da estagiária.
- **Anotações:** aba 📝. Guarde passo-a-passo e dados de cada cliente. Ficam **compartilhadas** entre vocês duas; marque **privada** se for só sua.
- **Contas Fixas:** aba 💰. Cadastre as despesas fixas de cada empresa (nome, dia do vencimento e valor previsto). O app mostra, **por empresa**, o que já foi pago e o que falta no mês, com os totais. Quando pagar, clique em **Registrar pagamento** e informe o valor real — o histórico fica guardado mês a mês (use as setas ◀ ▶ para ver outros meses). Os vencimentos entram no e-mail diário (avisando antes e no dia).

> ⚠️ **Antes de usar as Contas Fixas** você precisa rodar uma vez o `4-contas-fixas.sql` no Supabase (SQL Editor → New query → cola → Run), igual fez com o `1-banco-de-dados.sql`.

---

## Perguntas comuns

**A estagiária consegue ver e mexer nas tarefas dela?**
Sim. Ela entra com o login dela e pode mudar o status (a fazer → fazendo → concluída) e criar/editar tarefas e anotações.

**E se eu quiser que ela NÃO receba e-mails?**
No SQL Editor: `update public.perfis set recebe_email=false where email='EMAIL-DELA';`

**Quero mudar o horário do e-mail (ex: 07:00).**
No arquivo `3-agendar-robo.sql`, o `0 11` é 08:00 Brasília (11h UTC). Para 07:00 Brasília, use `0 10`. Rode o SQL de novo.

**Onde fica a fonte da verdade se eu esquecer algo?**
Este arquivo (`GUIA-DO-PROJETO.md`). Ele fica junto do app no GitHub, então você acha em qualquer computador.
