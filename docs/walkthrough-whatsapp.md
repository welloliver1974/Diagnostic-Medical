# Walkthrough — Botão de Compartilhamento Direto via WhatsApp

Adicionamos e estilizamos com sucesso o botão de compartilhamento direto via WhatsApp para cada chamado em [`src/pages/Index.tsx`](../../src/pages/Index.tsx).

## Alterações Realizadas

### [`src/pages/Index.tsx`](../../src/pages/Index.tsx)
- Adicionamos um botão condicional que só é renderizado caso o chamado tenha `contact` e `public_token` cadastrados.
- O botão abre uma nova aba redirecionando para `https://wa.me/{phone}?text={message}`.
- O número do telefone é sanitizado removendo caracteres não numéricos, zeros à esquerda e prefixando o código de área do país `55` se aplicável (10 ou 11 dígitos).
- Estilizamos o botão com fundo preto (`bg-black` no fundo, com ícone SVG/texto em branco, e efeito hover com `bg-zinc-800`).

## Validação e Verificação

- **Compilação do Projeto:** Executamos `npm run build` com sucesso, garantindo que não há erros de compilação com a introdução do novo código.
