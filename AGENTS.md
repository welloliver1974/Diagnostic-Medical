# AGENTS.md — Diagnostic Medical Call

## Project
DiagMed Call — app de gestão de chamados técnicos (React + Vite + Supabase).

## Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase self-hosted
- **PDF:** jsPDF v4.2.1, signature_pad v5.1.3
- **Deploy:** Vercel (alias: `diagnostic-medical-kohl.vercel.app`)

## Environment Variables (`.env`)
```
VITE_SUPABASE_URL=https://supabaseapi.housecloud.tec.br
VITE_SUPABASE_PUBLISHABLE_KEY=<anon_key>
VITE_GROQ_API_KEY=<groq_key>
```

## Supabase (Self-Hosted)
- **URL:** `https://supabaseapi.housecloud.tec.br` (via Cloudflare Tunnel)
- **Anon key:** `<supabase_anon_key>`
- **Service role key:** `<supabase_service_role_key>`
- **Auth user:** welloliver1974@gmail.com / UUID `fb4e43e3-8e86-4fbf-851c-d5b7e5ed8103`
- **Old UUID (migrated from):** `2b546c1b-eea2-4ec9-a99a-0e7af7d82a66`

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/pdf.ts` | PDF report generation (signature rendering via `HTMLImageElement` + `addImage`) |
| `src/components/SignaturePad.tsx` | Canvas-based signature capture (produces `data:image/png;base64,...`) |
| `src/pages/ClientPortal.tsx` | Client-facing portal for signing + downloading PDF |
| `src/pages/Index.tsx` | Main list with PDF download button |
| `src/integrations/supabase/client.ts` | Supabase client setup |
| `supabase/migrations/` | DB schema migrations |
| `vercel.json` | SPA rewrites configuration |

## PDF Signature Rendering
- Signatures are stored as base64 data URLs in `service_calls.client_signature`
- `pdf.ts` loads them into `HTMLImageElement` before passing to `doc.addImage()` (more reliable than raw data URL)
- Format: `"PNG"` (auto-detected from data URL prefix)
- Tech signature comes from `profiles.signature_url` or user metadata
- Both signatures catch errors internally + log to console

## Database Fixes (May 2026)
- Migrated from Supabase Cloud (`wvifvsmsfycfsbuwqpqf.supabase.co`) to self-hosted
- Old profile deleted, clients FK updated to new UUID
- `user_roles` manually fixed (trigger auto-creates `technician`, was changed to `admin`)

## Common Tasks
```bash
npm run dev          # Local dev server
npm run build        # Production build
vercel --prod        # Deploy to production
```

## Groq
- Key: `<groq_api_key>`
- Used for: AI features in the app

## GitHub
- **Remote:** `welloliver1974/Diagnostic-Medical` (migrado de `welloliver19744`)
- **Branch:** `main`
- **Push:** `git push -u origin main --force` (se necessário reescrever histórico)
