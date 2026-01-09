import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    FileText, Download, Search, Upload, CheckCircle, AlertCircle, 
    Key, Loader2, Eye, EyeOff, Copy
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConsultaSEFAZ() {
    const [chave, setChave] = useState("");
    const [showCertDialog, setShowCertDialog] = useState(false);
    const [certFile, setCertFile] = useState(null);
    const [senhacert, setSenhacert] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [resultadoBusca, setResultadoBusca] = useState(null);
    const [validacaoChave, setValidacaoChave] = useState(null);
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const validarChaveMutation = useMutation({
        mutationFn: async (chaveInput) => {
            const res = await base44.functions.invoke('consultaSEFAZ', {
                action: 'validarChave',
                chave: chaveInput
            });
            return res.data;
        },
        onSuccess: (data) => {
            setValidacaoChave(data);
            if (!data.valid) {
                toast.error(data.message);
            }
        }
    });

    const buscarDFEMutation = useMutation({
        mutationFn: async () => {
            const res = await base44.functions.invoke('consultaSEFAZ', {
                action: 'buscarDFE',
                chave: chave
            });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                setResultadoBusca(data);
                toast.success("DFE encontrado com sucesso!");
            } else {
                toast.error(data.error || "Erro ao buscar DFE");
            }
        },
        onError: (error) => {
            toast.error("Erro ao buscar DFE: " + error.message);
        }
    });

    const downloadXMLMutation = useMutation({
        mutationFn: async () => {
            const res = await base44.functions.invoke('consultaSEFAZ', {
                action: 'downloadXML',
                chave: chave
            });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                // Criar blob e download
                const blob = new Blob([data.xml_content], { type: 'application/xml' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = data.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                toast.success("XML baixado com sucesso!");
            }
        }
    });

    const downloadDANFEMutation = useMutation({
        mutationFn: async () => {
            const res = await base44.functions.invoke('consultaSEFAZ', {
                action: 'downloadDANFE',
                chave: chave
            });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                window.open(data.pdf_url, '_blank');
                toast.success("DANFE aberto!");
            }
        }
    });

    const uploadCertificadoMutation = useMutation({
        mutationFn: async () => {
            if (!certFile || !senhacert) {
                toast.error("Selecione um certificado e insira a senha");
                return;
            }

            const reader = new FileReader();
            return new Promise((resolve, reject) => {
                reader.onload = async () => {
                    const base64 = reader.result.split(',')[1];
                    try {
                        const res = await base44.functions.invoke('consultaSEFAZ', {
                            action: 'uploadCertificado',
                            certificado_base64: base64,
                            senha_cert: senhacert
                        });
                        resolve(res.data);
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
                reader.readAsDataURL(certFile);
            });
        },
        onSuccess: (data) => {
            if (data.success) {
                toast.success("Certificado importado com sucesso!");
                setShowCertDialog(false);
                setCertFile(null);
                setSenhacert("");
                queryClient.invalidateQueries({ queryKey: ["current-user"] });
            }
        },
        onError: (error) => {
            toast.error("Erro ao importar: " + error.message);
        }
    });

    const handleBuscar = () => {
        if (!chave) {
            toast.error("Digite uma chave de acesso");
            return;
        }
        
        // Validar primeiro
        validarChaveMutation.mutate(chave);
        
        // Depois buscar
        setTimeout(() => {
            if (validacaoChave?.valid) {
                buscarDFEMutation.mutate();
            }
        }, 500);
    };

    const formatarChave = (valor) => {
        // Remover não dígitos
        const apenas_numeros = valor.replace(/\D/g, '');
        // Limitar a 44 dígitos
        return apenas_numeros.slice(0, 44);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Consulta DFE SEFAZ</h1>
                            <p className="text-slate-500">Busque, baixe XML e DANFE</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowCertDialog(true)}
                        variant="outline"
                        className="border-indigo-500 text-indigo-600"
                    >
                        <Key className="w-4 h-4 mr-2" />
                        {currentUser?.certificado_digital_configurado ? "Certificado ✓" : "Importar Certificado"}
                    </Button>
                </div>

                {/* Status do Certificado */}
                {currentUser?.certificado_digital_configurado && (
                    <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                            Certificado digital configurado em {format(new Date(currentUser.certificado_data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Card de Busca */}
                <Card className="bg-white border-0 shadow-lg">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5 text-indigo-600" />
                            Buscar DFE
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm font-semibold mb-2 block">Chave de Acesso (44 dígitos)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ex: 35240100000000000000550010000000011234567890"
                                        value={chave}
                                        onChange={(e) => setChave(formatarChave(e.target.value))}
                                        className="font-mono text-sm"
                                        maxLength="44"
                                    />
                                    <Button
                                        onClick={handleBuscar}
                                        disabled={buscarDFEMutation.isPending || !chave}
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {buscarDFEMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Search className="w-4 h-4 mr-2" />
                                                Buscar
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Validação da Chave */}
                                {validacaoChave && (
                                    <div className={`mt-2 p-3 rounded-lg ${
                                        validacaoChave.valid 
                                            ? "bg-green-50 border border-green-200" 
                                            : "bg-red-50 border border-red-200"
                                    }`}>
                                        <div className="flex items-start gap-2">
                                            {validacaoChave.valid ? (
                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div>
                                                <p className={`font-semibold ${validacaoChave.valid ? "text-green-800" : "text-red-800"}`}>
                                                    {validacaoChave.message}
                                                </p>
                                                {validacaoChave.valid && validacaoChave.info && (
                                                    <p className="text-sm text-green-700 mt-1">
                                                        {validacaoChave.info.tipo} • {validacaoChave.info.data} • Série {validacaoChave.info.serie} • NF {validacaoChave.info.numero}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Resultado da Busca */}
                {resultadoBusca && resultadoBusca.dfe && (
                    <Card className="bg-white border-0 shadow-lg">
                        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    DFE Encontrado
                                </CardTitle>
                                <Badge className="bg-green-100 text-green-700">
                                    {resultadoBusca.dfe.status.toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Informações do DFE */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-600 font-semibold">Tipo</p>
                                    <p className="text-lg font-bold text-slate-800">{resultadoBusca.dfe.tipo}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-600 font-semibold">NF</p>
                                    <p className="text-lg font-bold text-slate-800">{resultadoBusca.dfe.numero_nf}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-600 font-semibold">Série</p>
                                    <p className="text-lg font-bold text-slate-800">{resultadoBusca.dfe.serie}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-600 font-semibold">Valor</p>
                                    <p className="text-lg font-bold text-slate-800">R$ {resultadoBusca.dfe.valor.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Chave em destaque */}
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs text-blue-600 font-semibold mb-2">CHAVE DE ACESSO</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 font-mono text-sm text-blue-900 break-all">
                                        {resultadoBusca.dfe.chave}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(resultadoBusca.dfe.chave);
                                            toast.success("Copiado!");
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Botões de Download */}
                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    onClick={() => downloadXMLMutation.mutate()}
                                    disabled={downloadXMLMutation.isPending}
                                    className="bg-amber-600 hover:bg-amber-700"
                                >
                                    {downloadXMLMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    Baixar XML
                                </Button>
                                <Button
                                    onClick={() => downloadDANFEMutation.mutate()}
                                    disabled={downloadDANFEMutation.isPending}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    {downloadDANFEMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    Baixar DANFE
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Guia de Uso */}
                <Card className="bg-blue-50 border border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-base">ℹ️ Como usar</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-700 space-y-2">
                        <p>1️⃣ Importe seu <strong>certificado digital A1</strong> clicando em "Importar Certificado"</p>
                        <p>2️⃣ Cole a <strong>chave de acesso de 44 dígitos</strong> do DFE</p>
                        <p>3️⃣ Clique em <strong>Buscar</strong> para validar e localizar o documento</p>
                        <p>4️⃣ Baixe o <strong>XML</strong> ou <strong>DANFE</strong> conforme necessário</p>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog de Certificado */}
            <Dialog open={showCertDialog} onOpenChange={setShowCertDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-indigo-600" />
                            Importar Certificado Digital
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Alert className="bg-blue-50 border-blue-200">
                            <AlertCircle className="w-4 h-4" />
                            <AlertDescription>
                                Use um certificado A1 (arquivo .p12 ou .pfx)
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label>Certificado (.p12 ou .pfx)</Label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition">
                                <input
                                    type="file"
                                    accept=".p12,.pfx,.pem"
                                    onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="cert-input"
                                />
                                <label htmlFor="cert-input" className="cursor-pointer block">
                                    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                    <p className="text-sm font-medium text-slate-700">
                                        {certFile ? certFile.name : "Clique para selecionar arquivo"}
                                    </p>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Senha do Certificado</Label>
                            <div className="relative">
                                <input
                                    type={mostrarSenha ? "text" : "password"}
                                    value={senhacert}
                                    onChange={(e) => setSenhacert(e.target.value)}
                                    placeholder="Digite a senha"
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarSenha(!mostrarSenha)}
                                    className="absolute right-3 top-2.5 text-slate-500"
                                >
                                    {mostrarSenha ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCertDialog(false);
                                    setCertFile(null);
                                    setSenhacert("");
                                }}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => uploadCertificadoMutation.mutate()}
                                disabled={!certFile || !senhacert || uploadCertificadoMutation.isPending}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            >
                                {uploadCertificadoMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                )}
                                Importar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}