import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { generateServiceCallPdfBlob } from "@/lib/pdf";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type SC = Tables<"service_calls">;

export function PdfPreview({ call, onClose }: { call: SC; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const blob = await generateServiceCallPdfBlob(call);
        if (active) setUrl(URL.createObjectURL(blob));
      } catch (e: any) {
        toast.error("Erro ao pré-visualizar: " + e.message);
      }
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [call]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pré-visualização — {call.client_name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {url ? (
            <iframe src={url} className="w-full h-full border rounded" title="Pré-visualização do PDF" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="animate-spin h-6 w-6" />
            </div>
          )}
        </div>
        <DialogFooter>
          {url && (
            <Button asChild>
              <a href={url} download={`Relatorio-${call.client_name}.pdf`}>
                <Download className="w-4 h-4 mr-1" /> Baixar PDF
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
