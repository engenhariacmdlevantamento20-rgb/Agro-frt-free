export const whatsappConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

export async function sendWhatsApp(phone: string, title: string, body = "", path = "/painel") {
  if (!whatsappConfigured()) return { ok: false, error: "Envio automático não configurado." };
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.URL;
  if (!base) return { ok: false, error: "Endereço do aplicativo não configurado." };
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "template", template: {
        name: process.env.WHATSAPP_TEMPLATE || "atualizacao_agro_frete", language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "pt_BR" },
        components: [{ type: "body", parameters: [title, body || "Confira os detalhes no aplicativo.", new URL(path, base).href].map((text) => ({ type: "text", text })) }],
      } }), signal: AbortSignal.timeout(10000),
    });
    return response.ok ? { ok: true } : { ok: false, error: `Falha no provedor (HTTP ${response.status}). Confira o modelo aprovado e a configuração no Netlify.` };
  } catch { return { ok: false, error: "O provedor de mensagens está indisponível." }; }
}
