import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/AppLayout";
import { Sparkles, Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "diagmed_chat_history";

const SYSTEM_PROMPT = `Você é um Engenheiro Clínico Sênior especialista em equipamentos médicos de Litotripsia e Laser. Você trabalha como consultor técnico para uma equipe de técnicos de campo.

Você pode ajudar com:
- Diagnóstico de falhas em equipamentos de litotripsia (Tripter Compact, Lithorex, Duet)
- Diagnóstico de falhas em equipamentos laser (Lito 30W/35W, Litho Evo, Cyber Ho 60W/100W/150W, Laserclast 35W, Thulium TFL 60W, Megapulse 30W/35W/70W, Edap 30W)
- Procedimentos de verificação e teste
- Interpretação de sintomas e defeitos relatados
- Sugestões de peças para substituição
- Manutenção preventiva

Seja objetivo, técnico e direto. Responda em português do Brasil.`;

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = "Diagnostic Medical Call — Chat IA"; }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Olá! Sou o Diag Med assistente técnico especializado em equipamentos médicos de Litotripsia e Laser. Como posso ajudar?",
      }]);
    }
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const updated: Message[] = [...messages, { role: "user", content: text }];
    setMessages(updated);
    setLoading(true);

    try {
      const key = import.meta.env.VITE_GROQ_API_KEY;
      if (!key) { toast.error("Chave da API Groq não configurada"); setLoading(false); return; }

      const chatHistory = updated.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...chatHistory,
          ],
          temperature: 0.5,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `Erro ${response.status}`);
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) throw new Error("IA não retornou resposta");

      const final: Message[] = [...updated, { role: "assistant", content: reply }];
      setMessages(final);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(final));
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([{
      role: "assistant",
      content: "Olá! Sou o assistente técnico especializado em equipamentos médicos de Litotripsia e Laser. Como posso ajudar?",
    }]);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader
        title="Chat Técnico IA"
        subtitle="Assistente virtual especializado em equipamentos médicos"
        action={messages.length > 1 ? (
          <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
            <Trash2 className="w-4 h-4 mr-1" /> Limpar
          </Button>
        ) : undefined}
      />

      <Card className="flex-1 flex flex-col overflow-hidden mt-4">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/15 grid place-items-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md"
              }`}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary grid place-items-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/15 grid place-items-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-muted rounded-bl-md">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-4">
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta sobre equipamentos..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> para enviar
          </p>
        </div>
      </Card>
    </div>
  );
}
