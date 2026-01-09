import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChatFirebase() {
    const [mensagem, setMensagem] = useState("");
    const [destinatarioId, setDestinatarioId] = useState("");
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ["current-user-chat"],
        queryFn: () => base44.auth.me()
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas-chat"],
        queryFn: () => base44.entities.Motorista.list()
    });

    const { data: mensagens = [] } = useQuery({
        queryKey: ["mensagens-chat"],
        queryFn: async () => {
            const res = await base44.functions.invoke('firebaseSync', { action: 'getMessages' });
            return res.data?.messages || [];
        },
        refetchInterval: 5000
    });

    const enviarMutation = useMutation({
        mutationFn: async () => {
            await base44.functions.invoke('firebaseSync', {
                action: 'sendMessage',
                destinatario_id: destinatarioId,
                titulo: `Mensagem de ${currentUser?.full_name}`,
                mensagem: mensagem
            });
        },
        onSuccess: () => {
            setMensagem("");
            queryClient.invalidateQueries({ queryKey: ["mensagens-chat"] });
        }
    });

    const formatarData = (dataStr) => {
        try {
            return format(new Date(dataStr), "HH:mm", { locale: ptBR });
        } catch {
            return "-";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-slate-800">Chat Interno</h2>
            </div>

            {/* Área de Mensagens */}
            <Card className="bg-white">
                <CardContent className="p-5">
                    <div className="h-96 overflow-y-auto bg-slate-50 rounded-lg p-4 space-y-3">
                        {mensagens.length === 0 ? (
                            <div className="text-center text-slate-500 py-8">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                Nenhuma mensagem
                            </div>
                        ) : (
                            mensagens.map((msg) => (
                                <div 
                                    key={msg.id}
                                    className={`p-3 rounded-lg ${
                                        msg.created_by === currentUser?.email 
                                            ? "bg-blue-100 ml-auto" 
                                            : "bg-white border border-slate-200"
                                    } max-w-xs`}
                                >
                                    <p className="text-sm font-semibold text-slate-800">{msg.titulo}</p>
                                    <p className="text-sm text-slate-700 mt-1">{msg.mensagem}</p>
                                    <p className="text-xs text-slate-500 mt-2">{formatarData(msg.created_date)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Input de Mensagem */}
            <Card className="bg-white">
                <CardContent className="p-5">
                    <div className="space-y-3">
                        <Input
                            placeholder="Selecione um destinatário..."
                            value={destinatarioId}
                            onChange={(e) => setDestinatarioId(e.target.value)}
                            list="motoristas-list"
                        />
                        <datalist id="motoristas-list">
                            {motoristas.map(m => (
                                <option key={m.id} value={m.id}>{m.nome}</option>
                            ))}
                        </datalist>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Digite sua mensagem..."
                                value={mensagem}
                                onChange={(e) => setMensagem(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && mensagem && destinatarioId) {
                                        enviarMutation.mutate();
                                    }
                                }}
                            />
                            <Button
                                onClick={() => enviarMutation.mutate()}
                                disabled={!mensagem || !destinatarioId || enviarMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}