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
    notasSelecionadas = [],
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

            // Adicionar notas selecionadas na busca que não estão na importação
            const notasSelecionadasNaBusca = [];
            if (notasSelecionadas && notasSelecionadas.length > 0) {
                for (const notaId of notasSelecionadas) {
                    if (!importacao.notas_ids?.includes(notaId)) {
                        const notaEncontrada = notas.find(n => n.id === notaId);
                        if (notaEncontrada && !notasFaltantes.find(n => n.id === notaId)) {
                            notasSelecionadasNaBusca.push(notaEncontrada);
                        }
                    }
                }
            }

            setNotasParaImprimir(notasImportacao);
            setNotasDaMascara([...notasFaltantes, ...notasSelecionadasNaBusca]);
            setShowPrintDialog(true);

            let mensagens = [];
            if (notasFaltantes.length > 0) {
                mensagens.push(`${notasFaltantes.length} nota(s) da máscara do dia`);
            }
            if (notasSelecionadasNaBusca.length > 0) {
                mensagens.push(`${notasSelecionadasNaBusca.length} nota(s) selecionadas na busca`);
            }
            if (mensagens.length > 0) {
                toast.info(`Encontradas ${mensagens.join(" e ")} que não estão nesta importação.`);
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

        // Calcular resumo por placa (apenas notas com placa definida)
        const resumoPorPlaca = {};
        notasParaImprimir.forEach(nota => {
            const placa = nota.placa || "";
            // Ignorar notas sem placa
            if (!placa) return;

            if (!resumoPorPlaca[placa]) {
                resumoPorPlaca[placa] = {
                    totalNotas: 0,
                    transportadoras: new Set(),
                    pesoTotal: 0,
                    volumeTotal: 0
                };
            }
            resumoPorPlaca[placa].totalNotas++;
            if (nota.transportadora) {
                resumoPorPlaca[placa].transportadoras.add(nota.transportadora.trim().toUpperCase());
            }
            // Peso
            const pesoStr = nota.peso || "";
            const pesoNum = parseFloat(pesoStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
            resumoPorPlaca[placa].pesoTotal += pesoNum;
            // Volume
            const volStr = nota.volume || "";
            const volNum = parseFloat(volStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
            resumoPorPlaca[placa].volumeTotal += volNum;
        });

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

        // Calcular totais gerais
        let pesoTotalGeral = 0;
        let volumeTotalGeral = 0;
        let totalNotasGeral = 0;
        let totalEntregasGeral = 0;

        Object.values(resumoPorPlaca).forEach(dados => {
            pesoTotalGeral += dados.pesoTotal;
            volumeTotalGeral += dados.volumeTotal;
            totalNotasGeral += dados.totalNotas;
            totalEntregasGeral += (dados.transportadoras.size || dados.totalNotas);
        });

        // Gerar HTML do resumo (apenas se houver placas)
        let resumoHtml = '';
        if (Object.keys(resumoPorPlaca).length > 0) {
            resumoHtml = '<div class="resumo"><h3>RESUMO POR PLACA</h3>';
            Object.entries(resumoPorPlaca).forEach(([placa, dados]) => {
                resumoHtml += `
                    <div class="resumo-placa">
                        <h4>PLACA: ${placa}</h4>
                        <div class="resumo-item"><strong>Notas:</strong> ${dados.totalNotas}</div>
                        <div class="resumo-item"><strong>Entregas:</strong> ${dados.transportadoras.size || dados.totalNotas}</div>
                        <div class="resumo-item"><strong>Peso:</strong> ${dados.pesoTotal.toFixed(2)} kg</div>
                        <div class="resumo-item"><strong>Volume:</strong> ${dados.volumeTotal}</div>
                    </div>
                `;
            });
            
            // Adicionar totais gerais
            resumoHtml += `
                <div class="resumo-total">
                    <h4>TOTAL GERAL</h4>
                    <div class="resumo-item"><strong>Total de Notas:</strong> ${totalNotasGeral}</div>
                    <div class="resumo-item"><strong>Total de Entregas:</strong> ${totalEntregasGeral}</div>
                    <div class="resumo-item"><strong>Peso Total:</strong> ${pesoTotalGeral.toFixed(2)} kg</div>
                    <div class="resumo-item"><strong>Volume Total:</strong> ${volumeTotalGeral}</div>
                </div>
            `;
            
            resumoHtml += '</div>';
        }

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
                        margin-bottom: 5px;
                        font-size: 24px;
                    }
                    .info {
                        text-align: center;
                        color: #475569;
                        margin-bottom: 10px;
                        font-size: 9px;
                    }
                    .date-info {
                        text-align: center;
                        color: #1e3a8a;
                        margin-bottom: 10px;
                        font-size: 12px;
                        font-weight: bold;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th { 
                        background: #3b82f6;
                        color: white;
                        padding: 3px 4px;
                        text-align: left;
                        font-size: 9px;
                        font-weight: 600;
                        border: 1px solid #2563eb;
                    }
                    th:nth-child(1) { width: 10%; } /* Nota Fiscal */
                    th:nth-child(2) { width: 10%; } /* PLACA */
                    th:nth-child(3) { width: 40%; } /* Nome do Cliente */
                    th:nth-child(4) { width: 10%; } /* Qtd. Volumes */
                    th:nth-child(5) { width: 10%; } /* Peso */
                    th:nth-child(6) { width: 20%; } /* Transportadora */
                    td { 
                        padding: 2px 4px;
                        border: 1px solid #cbd5e1;
                        font-size: 8px;
                        background: white;
                        line-height: 1.1;
                    }
                    tr:nth-child(even) td {
                        background: #f8fafc;
                    }
                    tr:hover td {
                        background: #e0f2fe;
                    }
                    .footer {
                        margin-top: 10px;
                        text-align: center;
                        color: #64748b;
                        font-size: 9px;
                        padding-top: 8px;
                        border-top: 1px solid #e2e8f0;
                    }
                    .resumo {
                        margin-top: 15px;
                        padding: 10px;
                        border: 2px solid #2563eb;
                        background: #eff6ff;
                    }
                    .resumo h3 {
                        color: #1e3a8a;
                        font-size: 14px;
                        margin-bottom: 8px;
                        font-weight: bold;
                    }
                    .resumo-placa {
                        background: white;
                        padding: 8px;
                        margin-bottom: 6px;
                        border-left: 4px solid #3b82f6;
                    }
                    .resumo-placa h4 {
                        color: #1e40af;
                        font-size: 12px;
                        margin-bottom: 4px;
                        font-weight: bold;
                    }
                    .resumo-item {
                        font-size: 10px;
                        color: #334155;
                        margin: 2px 0;
                    }
                    .resumo-total {
                        background: #dbeafe;
                        padding: 8px;
                        margin-top: 10px;
                        border-left: 4px solid #1e40af;
                        border-radius: 4px;
                    }
                    .resumo-total h4 {
                        color: #1e40af;
                        font-size: 13px;
                        margin-bottom: 4px;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <h1>Relatório Diário</h1>
                <div class="date-info">
                    <p>${format(new Date(importacao.data_importacao), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div class="info">
                    <p>Origem: ${getOrigemLabel(importacao.origem)} | Total: ${notasParaImprimir.length} nota(s)</p>
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

                    ${resumoHtml}

                    <div class="footer">
                    <p>TWG Transportes</p>
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