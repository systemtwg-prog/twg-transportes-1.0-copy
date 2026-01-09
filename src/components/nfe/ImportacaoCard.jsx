import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
    Printer, FileText, Clock, Package, ChevronDown, ChevronUp, Eye, Trash2, Loader2, Save, RotateCcw, Settings
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
    const [showConfigDialog, setShowConfigDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notasParaImprimir, setNotasParaImprimir] = useState([]);
    const [notasDaMascara, setNotasDaMascara] = useState([]);
    
    // Carregar configurações salvas do localStorage
    const [printConfig, setPrintConfig] = useState(() => {
        const saved = localStorage.getItem("importacaoPrintConfig");
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return {
                    colNF: 10,
                    colPlaca: 10,
                    colCliente: 40,
                    colVolume: 10,
                    colPeso: 10,
                    colTransp: 20,
                    fontSize: 8,
                    orientation: "portrait",
                    marginTop: 10,
                    marginBottom: 10,
                    marginLeft: 10,
                    marginRight: 10
                };
            }
        }
        return {
            colNF: 10,
            colPlaca: 10,
            colCliente: 40,
            colVolume: 10,
            colPeso: 10,
            colTransp: 20,
            fontSize: 8,
            orientation: "portrait",
            marginTop: 10,
            marginBottom: 10,
            marginLeft: 10,
            marginRight: 10,
            resumoFontSize: 10,
            resumoGap: 8,
            resumoLineSpacing: 3,
            resumoTotalSpacing: 10
        };
    });

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

    // Abrir configurações de impressão
    const handleAbrirConfigImpressao = async () => {
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
            setShowConfigDialog(true);

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

    const handleAbrirConfigFinal = () => {
        if (notasParaImprimir.length === 0) {
            toast.error("Selecione ao menos uma nota para imprimir");
            return;
        }
        setShowPrintDialog(false);
        setShowConfigDialog(true);
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

        // Calcular resumo por placa (ignorar notas sem placa)
        const resumoPorPlaca = {};
        notasParaImprimir.forEach(nota => {
            if (!nota.placa) return; // Ignorar notas sem placa

            const placa = nota.placa;

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

        // Gerar linhas da tabela (incluir todas, placa em branco se não tiver)
        let rowsHtml = "";
        let placaAnterior = null;
        notasParaImprimir.forEach(nota => {
            const placaDisplay = nota.placa || "";
            const placaMudou = placaAnterior !== null && placaAnterior !== nota.placa;
            placaAnterior = nota.placa;
            
            // Adicionar triângulo quando a placa muda
            const indicadorPlaca = placaMudou && placaDisplay ? '▲ ' : '';
            
            rowsHtml += `
                <tr>
                    <td>${nota.numero_nf || "-"}</td>
                    <td class="${nota.placa ? 'placa-cell' : ''}">${indicadorPlaca}${placaDisplay}</td>
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

        // Gerar HTML do resumo (apenas notas com placa)
        let resumoHtml = '';

        if (Object.keys(resumoPorPlaca).length > 0) {
            resumoHtml = '<div class="resumo"><h3>RESUMO - NOTAS COM PLACA</h3>';

            // Agrupar por placa
            resumoHtml += '<div class="resumo-section"><h4 class="resumo-section-title">Por Placa:</h4><div class="resumo-grid">';

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

            resumoHtml += '</div></div>';

            // Agrupar por filial (apenas notas com placa)
            const resumoPorFilial = {};
            notasParaImprimir.forEach(nota => {
                if (!nota.placa || !nota.filial) return;
                const filial = nota.filial;
                const placa = nota.placa;

                if (!resumoPorFilial[placa]) {
                    resumoPorFilial[placa] = {};
                }
                if (!resumoPorFilial[placa][filial]) {
                    resumoPorFilial[placa][filial] = 0;
                }
                resumoPorFilial[placa][filial]++;
            });

            if (Object.keys(resumoPorFilial).length > 0) {
                resumoHtml += '<div class="resumo-section"><h4 class="resumo-section-title">Por Filial e Placa:</h4><div class="resumo-grid">';

                Object.entries(resumoPorFilial).forEach(([placa, filiais]) => {
                    const totalNotasPlaca = Object.values(filiais).reduce((a, b) => a + b, 0);
                    resumoHtml += `
                        <div class="resumo-filial">
                            <h4>PLACA: ${placa}</h4>
                            ${Object.entries(filiais).map(([filial, qtd]) => 
                                `<div class="resumo-item"><strong>${filial}:</strong> ${qtd} nota(s)</div>`
                            ).join('')}
                            <div class="resumo-item" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #ddd;"><strong>Total:</strong> ${totalNotasPlaca} nota(s)</div>
                        </div>
                    `;
                });

                resumoHtml += '</div></div>';
            }

            // Agrupar por filial e placa (apenas notas com placa)
            const resumoPorFilial = {};
            notasParaImprimir.forEach(nota => {
                if (!nota.placa || !nota.filial) return;
                const filial = nota.filial;
                const placa = nota.placa;

                if (!resumoPorFilial[placa]) {
                    resumoPorFilial[placa] = {};
                }
                if (!resumoPorFilial[placa][filial]) {
                    resumoPorFilial[placa][filial] = 0;
                }
                resumoPorFilial[placa][filial]++;
            });

            // Agrupar por transportadora (apenas notas com placa)
            const resumoPorTransp = {};
            notasParaImprimir.forEach(nota => {
                if (!nota.placa) return;
                const transp = nota.transportadora?.trim().toUpperCase() || "SEM TRANSPORTADORA";
                if (!resumoPorTransp[transp]) {
                    resumoPorTransp[transp] = {
                        totalNotas: 0,
                        pesoTotal: 0,
                        volumeTotal: 0
                    };
                }
                resumoPorTransp[transp].totalNotas++;
                const pesoNum = parseFloat((nota.peso || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
                resumoPorTransp[transp].pesoTotal += pesoNum;
                const volNum = parseFloat((nota.volume || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
                resumoPorTransp[transp].volumeTotal += volNum;
            });

            if (Object.keys(resumoPorTransp).length > 0) {
                resumoHtml += '<div class="resumo-section"><h4 class="resumo-section-title">Por Transportadora:</h4><div class="resumo-grid">';

                Object.entries(resumoPorTransp)
                    .sort((a, b) => b[1].totalNotas - a[1].totalNotas)
                    .forEach(([transp, dados]) => {
                        resumoHtml += `
                            <div class="resumo-transp">
                                <h4>${transp}</h4>
                                <div class="resumo-item"><strong>Notas:</strong> ${dados.totalNotas}</div>
                                <div class="resumo-item"><strong>Peso:</strong> ${dados.pesoTotal.toFixed(2)} kg</div>
                                <div class="resumo-item"><strong>Volume:</strong> ${dados.volumeTotal}</div>
                            </div>
                        `;
                    });

                resumoHtml += '</div></div>';
            }

            // Totais consolidados
            resumoHtml += `
                <div class="resumo-total">
                    <h4>TOTAL CONSOLIDADO (COM PLACA)</h4>
                    <div class="resumo-grid-total">
                        <div class="resumo-item"><strong>Total de Notas:</strong> ${totalNotasGeral}</div>
                        <div class="resumo-item"><strong>Total de Entregas:</strong> ${totalEntregasGeral}</div>
                        <div class="resumo-item"><strong>Peso Total:</strong> ${pesoTotalGeral.toFixed(2)} kg</div>
                        <div class="resumo-item"><strong>Volume Total:</strong> ${volumeTotalGeral}</div>
                    </div>
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
                        @page { margin: 10mm; size: A4 ${printConfig.orientation}; }
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
                    th:nth-child(1) { width: ${printConfig.colNF}%; }
                    th:nth-child(2) { width: ${printConfig.colPlaca}%; }
                    th:nth-child(3) { width: ${printConfig.colCliente}%; }
                    th:nth-child(4) { width: ${printConfig.colVolume}%; }
                    th:nth-child(5) { width: ${printConfig.colPeso}%; }
                    th:nth-child(6) { width: ${printConfig.colTransp}%; }
                    td { 
                        padding: 2px 4px;
                        border: 1px solid #cbd5e1;
                        font-size: ${printConfig.fontSize}px;
                        background: white;
                        line-height: 1.1;
                    }
                    td.placa-cell {
                        font-weight: bold;
                        color: #059669;
                        background: #d1fae5 !important;
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
                        padding: 12px;
                        border: 2px solid #2563eb;
                        background: #eff6ff;
                        page-break-inside: avoid;
                    }
                    .resumo h3 {
                        color: #1e3a8a;
                        font-size: 14px;
                        margin-bottom: 10px;
                        font-weight: bold;
                        text-align: center;
                        border-bottom: 2px solid #2563eb;
                        padding-bottom: 6px;
                    }
                    .resumo-section {
                        margin-bottom: ${printConfig.resumoTotalSpacing}px;
                    }
                    .resumo-section-title {
                        color: #1e40af;
                        font-size: ${printConfig.resumoFontSize + 2}px;
                        font-weight: bold;
                        margin-bottom: 6px;
                        padding-bottom: 3px;
                        border-bottom: 1px solid #60a5fa;
                    }
                    .resumo-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                        gap: ${printConfig.resumoGap}px;
                        margin-bottom: ${printConfig.resumoGap}px;
                    }
                    .resumo-placa {
                        background: white;
                        padding: 10px;
                        border-left: 4px solid #059669;
                        border-radius: 4px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .resumo-placa h4 {
                        color: #047857;
                        font-size: ${printConfig.resumoFontSize + 2}px;
                        margin-bottom: 6px;
                        font-weight: bold;
                        text-align: center;
                        background: #d1fae5;
                        padding: 4px;
                        border-radius: 3px;
                    }
                    .resumo-transp {
                        background: white;
                        padding: 10px;
                        border-left: 4px solid #7c3aed;
                        border-radius: 4px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .resumo-transp h4 {
                        color: #6d28d9;
                        font-size: ${printConfig.resumoFontSize + 1}px;
                        margin-bottom: 6px;
                        font-weight: bold;
                        text-align: center;
                        background: #ede9fe;
                        padding: 4px;
                        border-radius: 3px;
                    }
                    .resumo-filial {
                        background: white;
                        padding: 10px;
                        border-left: 4px solid #0284c7;
                        border-radius: 4px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .resumo-filial h4 {
                        color: #0369a1;
                        font-size: ${printConfig.resumoFontSize + 2}px;
                        margin-bottom: 6px;
                        font-weight: bold;
                        text-align: center;
                        background: #e0f2fe;
                        padding: 4px;
                        border-radius: 3px;
                    }
                    .resumo-filial {
                        background: white;
                        padding: 10px;
                        border-left: 4px solid #0284c7;
                        border-radius: 4px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .resumo-filial h4 {
                        color: #0369a1;
                        font-size: ${printConfig.resumoFontSize + 2}px;
                        margin-bottom: 6px;
                        font-weight: bold;
                        text-align: center;
                        background: #e0f2fe;
                        padding: 4px;
                        border-radius: 3px;
                    }
                    .resumo-item {
                        font-size: ${printConfig.resumoFontSize}px;
                        color: #334155;
                        margin: ${printConfig.resumoLineSpacing}px 0;
                        display: flex;
                        justify-content: space-between;
                    }
                    .resumo-total {
                        background: #1e40af;
                        color: white;
                        padding: 12px;
                        margin-top: 10px;
                        border-radius: 6px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    .resumo-total h4 {
                        color: white;
                        font-size: ${printConfig.resumoFontSize + 4}px;
                        margin-bottom: 8px;
                        font-weight: bold;
                        text-align: center;
                        border-bottom: 2px solid rgba(255,255,255,0.3);
                        padding-bottom: 6px;
                    }
                    .resumo-grid-total {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: ${printConfig.resumoGap}px;
                    }
                    .resumo-total .resumo-item {
                        color: white;
                        font-size: ${printConfig.resumoFontSize + 1}px;
                        background: rgba(255,255,255,0.1);
                        padding: 6px;
                        border-radius: 4px;
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
                            <th>Placa</th>
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
        setShowConfigDialog(false);
    };

    const totalColunas = printConfig.colNF + printConfig.colPlaca + printConfig.colCliente + 
                         printConfig.colVolume + printConfig.colPeso + printConfig.colTransp;

    // Salvar configurações no localStorage
    const handleSalvarConfig = () => {
        localStorage.setItem("importacaoPrintConfig", JSON.stringify(printConfig));
        toast.success("Configurações de impressão salvas!");
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
                                onClick={handleAbrirConfigImpressao}
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

            {/* Dialog de Configuração de Impressão */}
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
                <DialogContent className="max-w-5xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Printer className="w-5 h-5 text-indigo-600" />
                            Configurar Impressão
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                        {/* Painel de Configurações */}
                        <div className="space-y-6">
                        {/* Orientação */}
                        <div>
                            <Label className="text-sm font-semibold mb-2 block">Orientação da Página</Label>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant={printConfig.orientation === "portrait" ? "default" : "outline"}
                                    onClick={() => setPrintConfig({ ...printConfig, orientation: "portrait" })}
                                    className="flex-1"
                                >
                                    Retrato
                                </Button>
                                <Button
                                    type="button"
                                    variant={printConfig.orientation === "landscape" ? "default" : "outline"}
                                    onClick={() => setPrintConfig({ ...printConfig, orientation: "landscape" })}
                                    className="flex-1"
                                >
                                    Paisagem
                                </Button>
                            </div>
                        </div>

                        {/* Tamanho da Fonte */}
                        <div>
                            <Label className="text-sm font-semibold mb-2 block">
                                Tamanho da Fonte: {printConfig.fontSize}px
                            </Label>
                            <input
                                type="range"
                                min="6"
                                max="14"
                                value={printConfig.fontSize}
                                onChange={(e) => setPrintConfig({ ...printConfig, fontSize: parseInt(e.target.value) })}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>Pequena (6px)</span>
                                <span>Grande (14px)</span>
                            </div>
                        </div>

                        {/* Margens da Página */}
                        <div>
                            <Label className="text-sm font-semibold mb-3 block">Margens da Página (mm)</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-slate-600">Margem Superior</Label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={printConfig.marginTop}
                                        onChange={(e) => setPrintConfig({ ...printConfig, marginTop: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Margem Inferior</Label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={printConfig.marginBottom}
                                        onChange={(e) => setPrintConfig({ ...printConfig, marginBottom: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Margem Esquerda</Label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={printConfig.marginLeft}
                                        onChange={(e) => setPrintConfig({ ...printConfig, marginLeft: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Margem Direita</Label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={printConfig.marginRight}
                                        onChange={(e) => setPrintConfig({ ...printConfig, marginRight: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Espaçamento do Resumo */}
                        <div>
                            <Label className="text-sm font-semibold mb-3 block">Configurações do Resumo</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-slate-600">Tamanho Fonte (px)</Label>
                                    <input
                                        type="number"
                                        min="6"
                                        max="16"
                                        value={printConfig.resumoFontSize}
                                        onChange={(e) => setPrintConfig({ ...printConfig, resumoFontSize: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Espaço entre Placas (px)</Label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="20"
                                        value={printConfig.resumoGap}
                                        onChange={(e) => setPrintConfig({ ...printConfig, resumoGap: parseInt(e.target.value) || 8 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Espaço entre Linhas (px)</Label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={printConfig.resumoLineSpacing}
                                        onChange={(e) => setPrintConfig({ ...printConfig, resumoLineSpacing: parseInt(e.target.value) || 3 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Espaço Resumo Total (px)</Label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="30"
                                        value={printConfig.resumoTotalSpacing}
                                        onChange={(e) => setPrintConfig({ ...printConfig, resumoTotalSpacing: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Largura das Colunas */}
                        <div>
                            <Label className="text-sm font-semibold mb-3 block">
                                Largura das Colunas (%)
                                <span className={`ml-2 text-xs ${totalColunas === 100 ? 'text-green-600' : 'text-red-600'}`}>
                                    Total: {totalColunas}% {totalColunas !== 100 && '(ideal: 100%)'}
                                </span>
                            </Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-600">NF</Label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="30"
                                        value={printConfig.colNF}
                                        onChange={(e) => setPrintConfig({ ...printConfig, colNF: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Placa</Label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="20"
                                        value={printConfig.colPlaca}
                                        onChange={(e) => setPrintConfig({ ...printConfig, colPlaca: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Cliente</Label>
                                    <input
                                        type="number"
                                        min="20"
                                        max="60"
                                        value={printConfig.colCliente}
                                        onChange={(e) => setPrintConfig({ ...printConfig, colCliente: parseInt(e.target.value) || 40 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Volume</Label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="20"
                                        value={printConfig.colVolume}
                                        onChange={(e) => setPrintConfig({ ...printConfig, colVolume: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Peso</Label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="20"
                                        value={printConfig.colPeso}
                                        onChange={(e) => setPrintConfig({ ...printConfig, colPeso: parseInt(e.target.value) || 10 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Transportadora</Label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="40"
                                        value={printConfig.colTransp}
                                        onChange={(e) => setPrintConfig({ ...printConfig, colTransp: parseInt(e.target.value) || 20 })}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Painel de Preview */}
                        <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                            <h3 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Preview das Configurações
                            </h3>
                            <div className="bg-white rounded p-3 space-y-2 text-xs border">
                                <div className="border-b pb-2">
                                    <p className="text-slate-500">Margens:</p>
                                    <p className="font-mono">
                                        Superior: {printConfig.marginTop}mm | Inferior: {printConfig.marginBottom}mm<br/>
                                        Esquerda: {printConfig.marginLeft}mm | Direita: {printConfig.marginRight}mm
                                    </p>
                                </div>
                                <div className="border-b pb-2">
                                    <p className="text-slate-500">Tabela:</p>
                                    <p className="font-mono">
                                        Fonte: {printConfig.fontSize}px | Orientação: {printConfig.orientation === "portrait" ? "Retrato" : "Paisagem"}
                                    </p>
                                </div>
                                <div className="border-b pb-2">
                                    <p className="text-slate-500">Resumo:</p>
                                    <p className="font-mono">
                                        Fonte: {printConfig.resumoFontSize}px<br/>
                                        Espaço Placas: {printConfig.resumoGap}px<br/>
                                        Espaço Linhas: {printConfig.resumoLineSpacing}px<br/>
                                        Espaço Total: {printConfig.resumoTotalSpacing}px
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Colunas (Total: {totalColunas}%):</p>
                                    <div className="font-mono text-xs">
                                        NF: {printConfig.colNF}% | Placa: {printConfig.colPlaca}%<br/>
                                        Cliente: {printConfig.colCliente}% | Vol: {printConfig.colVolume}%<br/>
                                        Peso: {printConfig.colPeso}% | Transp: {printConfig.colTransp}%
                                    </div>
                                </div>
                            </div>
                            </div>
                            </div>

                            <div className="flex justify-between pt-4 border-t">
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        const defaultConfig = {
                                            colNF: 10,
                                            colPlaca: 10,
                                            colCliente: 40,
                                            colVolume: 10,
                                            colPeso: 10,
                                            colTransp: 20,
                                            fontSize: 8,
                                            orientation: "portrait",
                                            marginTop: 10,
                                            marginBottom: 10,
                                            marginLeft: 10,
                                            marginRight: 10,
                                            resumoFontSize: 10,
                                            resumoGap: 8,
                                            resumoLineSpacing: 3,
                                            resumoTotalSpacing: 10
                                        };
                                        setPrintConfig(defaultConfig);
                                        localStorage.setItem("importacaoPrintConfig", JSON.stringify(defaultConfig));
                                        toast.success("Configurações restauradas ao padrão!");
                                    }}
                                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                                >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    Restaurar Padrão
                                </Button>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        handleSalvarConfig();
                                        toast.success("Configurações salvas com sucesso!");
                                    }}
                                    className="border-green-500 text-green-600 hover:bg-green-50"
                                >
                                    <Save className="w-4 h-4 mr-1" />
                                    Salvar Configuração
                                </Button>
                                <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={() => {
                                        setShowConfigDialog(false);
                                        setShowPrintDialog(true);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Continuar
                                </Button>
                            </div>
                            </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog de Seleção de Notas */}
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
                                    variant="outline"
                                    onClick={() => {
                                        setShowConfigDialog(false);
                                        setShowPrintDialog(true);
                                    }}
                                >
                                    Voltar
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