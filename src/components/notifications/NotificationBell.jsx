import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { 
    Bell, BellRing, Package, Truck, AlertTriangle, 
    ClipboardList, Settings, CheckCheck
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ["current-user-notif"],
        queryFn: () => base44.auth.me()
    });

    const { data: notificacoes = [] } = useQuery({
        queryKey: ["notificacoes"],
        queryFn: () => base44.entities.Notificacao.list("-created_date", 50),
        refetchInterval: 30000 // Atualiza a cada 30 segundos
    });

    // Filtrar notificações para o usuário atual
    const minhasNotificacoes = notificacoes.filter(n => {
        if (n.destinatario_tipo === "todos") return true;
        if (n.destinatario_tipo === "usuario" && n.destinatario_id === currentUser?.id) return true;
        if (n.destinatario_tipo === "motoristas" && currentUser?.role !== "admin") return true;
        if (n.destinatario_tipo === "gestores" && currentUser?.role === "admin") return true;
        return false;
    });

    const naoLidas = minhasNotificacoes.filter(n => !n.lida);

    const marcarLidaMutation = useMutation({
        mutationFn: (id) => base44.entities.Notificacao.update(id, { lida: true }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes"] })
    });

    const marcarTodasLidasMutation = useMutation({
        mutationFn: async () => {
            for (const n of naoLidas) {
                await base44.entities.Notificacao.update(n.id, { lida: true });
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificacoes"] })
    });

    const getIcon = (tipo) => {
        switch (tipo) {
            case "coleta": return <Truck className="w-4 h-4 text-blue-500" />;
            case "entrega": return <Package className="w-4 h-4 text-green-500" />;
            case "alerta": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            case "ordem": return <ClipboardList className="w-4 h-4 text-purple-500" />;
            default: return <Settings className="w-4 h-4 text-slate-500" />;
        }
    };

    const getPrioridadeColor = (prioridade) => {
        switch (prioridade) {
            case "urgente": return "bg-red-100 border-red-300";
            case "alta": return "bg-orange-50 border-orange-200";
            case "normal": return "bg-white border-slate-200";
            default: return "bg-slate-50 border-slate-200";
        }
    };

    const formatarData = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const agora = new Date();
        const diffMs = agora - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHoras = Math.floor(diffMs / 3600000);

        if (diffMin < 1) return "Agora";
        if (diffMin < 60) return `${diffMin}min atrás`;
        if (diffHoras < 24) return `${diffHoras}h atrás`;
        return format(date, "dd/MM HH:mm", { locale: ptBR });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative bg-white/80 hover:bg-white shadow-md rounded-full h-10 w-10"
                >
                    {naoLidas.length > 0 ? (
                        <BellRing className="w-5 h-5 text-blue-600 animate-pulse" />
                    ) : (
                        <Bell className="w-5 h-5 text-slate-600" />
                    )}
                    {naoLidas.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {naoLidas.length > 9 ? "9+" : naoLidas.length}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-3 border-b bg-slate-50">
                    <h4 className="font-semibold text-slate-800">Notificações</h4>
                    {naoLidas.length > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => marcarTodasLidasMutation.mutate()}
                        >
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Marcar todas
                        </Button>
                    )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {minhasNotificacoes.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">
                            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">Nenhuma notificação</p>
                        </div>
                    ) : (
                        minhasNotificacoes.slice(0, 15).map((notif) => (
                            <div 
                                key={notif.id}
                                className={`p-3 border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                                    !notif.lida ? getPrioridadeColor(notif.prioridade) : "bg-white"
                                }`}
                                onClick={() => {
                                    if (!notif.lida) marcarLidaMutation.mutate(notif.id);
                                    if (notif.link) {
                                        setOpen(false);
                                        window.location.href = createPageUrl(notif.link);
                                    }
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {getIcon(notif.tipo)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className={`text-sm font-medium ${!notif.lida ? 'text-slate-800' : 'text-slate-600'}`}>
                                                {notif.titulo}
                                            </p>
                                            {!notif.lida && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                            {notif.mensagem}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {formatarData(notif.created_date)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}