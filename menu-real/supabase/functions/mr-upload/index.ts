// Edge Function "mr-upload" (Supabase lutuima-veiga): recebe a foto de um prato,
// confirma o PIN da equipa e guarda no bucket "menureal". O envio anónimo direto está fechado.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const form = await req.formData();
    const pin = String(form.get("pin") || "");
    const id = String(form.get("id") || "");
    const file = form.get("file");
    if (!/^[a-z0-9-]{1,60}$/.test(id)) return json({ error: "id" }, 400);
    if (!(file instanceof File)) return json({ error: "file" }, 400);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return json({ error: "type" }, 400);
    if (file.size > 4 * 1024 * 1024) return json({ error: "too_large" }, 413);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ok, error: e1 } = await admin.rpc("mr_pin_ok", { p_pin: pin });
    if (e1 || ok !== true) return json({ error: "pin" }, 401);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = id + "-" + Date.now() + "." + ext;
    const { error: e2 } = await admin.storage.from("menureal").upload(path, file, { contentType: file.type, upsert: false });
    if (e2) return json({ error: "upload", detail: e2.message }, 500);
    const url = admin.storage.from("menureal").getPublicUrl(path).data.publicUrl;
    return json({ url, id: path });
  } catch (e) {
    return json({ error: "server", detail: String(e) }, 500);
  }
});
