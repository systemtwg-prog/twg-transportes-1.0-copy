import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Download, Upload, Database, AlertTriangle, CheckCircle,
    FileJson, Clock, RefreshCw
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
    { name: "RomaneioGerado", label: "Romaneios Gerados" },
    { name: "NotaFiscal", label: "Notas Fiscais" },
    { name: "NotaDeposito", label: "Notas Depósito" },
    { name: "ComprovanteInterno", label: "Comprovantes Internos" },
    { name: "ComprovanteCTE", label: "Comprovantes CTEs" },
    { name: "Comprovante", label: "Comprovantes" },
    { name: "Transportadora", label: "Transportadoras" },
    { name: "EmpresaRemetente", label: "Empresas Remetentes" },
    { name: "EmpresaComprovante", label: "Empresas Comprovante" },
    { name: "StatusCTE", label: "Status CTEs" },
    { name: "Multa", label: "Multas" },
    { name: "Notificacao", label: "Notificações" },
    { name: "Aviso", label: "Avisos" },
    { name: "Configuracoes", label: "Configurações" }
];

export default function Backup() {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importFile, setImportFile] = useState(null);

    const { data: currentUser, isLoading: loadingUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const isAdmin = currentUser?.role === "admin";

    // Aguardar carregamento do usuário antes de verificar permissão
    if (loadingUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const handleExportBackup = async () => {
        setExporting(true);
        try {
            const backup = {
                date: new Date().toISOString(),
                version: "1.0",
                data: {}
            };

            for (const entity of ENTITIES) {
                try {
                    const data = await base44.entities[entity.name].list();
                    backup.data[entity.name] = data;
                } catch (e) {
                    console.warn(`Erro ao exportar ${entity.name}:`, e);
                    backup.data[entity.name] = [];
                }
            }

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `backup_${format(new Date(), "yyyy-MM-dd_HH-mm")}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success("Backup exportado com sucesso!");
        } catch (error) {
            toast.error("Erro ao exportar backup");
            console.error(error);
        }
        setExporting(false);
    };

    const handleImportBackup = async () => {
        if (!importFile) {
            toast.error("Selecione um arquivo de backup");
            return;
        }

        const importMode = confirm(
            "Escolha o modo de importação:\n\n" +
            "OK = SUBSTITUIR (apaga dados atuais e importa o backup)\n" +
            "Cancelar = ADICIONAR (mantém dados atuais e adiciona o backup)"
        );

        if (importMode && !confirm("ATENÇÃO: Isso irá APAGAR todos os dados atuais e substituir pelo backup. Tem certeza?")) {
            return;
        }

        setImporting(true);
        try {
            const text = await importFile.text();
            const backup = JSON.parse(text);

            if (!backup.data) {
                throw new Error("Arquivo de backup inválido");
            }

            let totalImported = 0;
            let totalDeleted = 0;

            for (const entity of ENTITIES) {
                const entityData = backup.data[entity.name];
                
                // Se modo substituir, deletar dados existentes primeiro
                if (importMode && entityData && Array.isArray(entityData)) {
                    try {
                        const existing = await base44.entities[entity.name].list();
                        for (const item of existing) {
                            try {
                                await base44.entities[entity.name].delete(item.id);
                                totalDeleted++;
                            } catch (e) {
                                console.warn(`Erro ao deletar item de ${entity.name}:`, e);
                            }
                        }
                    } catch (e) {
                        console.warn(`Erro ao listar ${entity.name} para exclusão:`, e);
                    }
                }

                // Importar dados do backup
                if (entityData && Array.isArray(entityData) && entityData.length > 0) {
                    for (const item of entityData) {
                        try {
                            // Remover campos do sistema
                            const { id, created_date, updated_date, created_by, created_by_id, entity_name, app_id, is_sample, is_deleted, deleted_date, ...cleanData } = item;
                            await base44.entities[entity.name].create(cleanData);
                            totalImported++;
                        } catch (e) {
                            console.warn(`Erro ao importar item de ${entity.name}:`, e);
                        }
                    }
                }
            }

            toast.success(`Backup restaurado! ${totalImported} registros importados.${importMode ? ` ${totalDeleted} registros anteriores removidos.` : ''}`);
            setImportFile(null);
        } catch (error) {
            toast.error("Erro ao importar backup: " + error.message);
            console.error(error);
        }
        setImporting(false);
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8 flex items-center justify-center">
                <Card className="max-w-md bg-white/90 border-0 shadow-xl">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
                        <p className="text-slate-500">Apenas administradores podem acessar o backup.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl shadow-lg">
                        <Database className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Backup e Restauração</h1>
                        <p className="text-slate-500">Exporte ou restaure seus dados</p>
                    </div>
                </div>

                {/* Aviso */}
                <Card className="bg-amber-50 border-amber-200 shadow-lg">
                    <CardContent className="p-4 flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-800">Importante</p>
                            <p className="text-sm text-amber-700">
                                Faça backups regularmente para evitar perda de dados. 
                                Na restauração você pode escolher entre ADICIONAR (mantém dados atuais) ou SUBSTITUIR (apaga e importa).
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Exportar Backup */}
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                        <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-cyan-50">
                            <CardTitle className="flex items-center gap-2">
                                <Download className="w-5 h-5 text-sky-600" />
                                Exportar Backup
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <p className="text-slate-600 text-sm">
                                Baixe uma cópia de todos os seus dados em formato JSON.
                            </p>
                            <div className="p-4 bg-sky-50 rounded-xl">
                                <p className="font-medium text-sky-800 mb-2">Dados incluídos:</p>
                                <div className="grid grid-cols-2 gap-1 text-sm text-sky-700">
                                    {ENTITIES.map(e => (
                                        <div key={e.name} className="flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            {e.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button 
                                onClick={handleExportBackup}
                                disabled={exporting}
                                className="w-full bg-sky-500 hover:bg-sky-600"
                            >
                                {exporting ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                {exporting ? "Exportando..." : "Exportar Backup"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Restaurar Backup */}
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                        <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="w-5 h-5 text-emerald-600" />
                                Restaurar Backup
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <p className="text-slate-600 text-sm">
                                Importe um arquivo de backup JSON para restaurar seus dados.
                            </p>
                            <div className="space-y-2">
                                <Label>Selecionar arquivo de backup</Label>
                                <Input
                                    type="file"
                                    accept=".json"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                />
                                {importFile && (
                                    <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg text-sm">
                                        <FileJson className="w-4 h-4 text-emerald-600" />
                                        <span className="text-emerald-700">{importFile.name}</span>
                                    </div>
                                )}
                            </div>
                            <Button 
                                onClick={handleImportBackup}
                                disabled={importing || !importFile}
                                variant="outline"
                                className="w-full border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                            >
                                {importing ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                )}
                                {importing ? "Restaurando..." : "Restaurar Backup"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Dicas */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Dicas de Backup</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-sky-50 rounded-xl">
                                <Clock className="w-8 h-8 text-sky-600 mb-2" />
                                <h3 className="font-semibold text-sky-800">Faça backup semanal</h3>
                                <p className="text-sm text-sky-600">Mantenha backups regulares para segurança.</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-xl">
                                <Download className="w-8 h-8 text-emerald-600 mb-2" />
                                <h3 className="font-semibold text-emerald-800">Guarde em local seguro</h3>
                                <p className="text-sm text-emerald-600">Salve os backups em nuvem ou HD externo.</p>
                            </div>
                            <div className="p-4 bg-violet-50 rounded-xl">
                                <Database className="w-8 h-8 text-violet-600 mb-2" />
                                <h3 className="font-semibold text-violet-800">Teste a restauração</h3>
                                <p className="text-sm text-violet-600">Verifique se os backups funcionam.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}