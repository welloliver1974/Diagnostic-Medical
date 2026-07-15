
# DiagMed Call 🛠️

**Gestão de Chamados Técnicos** — Aplicação completa para abertura, acompanhamento e fechamento de ordens de serviço técnicas, com suporte a assinaturas digitais, geração de PDF, portal do cliente e IA assistiva.

> Deploy: [diagnostic-medical-kohl.vercel.app](https://diagnostic-medical-kohl.vercel.app)

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Supabase (self-hosted via Cloudflare Tunnel) |
| **PDF** | jsPDF v4.2.1, signature_pad v5.1.3 |
| **IA** | Groq API (`llama-3.1-8b-instant`) |
| **Deploy** | Vercel |
| **Tema** | Indigo (`239 84% 67%`), fonte Outfit + Space Grotesk, dark/light toggle |

## Funcionalidades

- 📋 **Chamados Técnicos** — Abertura, edição, exclusão com formulário completo (equipamento, peças, fechamento)
- 📄 **PDF Profissional** — Relatório técnico com assinaturas digitais (cliente + técnico)
- ✍️ **Portal do Cliente** — Assinatura digital via link público, preview e download do PDF
- 🤖 **IA Assistiva** — Geração automática de relatórios, sugestão de causas, refinamento de texto, chat técnico (Groq)
- 📸 **Fotos no Chamado** — Upload para bucket Supabase, exibição em thumbnails
- 🔔 **Notificações** — Alerta visual + push para chamados recém-atribuídos
- 📅 **Agenda** — Lembretes vinculados a chamados e técnicos
- 📊 **Dashboard** — Métricas, calendário, alertas e lembretes
- 👥 **Equipe** — Gerenciamento de técnicos e papéis (admin/técnico)
- 📱 **PWA** — Instalável em dispositivos móveis, funciona offline parcial
- 🌗 **Tema Claro/Escuro** — Alternância com persistência em localStorage
- 📲 **Compartilhamento** — WhatsApp direto, link do portal, exportação para calendário (ICS)

## Começando

### Pré-requisitos

- Node.js 18+
- npm

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://supabaseapi.housecloud.tec.br
VITE_SUPABASE_PUBLISHABLE_KEY=<sua_chave_anon>
VITE_GROQ_API_KEY=<sua_chave_groq>
```

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento local |
| `npm run build` | Build de produção |
| `npm run build:dev` | Build em modo desenvolvimento |
| `npm run preview` | Preview do build local |
| `npm run lint` | Verificação de lint (ESLint) |
| `npm run test` | Executar testes (Vitest) |
| `npm run test:watch` | Testes em modo watch |

## Deploy

```bash
# Deploy para produção no Vercel
vercel --prod
```

## Supabase (Self-Hosted)

O banco de dados roda em instância Supabase self-hosted exposta via Cloudflare Tunnel:

- **URL:** `https://supabaseapi.housecloud.tec.br`
- **Migrações:** `supabase/migrations/`
- **RLS Policies:** Tabelas protegidas por Row Level Security; o portal do cliente usa policy `anon` baseada em `public_token`

## Arquitetura de Arquivos

```
src/
├── components/       # Componentes reutilizáveis
│   ├── AppLayout.tsx       # Sidebar + navegação + theme toggle
│   ├── SignaturePad.tsx    # Captura de assinatura (canvas)
│   ├── PdfPreview.tsx      # Modal de preview do PDF
│   └── ServiceCallForm.tsx # Formulário completo de chamado
├── pages/            # Páginas da aplicação
│   ├── Index.tsx           # Lista principal de chamados
│   ├── ClientPortal.tsx    # Portal do cliente (assinatura + PDF)
│   ├── AiChat.tsx          # Chat técnico com IA
│   ├── Dashboard.tsx       # Métricas e calendário
│   ├── Clients.tsx         # CRUD de clientes
│   ├── Team.tsx            # Gerenciamento de equipe
│   ├── Reminders.tsx       # Agenda de lembretes
│   └── Profile.tsx         # Perfil do usuário
├── lib/
│   ├── pdf.ts             # Geração de PDF (jsPDF)
│   └── ics.ts             # Exportação para calendário
├── hooks/             # Custom hooks (use-role, etc.)
└── integrations/
    └── supabase/
        └── client.ts      # Cliente Supabase
api/                  # Vercel serverless functions
├── create-user.ts
├── delete-user.ts
└── update-role.ts
```

## Documentação Adicional

- [`AGENTS.md`](./AGENTS.md) — Documentação técnica detalhada para desenvolvedores
- [`FIXLOG.md`](./FIXLOG.md) — Histórico completo de correções e implementações
- [`CLAUDE.md`](./CLAUDE.md) — Instruções para Claude Code
- [`docs/plano-whatsapp.md`](./docs/plano-whatsapp.md) — Plano de implementação do botão WhatsApp
- [`docs/plano-serie-equipamento.md`](./docs/plano-serie-equipamento.md) — Plano de implementação da série do equipamento

---

*Gerado com [Lovable](https://lovable.dev)*
