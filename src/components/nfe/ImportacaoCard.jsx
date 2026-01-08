import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Printer, FileText, Clock, Package, ChevronDown, ChevronUp, Eye, Trash2, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function ImportacaoCard({ 
    importacao, 
    notas, 
    onDelete,
    onPrint 
}) {
    const [expanded, setExpanded] = useState(false);
    const [showPrintDialog, setShowPrintDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notasParaImprimir, setNotasParaImprimir] = useState([]);
    const [notasDaMascara, setNotasDaMascara] = useState([]);

    // Filtrar notas desta importação
    const notasDaImportacao = notas.filter(n => 
        importacao.notas_ids?.includes(n.id)
    );

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const getOrigemLabel = (origem) => {
        const labels = {
            arquivo: "Arquivo",
            colagem: "Colagem de Texto",
            audio: "Áudio",
            manual: "Manual"
        };
        return labels[origem] || origem;
    };

    const getOrigemColor = (origem) => {
        const colors = {
            arquivo: "bg-blue-100 text-blue-700",
            colagem: "bg-purple-100 text-purple-700",
            audio: "bg-red-100 text-red-700",
            manual: "bg-slate-100 text-slate-700"
        };
        return colors[origem] || "bg-slate-100 text-slate-700";
    };

    // Verificar máscara do dia e preparar impressão
    const handlePrepararImpressao = async () => {
        setLoading(true);
        try {
            // Buscar máscaras do dia atual
            const dataHoje = format(new Date(), "yyyy-MM-dd");
            const romaneios = await base44.entities.RomaneioGerado.filter({ data: dataHoje });
            
            // Coletar todas as notas que estão nas máscaras do dia
            const notasIdsDaMascara = new Set();
            romaneios.forEach(rom => {
                (rom.notas_ids || []).forEach(id => notasIdsDaMascara.add(id));
            });

            // Notas da importação atual
            const notasImportacao = [...notasDaImportacao];
            
            // Verificar quais notas da máscara não estão nesta importação
            const notasFaltantes = [];
            for (const notaId of notasIdsDaMascara) {
                if (!importacao.notas_ids?.includes(notaId)) {
                    // Buscar a nota no banco
                    const notaEncontrada = notas.find(n => n.id === notaId);
                    if (notaEncontrada) {
                        notasFaltantes.push(notaEncontrada);
                    }
                }
            }

            setNotasParaImprimir(notasImportacao);
            setNotasDaMascara(notasFaltantes);
            setShowPrintDialog(true);

            if (notasFaltantes.length > 0) {
                toast.info(`Encontradas ${notasFaltantes.length} nota(s) da máscara do dia que não estão nesta importação.`);
            }
        } catch (error) {
            console.error("Erro ao preparar impressão:", error);
            toast.error("Erro ao preparar impressão");
        }
        setLoading(false);
    };

    const toggleNotaMascara = (nota) => {
        const existe = notasParaImprimir.find(n => n.id === nota.id);
        if (existe) {
            setNotasParaImprimir(prev => prev.filter(n => n.id !== nota.id));
        } else {
            setNotasParaImprimir(prev => [...prev, nota]);
        }
    };

    const handleImprimir = () => {
        if (notasParaImprimir.length === 0) {
            toast.error("Selecione ao menos uma nota para imprimir");
            return;
        }

        // Gerar impressão no formato tabular
        const winPrint = window.open('', '_blank', 'width=1200,height=800');
        if (!winPrint) {
            alert("Por favor, permita pop-ups para imprimir.");
            return;
        }

        // Gerar linhas da tabela
        let rowsHtml = "";
        notasParaImprimir.forEach(nota => {
            rowsHtml += `
                <tr>
                    <td>${nota.numero_nf || "-"}</td>
                    <td>${nota.placa || "-"}</td>
                    <td>${nota.destinatario || "-"}</td>
                    <td>${nota.volume || "-"}</td>
                    <td>${nota.peso || "-"}</td>
                    <td>${nota.transportadora || "-"}</td>
                </tr>
            `;
        });

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Importação de Notas Fiscais</title>
                <style>
                    @media print {
                        @page { margin: 10mm; size: A4 landscape; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 20px;
                        background: white;
                    }
                    h1 {
                        text-align: center;
                        color: #1e3a8a;
                        margin-bottom: 10px;
                        font-size: 24px;
                    }
                    .info {
                        text-align: center;
                        color: #475569;
                        margin-bottom: 20px;
                        font-size: 12px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th { 
                        background: #3b82f6;
                        color: white;
                        padding: 6px 8px;
                        text-align: left;
                        font-size: 12px;
                        font-weight: 600;
                        border: 1px solid #2563eb;
                    }
                    td { 
                        padding: 4px 8px;
                        border: 1px solid #cbd5e1;
                        font-size: 11px;
                        background: white;
                        line-height: 1.3;
                    }
                    tr:nth-child(even) td {
                        background: #f8fafc;
                    }
                    tr:hover td {
                        background: #e0f2fe;
                    }
                    .footer {
                        margin-top: 30px;
                        text-align: center;
                        color: #64748b;
                        font-size: 11px;
                        padding-top: 20px;
                        border-top: 2px solid #e2e8f0;
                    }
                </style>
            </head>
            <body>
                <h1>Importação de Notas Fiscais</h1>
                <div class="info">
                    <p>Data: ${formatDateTime(importacao.data_importacao)} | Origem: ${getOrigemLabel(importacao.origem)} | Total: ${notasParaImprimir.length} nota(s)</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Nota Fiscal</th>
                            <th>PLACA</th>
                            <th>Nome do Cliente</th>
                            <th>Qtd. Volumes</th>
                            <th>Peso</th>
                            <th>Transportadora</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="footer">
                    <p>TWG Transportes - Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>
                </div>
            </body>
            </html>
        `);
        
        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
        setShowPrintDialog(false);
    };

    return (
        <>
            <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-l-indigo-500 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Package className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-800">
                                        Importação #{importacao.id?.slice(-6).toUpperCase()}
                                    </h3>
                                    <Badge className={getOrigemColor(importacao.origem)}>
                                        {getOrigemLabel(importacao.origem)}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDateTime(importacao.data_importacao)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {importacao.quantidade_notas} nota(s)
                                    </span>
                                    {importacao.nome_arquivo && (
                                        <span className="text-xs text-slate-400">
                                            {importacao.nome_arquivo}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrepararImpressao}
                                disabled={loading}
                                className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Printer className="w-4 h-4 mr-1" />
                                        Imprimir
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(importacao.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Lista de notas expandida */}
                    {expanded && (
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="text-sm font-medium text-slate-600 mb-2">Notas desta importação:</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                                {notasDaImportacao.map(nota => (
                                    <div 
                                        key={nota.id} 
                                        className="bg-white p-2 rounded-lg border text-xs"
                                    >
                                        <p className="font-bold text-blue-600">{nota.numero_nf}</p>
                                        <p className="text-slate-600 truncate" title={nota.destinatario}>
                                            {nota.destinatario}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de Opções de Impressão */}
            <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Printer className="w-5 h-5 text-indigo-600" />
                            Opções de Impressão
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Notas da Importação */}
                        <div>
                            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                Notas da Importação ({notasDaImportacao.length})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                                {notasDaImportacao.map(nota => {
                                    const selecionada = notasParaImprimir.some(n => n.id === nota.id);
                                    return (
                                        <div 
                                            key={nota.id}
                                            onClick={() => toggleNotaMascara(nota)}
                                            className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                                selecionada 
                                                    ? "bg-blue-50 border-blue-500" 
                                                    : "bg-white border-slate-200 hover:border-blue-300"
                                            }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <Checkbox checked={selecionada} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-blue-600 text-sm">{nota.numero_nf}</p>
                                                    <p className="text-xs text-slate-600 truncate">{nota.destinatario}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Notas da Máscara do Dia (faltantes) */}
                        {notasDaMascara.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    Notas da Máscara do Dia (não incluídas) - {notasDaMascara.length}
                                </h3>
                                <p className="text-sm text-amber-600 mb-2">
                                    Estas notas estão na máscara de romaneio do dia mas não foram incluídas nesta importação. 
                                    Selecione as que deseja adicionar à impressão.
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-amber-50 rounded-lg">
                                    {notasDaMascara.map(nota => {
                                        const selecionada = notasParaImprimir.some(n => n.id === nota.id);
                                        return (
                                            <div 
                                                key={nota.id}
                                                onClick={() => toggleNotaMascara(nota)}
                                                className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                                    selecionada 
                                                        ? "bg-amber-100 border-amber-500" 
                                                        : "bg-white border-amber-200 hover:border-amber-400"
                                                }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <Checkbox checked={selecionada} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-amber-700 text-sm">{nota.numero_nf}</p>
                                                        <p className="text-xs text-slate-600 truncate">{nota.destinatario}</p>
                                                        <p className="text-xs text-amber-600">{nota.transportadora}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Resumo e Botão de Impressão */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="text-sm text-slate-600">
                                <span className="font-semibold text-indigo-600">{notasParaImprimir.length}</span> nota(s) selecionada(s) para impressão
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={handleImprimir}
                                    disabled={notasParaImprimir.length === 0}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir ({notasParaImprimir.length})
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}