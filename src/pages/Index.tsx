import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Wrench, Search, Pencil, Trash2, Calendar, CalendarPlus, MapPin, Phone, User, FileDown, Share2, Mail, Copy, Link as LinkIcon, Clock } from "lucide-react";
import { ServiceCallForm } from "@/components/ServiceCallForm";
import { PageHeader } from "@/components/AppLayout";
import { generateServiceCallPDF } from "@/lib/pdf";
import { generateServiceCallICS } from "@/lib/ics";
import { toast } from "sonner";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}m`;
}
import { useRole } from "@/hooks/use-role";
import type { Tables } from "@/integrations/supabase/types";

type ServiceCall = Tables<"service_calls"> & {
  clients?: { email: string | null } | null;
};

const statusLabels: Record<string, { label: string; cls: string }> = {
  open: { label: "Aberto", cls: "bg-warning/10 text-warning border-warning/30" },
  in_progress: { label: "Em execução", cls: "bg-primary/10 text-primary border-primary/30" },
  waiting_parts: { label: "Aguardando peça", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  completed: { label: "Finalizado", cls: "bg-success/10 text-success border-success/30" },
};

const Index = () => {
  const { isStaff } = useRole();
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCall | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Diagnostic Medical Call — Chamados Técnicos";
    load();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    const id = setInterval(checkNewAssignments, 30000);
    return () => clearInterval(id);
  }, []);

  const [userId, setUserId] = useState<string>("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) setUserId(data.user.id); }); }, []);

  const checkNewAssignments = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data } = await supabase
      .from("service_calls")
      .select("id, client_name, assigned_to")
      .eq("assigned_to", u.user.id)
      .gte("created_at", oneHourAgo);
    if (!data) return;
    const shown = new Set(JSON.parse(localStorage.getItem("notified_calls") || "[]"));
    const news = data.filter(n => n.assigned_to === u.user.id && !shown.has(n.id));
    if (news.length > 0) {
      const ids = news.map(n => n.id);
      shown.add(ids);
      localStorage.setItem("notified_calls", JSON.stringify([...shown]));
      const names = news.map(n => n.client_name).join(", ");
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Novo chamado atribuído a você", { body: `Cliente(s): ${names}`, icon: "/icon.jpg" });
      }
      toast.info(`🔔 Chamado(s) atribuído(s) a você: ${names}`);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_calls")
      .select(`
        *,
        clients (
          email
        )
      `)
      .order("service_date", { ascending: false });
    if (error) toast.error(error.message);
    else setCalls(data ?? []);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("service_calls").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else { toast.success("Chamado excluído"); setCalls((c) => c.filter((x) => x.id !== deleteId)); }
    setDeleteId(null);
  };

  const filtered = useMemo(() => calls.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.client_name.toLowerCase().includes(q)
        || c.address?.toLowerCase().includes(q)
        || c.reported_defect?.toLowerCase().includes(q);
    }
    return true;
  }), [calls, filter, search]);

  const stats = useMemo(() => ({
    open: calls.filter((c) => c.status === "open").length,
    in_progress: calls.filter((c) => c.status === "in_progress").length,
    completed: calls.filter((c) => c.status === "completed").length,
    total: calls.length,
  }), [calls]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full mx-auto">
      <PageHeader
        title="Chamados Técnicos"
        subtitle="Gerencie todos os atendimentos da sua operação"
        action={(
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gradient-brand glow-brand text-primary-foreground border-0">
            <Plus className="w-4 h-4 mr-1" /> Novo chamado
          </Button>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Abertos", value: stats.open, color: "text-warning" },
          { label: "Em Execução", value: stats.in_progress, color: "text-primary" },
          { label: "Finalizados", value: stats.completed, color: "text-success" },
          { label: "Total", value: stats.total, color: "text-gradient-brand" },
        ].map((s) => (
          <Card key={s.label} className="p-5 card-hover min-w-0">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">{s.label}</p>
            <p className={`font-display text-3xl font-semibold mt-1 ${s.color}`}>{s.value.toString().padStart(2, "0")}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, endereço, defeito..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { v: "all", l: `Todos (${stats.total})` },
            { v: "open", l: "Abertos" },
            { v: "in_progress", l: "Em execução" },
            { v: "waiting_parts", l: "Aguard. peça" },
            { v: "completed", l: "Finalizados" },
          ].map((f) => (
            <Button key={f.v} size="sm" variant={filter === f.v ? "default" : "outline"} onClick={() => setFilter(f.v)} className="whitespace-nowrap">
              {f.l}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">Nenhum chamado encontrado</p>
          <Button className="mt-4" variant="outline" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Criar primeiro chamado
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((c) => {
            const st = statusLabels[c.status] ?? statusLabels.open;
            return (
              <Card key={c.id} className="p-5 card-hover">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base truncate">{c.client_name}</h3>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(c.service_date + "T00:00").toLocaleDateString("pt-BR")}</span>
                          <span className="flex items-center gap-1 text-muted-foreground/60" title={`Aberto ${new Date(c.created_at).toLocaleString("pt-BR")}`}><Clock className="w-3 h-3" />{timeAgo(c.created_at)}</span>
                          {c.contact && (
                            <span className="flex items-center gap-1 group">
                              <Phone className="w-3 h-3" />
                              {c.contact}
                              <a
                                href="#"
                                className="ml-1 p-0.5 hover:bg-accent rounded text-green-600 transition-colors"
                                title="Copiar número"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const d = c.contact.replace(/\D/g, "");
                                  if (navigator.clipboard && window.isSecureContext) {
                                    await navigator.clipboard.writeText(d);
                                    toast.success(`Nº ${d} copiado`);
                                  }
                                }}
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </a>
                            </span>
                          )}
                          {c.technician && <span className="flex items-center gap-1"><User className="w-3 h-3" />{c.technician}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className={st.cls}>{st.label}</Badge>
                    </div>

                    {c.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 group">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="min-w-0 truncate">{c.address}</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 p-1 hover:bg-accent rounded-md text-primary transition-colors"
                          title="Abrir no Google Maps"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Share2 className="w-3 h-3" />
                        </a>
                      </p>
                    )}

                    {c.reported_defect && (<div><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Defeito</p><p className="text-sm">{c.reported_defect}</p></div>)}
                    {c.service_performed && (<div><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Serviço realizado</p><p className="text-sm">{c.service_performed}</p></div>)}
                    {c.parts_replaced && (<div><p className="text-[10px] uppercase text-muted-foreground tracking-wider">Peças trocadas</p><p className="text-sm">{c.parts_replaced}</p></div>)}
                    {c.value != null && <p className="text-sm font-semibold text-gradient-brand">R$ {Number(c.value).toFixed(2).replace(".", ",")}</p>}
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                      onClick={async () => { try { await generateServiceCallPDF(c); } catch (e: any) { toast.error("Erro ao gerar PDF: " + e.message); } }} 
                      title="Gerar OS em PDF"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try { 
                          generateServiceCallICS(c); 
                        } catch (err: any) { 
                          toast.error(err.message || "Erro ao gerar arquivo de calendário"); 
                        } 
                      }} 
                      title="Adicionar ao calendário"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </Button>
                    {c.public_token && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-sky-600 hover:text-sky-700 hover:bg-sky-50 border-sky-200 dark:border-sky-900/50 dark:text-sky-400 dark:hover:bg-sky-950/30"
                        title="Enviar por E-mail" 
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/portal/${c.public_token}`;
                          const email = c.clients?.email || "";
                          const subject = encodeURIComponent(`Relatório de Serviço - ${c.client_name}`);
                          const body = encodeURIComponent(`Olá, ${c.client_name}.\n\nAcesse o relatório do serviço através do link abaixo:\n${url}\n\nAtenciosamente,`);
                          window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
                        }}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {c.public_token && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        title="Copiar link do relatório" 
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-950/30" 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/portal/${c.public_token}`;
                          try {
                            if (navigator.clipboard && window.isSecureContext) {
                              await navigator.clipboard.writeText(url);
                            } else {
                              const ta = document.createElement("textarea");
                              ta.value = url;
                              document.body.appendChild(ta);
                              ta.select();
                              document.execCommand("copy");
                              document.body.removeChild(ta);
                            }
                            toast.success("Link copiado!");
                          } catch {
                            toast.error("Copie o link: " + url);
                          }
                        }}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {c.contact && c.public_token && (
                      <Button
                        size="sm"
                        variant="outline"
                        title="Enviar por WhatsApp"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
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
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 dark:border-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                      onClick={() => { setEditing(c); setFormOpen(true); }}
                      title="Editar chamado"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(c.id);
                      }}
                      title="Excluir chamado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ServiceCallForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={load} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir chamado?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
