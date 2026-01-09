import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Zap, Database, MapPin, MessageSquare, HardDrive, 
    CheckCircle, AlertCircle, Clock, Activity
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import RastreamentoGPS from "@/components/firebase/RastreamentoGPS";
import ChatFirebase from "@/components/firebase/ChatFirebase";

export default function SincronizacaoFirebase() {
    const [syncStatus, setSyncStatus] = useState(null);
    const [backupStatus, setBackupStatus] = useState(null);
    const queryClient = useQueryClient();

    const { data: status } = useQuery({
        queryKey: ["firebase-status"],
        queryFn: async () => {
            const res = await base44.functions.invoke('firebaseSync', { action: 'getStatus' });
            return res.data;
        },
        refetchInterval: 30000
    });

    const { data: syncData } = useQuery({
        queryKey: ["firebase-sync"],
        queryFn: async () => {
            const res = await base44.functions.invoke('firebaseSync', { action: 'syncColetas' });
            return res.data;
        },
        refetchInterval: 60000
    });

    const syncMutation = useMutation({
        mutationFn: async () => {
            setSyncStatus({ loading: true });
            const res = await base44.functions.invoke('firebaseSync', { action: 'syncColetas' });
            setSyncStatus({ loading: false, success: true, data: res.data });
            queryClient.invalidateQueries({ queryKey: ["firebase-sync"] });
            setTimeout(() => setSyncStatus(null), 3000);
        }
    });

    const backupMutation = useMutation({
        mutationFn: async () => {
            setBackupStatus({ loading: true });
            const res = await base44.functions.invoke('firebaseSync', { action: 'backup' });
            setBackupStatus({ loading: false, success: true, data: res.data });
            setTimeout(() => setBackupStatus(null), 5000);
        }
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl">
                            <Zap className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Firebase Sync Dashboard</h1>
                            <p className="text-slate-500">Sincronização, Chat, GPS e Backup</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => syncMutation.mutate()}
                            disabled={syncMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            {syncMutation.isPending ? "Sincronizando..." : "Sincronizar Agora"}
                        </Button>
                        <Button
                            onClick={() => backupMutation.mutate()}
                            disabled={backupMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <HardDrive className="w-4 h-4 mr-2" />
                            {backupMutation.isPending ? "Fazendo Backup..." : "Backup Agora"}
                        </Button>
                    </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Status Firebase</p>
                                    <p className="text-2xl font-bold text-slate-800">
                                        {status?.firebaseConnected ? "✓ Ativo" : "✗ Desconectado"}
                                    </p>
                                </div>
                                {status?.firebaseConnected ? (
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                ) : (
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Veículos em Trânsito</p>
                                    <p className="text-2xl font-bold text-slate-800">
                                        {status?.ordensEmTransito || 0}
                                    </p>
                                </div>
                                <MapPin className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Coletas</p>
                                    <p className="text-2xl font-bold text-slate-800">
                                        {syncData?.coletas || 0}
                                    </p>
                                </div>
                                <Database className="w-8 h-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Última Sync</p>
                                    <p className="text-sm font-bold text-slate-800">
                                        {status?.lastCheck 
                                            ? format(new Date(status.lastCheck), "HH:mm", { locale: ptBR })
                                            : "-"
                                        }
                                    </p>
                                </div>
                                <Clock className="w-8 h-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Status Messages */}
                {syncStatus?.success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                        ✓ Sincronização concluída com sucesso!
                    </div>
                )}

                {backupStatus?.success && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                        ✓ Backup realizado: {backupStatus.data?.backup?.totalRecords} registros
                    </div>
                )}

                {/* Tabs */}
                <Tabs defaultValue="rastreamento" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="rastreamento" className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Rastreamento GPS
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Chat
                        </TabsTrigger>
                        <TabsTrigger value="dados" className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Dados
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="rastreamento" className="mt-6">
                        <RastreamentoGPS />
                    </TabsContent>

                    <TabsContent value="chat" className="mt-6">
                        <ChatFirebase />
                    </TabsContent>

                    <TabsContent value="dados" className="mt-6 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="w-5 h-5" />
                                    Sincronização de Dados
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                    <span className="text-slate-700">Coletas Diárias</span>
                                    <Badge className="bg-blue-100 text-blue-700">{syncData?.coletas || 0}</Badge>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                    <span className="text-slate-700">Ordens de Coleta</span>
                                    <Badge className="bg-purple-100 text-purple-700">{syncData?.ordens || 0}</Badge>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                    <span className="text-slate-700">Romaneios Gerados</span>
                                    <Badge className="bg-orange-100 text-orange-700">{syncData?.romaneios || 0}</Badge>
                                </div>
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                    <p className="font-semibold mb-1">Última sincronização:</p>
                                    <p>{syncData?.lastSync 
                                        ? format(new Date(syncData.lastSync), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                                        : "-"
                                    }</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <HardDrive className="w-5 h-5" />
                                    Backup Automático
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-slate-600">
                                    Backups são realizados diariamente. Clique em "Backup Agora" para forçar um backup imediato.
                                </p>
                                <Button 
                                    onClick={() => backupMutation.mutate()}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    Fazer Backup Manual
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}