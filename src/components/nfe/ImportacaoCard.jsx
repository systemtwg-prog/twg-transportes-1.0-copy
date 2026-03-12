import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Printer, FileText, Clock, Package, ChevronDown, ChevronUp, Eye, Trash2, Loader2, Save, RotateCcw, Settings, Pencil, MapPin
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
    const [notasSelecionadasExpanded, setNotasSelecionadasExpanded] = useState([]);
    const [showEditFilialDialog, setShowEditFilialDialog] = useState(false);
    const [filialParaAtribuir, setFilialParaAtribuir] = useState("");
    const [filtroNotas, setFiltroNotas] = useState("");
    
    // Carregar configurações do novo padrão PrintConfigNFE
    const [printConfig, setPrintConfig] = useState(() => {
        const saved = localStorage.getItem("nfePrintConfig");
        if (saved) {
            try {
                const config = JSON.parse(saved);
                // Mapear as configurações do novo formato
                return {
                    colNF: config.colNotaFiscal || 12,
                    colPlaca: config.colPlaca || 8,
                    colCliente: config.colCliente || 35,
                    colVolume: config.colVolume || 12,
                    colPeso: config.colPeso || 12,
                    colTransp: config.colTransportadora || 21,
                    fontSize: config.fontSize || 10,
                    fontWeight: config.fontWeight || "normal",
                    orientation: config.orientation || "landscape",
                    marginTop: config.marginTop || 5,
                    marginBottom: config.marginBottom || 5,
                    marginLeft: config.marginLeft || 5,
                    marginRight: config.marginRight || 5,
                    alturaLinha: config.alturaLinha || 25,
                    alturaCabecalho: config.alturaCabecalho || 35,
                    alturaTitulo: config.alturaTitulo || 40,
                    simbolosPlaca: config.simbolosPlaca !== undefined ? config.simbolosPlaca : true,
                    resumoFontSize: config.resumoFontSize || 9,
                    resumoGap: config.resumoGap || 6,
                    resumoLineSpacing: config.resumoLineSpacing || 2,
                    resumoTotalSpacing: 8
                };
            } catch {
                // Fallback para configuração padrão
            }
        }
        return {
            colNF: 12,
            colPlaca: 8,
            colCliente: 35,
            colVolume: 12,
            colPeso: 12,
            colTransp: 21,
            fontSize: 10,
            fontWeight: "normal",
            orientation: "landscape",
            marginTop: 5,
            marginBottom: 5,
            marginLeft: 5,
            marginRight: 5,
            alturaLinha: 25,
            alturaCabecalho: 35,
            alturaTitulo: 40,
            simbolosPlaca: true,
            resumoFontSize: 9,
            resumoGap: 6,
            resumoLineSpacing: 2,
            resumoTotalSpacing: 8
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
            // Notas da importação atual
            const notasImportacao = [...notasDaImportacao];

            if (notasImportacao.length === 0) {
                toast.error("Nenhuma nota encontrada nesta importação");
                setLoading(false);
                return;
            }

            setNotasParaImprimir(notasImportacao);
            setNotasDaMascara([]);
            setShowPrintDialog(true);
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

    const toggleNotaExpanded = (notaId) => {
        setNotasSelecionadasExpanded(prev =>
            prev.includes(notaId) ? prev.filter(id => id !== notaId) : [...prev, notaId]
        );
    };

    const selecionarTodasExpanded = () => {
        const notasComPlaca = notasDaImportacao.filter(n => n.placa);
        if (notasSelecionadasExpanded.length === notasComPlaca.length) {
            setNotasSelecionadasExpanded([]);
        } else {
            setNotasSelecionadasExpanded(notasComPlaca.map(n => n.id));
        }
    };

    const handleAtualizarFilialEmMassa = async () => {
        if (!filialParaAtribuir) {
            toast.error("Selecione uma filial");
            return;
        }

        if (notasSelecionadasExpanded.length === 0) {
            toast.error("Selecione ao menos uma nota");
            return;
        }

        try {
            // Atualizar todas as notas selecionadas
            for (const id of notasSelecionadasExpanded) {
                await base44.entities.NotaFiscal.update(id, { filial: filialParaAtribuir });
            }

            // Mostrar mensagem de sucesso
            toast.success(`✅ Filial ${filialParaAtribuir} atribuída com sucesso a ${notasSelecionadasExpanded.length} nota(s)!`, {
                duration: 3000
            });

            // Limpar estado
            setShowEditFilialDialog(false);
            setFilialParaAtribuir("");
            setNotasSelecionadasExpanded([]);

            // Recarregar dados após 500ms
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error("Erro ao atualizar:", error);
            toast.error("❌ Erro ao atribuir filial. Tente novamente.");
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

    const handleImprimir = async () => {
        if (notasParaImprimir.length === 0) {
            toast.error("Selecione ao menos uma nota para imprimir");
            return;
        }

        // Usar todas as notas selecionadas sem consultar romaneios (evita rate limit)
        const notasFiltradas = notasParaImprimir;

        // Ordenar notas por número de nota fiscal (do menor para o maior)
        const notasOrdenadas = [...notasFiltradas].sort((a, b) => {
            const numA = parseInt(a.numero_nf?.replace(/\D/g, "") || "0");
            const numB = parseInt(b.numero_nf?.replace(/\D/g, "") || "0");
            return numA - numB;
        });

        // Gerar impressão no formato tabular
        const winPrint = window.open('', '_blank', 'width=1200,height=800');
        if (!winPrint) {
            alert("Por favor, permita pop-ups para imprimir.");
            return;
        }

        // Calcular resumo por placa (ignorar notas sem placa)
        const resumoPorPlaca = {};
        notasOrdenadas.forEach(nota => {
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

        // Calcular resumo por filial e placa (apenas notas com placa)
        const resumoPorFilial = {};
        notasOrdenadas.forEach(nota => {
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

        // Símbolos para diferenciar placas
        const simbolosPorPlaca = ["▲", "●", "■", "◆", "★", "▼", "◉", "◈", "♦", "✦"];
        const placasUnicas = [...new Set(notasOrdenadas.map(n => n.placa).filter(Boolean))];
        const mapPlacaParaSimbolo = {};
        placasUnicas.forEach((placa, index) => {
            mapPlacaParaSimbolo[placa] = simbolosPorPlaca[index % simbolosPorPlaca.length];
        });

        // Gerar linhas da tabela
        let rowsHtml = "";
        notasOrdenadas.forEach(nota => {
            const placaDisplay = nota.placa || "";
            const simbolo = printConfig.simbolosPlaca && placaDisplay ? `${mapPlacaParaSimbolo[placaDisplay]} ` : '';
            
            // Pegar apenas 3 primeiras palavras do nome do cliente
            const clienteCompleto = nota.destinatario || "-";
            const clientePalavras = clienteCompleto.split(" ");
            const clienteDisplay = clientePalavras.slice(0, 3).join(" ");
            
            rowsHtml += `
                <tr>
                    <td>${nota.numero_nf || "-"}</td>
                    <td class="${nota.placa ? 'placa-cell' : ''}">${simbolo}${placaDisplay}</td>
                    <td>${clienteDisplay}</td>
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

            // Agrupar por placa - UNIFICADO COM FILIAIS
            resumoHtml += '<div class="resumo-section"><h4 class="resumo-section-title">Por Placa:</h4><div class="resumo-grid">';

            Object.entries(resumoPorPlaca).forEach(([placa, dados]) => {
                // Calcular totais por filial para esta placa
                const filiaisPlaca = {};
                const pesosPorFilial = {};
                notasParaImprimir.forEach(nota => {
                    if (nota.placa === placa && nota.filial) {
                        if (!filiaisPlaca[nota.filial]) {
                            filiaisPlaca[nota.filial] = 0;
                            pesosPorFilial[nota.filial] = 0;
                        }
                        filiaisPlaca[nota.filial]++;

                        // Somar peso
                        const pesoStr = nota.peso || "";
                        const pesoNum = parseFloat(pesoStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
                        pesosPorFilial[nota.filial] += pesoNum;
                    }
                });

                resumoHtml += `
                    <div class="resumo-placa-unificado">
                        <h4 class="resumo-placa-titulo">PLACA: ${placa}</h4>
                        <div class="resumo-placa-colunas">
                            <div class="resumo-placa-col1">
                                <div class="resumo-item-grande"><strong>NOTAS:</strong> ${dados.totalNotas}</div>
                                <div class="resumo-item-grande"><strong>ENTREGAS:</strong> ${dados.transportadoras.size || dados.totalNotas}</div>
                                <div class="resumo-item-grande"><strong>PESO:</strong> ${dados.pesoTotal.toFixed(2)} KG</div>
                                <div class="resumo-item-grande"><strong>VOLUME:</strong> ${dados.volumeTotal}</div>
                            </div>
                            ${Object.keys(filiaisPlaca).length > 0 ? `
                            <div class="resumo-placa-col2">
                                ${Object.entries(filiaisPlaca).sort((a, b) => a[0].localeCompare(b[0])).map(([filial, qtd]) => 
                                    `<div class="resumo-filial-item">
                                        <strong>FILIAL ${filial}:</strong> ${qtd} NOTAS<br/>
                                        <strong>PESO:</strong> ${pesosPorFilial[filial].toFixed(2)} KG
                                    </div>`
                                ).join('')}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            resumoHtml += '</div></div>';



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
                resumoHtml += '<div class="resumo-section"><h4 class="resumo-section-title">Por Transportadora:</h4><div class="resumo-grid-transportadora">';

                // Agrupar notas por placa para cada transportadora
                const notasPorTranspEPlaca = {};
                notasParaImprimir.forEach(nota => {
                    if (!nota.placa) return;
                    const transp = nota.transportadora?.trim().toUpperCase() || "SEM TRANSPORTADORA";
                    if (!notasPorTranspEPlaca[transp]) {
                        notasPorTranspEPlaca[transp] = new Set();
                    }
                    notasPorTranspEPlaca[transp].add(nota.placa);
                });

                Object.entries(resumoPorTransp)
                    .sort((a, b) => b[1].totalNotas - a[1].totalNotas)
                    .forEach(([transp, dados]) => {
                        const placas = Array.from(notasPorTranspEPlaca[transp] || []);
                        const placasDisplay = placas.length > 0 ? placas.join(', ') : '';
                        
                        resumoHtml += `
                            <div class="resumo-transp-novo">
                                <div class="resumo-transp-header">${transp}</div>
                                <div class="resumo-transp-body">
                                    <div class="resumo-transp-info">
                                        <div class="resumo-transp-linha"><strong>Notas:</strong> ${dados.totalNotas}</div>
                                        <div class="resumo-transp-linha"><strong>Peso:</strong> ${dados.pesoTotal.toFixed(2)} kg</div>
                                        <div class="resumo-transp-linha"><strong>Volumes:</strong> ${dados.volumeTotal}</div>
                                    </div>
                                    ${placasDisplay ? `<div class="resumo-transp-placas">${placasDisplay}</div>` : ''}
                                </div>
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
                        @page { 
                            margin: ${printConfig.marginTop}mm ${printConfig.marginRight}mm ${printConfig.marginBottom}mm ${printConfig.marginLeft}mm; 
                            size: A4 ${printConfig.orientation}; 
                        }
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
                        font-size: 18px;
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
                        font-size: ${printConfig.fontSize + 2}px;
                        font-weight: 600;
                        border: 1px solid #2563eb;
                        height: ${printConfig.alturaCabecalho || 35}px;
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
                        font-weight: ${printConfig.fontWeight || "normal"};
                        background: white;
                        line-height: 1.1;
                        height: ${printConfig.alturaLinha || 25}px;
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
                        margin-top: 10px;
                        padding: 8px;
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
                        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                        gap: ${printConfig.resumoGap}px;
                        margin-bottom: ${printConfig.resumoGap}px;
                    }
                    .resumo-grid-transportadora {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: ${printConfig.resumoGap}px;
                        margin-bottom: ${printConfig.resumoGap}px;
                    }
                    .resumo-placa-unificado {
                        background: white;
                        padding: 8px;
                        border-left: 3px solid #059669;
                        border-radius: 4px;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                        margin-bottom: ${printConfig.resumoGap}px;
                    }
                    .resumo-placa-titulo {
                        color: #047857;
                        font-size: ${printConfig.resumoFontSize + 4}px;
                        margin-bottom: 10px;
                        font-weight: bold;
                        text-align: left;
                        background: #d1fae5;
                        padding: 6px 10px;
                        border-radius: 4px;
                    }
                    .resumo-placa-colunas {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                    }
                    .resumo-placa-col1,
                    .resumo-placa-col2 {
                        display: flex;
                        flex-direction: column;
                    }
                    .resumo-item-grande {
                        font-size: ${printConfig.resumoFontSize + 3}px;
                        color: #1e293b;
                        margin: 5px 0;
                        font-weight: 600;
                    }
                    .resumo-filial-item {
                        font-size: ${printConfig.resumoFontSize + 2}px;
                        color: #334155;
                        margin: 5px 0;
                        padding: 6px 10px;
                        background: #f1f5f9;
                        border-radius: 3px;
                        line-height: 1.6;
                    }
                    .resumo-transp-novo {
                        background: white;
                        border: 1px solid #cbd5e1;
                        border-radius: 6px;
                        overflow: hidden;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .resumo-transp-header {
                        background: #e2e8f0;
                        padding: 8px 10px;
                        text-align: center;
                        font-weight: bold;
                        font-size: ${printConfig.resumoFontSize}px;
                        color: #1e293b;
                        border-bottom: 2px solid #cbd5e1;
                    }
                    .resumo-transp-body {
                        display: flex;
                        padding: 0;
                    }
                    .resumo-transp-info {
                        flex: 1;
                        padding: 10px;
                    }
                    .resumo-transp-linha {
                        font-size: ${printConfig.resumoFontSize}px;
                        color: #334155;
                        margin: 4px 0;
                    }
                    .resumo-transp-placas {
                        background: #334155;
                        color: white;
                        writing-mode: vertical-rl;
                        text-orientation: mixed;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 10px 8px;
                        font-weight: bold;
                        font-size: ${printConfig.resumoFontSize}px;
                        letter-spacing: 2px;
                        min-width: 35px;
                    }
                    .resumo-item {
                        font-size: ${printConfig.resumoFontSize}px;
                        color: #334155;
                        margin: ${printConfig.resumoLineSpacing}px 0;
                        display: flex;
                        justify-content: space-between;
                    }
                    .resumo-total {
                        background: #dbeafe;
                        color: #1e3a8a;
                        padding: 14px;
                        margin-top: 12px;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        border: 2px solid #3b82f6;
                    }
                    .resumo-total h4 {
                        color: #1e3a8a;
                        font-size: ${printConfig.resumoFontSize + 6}px;
                        margin-bottom: 10px;
                        font-weight: bold;
                        text-align: center;
                        border-bottom: 2px solid #3b82f6;
                        padding-bottom: 8px;
                    }
                    .resumo-grid-total {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: ${printConfig.resumoGap + 2}px;
                    }
                    .resumo-total .resumo-item {
                        color: #1e293b;
                        font-size: ${printConfig.resumoFontSize + 4}px;
                        background: white;
                        padding: 8px;
                        border-radius: 4px;
                        font-weight: bold;
                        border: 1px solid #cbd5e1;
                    }
                </style>
            </head>
            <body>
                <h1>Relatório Diário - ${format(new Date(importacao.data_importacao), "dd/MM/yyyy", { locale: ptBR })}</h1>
                
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
                            <div className="flex flex-col gap-3 mb-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-slate-600">Notas com placa desta importação:</h4>
                                    <div className="flex gap-2">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={selecionarTodasExpanded}
                                    >
                                        {notasSelecionadasExpanded.length === notasDaImportacao.filter(n => n.placa).length ? "Desmarcar" : "Selecionar"} Todas com Placa
                                    </Button>
                                    {notasSelecionadasExpanded.length > 0 && (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => setShowEditFilialDialog(true)}
                                            className="border-purple-500 text-purple-600 hover:bg-purple-50"
                                        >
                                            <Pencil className="w-4 h-4 mr-1" />
                                            Atribuir Filial ({notasSelecionadasExpanded.length})
                                        </Button>
                                    )}
                                </div>
                                </div>
                                <Input
                                    placeholder="Filtrar por NF ou Destinatário (começa com)..."
                                    value={filtroNotas}
                                    onChange={(e) => setFiltroNotas(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                                {notasDaImportacao
                                    .filter(nota => {
                                        // Filtrar apenas notas com placa
                                        if (!nota.placa) return false;
                                        // Aplicar filtro de busca
                                        if (!filtroNotas) return true;
                                        const termo = filtroNotas.toLowerCase();
                                        return nota.numero_nf?.toLowerCase().startsWith(termo) || 
                                               nota.destinatario?.toLowerCase().startsWith(termo);
                                    })
                                    .map(nota => {
                                    const selecionada = notasSelecionadasExpanded.includes(nota.id);
                                    return (
                                        <div 
                                            key={nota.id} 
                                            onClick={() => toggleNotaExpanded(nota.id)}
                                            className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                                selecionada ? "bg-purple-50 border-purple-500" : "bg-white border-slate-200 hover:border-purple-300"
                                            }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <Checkbox checked={selecionada} className="pointer-events-none" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-blue-600">{nota.numero_nf}</p>
                                                    <p className="text-slate-600 truncate" title={nota.destinatario}>
                                                        {nota.destinatario}
                                                    </p>
                                                    {nota.filial && (
                                                        <p className="text-purple-600 font-medium mt-1">
                                                            {nota.filial}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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

            {/* Dialog Atribuir Filial em Massa */}
            <Dialog open={showEditFilialDialog} onOpenChange={setShowEditFilialDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-purple-600" />
                            Atribuir Filial
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Atribuir filial a <strong>{notasSelecionadasExpanded.length}</strong> nota(s) desta importação.
                        </p>
                        <div className="space-y-2">
                            <Label>Filial</Label>
                            <Select value={filialParaAtribuir} onValueChange={setFilialParaAtribuir}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione a filial..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SP">Filial SP</SelectItem>
                                    <SelectItem value="SC">Filial SC</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {
                                setShowEditFilialDialog(false);
                                setFilialParaAtribuir("");
                            }}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleAtualizarFilialEmMassa}
                                disabled={!filialParaAtribuir}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <Save className="w-4 h-4 mr-1" />
                                Salvar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}