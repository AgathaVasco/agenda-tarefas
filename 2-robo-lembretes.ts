// ============================================================
//  ROBÔ DE LEMBRETES  —  Supabase Edge Function
//  Nome da função no Supabase: robo-lembretes
//
//  O que ele faz: uma vez por dia, olha as tarefas de cada pessoa
//  (atrasadas, de hoje e de amanhã) e manda UM e-mail resumo para
//  cada uma, usando o Brevo (serviço de e-mail gratuito).
//
//  Você NÃO precisa entender este código — só copiá-lo para dentro
//  do Supabase. O guia explica onde.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY  = Deno.env.get("BREVO_API_KEY")!;
const REMETENTE_EMAIL = Deno.env.get("REMETENTE_EMAIL")!;   // ex: agatha.vasco@conflex.com.br
const REMETENTE_NOME  = Deno.env.get("REMETENTE_NOME") ?? "Agenda & Tarefas";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!   // chave que enxerga tudo (só do lado do servidor)
);

// data de hoje/amanhã no fuso do Brasil
function diaBR(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
}
function fmt(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
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

Deno.serve(async () => {
  const hoje = diaBR(0);
  const amanha = diaBR(1);

  // pessoas que recebem e-mail
  const { data: perfis } = await supabase
    .from("perfis").select("id,nome,email,recebe_email").eq("recebe_email", true);

  let enviados = 0;

  for (const p of perfis ?? []) {
    if (!p.email) continue;

    // tarefas abertas dessa pessoa com prazo até amanhã
    const { data: tarefas } = await supabase
      .from("tarefas")
      .select("titulo,cliente,prazo,hora,prioridade,status")
      .eq("responsavel_id", p.id)
      .neq("status", "concluida")
      .not("prazo", "is", null)
      .lte("prazo", amanha)
      .order("prazo");

    if (!tarefas || tarefas.length === 0) continue;

    const atrasadas = tarefas.filter((t) => t.prazo < hoje);
    const deHoje    = tarefas.filter((t) => t.prazo === hoje);
    const deAmanha  = tarefas.filter((t) => t.prazo === amanha);

    const emoji = { alta: "🔴", media: "🟠", baixa: "🟢" } as Record<string, string>;
    const linha = (t: any) =>
      `<li style="margin:6px 0">${emoji[t.prioridade] ?? "•"} <b>${t.titulo}</b>` +
      `${t.cliente ? ` <span style="color:#2563eb">· ${t.cliente}</span>` : ""}` +
      `${t.hora ? ` <span style="color:#64748b">(${String(t.hora).slice(0,5)})</span>` : ""}</li>`;

    const bloco = (titulo: string, cor: string, arr: any[]) =>
      arr.length
        ? `<h3 style="color:${cor};margin:18px 0 6px;font-size:15px">${titulo}</h3><ul style="padding-left:20px;margin:0">${arr.map(linha).join("")}</ul>`
        : "";

    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
        <div style="background:#2563eb;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0">
          <h2 style="margin:0;font-size:18px">📋 Seus lembretes de hoje</h2>
          <p style="margin:4px 0 0;opacity:.9;font-size:13px">Olá, ${p.nome ?? ""}! Aqui está o que precisa de atenção.</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:6px 22px 20px">
          ${bloco("⚠️ Atrasadas", "#dc2626", atrasadas)}
          ${bloco("📅 Para hoje", "#d97706", deHoje)}
          ${bloco("🔜 Para amanhã", "#059669", deAmanha)}
          <p style="margin:22px 0 0;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px">
            Enviado automaticamente pela sua Agenda &amp; Tarefas · Sallus
          </p>
        </div>
      </div>`;

    const assunto = `📋 ${atrasadas.length ? `${atrasadas.length} atrasada(s) · ` : ""}${deHoje.length} para hoje — ${fmt(hoje)}`;
    if (await enviarEmail(p.email, p.nome ?? "", assunto, html)) enviados++;
  }

  return new Response(JSON.stringify({ ok: true, enviados }), {
    headers: { "Content-Type": "application/json" },
  });
});
