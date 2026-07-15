# Plano de Implementação — Série do Equipamento e Opção N/A nos Campos do Equipamento

Este plano detalha as alterações para:
1. Adicionar o campo "Série do Equipamento" no cadastro do cliente (`clients`).
2. Fazer com que o campo "Número de série" na aba de equipamento do relatório seja automaticamente preenchido com a série do equipamento do cliente selecionado.
3. Adicionar uma opção rápida "N/A" (badge/botão) nos campos "Contador/Odômetro", "Nº Série Transformador Principal" e "Nº do Lote" na aba de equipamento do formulário de relatório técnico, mantendo a possibilidade de digitar manualmente.

---

## Modificações Propostas

### Banco de Dados (Supabase)

#### [NEW] [`20260611144300_add_equipment_serial_to_clients.sql`](../../supabase/migrations/20260611144300_add_equipment_serial_to_clients.sql)
Criar uma nova migração para adicionar a coluna `equipment_serial` do tipo `TEXT` na tabela `public.clients`.

```sql
ALTER TABLE public.clients ADD COLUMN equipment_serial TEXT;
```

---

### Integração / Types

#### [MODIFY] [`types.ts`](../../src/integrations/supabase/types.ts)
Atualizar a definição de tipos TypeScript do Supabase para refletir a nova coluna na tabela `clients`:
- Em `clients.Row`, adicionar `equipment_serial: string | null`.
- Em `clients.Insert`, adicionar `equipment_serial?: string | null`.
- Em `clients.Update`, adicionar `equipment_serial?: string | null`.

---

### Cadastro de Clientes

#### [MODIFY] [`Clients.tsx`](../../src/pages/Clients.tsx)
- Adicionar o estado de inicialização no objeto `empty` (`equipment_serial: ""`).
- Atualizar a função `openEdit` para popular `equipment_serial: c.equipment_serial ?? ""`.
- Atualizar a função `save` para incluir `equipment_serial: form.equipment_serial || null` no `payload`.
- Adicionar no formulário (dentro do `Dialog`) um novo campo de texto para o "Nº de Série do Equipamento" posicionado de forma harmônica na grade (ao lado de CPF/CNPJ).
- Mostrar a série do equipamento no card de cada cliente (se preenchida), utilizando o ícone `Cpu` importado de `lucide-react`.

---

### Formulário de Relatório Técnico (Chamado)

#### [MODIFY] [`ServiceCallForm.tsx`](../../src/components/ServiceCallForm.tsx)
- Atualizar a função `pickClient` para obter e setar a série de equipamento do cliente:
  ```typescript
  equipment_serial: s.equipment_serial || (c as any).equipment_serial || ""
  ```
- Na aba "Equipamento", adicionar botões inline "N/A" ao lado dos labels de:
  - Contador / Odômetro
  - Nº Série Transformador Principal
  - Nº lote (consumíveis)
- Clicar nesse botão alternará o valor do campo para `"N/A"`. Se o campo já for `"N/A"`, limpará para que o usuário possa digitar manualmente um número.

---

## Plano de Verificação

### Testes Manuais
1. **Cadastro de Clientes**:
   - Abrir o sistema localmente.
   - Acessar a tela de Clientes e cadastrar um novo cliente informando o "Nº de Série do Equipamento".
   - Confirmar se o número de série aparece no card do cliente.
   - Editar o cliente, alterar a série do equipamento e salvar, garantindo a persistência.
2. **Preenchimento Automático do Relatório**:
   - Criar ou editar um Relatório de Chamada de Serviço.
   - Na aba "Dados", selecionar o cliente recém-criado.
   - Navegar até a aba "Equipamento" e verificar se o campo "Número de série" foi automaticamente preenchido.
3. **Opção N/A na aba Equipamento**:
   - Na aba "Equipamento", testar os três botões "N/A" (Contador/Odômetro, Transformador, Lote).
   - Verificar se ao clicar, o input exibe "N/A".
   - Verificar se ao clicar novamente, o input é limpo.
   - Digitar valores numéricos personalizados para validar que a digitação direta continua funcionando normalmente.
4. **Exportação de PDF**:
   - Clicar para gerar o PDF do relatório.
   - Confirmar se o campo "Número de série", "Contador / Odômetro", "Nº Série Transformador" e "Lote" são renderizados perfeitamente com os valores preenchidos (incluindo "N/A").
