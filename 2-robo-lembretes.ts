// ============================================================
//  ROBÔ DE LEMBRETES  —  Supabase Edge Function
//  Nome da função no Supabase: robo-lembretes
//
//  O que ele faz: uma vez por dia, manda UM e-mail resumo para cada
//  pessoa com (1) as tarefas dela — atrasadas, de hoje e de amanhã —
//  e (2) as CONTAS FIXAS das empresas que estão vencendo (antes e no
//  dia). Usa o Brevo (serviço de e-mail gratuito).
//
//  Você NÃO precisa entender este código — só copiá-lo para dentro
//  do Supabase. O guia explica onde.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY   = Deno.env.get("BREVO_API_KEY")!;
const REMETENTE_EMAIL = Deno.env.get("REMETENTE_EMAIL")!;   // ex: agatha.vasco@conflex.com.br
const REMETENTE_NOME  = Deno.env.get("REMETENTE_NOME") ?? "Agenda & Tarefas";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!   // chave que enxerga tudo (só do lado do servidor)
);

// ---------- utilidades de data ----------
function diaBR(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
}
function fmt(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
function diasNoMes(comp: string): number {
  const [a, m] = comp.split("-").map(Number);
  return new Date(a, m, 0).getDate();
}
function diffDias(a: string, b: string): number {
  return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
}
function moeda(v: number | null): string {
  if (v === null || v === undefined) return "";
  return " · " + Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function enviarEmail(para: string, nome: string, assunto: string, html: string) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: REMETENTE_NOME, email: REMETENTE_EMAIL },
      to: [{ email: para, name: nome }],
      subject: assunto,
      htmlContent: html,
    }),
  });
  if (!r.ok) console.error("Falha e-mail p/", para, await r.text());
  return r.ok;
}

const bloco = (titulo: string, cor: string, itens: string[]) =>
  itens.length
    ? `<h3 style="color:${cor};margin:18px 0 6px;font-size:15px">${titulo}</h3><ul style="padding-left:20px;margin:0">${itens.join("")}</ul>`
    : "";

Deno.serve(async () => {
  const hoje = diaBR(0);
  const amanha = diaBR(1);
  const comp = hoje.slice(0, 7); // AAAA-MM

  // ========== CONTAS FIXAS (iguais para todo mundo que recebe) ==========
  const { data: contas } = await supabase
    .from("contas_fixas").select("*").eq("ativo", true);
  const { data: pagos } = await supabase
    .from("pagamentos").select("conta_fixa_id").eq("competencia", comp);
  const idsPagos = new Set((pagos ?? []).map((p) => p.conta_fixa_id));

  const cVencidas: string[] = [], cHoje: string[] = [], cBreve: string[] = [];
  for (const c of contas ?? []) {
    if (idsPagos.has(c.id)) continue; // já paga este mês
    const dia = Math.min(c.dia_vencimento, diasNoMes(comp));
    const venc = `${comp}-${String(dia).padStart(2, "0")}`;
    const d = diffDias(hoje, venc);
    const item = `<li style="margin:6px 0"><b>${c.empresa}</b> — ${c.nome}${moeda(c.valor_previsto)}` +
      ` <span style="color:#64748b">(vence ${fmt(venc)})</span></li>`;
    if (d < 0) cVencidas.push(item);
    else if (d === 0) cHoje.push(item);
    else if (d <= (c.avisar_dias_antes ?? 3)) cBreve.push(item);
  }
  const totalContas = cVencidas.length + cHoje.length + cBreve.length;
  const fixasHtml =
    bloco("💰 Contas vencidas (não pagas)", "#dc2626", cVencidas) +
    bloco("💰 Contas que vencem hoje", "#d97706", cHoje) +
    bloco("💰 Contas a vencer em breve", "#0f766e", cBreve);

  // pessoas que recebem e-mail
  const { data: perfis } = await supabase
    .from("perfis").select("id,nome,email,recebe_email").eq("recebe_email", true);

  const emoji = { alta: "🔴", media: "🟠", baixa: "🟢" } as Record<string, string>;
  let enviados = 0;

  for (const p of perfis ?? []) {
    if (!p.email) continue;

    // ----- tarefas da pessoa (até amanhã, não concluídas) -----
    const { data: tarefas } = await supabase
      .from("tarefas")
      .select("titulo,cliente,prazo,hora,prioridade,status")
      .eq("responsavel_id", p.id)
      .neq("status", "concluida")
      .not("prazo", "is", null)
      .lte("prazo", amanha)
      .order("prazo");

    const linhaT = (t: any) =>
      `<li style="margin:6px 0">${emoji[t.prioridade] ?? "•"} <b>${t.titulo}</b>` +
      `${t.cliente ? ` <span style="color:#2563eb">· ${t.cliente}</span>` : ""}` +
      `${t.hora ? ` <span style="color:#64748b">(${String(t.hora).slice(0, 5)})</span>` : ""}</li>`;

    const atrasadas = (tarefas ?? []).filter((t) => t.prazo < hoje).map(linhaT);
    const deHoje    = (tarefas ?? []).filter((t) => t.prazo === hoje).map(linhaT);
    const deAmanha  = (tarefas ?? []).filter((t) => t.prazo === amanha).map(linhaT);
    const totalTarefas = atrasadas.length + deHoje.length + deAmanha.length;

    // se não há nada (nem tarefa, nem conta) para essa pessoa, não manda e-mail
    if (totalTarefas === 0 && totalContas === 0) continue;

    const tarefasHtml =
      bloco("⚠️ Tarefas atrasadas", "#dc2626", atrasadas) +
      bloco("📅 Tarefas para hoje", "#d97706", deHoje) +
      bloco("🔜 Tarefas para amanhã", "#059669", deAmanha);

    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
        <div style="background:#2563eb;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0">
          <h2 style="margin:0;font-size:18px">📋 Seus lembretes de hoje</h2>
          <p style="margin:4px 0 0;opacity:.9;font-size:13px">Olá, ${p.nome ?? ""}! Aqui está o que precisa de atenção.</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:6px 22px 20px">
          ${tarefasHtml || (totalTarefas === 0 ? '<p style="color:#64748b;font-size:14px;margin:14px 0 0">Nenhuma tarefa para hoje. 🎉</p>' : "")}
          ${fixasHtml}
          <p style="margin:22px 0 0;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px">
            Enviado automaticamente pela sua Agenda &amp; Tarefas · Sallus
          </p>
        </div>
      </div>`;

    const partes: string[] = [];
    if (atrasadas.length) partes.push(`${atrasadas.length} atrasada(s)`);
    if (deHoje.length) partes.push(`${deHoje.length} p/ hoje`);
    if (totalContas) partes.push(`${totalContas} conta(s)`);
    const assunto = `📋 ${partes.join(" · ") || "Resumo"} — ${fmt(hoje)}`;

    if (await enviarEmail(p.email, p.nome ?? "", assunto, html)) enviados++;
  }

  return new Response(JSON.stringify({ ok: true, enviados }), {
    headers: { "Content-Type": "application/json" },
  });
});
