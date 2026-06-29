# FIXLOG — Diagnostic Medical Call

---

## 2026-06-29

### Fix: Assinatura do cliente via portal não persistia no banco
- **Motivo:** As policies RLS de `service_calls` eram `TO authenticated`. O `ClientPortal.tsx` roda como `anon` (sem login); o UPDATE passava pelo PostgREST mas era filtrado por todas as 4 policies, resultando em **0 linhas afetadas sem erro**. O toast "Assinatura registrada!" aparecia mesmo assim. Quando o técnico gerava o PDF, `client_signature` estava `null` e a imagem não era renderizada.
- **Mudanças:**
  - `supabase/migrations/20260629000000_anon_portal_signature.sql` [NEW] — policies `SELECT`/`UPDATE` para role `anon` filtradas por `public_token IS NOT NULL`. Token UUID v4 (NOT NULL UNIQUE em todas as linhas) é a única barreira de acesso público.
  - `src/pages/ClientPortal.tsx:60-80` — `handleSign` agora usa `count: "exact"` no UPDATE e bloqueia o fluxo se `count === 0` (detecta regressão de RLS).
  - `src/pages/ClientPortal.tsx:82-96` — `handleDownload` exibe toast claro se o cliente tentar baixar antes de confirmar a assinatura.
- **Status:** ✅ Completo (código). Migration precisa ser aplicada no Supabase Studio → SQL Editor ou `supabase db push`.

---

## 2026-06-29 (b)

### Fix: Assinatura do cliente sobrepondo a linha no PDF + notificação repetitiva + preview sem download

#### 1 — Posição da assinatura no PDF
- **Motivo:** Imagens eram desenhadas em `y - 8` (acima da linha), podendo invadir a label "Aprovado por".
- **Mudanças:** `src/lib/pdf.ts:269-290` — assinatura agora é ancorada com a **base na linha**: `y + 5.5 - sigH`, com altura máxima `11mm` via `Math.min()`.

#### 2 — Notificação repetindo a cada 30s
- **Motivo:** `Set.prototype.add(ids)` recebia um array reduzido a chave única `"[object Array]"`, impedindo dedup. janela de 1h pegava chamados muito antigos.
- **Mudanças:** `src/pages/Index.tsx:64-86` — (a) janela reduzida para **5 minutos**; (b) `Set` populado por `stored: string[]` + `!shown.has(n.id)` correto; (c) trim a 200 IDs via `.slice(-200)`; (d) ícone corrigido para `/icon.svg`; (e) toast com `duration: 6000`.

#### 3 — Pré-visualizar PDF sem baixar
- **Motivo:** Só havia botão de download direto; cliente não conseguia ver o PDF antes de decidir baixar.
- **Mudanças:**
  - `src/lib/pdf.ts` — função interna refatorada: extraída `buildServiceCallPdf()` + export `generateServiceCallPdfBlob()` (retorna `Blob`); `generateServiceCallPDF()` virou wrapper.
  - `src/components/PdfPreview.tsx` [NEW] — modal com `Dialog` + `iframe` carregando blob URL, botão Baixar no footer.
  - `src/pages/Index.tsx` — botão `<Eye>` (sky) na action bar de cada card + estado `previewing` + renderização condicional do `PdfPreview`.
- **Status:** ✅ Completo

---

## 2026-06-29 (c)

### Fix: Assinatura do cliente apagava a linha no PDF
- **Motivo:** `SignaturePad` gerava PNG com fundo branco opaco (`backgroundColor: "rgba(255,255,255,1)"`). O `addImage` colocado sobre a linha de assinatura cobria o tracejado, pois o retângulo branco do PNG opacificava a linha.
- **Mudanças:**
  - `src/components/SignaturePad.tsx:38` — `backgroundColor` alterado de branco opaco para `"rgba(0,0,0,0)"` (transparente). O `<canvas>` passa a gerar PNG apenas com o traço da caneta.
  - `src/lib/pdf.ts:261-289` — (a) imagens posicionadas `1mm` acima da linha (`y + 5.5 - sigH - 1`); (b) linhas removidas de antes das imagens; (c) linhas redesenhadas **após** as imagens com `setLineWidth(0.4)` para garantir visibilidade mesmo com borda do PNG.
- **Status:** ✅ Completo

---

## 2026-06-22

### Fix: Detecção de plataforma no botão de Calendário (iOS vs Android/Desktop)
- **Problema:** Botão de Calendário abria Google Calendar URL em todas as plataformas — no iPhone com Apple Calendar, o Safari pedia login ao Google sem integrar com o calendário nativo.
- **Solução:** Adicionada função `isIOS()` em `src/lib/ics.ts` usando `navigator.userAgent`. Em iOS, faz download de `.ics` (popover nativo 1-clique); em Android/Desktop, abre Google Calendar direto.
- **Mudanças:**
  - `src/lib/ics.ts` — nova export `isIOS()` (linhas 47-50)
  - `src/pages/Index.tsx:270-281` — onClick detecta iOS e chama a função correta
  - `src/pages/ClientPortal.tsx:189-196` — mesmo pattern no portal do cliente
- **Status:** ✅ Completo

---

## 2026-06-22

### Feat: Exportação para o Calendário (ICS) e Estilização Premium de Ações (Color-Semantic)
- **Motivo:** Permitir a exportação direta de chamados para calendários locais (Google, Outlook, etc.) de forma offline, e trazer harmonia visual e acabamento premium para todas as ações do chamado (PDF, WhatsApp, Link, E-mail, Editar, Excluir).
- **Mudanças:**
  - `src/lib/ics.ts` [NEW] — Biblioteca pura de iCalendar com tratamento de timezone seguro (UTC), line folding e escaping RFC 5545. Adicionado `DTSTAMP` (obrigatório na RFC 5545 para VEVENT) e `METHOD:PUBLISH` no VCALENDAR, resolvendo erros de importação/parse no Google Calendar e Microsoft Outlook.
  - `src/pages/Index.tsx` — Integrado exportação de calendário e estilizado todos os botões de ação do card do chamado com bordas, ícones e hovers coloridos baseados em sua semântica de ação:
    - **PDF**: Rose/Vermelho (`text-rose-600 border-rose-200 hover:bg-rose-50`)
    - **Calendário**: Indigo (`text-indigo-600 border-indigo-200 hover:bg-indigo-50`)
    - **E-mail**: Sky Blue (`text-sky-600 border-sky-200 hover:bg-sky-50`)
    - **Copiar Link**: Blue (`text-blue-600 border-blue-200 hover:bg-blue-50`)
    - **WhatsApp**: Emerald (`text-emerald-600 border-emerald-200 hover:bg-emerald-50`)
    - **Editar**: Amber/Laranja (`text-amber-600 border-amber-200 hover:bg-amber-50`)
    - **Excluir**: Red/Destructive (`text-red-600 border-red-200 hover:bg-red-50`)
    - **Fix (Mobile Overflow)**: Corrigido o vazamento dos botões para fora do card em dispositivos móveis aplicando `flex-wrap`, largura total (`w-full`), e um divisor de linha sutil (`border-t border-border/40 pt-3 mt-1`) que só aparece no mobile, mantendo o empilhamento vertical limpo no desktop.
  - `src/pages/ClientPortal.tsx` — Substituído o botão cinza de PDF por um layout responsivo de duas colunas, aplicando a estilização Rose/Vermelho ao botão de PDF e Indigo ao botão de salvar agenda.
- **Status:** ✅ Completo (Build e PWA gerados sem nenhum erro)

## 2026-06-19

### Fix: Loading screen com "bola estranha" no celular
- **Motivo:** `index.html` exibia `icon.jpg` em fundo branco com spinner azul — no celular o ícone ficava pixelado/distorcido e o fundo branco destoava do tema escuro do app.
- **Mudanças:**
  - `index.html:25-31` — substituído `icon.jpg` por um ícone Wrench com gradiente indigo (`#818cf8` → `#a78bfa`) dentro de um container com box-shadow glow
  - Fundo alterado de `#ffffff` para `#0c0a09` (dark)
  - Spinner mudado de `#2563eb` (azul) para `#818cf8` (indigo)
  - Fonte alterada de sans-serif genérica para Space Grotesk
- **Status:** ✅ Completo (deploy feito)

### Fix: Formulário de chamado com overflow horizontal no celular
- **Motivo:** `DialogContent` com `max-w-4xl` (896px) e abas com `min-w-[80px]` cada forçavam o conteúdo a ficar mais largo que a tela do celular, exigindo scroll horizontal.
- **Mudanças:**
  - `src/components/ServiceCallForm.tsx:557` — `max-w-4xl` → `w-[95vw] sm:max-w-4xl` para ocupar 95% da viewport no mobile
  - `src/components/ServiceCallForm.tsx:557` — removido `overflow-x-hidden` que impedia scroll (travou o form)
  - `src/components/ServiceCallForm.tsx:595-601` — min-width das abas reduzido de 80px para 72px em mobile
- **Status:** ✅ Completo (deploy feito)

### Fix: Ícone PWA "bola ridícula" no celular + loading screen
- **Motivo:** O `icon.jpg` (baixa qualidade, pequeno) era usado como ícone do PWA e favicon. O SVG criado tinha scale/stroke-width errados, resultando num "blob indigo" em vez de chave inglesa. O manifest ainda usava azul e fundo branco.
- **Mudanças:**
  - `public/icon.svg` — refeito com `viewBox="0 0 24 24"`, path nativo da chave inglesa Lucide com `stroke-width="1.8"`, fundo gradiente indigo com bordas arredondadas (`rx=4.5`)
  - `vite.config.ts` — icons do manifest alterados para `icon.svg` (192x192 e 512x512)
  - `vite.config.ts` — `theme_color` → `#6366f1` (indigo), `background_color` → `#0c0a09` (escuro)
  - `index.html` — favicon alterado para `/icon.svg`
  - `index.html` — loading screen renovada: ícone Wrench indigo com glow, fundo escuro, spinner indigo
- **Status:** ✅ Completo (deploy feito)

### Feat: Transição suave nas abas do formulário
- **Motivo:** Troca de abas no formulário de chamado era instantânea ("seca"), sem feedback visual.
- **Mudanças:**
  - `src/components/ServiceCallForm.tsx` — todas as `TabsContent` ganharam classes `animate-in fade-in slide-in-from-top-1 duration-200` (via `tailwindcss-animate`)
- **Status:** ✅ Completo (deploy feito)

### Feat: SLA, Notificação push e Fotos no chamado
- **SLA:** `src/pages/Index.tsx` — badge `timeAgo()` exibindo há quanto tempo o chamado foi aberto (agora/5min/3h/2d)
- **Notificação push:** `src/pages/Index.tsx` — verificação a cada 30s de chamados recém-atribuídos ao usuário (última 1h); toast + `Notification` API do navegador
- **Fotos:** `src/components/ServiceCallForm.tsx` — input `capture="environment"` para câmera, upload para bucket `service_photos`, thumbnails 80px com hover para remover, URLs armazenadas em `notes` como `__FOTOS__:[...]`
- **Bucket:** `service_photos.sql` — SQL para criar bucket público com políticas RLS
- **Status:** ✅ Completo

### Feat: Chat Técnico IA (Groq)
- `src/pages/AiChat.tsx` — página `/ai-chat` com interface de chat (bolhas, scroll, Enter pra enviar)
- System prompt como Engenheiro Clínico Sênior especialista em Litotripsia e Laser
- Histórico salvo no `localStorage` (chave `diagmed_chat_history`)
- Botão "Limpar" para resetar conversa
- Sidebar: item "Chat IA" entre Agenda e Relatórios
- **Status:** ✅ Completo

### Feat: Gerar Relatório (IA) — autofill
- `src/components/ServiceCallForm.tsx` — novo tipo `"autofill"` no `askAI()`
- Envia defeito relatado + peças (trocadas/utilizadas/solicitadas) + tipo equipamento para Groq
- Gera relatório técnico completo no campo "Serviço realizado"
- Botão "Gerar Relatório (IA)" ao lado de "Sugerir Causa (IA)"
- **Status:** ✅ Completo

### Feat: Agenda técnica aprimorada
- `src/pages/Reminders.tsx` — selects para vincular lembrete a chamado e atribuir a técnico
- `src/pages/Dashboard.tsx` — card "Meus Lembretes" com pendências do usuário logado
- **Status:** ✅ Completo

### Feat: Tema claro/escuro + indigo + Outfit
- `src/index.css` — `:root` (claro) + `.dark` (escuro) com cor primária indigo `239 84% 67%`
- `src/components/AppLayout.tsx` — `ThemeToggle` na sidebar (botão "Claro"/"Escuro"), persiste em `localStorage`
- Fonte alterada de Inter para **Outfit** (corpo) + Space Grotesk (títulos)
- **Status:** ✅ Completo

### Feat: Equipe — editar nome e telefone
- `src/pages/Team.tsx` — botão lápis ao lado do lixo, abre diálogo com nome + telefone editáveis
- Cargo removido do dropdown no card (só badge visível)
- `api/update-role.ts` criado (não utilizado, RLS blocking)
- **Status:** ✅ Completo

### Fix: API routes user management
- Substituído Edge Functions por Vercel API routes (`api/create-user.ts`, `api/delete-user.ts`)
- Assinatura `(req, res)` em vez de `(req: Request)` para compatibilidade
- Timeout de 15s + AbortController no frontend
- **Status:** ✅ Completo

### Feat: Equipamento model select + templates
- `src/components/ServiceCallForm.tsx` — dropdown com modelos pré-definidos (Tripter Compact, Lithorex, Duet, lasers) + "Outro"
- Templates clicáveis (verificação em chips primary, reparo/troca em chips amber)
- **Status:** ✅ Completo

## 2026-06-09

### Fix: WhatsApp abrindo com número errado após edição
- **Motivo:** `pickClient()` em `ServiceCallForm.tsx` sobrescrevia `contact` e `address` do formulário com os dados da tabela `clients` sempre que o dropdown de cliente era acionado, mesmo durante edição — revertendo a correção feita pelo usuário.
- **Mudanças:**
  - `src/components/ServiceCallForm.tsx:249` — `pickClient` agora só auto-preenche `contact`/`address` do cliente quando é **criação** (novo chamado); durante **edição**, preserva os valores já salvos no chamado.
- **Status:** ✅ Completo (deploy feito)

### Fix: Layout mobile com overflow horizontal
- **Motivo:** Três causas combinadas: (1) `PageHeader` sem `flex-wrap` fazia título + botão estourarem o container em telas pequenas; (2) cards de stats em grid sem `min-w-0` resistiam a encolher; (3) `p-6` (48px de padding) consumia ~13% da viewport em celulares 360px.
- **Mudanças:**
  - `src/components/AppLayout.tsx:145` — `flex-wrap` adicionado ao PageHeader
  - `src/pages/Index.tsx:88` — padding reduzido para `p-4 sm:p-6 lg:p-8`
  - `src/pages/Reports.tsx:54` — `p-4 sm:p-6 lg:p-8`
  - `src/pages/Team.tsx:107` — `p-4 sm:p-6 lg:p-8`
  - `src/pages/Reminders.tsx:105` — `p-4 sm:p-6 lg:p-8`
  - `src/pages/Profile.tsx:111` — `p-4 sm:p-6 lg:p-8`
  - `src/pages/Parts.tsx:84` — `p-4 sm:p-6 lg:p-8`
  - `src/pages/Clients.tsx:136` — `p-4 sm:p-6 lg:p-8`
  - `src/pages/Index.tsx:106` — `min-w-0` nos cards de stats
  - `src/pages/Reports.tsx:135` — `min-w-0` no componente Stat
  - `src/pages/Dashboard.tsx:367` — `min-w-0` no MetricCard
- **Status:** ✅ Completo (deploy feito)

### Fix: PWA Service Worker servindo código antigo no celular
- **Motivo:** Após deploy no Vercel, o Service Worker do PWA continuava servindo os arquivos JS/CSS antigos do cache. `skipWaiting()` + `clientsClaim()` já estavam no SW, mas a página carregada só executava o bundle novo após refresh manual. Limpar cookies não limpa o cache do SW.
- **Mudanças:**
  - `src/main.tsx` — adicionado `controllerchange` listener que recarrega a página automaticamente quando o SW atualiza
- **Status:** ✅ Completo (deploy feito)

### Fix: Layout mobile ainda com overflow (segunda rodada)
- **Motivo:** Mesmo com `p-4` e `flex-wrap`, `overflow-x-auto` nos filtros podia não constranger corretamente em mobile + falta `overflow-x-hidden` no `<main>` como rede de segurança.
- **Mudanças:**
  - `src/components/AppLayout.tsx:66` — `overflow-x-hidden` no `<main>`
  - `src/pages/Index.tsx:123` — `overflow-x-auto` substituído por `flex-wrap` nos filtros
- **Status:** ✅ Completo (deploy feito)

## 2026-05-31

### Fix: Admin bypass com UUID antigo após migração
- **Motivo:** O silent bypass do owner em `use-role.ts` e o hardcoded admin em `Team.tsx` ainda usavam o UUID antigo (`2b546c1b`), perdendo o acesso de admin após a migração.
- **Mudanças:**
  - `src/hooks/use-role.ts:28` — UUID atualizado para `fb4e43e3`
  - `src/pages/Team.tsx:63` — UUID atualizado para `fb4e43e3`
- **Status:** ✅ Completo (deploy feito)

### Fix: PDF com quebra de página ao exceder espaço
- **Motivo:** `reportedDefect` e `servicePerformed` com alturas fixas (45mm e 70mm) causavam overflow e sobreposição com a seção de assinaturas.
- **Mudanças:**
  - `src/lib/pdf.ts`: Altura dinâmica calculada como `spaceForTextAreas = sigY - currentY - remainingFixedBlocks`
  - Proporção: 38% para defeito / 62% para ação corretiva
  - Assinaturas sempre ancoradas em `sigY` (247mm) para garantir layout em página única A4
  - Altura da seção de peças varia por tipo (`laser`: 28mm, `parts_replaced`: 15mm)
- **Status:** ✅ Completo

### Fix: PDF com proporções originais e altura dinâmica
- **Motivo:** Após ajustes de quebra de página, o layout perdeu as proporções originais do template.
- **Mudanças:** Restauradas proporções e introduzido cálculo dinâmico de altura para preencher a folha A4 sem quebras.
- **Status:** ✅ Completo

### Fix: Suporte a assinatura base64 no techSignatureUrl
- **Motivo:** `techSignatureUrl` pré-carregado como base64 não era reconhecido (só aceitava URLs HTTP).
- **Mudança:** `src/lib/pdf.ts` — se `techSignatureUrl` não começa com `http`, usa diretamente como base64 em vez de buscar via `urlToDataUrl`.
- **Status:** ✅ Completo

### Migração: Supabase Cloud → Self-Hosted
- **Motivo:** Servidor Supabase Cloud original foi descontinuado
- **Mudanças:**
  - Criado `.env` com `VITE_SUPABASE_URL` apontando para `https://supabaseapi.housecloud.tec.br`
  - Configurado Cloudflare Tunnel para expor self-hosted Supabase com HTTPS
  - Configurado DNS Cloudflare com proxy (orange cloud) + SSL/TLS Flexible
  - Atualizado env vars no Vercel
  - Migrados dados via REST API (profiles, clients, service_calls, user_roles, parts, reminders)
  - Criado novo auth user com UUID `fb4e43e3-8e86-4fbf-851c-d5b7e5ed8103`
  - Corrigido trigger `user_roles` (`ALTER TABLE user_roles ALTER COLUMN id SET DEFAULT gen_random_uuid()`)
  - Migrado `user_roles` do UUID antigo para o novo
  - Atualizado `service_calls.user_id` e `assigned_to` para o novo UUID
  - Aplicado RLS policies para permitir leitura/escrita com anon key
  - Bucket `signatures` tornado público
- **Status:** ✅ Completo

### Fix: assigned_to com UUID antigo (Cuper)
- **Motivo:** Registro do cliente Cuper ainda apontava `assigned_to` para o UUID antigo (`2b546c1b`)
- **Mudança:** `service_calls.id=63b228ff` — `assigned_to` atualizado para `fb4e43e3`
- **Status:** ✅ Completo

### Fix: Profile duplicado removido
- **Motivo:** Profile com UUID antigo (`2b546c1b`) ainda existia no banco após migração
- **Mudanças:**
  - Atualizado `clients.user_id` de `2b546c1b` para `fb4e43e3` (FK blocking)
  - Deletado profile `2b546c1b`
- **Status:** ✅ Completo

### Fix: Assinatura não renderizava no PDF
- **Motivo:** `doc.addImage(stringDataUrl, "PNG", ...)` falhava silenciosamente com base64 grandes no jsPDF v4.2.1
- **Mudanças:**
  - `src/lib/pdf.ts`: Assinaturas agora são carregadas em `HTMLImageElement` via `new Image()` + `await img.onload`, depois passadas ao `doc.addImage(img, ...)`
  - `src/pages/Index.tsx`: Botão de PDF agora exibe toast de erro se a geração falhar
- **Status:** ✅ Completo (deploy feito)

### Fix: Layout do PDF quebrado quando conteúdo excede o espaço
- **Motivo:** `y = H - M - 40` forçava as assinaturas para a posição 247mm, mas se o conteúdo anterior (Observações, descrição, etc.) já ultrapassava esse ponto, as seções se sobrepunham — assinatura aparecia dentro da caixa de Observações e a Investigação ficava fora de ordem
- **Mudança:** `src/lib/pdf.ts:234-240` — agora verifica se `y > sigY`; se sim, cria nova página e renderiza as assinaturas no topo; senão, mantém o alinhamento inferior fixo
- **Status:** ✅ Completo (deploy feito)

### Fix: Regressão no layout da pg2 - assinaturas desalinhadas após migração
- **Motivo:** Commit `e96706d` introduziu regressão: ao criar nova página por overflow, `y` ficava em `247mm` (rodapé da pg2), deixando enorme espaço em branco no topo e empurrando caixa de Investigação para fora da página.
- **Mudança:** `src/lib/pdf.ts:233-241` — restaurada lógica correta com `const sigY`: overflow → `y = M` (topo pg2); sem overflow → `y = sigY` (rodapé pg1).
- **Status:** ✅ Completo

### Fix: signature_url do técnico apontando para Supabase Cloud antigo
- **Motivo:** `profiles.signature_url` ainda continha URL do Supabase Cloud (`wvifvsmsfycfsbuwqpqf.supabase.co`) inexistente após migração.
- **Mudança:** Campo `signature_url` do perfil `fb4e43e3` setado para `null` via REST API. Técnico deve re-salvar assinatura pela página Perfil.
- **Status:** ✅ Completo
