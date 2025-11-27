import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
    Download, Upload, Database, FileJson, CheckCircle, 
    AlertTriangle, Loader2, HardDrive
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ENTITIES = [
    { name: "OrdemColeta", label: "Ordens de Coleta" },
    { name: "ColetaDiaria", label: "Coletas Diárias" },
    { name: "Cliente", label: "Clientes" },
    { name: "Motorista", label: "Colaboradores" },
    { name: "Veiculo", label: "Veículos" },
    { name: "Romaneio", label: "Romaneios" },
    { name: "NotaDeposito", label: "Notas Depósito" },
    { name: "ComprovanteInterno", label: "Comprovantes Internos" },
    { name: "Comprovante", label: "Comprovantes" },
    { name: "Aviso", label: "Avisos" },
    { name: "Configuracoes", label: "Configurações" }
];

export default function Backup() {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const isAdmin = currentUser?.role === "admin";

    const handleExportBackup = async () => {
        setExporting(true);
        try {
            const backup = {
                version: "1.0",
                date: new Date().toISOString(),
                data: {}
            };

            for (const entity of ENTITIES) {
                try {
                    const data = await base44.entities[entity.name].list();
                    backup.data[entity.name] = data;
                } catch (e) {
                    backup.data[entity.name] = [];
                }
            }

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `backup_${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success("Backup exportado com sucesso!");
        } catch (error) {
            toast.error("Erro ao exportar backup");
        }
        setExporting(false);
    };

    const handleImportBackup = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        setImportResult(null);

        try {
            const text = await file.text();
            const backup = JSON.parse(text);

            if (!backup.version || !backup.data) {
                throw new Error("Arquivo de backup inválido");
            }

            const results = { success: [], errors: [] };

            for (const entity of ENTITIES) {
                const entityData = backup.data[entity.name];
                if (!entityData || entityData.length === 0) continue;

                try {
                    // Para cada registro, remover campos de sistema e criar novo
                    for (const record of entityData) {
                        const cleanRecord = { ...record };
                        delete cleanRecord.id;
                        delete cleanRecord.created_date;
                        delete cleanRecord.updated_date;
                        delete cleanRecord.created_by;

                        await base44.entities[entity.name].create(cleanRecord);
                    }
                    results.success.push({ entity: entity.label, count: entityData.length });
                } catch (err) {
                    results.errors.push({ entity: entity.label, error: err.message });
                }
            }

            setImportResult(results);
            toast.success("Backup restaurado!");
        } catch (error) {
            toast.error("Erro ao importar backup: " + error.message);
        }

        setImporting(false);
        e.target.value = "";
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardContent className="p-12 text-center">
                            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
                            <p className="text-slate-600">Apenas administradores podem acessar o backup.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-2xl shadow-lg">
                        <Database className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Backup e Restauração</h1>
                        <p className="text-slate-500">Exporte e importe dados do sistema</p>
                    </div>
                </div>

                {/* Export */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Download className="w-5 h-5 text-sky-600" />
                            Exportar Backup
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <p className="text-slate-600 mb-4">
                            Exporte todos os dados do sistema em um arquivo JSON. Este backup pode ser usado para restaurar os dados posteriormente.
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {ENTITIES.map(e => (
                                <Badge key={e.name} variant="outline" className="bg-sky-50 text-sky-700">
                                    {e.label}
                                </Badge>
                            ))}
                        </div>
                        <Button 
                            onClick={handleExportBackup} 
                            disabled={exporting}
                            className="bg-sky-600 hover:bg-sky-700"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4 mr-2" />
                            )}
                            {exporting ? "Exportando..." : "Exportar Backup"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Import */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Upload className="w-5 h-5 text-emerald-600" />
                            Restaurar Backup
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-amber-800">Atenção!</p>
                                    <p className="text-sm text-amber-700">
                                        A restauração irá adicionar os dados do backup ao sistema existente. 
                                        Registros duplicados podem ser criados.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>Selecione o arquivo de backup</Label>
                                <Input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImportBackup}
                                    disabled={importing}
                                    className="mt-2"
                                />
                            </div>

                            {importing && (
                                <div className="flex items-center gap-2 text-sky-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Restaurando backup...</span>
                                </div>
                            )}

                            {importResult && (
                                <div className="space-y-3">
                                    {importResult.success.length > 0 && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2">
                                                <CheckCircle className="w-4 h-4" />
                                                Restaurados com sucesso:
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {importResult.success.map((s, i) => (
                                                    <Badge key={i} className="bg-emerald-100 text-emerald-700">
                                                        {s.entity}: {s.count}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {importResult.errors.length > 0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Erros:
                                            </div>
                                            <div className="space-y-1">
                                                {importResult.errors.map((e, i) => (
                                                    <p key={i} className="text-sm text-red-600">
                                                        {e.entity}: {e.error}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}