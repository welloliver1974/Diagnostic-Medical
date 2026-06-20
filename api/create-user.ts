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
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return res.status(401).json({ error: "Não autenticado" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return res.status(403).json({ error: "Apenas administradores podem cadastrar técnicos" });

    const { email, password, full_name, phone, role = "technician" } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    if (!["technician", "manager", "admin"].includes(role)) return res.status(400).json({ error: "Papel inválido" });

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });
    if (createErr) return res.status(400).json({ error: createErr.message });
    const newId = created.user!.id;

    await admin.from("profiles").upsert({ id: newId, full_name: full_name ?? email, phone: phone ?? null });
    await admin.from("user_roles").delete().eq("user_id", newId);
    await admin.from("user_roles").insert({ user_id: newId, role });

    return res.status(200).json({ ok: true, user_id: newId });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
}