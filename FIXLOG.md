# FIXLOG — Diagnostic Medical Call

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
