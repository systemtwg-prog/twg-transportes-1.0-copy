import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Printer, ClipboardPaste, FileText, Calendar, 
    Check, X, AlertTriangle, Plus, Search, Trash2,
    Download, CheckCircle, XCircle, Building2, FileSpreadsheet
} from "lucide-react";
import ImportadorRelatorio from "@/components/relatorio/ImportadorRelatorio";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ImpressaoRelatorio() {
    const [dataSelecionada, setDataSelecionada] = useState(format(new Date(), "yyyy-MM-dd"));
    const [showColar, setShowColar] = useState(false);
    const [textoColar, setTextoColar] = useState("");
    const [processandoColar, setProcessandoColar] = useState(false);
    const [notasAdicionadas, setNotasAdicionadas] = useState([]);
    const [showImportar, setShowImportar] = useState(false);
    const [notasSelecionadasImportar, setNotasSelecionadasImportar] = useState([]);
    const [notaManual, setNotaManual] = useState({ numero_nf: "", destinatario: "", transportadora: "" });
    const [showAddManual, setShowAddManual] = useState(false);
    const [showImportadorArquivo, setShowImportadorArquivo] = useState(false);
    const queryClient = useQueryClient();

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });
    const config = configs[0] || {};

    const { data: romaneiosGerados = [] } = useQuery({
        queryKey: ["romaneios-gerados-relatorio", dataSelecionada],
        queryFn: () => base44.entities.RomaneioGerado.filter({ data: dataSelecionada })
    });

    const { data: notasFiscais = [] } = useQuery({
        queryKey: ["notas-fiscais-relatorio"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date", 500)
    });

    // Notas dos romaneios da data
    const notasDoRomaneio = useMemo(() => {
        const idsNotas = [];
        romaneiosGerados.forEach(r => {
            if (r.notas_ids) {
                idsNotas.push(...r.notas_ids);
            }
        });
        return notasFiscais.filter(n => idsNotas.includes(n.id));
    }, [romaneiosGerados, notasFiscais]);

    // Verificar quais notas adicionadas estão no romaneio
    const verificarNotas = useMemo(() => {
        return notasAdicionadas.map(nota => {
            const encontrada = notasDoRomaneio.find(n => 
                n.numero_nf === nota.numero_nf || 
                n.numero_nf?.includes(nota.numero_nf) ||
                nota.numero_nf?.includes(n.numero_nf)
            );
            return {
                ...nota,
                encontrada: !!encontrada,
                notaRomaneio: encontrada
            };
        });
    }, [notasAdicionadas, notasDoRomaneio]);

    const notasEncontradas = verificarNotas.filter(n => n.encontrada);
    const notasFaltantes = verificarNotas.filter(n => !n.encontrada);

    const handleColar = async () => {
        if (!textoColar.trim()) {
            toast.error("Cole o texto com as notas fiscais");
            return;
        }

        setProcessandoColar(true);

        try {
            const resultado = await base44.integrations.Core.InvokeLLM({
                prompt: `Extraia os números de notas fiscais e informações do texto abaixo.
Para cada nota, extraia: número da NF, destinatário/cliente, transportadora (se houver).

Texto:
${textoColar}

Retorne todas as notas encontradas.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        notas: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    numero_nf: { type: "string" },
                                    destinatario: { type: "string" },
                                    transportadora: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            if (resultado?.notas?.length > 0) {
                const novasNotas = resultado.notas.map((n, idx) => ({
                    id: `colado_${Date.now()}_${idx}`,
                    ...n
                }));
                setNotasAdicionadas(prev => [...prev, ...novasNotas]);
                toast.success(`${resultado.notas.length} nota(s) extraída(s)`);
                setShowColar(false);
                setTextoColar("");
            } else {
                toast.error("Nenhuma nota encontrada no texto");
            }
        } catch (error) {
            console.error("Erro ao processar:", error);
            toast.error("Erro ao processar o texto");
        }

        setProcessandoColar(false);
    };

    const handleAddManual = () => {
        if (!notaManual.numero_nf) {
            toast.error("Informe o número da NF");
            return;
        }

        setNotasAdicionadas(prev => [...prev, {
            id: `manual_${Date.now()}`,
            ...notaManual
        }]);
        setNotaManual({ numero_nf: "", destinatario: "", transportadora: "" });
        setShowAddManual(false);
        toast.success("Nota adicionada");
    };

    const handleImportarNotas = () => {
        const notasSelecionadas = notasFiscais.filter(n => notasSelecionadasImportar.includes(n.id));
        const novasNotas = notasSelecionadas.map(n => ({
            id: `importado_${n.id}`,
            numero_nf: n.numero_nf,
            destinatario: n.destinatario,
            transportadora: n.transportadora
        }));
        setNotasAdicionadas(prev => [...prev, ...novasNotas]);
        setShowImportar(false);
        setNotasSelecionadasImportar([]);
        toast.success(`${novasNotas.length} nota(s) importada(s)`);
    };

    const removerNota = (id) => {
        setNotasAdicionadas(prev => prev.filter(n => n.id !== id));
    };

    const limparTodas = () => {
        setNotasAdicionadas([]);
        toast.success("Lista limpa");
    };

    const handleImprimir = () => {
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        // Agrupar por transportadora
        const agrupadas = {};
        verificarNotas.forEach(nota => {
            const transp = nota.transportadora || "SEM TRANSPORTADORA";
            if (!agrupadas[transp]) agrupadas[transp] = [];
            agrupadas[transp].push(nota);
        });

        const notasHtml = Object.entries(agrupadas).map(([transportadora, notas]) => `
            <div style="margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                <div style="background: #eff6ff; padding: 8px 12px; border-bottom: 1px solid #dbeafe;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; color: #1e40af; font-size: 13px;">${transportadora}</span>
                        <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 10px; font-size: 11px;">${notas.length} nota(s)</span>
                    </div>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                        <tr style="background: #f8fafc;">
                            <th style="padding: 6px; text-align: left; border-bottom: 1px solid #e2e8f0;">NF</th>
                            <th style="padding: 6px; text-align: left; border-bottom: 1px solid #e2e8f0;">Destinatário</th>
                            <th style="padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${notas.map(nota => `
                            <tr>
                                <td style="padding: 6px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #2563eb;">${nota.numero_nf || '-'}</td>
                                <td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${nota.destinatario || '-'}</td>
                                <td style="padding: 6px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                                    ${nota.encontrada 
                                        ? '<span style="color: #16a34a; font-weight: bold;">✓ No Romaneio</span>' 
                                        : '<span style="color: #dc2626; font-weight: bold;">✗ Faltante</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('');

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Notas - ${format(new Date(dataSelecionada), "dd/MM/yyyy")}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; padding: 15px; color: #1e293b; }
                    .header { display: flex; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 15px; }
                    .logo { width: 80px; margin-right: 15px; }
                    .logo img { max-width: 100%; max-height: 60px; object-fit: contain; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 16px; font-weight: bold; color: #1e293b; }
                    .company-details { font-size: 10px; color: #64748b; }
                    .title { text-align: center; font-size: 14px; font-weight: bold; color: #1e40af; margin: 10px 0; padding: 8px; background: #eff6ff; border-radius: 6px; }
                    .summary { display: flex; justify-content: center; gap: 20px; background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 11px; }
                    .summary-item { text-align: center; padding: 5px 15px; }
                    .summary-label { color: #64748b; text-transform: uppercase; font-size: 9px; }
                    .summary-value { font-size: 16px; font-weight: bold; }
                    .summary-ok { color: #16a34a; }
                    .summary-error { color: #dc2626; }
                    .footer { margin-top: 15px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
                    @media print { body { padding: 10px; } @page { margin: 10mm; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        ${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : ''}
                    </div>
                    <div class="company-info">
                        <p class="company-name">${config.nome_empresa || 'TWG TRANSPORTES'}</p>
                        <p class="company-details">${config.endereco || ''}</p>
                        <p class="company-details">${config.cnpj ? 'CNPJ: ' + config.cnpj : ''} ${config.telefone ? ' | ' + config.telefone : ''}</p>
                    </div>
                </div>

                <div class="title">RELATÓRIO DE CONFERÊNCIA - ${format(new Date(dataSelecionada), "dd/MM/yyyy")}</div>

                <div class="summary">
                    <div class="summary-item">
                        <div class="summary-label">Total Notas</div>
                        <div class="summary-value" style="color: #1e40af;">${verificarNotas.length}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">No Romaneio</div>
                        <div class="summary-value summary-ok">${notasEncontradas.length}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Faltantes</div>
                        <div class="summary-value summary-error">${notasFaltantes.length}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Romaneios</div>
                        <div class="summary-value" style="color: #1e40af;">${romaneiosGerados.length}</div>
                    </div>
                </div>

                ${notasHtml}

                <div class="footer">
                    Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
            </body>
            </html>
        `);

        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                            <Printer className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Impressão de Relatório</h1>
                            <p className="text-slate-500">Conferência de notas x romaneios</p>
                        </div>
                    </div>
                </div>

                {/* Filtros e Ações */}
                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-2">
                                <Label>Data do Romaneio</Label>
                                <Input
                                    type="date"
                                    value={dataSelecionada}
                                    onChange={(e) => setDataSelecionada(e.target.value)}
                                    className="w-44"
                                />
                            </div>
                            <Button 
                                onClick={() => setShowColar(true)}
                                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                            >
                                <ClipboardPaste className="w-4 h-4 mr-2" />
                                Colar Notas
                            </Button>
                            <Button 
                                onClick={() => setShowAddManual(true)}
                                variant="outline"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Manual
                            </Button>
                            <Button 
                                onClick={() => setShowImportar(true)}
                                variant="outline"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Importar NFs
                            </Button>
                            <Button 
                                onClick={() => setShowImportadorArquivo(true)}
                                variant="outline"
                                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                            >
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Importar Arquivo
                            </Button>
                            {notasAdicionadas.length > 0 && (
                                <Button 
                                    onClick={limparTodas}
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Limpar
                                </Button>
                            )}
                        </div>

                        {/* Info Romaneios */}
                        <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                            <p className="text-sm text-indigo-700">
                                <strong>{romaneiosGerados.length}</strong> romaneio(s) encontrado(s) para {format(new Date(dataSelecionada), "dd/MM/yyyy")} 
                                {" "}com <strong>{notasDoRomaneio.length}</strong> nota(s)
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Resumo */}
                {notasAdicionadas.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-white border-0 shadow-lg">
                            <CardContent className="p-4 text-center">
                                <p className="text-sm text-slate-500">Total de Notas</p>
                                <p className="text-3xl font-bold text-indigo-600">{verificarNotas.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg">
                            <CardContent className="p-4 text-center">
                                <p className="text-sm text-green-600">No Romaneio</p>
                                <p className="text-3xl font-bold text-green-600">{notasEncontradas.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-0 shadow-lg">
                            <CardContent className="p-4 text-center">
                                <p className="text-sm text-red-600">Faltantes</p>
                                <p className="text-3xl font-bold text-red-600">{notasFaltantes.length}</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Lista de Notas */}
                {notasAdicionadas.length > 0 && (
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="w-5 h-5 text-indigo-600" />
                                Notas para Conferência ({verificarNotas.length})
                            </CardTitle>
                            <Button 
                                onClick={handleImprimir}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Imprimir Relatório
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>NF</TableHead>
                                        <TableHead>Destinatário</TableHead>
                                        <TableHead>Transportadora</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {verificarNotas.map((nota) => (
                                        <TableRow key={nota.id} className={nota.encontrada ? "bg-green-50/50" : "bg-red-50/50"}>
                                            <TableCell className="font-bold">{nota.numero_nf}</TableCell>
                                            <TableCell>{nota.destinatario || "-"}</TableCell>
                                            <TableCell>{nota.transportadora || "-"}</TableCell>
                                            <TableCell className="text-center">
                                                {nota.encontrada ? (
                                                    <Badge className="bg-green-100 text-green-700">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        No Romaneio
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-red-100 text-red-700">
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Faltante
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removerNota(nota.id)}
                                                    className="text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Empty State */}
                {notasAdicionadas.length === 0 && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardContent className="p-12 text-center">
                            <ClipboardPaste className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">
                                Nenhuma nota adicionada
                            </h3>
                            <p className="text-slate-500 mb-4">
                                Cole texto com notas fiscais ou importe do cadastro
                            </p>
                            <div className="flex justify-center gap-3">
                                <Button onClick={() => setShowColar(true)} className="bg-indigo-600 hover:bg-indigo-700">
                                    <ClipboardPaste className="w-4 h-4 mr-2" />
                                    Colar Notas
                                </Button>
                                <Button onClick={() => setShowImportar(true)} variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Importar NFs
                                </Button>
                                <Button 
                                    onClick={() => setShowImportadorArquivo(true)} 
                                    variant="outline"
                                    className="border-emerald-500 text-emerald-600"
                                >
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                    Importar Arquivo
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Dialog Colar */}
            <Dialog open={showColar} onOpenChange={setShowColar}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardPaste className="w-5 h-5 text-indigo-600" />
                            Colar Notas Fiscais
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Cole o texto contendo as notas fiscais. O sistema irá extrair automaticamente os números.
                        </p>
                        <Textarea
                            value={textoColar}
                            onChange={(e) => setTextoColar(e.target.value)}
                            placeholder="Cole aqui o texto com as notas fiscais..."
                            rows={8}
                        />
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowColar(false)} className="flex-1">
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleColar}
                                disabled={processandoColar || !textoColar.trim()}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            >
                                {processandoColar ? "Processando..." : "Extrair Notas"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Adicionar Manual */}
            <Dialog open={showAddManual} onOpenChange={setShowAddManual}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-indigo-600" />
                            Adicionar Nota Manual
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Número da NF *</Label>
                            <Input
                                value={notaManual.numero_nf}
                                onChange={(e) => setNotaManual({ ...notaManual, numero_nf: e.target.value })}
                                placeholder="Ex: 123456"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Destinatário</Label>
                            <Input
                                value={notaManual.destinatario}
                                onChange={(e) => setNotaManual({ ...notaManual, destinatario: e.target.value })}
                                placeholder="Nome do destinatário"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Transportadora</Label>
                            <Input
                                value={notaManual.transportadora}
                                onChange={(e) => setNotaManual({ ...notaManual, transportadora: e.target.value })}
                                placeholder="Nome da transportadora"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowAddManual(false)} className="flex-1">
                                Cancelar
                            </Button>
                            <Button onClick={handleAddManual} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                                Adicionar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Importador de Arquivos */}
            <ImportadorRelatorio 
                open={showImportadorArquivo} 
                onClose={() => setShowImportadorArquivo(false)}
                onImportSuccess={(notas) => {
                    setNotasAdicionadas(prev => [...prev, ...notas]);
                }}
            />

            {/* Dialog Importar */}
            <Dialog open={showImportar} onOpenChange={setShowImportar}>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Download className="w-5 h-5 text-indigo-600" />
                            Importar Notas Fiscais
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Selecione as notas fiscais para importar do cadastro.
                        </p>
                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 sticky top-0">
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>NF</TableHead>
                                        <TableHead>Destinatário</TableHead>
                                        <TableHead>Transportadora</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {notasFiscais.slice(0, 100).map((nota) => (
                                        <TableRow 
                                            key={nota.id}
                                            className={`cursor-pointer hover:bg-slate-50 ${notasSelecionadasImportar.includes(nota.id) ? "bg-indigo-50" : ""}`}
                                            onClick={() => {
                                                setNotasSelecionadasImportar(prev => 
                                                    prev.includes(nota.id) 
                                                        ? prev.filter(id => id !== nota.id)
                                                        : [...prev, nota.id]
                                                );
                                            }}
                                        >
                                            <TableCell>
                                                <Checkbox checked={notasSelecionadasImportar.includes(nota.id)} />
                                            </TableCell>
                                            <TableCell className="font-bold">{nota.numero_nf}</TableCell>
                                            <TableCell>{nota.destinatario || "-"}</TableCell>
                                            <TableCell>{nota.transportadora || "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">
                                {notasSelecionadasImportar.length} nota(s) selecionada(s)
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setShowImportar(false)}>
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={handleImportarNotas}
                                    disabled={notasSelecionadasImportar.length === 0}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Importar ({notasSelecionadasImportar.length})
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}