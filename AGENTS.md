# AGENTS.md — Diagnostic Medical Call

## Project
DiagMed Call — app de gestão de chamados técnicos (React + Vite + Supabase).

## Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase self-hosted
- **PDF:** jsPDF v4.2.1, signature_pad v5.1.3
- **AI:** Groq API (`llama-3.1-8b-instant`)
- **Deploy:** Vercel (alias: `diagnostic-medical-kohl.vercel.app`)
- **Theme:** Indigo `239 84% 67%`, font **Outfit** (body) + **Space Grotesk** (headings), dark/light toggle

## Environment Variables (`.env`)
```
VITE_SUPABASE_URL=https://supabaseapi.housecloud.tec.br
VITE_SUPABASE_PUBLISHABLE_KEY=<anon_key>
VITE_GROQ_API_KEY=<groq_key>
```

## Supabase (Self-Hosted)
- **URL:** `https://supabaseapi.housecloud.tec.br` (via Cloudflare Tunnel)
- **Anon key:** `<supabase_anon_key>`
- **Service role key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODAxMDk4MDQsImV4cCI6MjA5NTQ2OTgwNH0.qf1kL9t2AN1AJFLXE8jjbrw2RFwepgZXvnIBCAElltI`
- **Auth user:** welloliver1974@gmail.com / UUID `fb4e43e3-8e86-4fbf-851c-d5b7e5ed8103`
- **Old UUID (migrated from):** `2b546c1b-eea2-4ec9-a99a-0e7af7d82a66`

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/pdf.ts` | PDF report generation (signature rendering via `HTMLImageElement` + `addImage`); exports `generateServiceCallPDF` (download) and `generateServiceCallPdfBlob` (blob for preview) |
| `src/components/SignaturePad.tsx` | Canvas-based signature capture (produces `data:image/png;base64,...`) |
| `src/components/PdfPreview.tsx` | Modal with iframe that loads blob URL from `generateServiceCallPdfBlob` — preview PDF without downloading |
| `src/pages/ClientPortal.tsx` | Client-facing portal for signing + downloading PDF; `handleSign` checks UPDATE `count` exactly to detect RLS regression; `handleDownload` blocks if not signed. Requires RLS policy `anon update client_signature via portal` (migration `20260629000000_*`). |
| `src/pages/Index.tsx` | Main list — SLA badge, notification check, botão azul copia link, ícone verde copia número |
| `src/pages/AiChat.tsx` | Chat técnico IA (Groq, `llama-3.1-8b-instant`, salva histórico no localStorage) |
| `src/components/ServiceCallForm.tsx` | Formulário completo — templates, IA (autofill/diagnosis/refine), fotos (storage `service_photos`), transição animada nas abas |
| `src/pages/Reminders.tsx` | Agenda — lembrete vinculável a chamado + técnico |
| `src/pages/Dashboard.tsx` | Dashboard — métricas, calendário, alertas, lembretes do usuário, **ações rápidas** (novo chamado, cliente, peça, lembrete, chat IA) |
| `src/components/AppLayout.tsx` | Sidebar — toggle tema (claro/escuro), navegação |
| `src/integrations/supabase/client.ts` | Supabase client setup |
| `supabase/migrations/` | DB schema migrations |
| `vercel.json` | SPA rewrites configuration |
| `api/create-user.ts` | Vercel function — cria usuário (service role) |
| `api/delete-user.ts` | Vercel function — deleta usuário (service role) |
| `api/update-role.ts` | Vercel function — altera papel (service role) |
| `src/lib/ics.ts` | Exportação calendário (RFC 5545), `isIOS()` com detecção iPadOS 13+, `openGoogleCalendar`, `generateServiceCallICS` |
| `src/pages/Clients.tsx` | CRUD clientes + resumo IA via Dialog (nunca `alert()`) |
| `src/pages/Parts.tsx` | Estoque com ajuste +/-1 e input manual de quantidade |

## PDF Signature Rendering
- Signatures are stored as base64 data URLs in `service_calls.client_signature`
- `pdf.ts` loads them into `HTMLImageElement` before passing to `doc.addImage()` (more reliable than raw data URL)
- Format: `"PNG"` (auto-detected from data URL prefix)
- Tech signature comes from `profiles.signature_url` or user metadata
- Both signatures catch errors internally + log to console
- Signature width: 35mm, aspect ratio preserved via `naturalWidth/naturalHeight`

## WhatsApp / Compartilhamento
- WhatsApp link direto com número não funciona em Android Chrome (corrompe o número ao passar pro app)
- Solução: **copiar link/número pra área de transferência**
- Botão azul (ícone link) → copia URL do portal (`/portal/TOKEN`)
- Ícone verde (ícone copiar) ao lado do telefone → copia só o número (sem formatação)
- `Index.tsx` usa `navigator.clipboard.writeText()` com fallback pra `document.execCommand('copy')`
- Service Worker com `registerType: "autoUpdate"` + `controllerchange` em `main.tsx` pra recarregar após deploy

## AI Features (Groq)
- **Gerar Relatório (IA):** `askAI("autofill")` — gera relatório completo baseado em defeito + peças
- **Sugerir Causa (IA):** `askAI("diagnosis")` — 3 causas prováveis para o defeito
- **Melhorar texto (IA):** `askAI("refine")` — formaliza o texto do serviço realizado
- **Analisar Passado (IA):** `askAIHistory()` — analisa últimos 10 chamados do mesmo equipamento
- **Chat Técnico:** `AiChat.tsx` — assistente especializado em litotripsia/laser, responde perguntas técnicas
- **Resumo do Cliente:** `Clients.tsx` — sparkle icon resume histórico do cliente em 3 pontos
- **Modelo:** `llama-3.1-8b-instant`, temperatura 0.3-0.7

## Notificações
- `Index.tsx` verifica a cada 30s se há chamados recém-atribuídos ao usuário (últimos 5 min)
- Toast + `Notification` API do navegador (pede permissão na inicialização)
- IDs de chamados já notificados salvos no `localStorage` para evitar repetição (máx 200)

## Fotos no Chamado
- Upload para bucket `service_photos` (público, max 5MB, jpg/png/webp)
- Botão câmera na aba "Fechamento" do formulário
- URLs armazenadas no campo `notes` como `__FOTOS__:[...]`
- Thumbnails de 80px com hover para remover

## Layout Mobile
- `overflow-x-hidden` no `<main>`
- `flex-wrap` no PageHeader, `p-4 sm:p-6 lg:p-8` nas páginas, `min-w-0` em cards e spans
- Filter buttons usam `flex-wrap` em vez de `overflow-x-auto`
- Grid de cards com `grid-cols-1` explícito
- Formulário: `w-[95vw]` no dialog, tabs com `min-w-[72px]`, transição `animate-in fade-in slide-in-from-top-1` nas TabsContent

## Loading Screen & PWA Icon
- Fundo escuro (`#0c0a09`) combinando com tema dark padrão
- Ícone Wrench com gradiente indigo (`#818cf8` → `#a78bfa`) + box-shadow glow
- Spinner indigo (`#818cf8`)
- Fonte Space Grotesk
- PWA: `icon.svg` (viewBox 24, gradiente indigo + chave inglesa Lucide) em vez do antigo `icon.jpg`
- Favicon: `/icon.svg` em vez de `/icon.jpg`
- `theme_color: #6366f1`, `background_color: #0c0a09`

## Database Fixes (May 2026)
- Migrated from Supabase Cloud (`wvifvsmsfycfsbuwqpqf.supabase.co`) to self-hosted
- Old profile deleted, clients FK updated to new UUID
- `user_roles` manually fixed (trigger auto-creates `technician`, was changed to `admin`)
- Hardcoded admin UUID bypass updated from `2b546c1b` → `fb4e43e3` in `use-role.ts` and `Team.tsx`

## Documentação
- `README.md` — Visão geral, setup, scripts, arquitetura
- `CLAUDE.md` — Instruções para Claude Code (stack, key files, regras de negócio)
- `FIXLOG.md` — Histórico cronológico de correções e features
- `AGENTS.md` — Este arquivo (documentação técnica detalhada)
- `docs/plano-*.md` — Planos de implementação
- `docs/walkthrough-*.md` — Walkthroughs pós-implementação

## Common Tasks
```bash
npm run dev          # Local dev server
npm run build        # Production build
npm run preview      # Preview do build local
npm run lint         # ESLint
npm run test         # Vitest
vercel --prod        # Deploy to production
```

## Padrões de Código

### Imports
- Preferir imports nomeados em vez de `any`. Criar tipos inline quando necessário.
- Nunca remover um import sem verificar se o símbolo é usado **em todo o arquivo** (incluindo componentes internos). O SWC não detecta símbolos faltantes em build — o erro aparece apenas em runtime.
- Exemplo: `Sun` e `Moon` são usados no `ThemeToggle` (componente interno do `AppLayout.tsx`), não no componente exportado.

### Blob URLs / Memory
- Usar `useRef` para armazenar blob URLs que precisam sobreviver a desmontagem de componente.
- Revogar blob URLs apenas quando a referência externa (ex: nova aba) não depender mais deles.

### Modal vs alert()
- Nunca usar `alert()` nativo para exibir dados. Usar `Dialog` do shadcn/ui.
- Para resultados de IA, usar modal com `Loader2` durante o carregamento.

### Formulários
- Validação com `zod` nos campos obrigatórios.
- Botões "N/A" toggle para campos opcionais de equipamento.
- Templates de verificação/reparo por modelo de equipamento (chips clicáveis).

### Tema
- Tema claro/escuro gerenciado pelo componente `ThemeToggle` em `AppLayout.tsx`.
- Persiste em `localStorage` com chave `diagmed_theme`.
- Estado duplicado de tema causa runtime errors — manter apenas no `ThemeToggle`.

### Detecção de Plataforma
- `isIOS()` em `ics.ts` verifica iPadOS 13+ via `navigator.maxTouchPoints && navigator.platform === 'MacIntel'`.
- `isMobileDevice()` em `PdfPreview.tsx` verifica userAgent + touch + viewport < 768px.


## Groq
- Key: `<groq_api_key>`
- Used for: AI features in the app

## GitHub
- **Remote:** `welloliver1974/Diagnostic-Medical` (migrado de `welloliver19744`)
- **Branch:** `main`
- **Push:** `git push -u origin main --force` (se necessário reescrever histórico)
- **Owner UUID:** `fb4e43e3-8e86-4fbf-851c-d5b7e5ed8103` (hardcoded admin bypass em `use-role.ts` e `Team.tsx`)
