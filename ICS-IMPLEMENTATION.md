# ICS Calendar Export — Plano Executável

> **Status:** ✅ Plano totalmente executado e homologado em 22/06/2026 (Horário de Brasília).

## Arquivos a criar

### 1. `src/lib/ics.ts`

Gerar ICS file do chamado (sem dependências, formato iCalendar puro).

```typescript
import type { Tables } from "@/integrations/supabase/types";

type SC = Tables<"service_calls"> & {
  client_signature?: string | null;
  parts_used?: any;
  parts_requested?: any;
};

function fmtICSDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

export function generateServiceCallICS(c: SC): void {
  const uid = `${c.id}@diagmed`;
  const dateStart = c.service_date;
  if (!dateStart) return;
  const dateEnd = addDay(dateStart);

  const summary = `OS ${c.report_number ? "#" + c.report_number + " " : ""}— ${c.client_name}`;
  const descLines = [];
  if (c.reported_defect) descLines.push(`Defeito relatado: ${c.reported_defect}`);
  if (c.service_performed) descLines.push(`Serviço realizado: ${c.service_performed}`);
  if (c.equipment_type) descLines.push(`Equipamento: ${c.equipment_type}`);
  descLines.push(`Contato: ${c.contact || "—"}`);
  const description = descLines.join("\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Diagnostic Medical Call//PT-BR",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${fmtICSDate(dateStart)}`,
    `DTEND;VALUE=DATE:${fmtICSDate(dateEnd)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    c.address ? `LOCATION:${c.address.replace(/\n/g, "\\n")}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lembrete de visita técnica",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Chamado-${c.client_name.replace(/[^a-zA-Z0-9]/g, "_")}-${dateStart}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function addDay(d: string): string {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString().slice(0, 10);
}
```

---

## Arquivos a modificar

### 2. `src/pages/Index.tsx`

**A.** Na linha 11, adicionar `CalendarPlus` no import de lucide-react:
```
import { ..., CalendarPlus, ... } from "lucide-react";
```

**B.** Na linha 14, adicionar import:
```typescript
import { generateServiceCallICS } from "@/lib/ics";
```

**C.** Após a linha 258 (depois do botão de PDF), inserir:
```tsx
<Button size="sm" variant="outline"
  onClick={async () => {
    try { await generateServiceCallICS(c); }
    catch (e: any) { toast.error("Erro ao gerar ICS: " + e.message); }
  }}
  title="Adicionar ao calendário">
  <CalendarPlus className="w-3.5 h-3.5" />
</Button>
```

---

## Verificação

1. `npm run build` — sem erros de compilação
2. Abrir listagem de chamados → ver botão calendário ao lado do PDF
3. Clicar → baixar `.ics` → abrir → evento preenchido
