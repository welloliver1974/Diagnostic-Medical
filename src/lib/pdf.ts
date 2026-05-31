import jsPDF from "jspdf";
import logoUrl from "@/assets/diagnostic-logo.jpg";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type SC = Tables<"service_calls"> & {
  report_type?: string | null;
  report_number?: string | null;
  equipment_type?: string | null;
  equipment_serial?: string | null;
  responsible_employee?: string | null;
  installed_at?: string | null;
  in_warranty?: boolean | null;
  in_contract?: boolean | null;
  transformer_serial?: string | null;
  counter_odometer?: string | null;
  lot_number?: string | null;
  working_before?: boolean | null;
  verified_tested?: boolean | null;
  working_after?: boolean | null;
  approved_by?: string | null;
  client_signature?: string | null;
  parts_used?: any;
  parts_requested?: any;
  parts_priority?: string | null;
};

const fmtDate = (d?: string | null) => d ? new Date(d + "T00:00").toLocaleDateString("pt-BR") : "";

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(blob); });
  } catch { return null; }
}

export async function generateServiceCallPDF(
  c: SC,
  preloaded?: { techName?: string | null; techSignatureUrl?: string | null }
) {
  let techSignature: string | null = null;
  let clientSignature: string | null = null;
  let techName = c.technician ?? "";

  // Preload signatures
  if (preloaded) {
    techName = techName || preloaded.techName || "";
    if (preloaded.techSignatureUrl) techSignature = await urlToDataUrl(preloaded.techSignatureUrl);
  } else {
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData.user;
    if (currentUser && (!c.technician || c.technician === currentUser.user_metadata?.full_name)) {
      techName = techName || currentUser.user_metadata?.full_name || "";
      const sig = currentUser.user_metadata?.signature_url;
      if (sig) techSignature = sig.startsWith("http") ? await urlToDataUrl(sig) : sig;
    }
    if (!techSignature && (c as any).assigned_to) {
      const { data } = await supabase.from("profiles").select("full_name, signature_url").eq("id", (c as any).assigned_to).maybeSingle();
      if (data) {
        techName = techName || data.full_name || "";
        const sig = (data as any).signature_url;
        if (sig) techSignature = sig.startsWith("http") ? await urlToDataUrl(sig) : sig;
      }
    }
  }
  if (c.client_signature) {
    if (c.client_signature.startsWith("http")) {
      clientSignature = await urlToDataUrl(c.client_signature);
    } else if (c.client_signature.startsWith("data:image")) {
      clientSignature = c.client_signature;
    }
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 10, RW = W - 2 * M;

  // Global Styles
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);

  // ---- HEADER SECTION (0 - 32mm) ----
  doc.rect(M, M, RW, 22);
  try { doc.addImage(logoUrl, "JPEG", M + 1, M + 1, 30, 20); } catch {}
  
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("SISTEMA DE GESTÃO DA QUALIDADE", W / 2, M + 7, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text("Setor: Administrativo / Assistência Técnica", W / 2, M + 12, { align: "center" });
  
  const rx = W - M - 50;
  doc.rect(rx, M, 50, 22);
  doc.line(rx + 25, M, rx + 25, M + 15);
  doc.line(rx, M + 8, rx + 50, M + 8);
  doc.line(rx, M + 15, rx + 50, M + 15);
  doc.setFontSize(7); doc.setFont("helvetica", "bold");
  doc.text("Versão", rx + 12.5, M + 4, { align: "center" }); doc.text("002", rx + 19, M + 4);
  doc.text("Revisão", rx + 37.5, M + 4, { align: "center" }); doc.text("005", rx + 44, M + 4);
  doc.text("25/07/ 2021", rx + 12.5, M + 12, { align: "center" });
  doc.text("05/06/2024", rx + 37.5, M + 12, { align: "center" });
  doc.text("Datas", rx + 25, M + 20, { align: "center" });

  let y = M + 22;
  doc.rect(M, y, RW, 8);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("Título: F: 024; RELATÓRIO DE CHAMADA DE SERVIÇO (AT)", M + 20, y + 5.5);
  doc.rect(W - M - 25, y, 25, 8);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("Nº página", W - M - 23, y + 5.5);
  doc.setFont("helvetica", "bold"); doc.text("1/1", W - M - 2, y + 5.5, { align: "right" });
  y  // ---- DATA ROWS SECTION ----
  const cellH = 6.2;
  const drawRow = (label1: string, val1: string | null, w1: number, label2: string, val2: string | null, w2: number) => {
    // Cell 1
    doc.rect(M, y, w1, cellH);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text(label1, M + 1.2, y + 2.3);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(val1 || "", M + 1.2, y + 5.3);
    // Cell 2
    doc.rect(M + w1, y, w2, cellH);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text(label2, M + w1 + 1.2, y + 2.3);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(val2 || "", M + w1 + 1.2, y + 5.3);
    y += cellH;
  };

  drawRow("Técnico executor:", techName, RW * 0.5, "Endereço:", c.address, RW * 0.5);
  
  // Row 2: Cliente + Data + Relatório nº
  doc.rect(M, y, RW * 0.5, cellH);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text("Cliente:", M + 1.2, y + 2.3);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(c.client_name || "", M + 1.2, y + 5.3);
  
  doc.rect(M + RW * 0.5, y, RW * 0.22, cellH);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text("Data:", M + RW * 0.5 + 1.2, y + 2.3);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(fmtDate(c.service_date), M + RW * 0.5 + 1.2, y + 5.3);
  
  doc.rect(M + RW * 0.72, y, RW * 0.28, cellH);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7);
  doc.text("RELATÓRIO", M + RW * 0.86, y + 2.3, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(8);
  doc.text(`Nº ${c.report_number || "—"}`, M + RW * 0.86, y + 5.3, { align: "center" });
  y += cellH;

  drawRow("Tipo de equipamento:", c.equipment_type, RW * 0.5, "Número de série:", c.equipment_serial, RW * 0.5);
  drawRow("Colaborador responsável em atender:", c.responsible_employee, RW * 0.5, "Instalado em:", fmtDate(c.installed_at), RW * 0.5);

  // Warranty / Contract Row
  const drawCheck = (x: number, yy: number, w: number, label: string, val?: boolean | null) => {
    doc.rect(x, yy, w, cellH);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.text(label, x + 1.2, yy + 4.2);
    const tw = doc.getTextWidth(label);
    const bs = 2.5, by = yy + 4.2 - 2.2;
    doc.rect(x + tw + 3, by, bs, bs); doc.text("SIM", x + tw + 7, yy + 4.2);
    if (val === true) doc.text("X", x + tw + 3.4, yy + 4.0);
    doc.rect(x + tw + 15, by, bs, bs); doc.text("NÃO", x + tw + 19, yy + 4.2);
    if (val === false) doc.text("X", x + tw + 15.4, yy + 4.0);
  };
  drawCheck(M, y, RW * 0.5, "Em garantia:", c.in_warranty);
  drawCheck(M + RW * 0.5, y, RW * 0.5, "Em contrato de manutenção:", c.in_contract);
  y += cellH;

  drawRow("Número de Série do Transformador Principal:", c.transformer_serial, RW * 0.5, "Contador / Odômetro:", c.counter_odometer, RW * 0.5);
  
  doc.rect(M, y, RW, cellH);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.text("Para o caso de problemas com consumíveis especificar o número do lote:", M + 1.2, y + 2.3);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(c.lot_number || "", M + 1.2, y + 5.3);
  y += cellH;

  // Working before repair row
  doc.rect(M, y, RW, 5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.text("O equipamento estava em funcionamento antes do reparo?", M + 1.2, y + 3.6);
  doc.rect(M + 90, y + 1.2, 2.5, 2.5); doc.text("SIM", M + 94, y + 3.6);
  if (c.working_before === true) doc.text("X", M + 90.4, y + 3.3);
  doc.rect(M + 105, y + 1.2, 2.5, 2.5); doc.text("NÃO", M + 109, y + 3.6);
  if (c.working_before === false) doc.text("X", M + 105.4, y + 3.3);
  y += 5;

  // ---- LARGE TEXT BLOCKS ----
  const drawTextArea = (label: string, val: string | null | undefined, h: number) => {
    doc.rect(M, y, RW, h);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.text(label, M + 1.2, y + 3.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const lines = doc.splitTextToSize(val ?? "", RW - 4);
    doc.text(lines.slice(0, Math.floor((h - 5) / 3.2)), M + 1.2, y + 7, { lineHeightFactor: 1.1 });
    y += h;
  };

  drawTextArea("Descrição do problema:", c.reported_defect, 34);
  drawTextArea("Causa do problema diagnosticado pelo técnico e ação corretiva de serviço ou reparo realizado:", c.service_performed, 56);

  // Verificado e testado row
  doc.rect(M, y, RW, 6);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.text("Verificado e testado?", M + 1.2, y + 4.2);
  doc.rect(M + 35, y + 1.7, 2.5, 2.5); doc.text("SIM", M + 39, y + 4.2);
  if (c.verified_tested === true) doc.text("X", M + 35.4, y + 3.9);
  doc.rect(M + 48, y + 1.7, 2.5, 2.5); doc.text("NÃO", M + 52, y + 4.2);
  if (c.verified_tested === false) doc.text("X", M + 48.5, y + 3.9);
  doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
  doc.text("(Indicar o número do Relatório de Resultados de teste com base nas especificações do produto)", M + 62, y + 4.2);
  y += 6;

  // Voltou a funcionar row
  doc.rect(M, y, RW, 5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.text("O equipamento voltou a funcionar após o reparo?", M + 1.2, y + 3.6);
  doc.rect(M + 80, y + 1.2, 2.5, 2.5); doc.text("SIM", M + 84, y + 3.6);
  if (c.working_after === true) doc.text("X", M + 80.4, y + 3.3);
  doc.rect(M + 92, y + 1.2, 2.5, 2.5); doc.text("NÃO", M + 96, y + 3.6);
  if (c.working_after === false) doc.text("X", M + 92.4, y + 3.3);
  y += 5;

  // Parts (only if laser)
  if (c.report_type === "laser") {
    const drawP = (title: string, rows: any[]) => {
      doc.rect(M, y, RW, 4); doc.setFont("helvetica", "bold"); doc.setFontSize(7);
      doc.text(title, M + 1.2, y + 2.8); y += 4;
      const rws = (rows?.slice(0, 2) || [{}, {}]);
      rws.forEach(r => {
        doc.rect(M, y, RW, 3.8); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
        doc.text(`${r.number??""} - ${r.description??""} (${r.qty??""})`, M + 1.2, y + 2.8); y += 3.8;
      });
    };
    drawP("Peças Utilizadas do Estoque", c.parts_used);
    drawP("Peças a serem requisitadas", c.parts_requested);
  } else if (c.parts_replaced) {
    drawTextArea("Peças trocadas:", c.parts_replaced, 10);
  }

  drawTextArea("Observações:", c.notes, 12);

  // ---- SIGNATURES SECTION (Strictly aligned to bottom) ----
  const sigY = H - M - 38;
  
  // NUNCA cria nova página - força tudo em uma única página A4
  y = sigY;
  
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("Relatório aprovado por:", M, y + 4.5);
  doc.line(M + 38, y + 5.0, M + 110, y + 5.0);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(techName || "", M + 74, y + 4.5, { align: "center" });

  y += 11;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("Assinatura do técnico:", M, y + 4.5);
  doc.line(M + 35, y + 5.0, M + 100, y + 5.0);
  doc.text("Assinatura do cliente:", M + 105, y + 4.5);
  doc.line(M + 140, y + 5.0, M + RW, y + 5.0);

  // Diminuí a altura da imagem e ajustei a posição
  if (techSignature) {
    try {
      const img = new Image();
      img.src = techSignature;
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });
      doc.addImage(img, "PNG", M + 45, y - 7, 45, 10);
    } catch (e) {
      console.error("Erro ao adicionar assinatura do técnico ao PDF:", e);
    }
  }
  if (clientSignature) {
    try {
      const img = new Image();
      img.src = clientSignature;
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });
      doc.addImage(img, "PNG", M + 145, y - 7, 45, 10);
    } catch (e) {
      console.error("Erro ao adicionar assinatura do cliente ao PDF:", e);
    }
  }
  
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  doc.text(c.client_name || "", M + 170, y + 8.5, { align: "center" });

  // ---- INVESTIGATION BOX ----
  y += 9;
  doc.rect(M, y, RW, 12);
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
  doc.text("INVESTIGAÇÃO (PARA USO DA GESTÃO DA QUALIDADE):", M + 1.2, y + 3.5);
  y += 12;
  doc.rect(M, y, RW, 6);
  doc.text("Realizou Ação Corretiva/Preventiva?", M + 1.2, y + 4.2);
  doc.rect(M + 55, y + 1.7, 2.5, 2.5); doc.text("NÃO", M + 59, y + 4.2);
  doc.rect(M + 67, y + 1.7, 2.5, 2.5); doc.text("SIM", M + 71, y + 4.2);
  doc.text("Nº:", M + 80, y + 4.2); doc.line(M + 85, y + 4.5, M + 115, y + 4.5);
  doc.text("Data: ___/___/______", M + 125, y + 4.2);

  doc.save(`Relatorio-${(c.report_type||"OS").toUpperCase()}-${(c.client_name||"cliente").replace(/\s+/g,"_")}-${c.service_date}.pdf`);
}
