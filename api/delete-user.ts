import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.headers.authorization ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: token } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return res.status(401).json({ error: "Não autenticado" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return res.status(403).json({ error: "Apenas administradores" });

    const { user_id } = req.body ?? {};
    if (!user_id) return res.status(400).json({ error: "user_id obrigatório" });
    if (user_id === user.id) return res.status(400).json({ error: "Você não pode excluir a si mesmo" });

    const { error } = await admin.auth.admin.deleteUser(user_id);
    if (error) return res.status(400).json({ error: error.message });

    // Limpa registros órfãos nas tabelas do banco
    await admin.from("profiles").delete().eq("id", user_id);
    await admin.from("user_roles").delete().eq("user_id", user_id);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
}