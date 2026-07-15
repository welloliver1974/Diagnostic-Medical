
# DiagMed Call — Instruções para Claude Code

## Projeto
App de gestão de chamados técnicos (DiagMed Call). React + Vite + Supabase.

## Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase self-hosted (`https://supabaseapi.housecloud.tec.br` via Cloudflare Tunnel)
- **PDF:** jsPDF v4.2.1, signature_pad v5.1.3
- **IA:** Groq API (`llama-3.1-8b-instant`)
- **Deploy:** Vercel (alias: `diagnostic-medical-kohl.vercel.app`)
- **Tema:** Indigo `239 84% 67%`, fonte **Outfit** (body) + **Space Grotesk** (headings), dark/light toggle

## Variáveis de Ambiente (`.env`)
```
VITE_SUPABASE_URL=https://supabaseapi.housecloud.tec.br
VITE_SUPABASE_PUBLISHABLE_KEY=<anon_key>
VITE_GROQ_API_KEY=<groq_key>
```

## Arquivos-Chave

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/pdf.ts` | Geração de PDF (assinaturas via `HTMLImageElement` + `addImage`) |
| `src/components/SignaturePad.tsx` | Captura de assinatura (canvas → PNG base64) |
| `src/components/PdfPreview.tsx` | Modal com iframe para preview do PDF |
| `src/pages/ClientPortal.tsx` | Portal do cliente — assinatura + download |
| `src/pages/Index.tsx` | Lista principal — SLA, notificações, ações (PDF, WhatsApp, calendário) |
| `src/pages/AiChat.tsx` | Chat técnico IA (Groq, histórico localStorage) |
| `src/components/ServiceCallForm.tsx` | Formulário completo — templates, IA, fotos |
| `src/pages/Dashboard.tsx` | Métricas, calendário, lembretes |
| `src/components/AppLayout.tsx` | Sidebar + navegação + theme toggle |
| `src/integrations/supabase/client.ts` | Cliente Supabase |
| `supabase/migrations/` | Schema do banco |
| `vercel.json` | SPA rewrites |
| `api/create-user.ts` | Vercel function — criar usuário (service role) |
| `api/delete-user.ts` | Vercel function — deletar usuário |
| `api/update-role.ts` | Vercel function — alterar papel |

## Convenções de Código

- **Nomes:** camelCase para variáveis/funções, PascalCase para componentes
- **Componentes:** React functional components com hooks
- **Estilos:** Tailwind CSS com classes utilitárias (shadcn/ui patterns)
- **Ícones:** `lucide-react`
- **Toast:** `sonner` (`toast()`)
- **Navegação:** `react-router-dom` v6
- **Tabelas:** Referenciar tipos em `src/integrations/supabase/types.ts`

## Regras de Negócio Importantes

1. **RLS no Portal do Cliente:** ClientPortal roda como `anon` (sem login). UPDATE usa `count: "exact"` — se `count === 0`, o RLS está bloqueando.
2. **Assinatura no PDF:** Assinaturas são carregadas em `HTMLImageElement` antes de `addImage()`. Fundo deve ser transparente (`rgba(0,0,0,0)`) para não cobrir a linha.
3. **Notificações:** Verificação a cada 30s (últimos 5 min). IDs no localStorage (máx 200) para evitar repetição.
4. **Fotos:** Bucket `service_photos` (público, max 5MB, jpg/png/webp). URLs armazenadas em `notes` como `__FOTOS__:[...]`.
5. **WhatsApp:** Link direto não funciona em Android Chrome. Usar cópia para área de transferência.
6. **Admin Bypass:** UUID `fb4e43e3-8e86-4fbf-851c-d5b7e5ed8103` hardcoded em `use-role.ts` e `Team.tsx`.

## Comandos

```bash
npm run dev          # Servidor local
npm run build        # Build produção
npm run build:dev    # Build dev
npm run preview      # Preview do build
npm run lint         # ESLint
npm run test         # Vitest
npm run test:watch   # Testes em watch
vercel --prod        # Deploy produção
git push -u origin main --force  # Push (se reescrever histórico)
```

## Documentos de Referência
- [`AGENTS.md`](./AGENTS.md) — Documentação técnica detalhada
- [`FIXLOG.md`](./FIXLOG.md) — Histórico de correções e features
- [`README.md`](./README.md) — Visão geral e setup
