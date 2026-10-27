// Edge Function "mr-ai" (Supabase lutuima-veiga): IA do Menu Real com Google Gemini.
// - action "nutri": valor nutricional aproximado de um prato (só equipa, precisa do PIN do restaurante)
// - action "ask": assistente do cliente (sugere pratos do menu enviado)
// A chave fica no segredo GEMINI_API_KEY (nunca no site). Modelo: GEMINI_MODEL (por omissão gemini-flash-latest).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const AL = ["marisco", "peixe", "leite", "ovo", "sulfitos"];
const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);

async function gemini(prompt: string, maxTokens: number) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("no_key");
  const models = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"].filter((m, i, a) => m && a.indexOf(m) === i) as string[];
  let last = "gemini";
  for (const model of models) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: maxTokens },
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const text = (j?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
      return JSON.parse(text || "{}");
    }
    // guarda o erro mais útil (um 404 de um modelo de reserva não esconde o 402/429 do principal)
    if (r.status !== 404 || last === "gemini") last = r.status === 429 ? "limit" : "gemini_" + r.status + ":" + String(j?.error?.message || j?.error?.status || "").slice(0, 60);
    if (![402, 403, 404, 429, 500, 503].includes(r.status)) break;
  }
  throw new Error(last);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const b = await req.json();
    const rid = clip(b.rid || "quintal", 30);
    if (!/^[a-z0-9-]{2,30}$/.test(rid)) return json({ error: "rid" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (b.action === "nutri") {
      const { data: ok } = await admin.rpc("mr_pin_ok", { p_rid: rid, p_pin: clip(b.pin, 12) });
      if (ok !== true) return json({ error: "pin" }, 401);
      const dose = ["pequena", "normal", "grande"].includes(b.dose) ? b.dose : "normal";
      const prompt = `És nutricionista. Estima o valor nutricional APROXIMADO de UMA dose ${dose} deste prato ou bebida de um restaurante em Cabo Verde.
Nome: ${clip(b.name, 120)}
Descrição: ${clip(b.desc, 300)}
Ingredientes: ${clip(b.ing, 500)}
Como é preparado: ${clip(b.prep, 500)}
Responde só JSON: {"kcal": inteiro, "p": gramas de proteína (inteiro), "c": gramas de hidratos (inteiro), "f": gramas de gordura (inteiro), "al": lista só com alergénios desta lista que o prato provavelmente tem ${JSON.stringify(AL)}, "nota": frase curta em português a explicar a dose considerada}.
Se não houver informação suficiente, faz a melhor estimativa para um prato típico com esse nome.`;
      const r = await gemini(prompt, 400);
      const n = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
      return json({
        kcal: n(r.kcal, 5000), p: n(r.p, 400), c: n(r.c, 800), f: n(r.f, 400),
        al: Array.isArray(r.al) ? r.al.filter((x: string) => AL.includes(x)) : [],
        nota: clip(r.nota, 200), source: "ia",
      });
    }

    if (b.action === "ask") {
      const { data: rest } = await admin.from("mr_settings").select("data").eq("id", rid).maybeSingle();
      if (!rest) return json({ error: "rid" }, 400);
      const name = clip(rest.data?.name || "o restaurante", 60);
      const lang = ({ pt: "português europeu", en: "English", fr: "français", de: "Deutsch" } as Record<string, string>)[b.lang] || "português europeu";
      const menu = clip(JSON.stringify(b.menu || []), 16000);
      const hist = (Array.isArray(b.history) ? b.history : []).slice(-6).map((m: { role: string; text: string }) =>
        (m.role === "user" ? "Cliente: " : "Assistente: ") + clip(m.text, 300)).join("\n");
      const prompt = `És o assistente do restaurante ${name} (Cabo Verde), dentro do Menu Real. Ajudas o cliente a escolher.
Regras: usa APENAS itens do MENU; nunca inventes pratos, preços, ingredientes ou disponibilidade. Calorias são aproximadas: diz isso se falares delas. Em alergias, avisa para confirmar com o empregado. Máximo 3 frases e 3 sugestões, com ids exatos. Responde em ${lang}.
MENU: ${menu}
${hist ? "Conversa até agora:\n" + hist + "\n" : ""}Pergunta do cliente: ${clip(b.q, 300)}
Responde só JSON: {"reply": string, "items": [ids]}`;
      const r = await gemini(prompt, 500);
      return json({ reply: clip(r.reply, 600), items: Array.isArray(r.items) ? r.items.slice(0, 3).map((x: unknown) => clip(x, 60)) : [] });
    }
    return json({ error: "action" }, 400);
  } catch (e) {
    const m = String((e as Error)?.message || e);
    return json({ error: m === "no_key" ? "no_key" : m === "limit" ? "limit" : "server", detail: m.slice(0, 120) }, m === "no_key" ? 503 : 502);
  }
});
