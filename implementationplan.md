# Plano de Implementação — Botão de Compartilhamento Direto via WhatsApp

Adicionar um botão na barra de ações laterais de cada chamado em [Index.tsx](src/pages/Index.tsx) que permita enviar o link de assinatura do portal do cliente diretamente via WhatsApp, resolvendo o problema do número incorreto/mal formatado.

## User Review Required

> [!IMPORTANT]
> - O botão só aparecerá para chamados que tenham um telefone de contato cadastrado e o public_token gerado.
> - O número do telefone será limpo via regex (removendo parênteses, traços, espaços e zeros à esquerda desnecessários) e receberá o DDI 55 (Brasil) automaticamente se tiver 10 ou 11 dígitos, garantindo que o WhatsApp reconheça e abra o chat correto.

## Proposed Changes

### Componente Principal

#### [MODIFY] [Index.tsx](src/pages/Index.tsx)

- Adicionar o botão de compartilhamento via WhatsApp na barra de botões do lado direito de cada card.
- Localizar a barra de botões ao redor da linha 212 e inserir o botão condicional:

```tsx
{c.contact && c.public_token && (
  <Button
    size="sm"
    variant="outline"
    title="Enviar por WhatsApp"
    className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
    onClick={(e) => {
      e.stopPropagation();
      let phone = c.contact.replace(/\D/g, "");
      
      // Remove zero à esquerda (ex: 0119...) se houver
      if (phone.startsWith("0")) {
        phone = phone.substring(1);
      }
      
      // Se tiver 10 ou 11 dígitos (apenas DDD + número), adiciona o DDI 55 do Brasil
      if (phone.length === 10 || phone.length === 11) {
        phone = `55${phone}`;
      }
      
      const url = `${window.location.origin}/portal/${c.public_token}`;
      const text = `Olá, ${c.client_name}.\n\nAcesse o relatório do seu atendimento técnico através do link abaixo:\n${url}\n\nAtenciosamente,`;
      
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    }}
  >
    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.557 1.875 14.079.843 11.45.843 6.012.843 1.59 5.26 1.587 10.702c-.001 1.69.447 3.336 1.3 4.773l-.995 3.637 3.755-.985zm12.39-7.234c-.308-.154-1.82-.9-2.102-1.002-.283-.103-.49-.154-.694.154-.205.308-.795 1.002-.975 1.205-.18.206-.36.23-.668.077-.308-.154-1.302-.48-2.48-1.53-1.01-.9-1.692-2.01-1.89-2.319-.197-.309-.02-.476.134-.63.14-.138.308-.36.462-.54.154-.18.206-.308.308-.514.102-.206.051-.385-.026-.54-.077-.154-.694-1.67-.95-2.285-.25-.6-.524-.52-.694-.528-.18-.008-.385-.01-.59-.01-.206 0-.54.077-.82.385-.283.308-1.078 1.053-1.078 2.569 0 1.516 1.103 2.98 1.257 3.186.154.205 2.17 3.31 5.257 4.637.734.317 1.309.507 1.758.65.738.234 1.41.2 1.942.12.593-.088 1.82-.743 2.077-1.46.256-.718.256-1.334.18-1.46-.077-.128-.282-.205-.59-.359z"/>
    </svg>
  </Button>
)}
```

## Verification Plan

### Manual Verification
- Iniciar a aplicação localmente (`npm run dev`)
- Acessar o dashboard de chamados
- Criar ou editar um chamado adicionando um telefone de contato (ex: (11) 99999-9999 ou 011999999999)
- Clicar no ícone de WhatsApp verde na barra de ações laterais do chamado
- Confirmar se o link direciona corretamente para a página `https://wa.me/5511999999999` com o texto devidamente codificado.
