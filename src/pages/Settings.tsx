import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/AppLayout";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const VISION_KEY = "diagmed_vision_key";

export default function Settings() {
  const [visionKey, setVisionKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    document.title = "Diagnostic Medical Call — Configurações";
    const stored = localStorage.getItem(VISION_KEY);
    if (stored) setVisionKey(stored);
  }, []);

  const hasVisionKey = !!visionKey.trim();

  const save = () => {
    const key = visionKey.trim();
    if (key) {
      localStorage.setItem(VISION_KEY, key);
    } else {
      localStorage.removeItem(VISION_KEY);
    }
    setSaved(true);
    toast.success(key ? "Chave vision salva!" : "Chave vision removida.");
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async () => {
    const key = visionKey.trim() || localStorage.getItem(VISION_KEY) || import.meta.env.VITE_GROQ_API_KEY;
    if (!key) {
      toast.error("Nenhuma chave configurada.");
      return;
    }
    setTesting(true);
    setTestResult("idle");
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: "Responda apenas 'OK' se você conseguir ler esta mensagem.",
            },
          ],
          temperature: 0.1,
          max_tokens: 10,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);
      setTestResult("ok");
      toast.success("Conexão OK! Modelo vision respondendo.");
    } catch (err: any) {
      setTestResult("fail");
      toast.error("Falha na conexão: " + err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Configurações"
        subtitle="Gerencie as chaves de API e preferências do sistema"
      />

      {/* Chave da IA de Visão */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-base font-semibold" htmlFor="visionKey">
            Chave da IA de Visão (Groq Vision)
          </Label>
          {hasVisionKey ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1">
              <CheckCircle2 className="w-3 h-3" /> Configurada
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-xs gap-1">
              <XCircle className="w-3 h-3" /> Não configurada
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Usada para extrair texto de fotos de relatórios manuscritos.
          Se vazia, tenta usar a chave <code className="text-xs bg-muted px-1 rounded">VITE_GROQ_API_KEY</code> do ambiente.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="visionKey"
              type={showKey ? "text" : "password"}
              placeholder="gsk_..."
              value={visionKey}
              onChange={(e) => {
                setVisionKey(e.target.value);
                setSaved(false);
                setTestResult("idle");
              }}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={save} disabled={saved}>
            {saved ? "Salvo ✓" : "Salvar"}
          </Button>
          <Button variant="outline" onClick={testConnection} disabled={testing || !hasVisionKey}>
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              "Testar Conexão"
            )}
          </Button>
        </div>

        {testResult === "ok" && (
          <p className="text-sm text-emerald-600 mt-2">✓ Conexão com Groq Vision estabelecida.</p>
        )}
        {testResult === "fail" && (
          <p className="text-sm text-red-600 mt-2">✗ Falha na conexão. Verifique a chave.</p>
        )}
      </Card>

      {/* Info sobre o modelo */}
      <Card className="p-6 mt-6">
        <h3 className="font-semibold text-sm mb-2">Sobre a extração de fotos</h3>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Modelo usado: <code className="text-xs bg-muted px-1 rounded">llama-3.2-11b-vision-preview</code> (econômico)</li>
          <li>A extração só acontece quando você clica em "Extrair de foto" no formulário</li>
          <li>A foto precisa já estar carregada no chamado (bucket <code className="text-xs bg-muted px-1 rounded">service_photos</code>)</li>
          <li>O texto extraído preenche o campo "Serviço realizado"</li>
        </ul>
      </Card>
    </div>
  );
}
