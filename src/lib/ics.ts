import type { Tables } from "@/integrations/supabase/types";

type SC = Tables<"service_calls"> & {
  client_signature?: string | null;
  parts_used?: any;
  parts_requested?: any;
};

// Evita bugs de fuso horário local ao incrementar a data
function addDay(d: string): string {
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(Date.UTC(year, month, day + 1));
  return date.toISOString().slice(0, 10);
}

function fmtICSDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

// Escapa caracteres conforme a especificação RFC 5545
function escapeICalText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

// Quebra linhas longas em blocos de até 75 caracteres
function foldLine(line: string): string {
  const parts: string[] = [];
  let remaining = line;
  while (remaining.length > 75) {
    parts.push(remaining.substring(0, 75));
    remaining = " " + remaining.substring(75);
  }
  parts.push(remaining);
  return parts.join("\r\n");
}

export function generateServiceCallICS(c: SC): void {
  if (!c.service_date) {
    throw new Error("Data de serviço não informada.");
  }

  const uid = `${c.id}@diagmed`;
  const dateStart = c.service_date;
  const dateEnd = addDay(dateStart);

  // DTSTAMP é obrigatório na RFC 5545 para VEVENT
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const summary = `OS ${c.report_number ? "#" + c.report_number + " " : ""}— ${c.client_name}`;
  
  const descLines: string[] = [];
  if (c.equipment_type) {
    descLines.push(`Equipamento: ${c.equipment_type}${c.equipment_serial ? ` (S/N: ${c.equipment_serial})` : ""}`);
  }
  if (c.reported_defect) {
    descLines.push(`Defeito relatado: ${c.reported_defect}`);
  }
  if (c.service_performed) {
    descLines.push(`Serviço realizado: ${c.service_performed}`);
  }
  if (c.technician) {
    descLines.push(`Técnico: ${c.technician}`);
  }
  descLines.push(`Contato: ${c.contact || "—"}`);
  
  if (c.public_token) {
    const portalUrl = `${window.location.origin}/portal/${c.public_token}`;
    descLines.push(`Relatório no Portal: ${portalUrl}`);
  }

  const description = descLines.join("\n");

  const rawLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Diagnostic Medical Call//PT-BR",
    "METHOD:PUBLISH", // Define o método de publicação para ser importável diretamente
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${fmtICSDate(dateStart)}`,
    `DTEND;VALUE=DATE:${fmtICSDate(dateEnd)}`,
    `SUMMARY:${escapeICalText(summary)}`,
    `DESCRIPTION:${escapeICalText(description)}`,
    c.address ? `LOCATION:${escapeICalText(c.address)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lembrete de visita técnica",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // Aplica line folding e remove linhas vazias
  const ics = rawLines
    .filter(Boolean)
    .map(foldLine)
    .join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  
  const formattedClientName = c.client_name.replace(/[^a-zA-Z0-9]/g, "_");
  a.download = `Chamado-${formattedClientName}-${dateStart}.ics`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Abre o evento diretamente no Google Calendar via URL pública.
 * Não requer download de arquivo — abre o Google Calendar no navegador
 * com o evento pré-preenchido e pronto para salvar em 1 clique.
 */
export function openGoogleCalendar(c: SC): void {
  if (!c.service_date) {
    throw new Error("Data de serviço não informada.");
  }

  const dateStart = c.service_date;
  const dateEnd = addDay(dateStart);

  const title = `OS ${c.report_number ? "#" + c.report_number + " " : ""}— ${c.client_name}`;

  const descLines: string[] = [];
  if (c.equipment_type) {
    descLines.push(`Equipamento: ${c.equipment_type}${c.equipment_serial ? ` (S/N: ${c.equipment_serial})` : ""}`);
  }
  if (c.reported_defect) {
    descLines.push(`Defeito: ${c.reported_defect}`);
  }
  if (c.technician) {
    descLines.push(`Técnico: ${c.technician}`);
  }
  descLines.push(`Contato: ${c.contact || "—"}`);
  if (c.public_token) {
    descLines.push(`Portal: ${window.location.origin}/portal/${c.public_token}`);
  }

  // Formato de data para a URL do Google Calendar: YYYYMMDD
  const gcStart = fmtICSDate(dateStart);
  const gcEnd = fmtICSDate(dateEnd);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${gcStart}/${gcEnd}`,
    details: descLines.join("\n"),
    ...(c.address ? { location: c.address } : {}),
  });

  window.open(
    `https://calendar.google.com/calendar/render?${params.toString()}`,
    "_blank",
    "noopener,noreferrer"
  );
}
