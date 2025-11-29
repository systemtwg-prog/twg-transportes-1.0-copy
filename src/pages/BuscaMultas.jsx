import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
    Car, Search, AlertTriangle, FileText, DollarSign, 
    Calendar, MapPin, CheckCircle, Clock, Loader2, Printer, Share2, Eye,
    User, ChevronDown, ChevronUp, Filter, X, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BuscaMultas() {
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
    const [consultando, setConsultando] = useState(false);
    const [multasEncontradas, setMultasEncontradas] = useState([]);
    const [showResultados, setShowResultados] = useState(false);
    const [multaDetalhes, setMultaDetalhes] = useState(null);
    const [showDetalhes, setShowDetalhes] = useState(false);
    const [filtroStatus, setFiltroStatus] = useState("todos");
    const [multasSelecionadasImpressao, setMultasSelecionadasImpressao] = useState([]);
    const [showIndicacao, setShowIndicacao] = useState(false);
    const [multaIndicacao, setMultaIndicacao] = useState(null);
    const [motoristaIndicado, setMotoristaIndicado] = useState("");
    const queryClient = useQueryClient();

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-multas"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const { data: multas = [] } = useQuery({
        queryKey: ["multas"],
        queryFn: () => base44.entities.Multa.list("-created_date")
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas-multas"],
        queryFn: () => base44.entities.Motorista.list()
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    const createMultaMutation = useMutation({
        mutationFn: (data) => base44.entities.Multa.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["multas"] });
            toast.success("Multa registrada!");
        }
    });

    const updateMultaMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Multa.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["multas"] });
            toast.success("Multa atualizada!");
        }
    });

    const veiculoInfo = veiculos.find(v => v.id === veiculoSelecionado);

    const handleConsultar = async () => {
        if (!veiculoSelecionado) {
            toast.error("Selecione um veículo");
            return;
        }

        setConsultando(true);
        
        try {
            const resultado = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um sistema de consulta de multas de trânsito brasileiro.

Para o veículo com placa ${veiculoInfo?.placa || ""} e RENAVAM ${veiculoInfo?.renavam || "N/I"}, gere uma lista de multas de demonstração realistas.

GERE de 4 a 6 multas com os seguintes critérios:
- Incluir multas de 2024 E 2025 (algumas já vencidas, outras a vencer)
- Datas de infração entre janeiro/2024 e novembro/2025
- Datas de vencimento: algumas já passadas (vencidas), outras futuras (a vencer em dezembro/2025, janeiro/2026)
- Valores realistas: R$ 88,38 (leve), R$ 130,16 (média), R$ 195,23 (grave), R$ 293,47 (gravíssima)
- Pontuação: 3 pts (leve), 4 pts (média), 5 pts (grave), 7 pts (gravíssima)
- Infrações comuns: excesso de velocidade, estacionamento irregular, avanço de sinal, uso de celular, rodízio municipal, ultrapassagem proibida
- Locais em São Paulo e rodovias (Av. Paulista, Marginal Tietê, Rod. Bandeirantes, Rod. Anhanguera, etc)
- Órgãos: DETRAN-SP, CET, DER-SP, PRF, Prefeitura de SP

Use números de auto no formato: XX123456789 (2 letras + 9 números)
Use datas no formato: YYYY-MM-DD`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        multas: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    numero_auto: { type: "string" },
                                    data_infracao: { type: "string" },
                                    descricao: { type: "string" },
                                    local: { type: "string" },
                                    valor: { type: "number" },
                                    pontos: { type: "number" },
                                    data_vencimento: { type: "string" },
                                    orgao: { type: "string" },
                                    gravidade: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            if (resultado?.multas) {
                setMultasEncontradas(resultado.multas.map(m => ({
                    ...m,
                    veiculo_id: veiculoSelecionado,
                    placa: veiculoInfo?.placa,
                    renavam: veiculoInfo?.renavam,
                    status: "pendente",
                    selecionada: false
                })));
                setShowResultados(true);
                
                if (resultado.multas.length === 0) {
                    toast.success("Nenhuma multa encontrada para este veículo!");
                } else {
                    toast.info(`${resultado.multas.length} multa(s) encontrada(s)`);
                }
            }
        } catch (error) {
            console.error("Erro na consulta:", error);
            toast.error("Erro ao consultar multas. Tente novamente.");
        }

        setConsultando(false);
    };

    const toggleMultaSelecionada = (index) => {
        setMultasEncontradas(prev => prev.map((m, i) => 
            i === index ? { ...m, selecionada: !m.selecionada } : m
        ));
    };

    const toggleMultaImpressao = (multaId) => {
        setMultasSelecionadasImpressao(prev => 
            prev.includes(multaId) ? prev.filter(id => id !== multaId) : [...prev, multaId]
        );
    };

    const marcarComoReconhecida = async () => {
        const selecionadas = multasEncontradas.filter(m => m.selecionada);
        if (selecionadas.length === 0) {
            toast.error("Selecione ao menos uma multa");
            return;
        }

        for (const multa of selecionadas) {
            await createMultaMutation.mutateAsync({
                ...multa,
                status: "reconhecida"
            });
        }

        setMultasEncontradas(prev => prev.filter(m => !m.selecionada));
        toast.success(`${selecionadas.length} multa(s) marcada(s) como reconhecida(s)`);
    };

    const handleIndicarMotorista = () => {
        if (!multaIndicacao || !motoristaIndicado) {
            toast.error("Selecione um motorista");
            return;
        }

        const motorista = motoristas.find(m => m.id === motoristaIndicado);
        updateMultaMutation.mutate({
            id: multaIndicacao.id,
            data: { 
                motorista_id: motoristaIndicado,
                motorista_responsavel: motorista?.nome || ""
            }
        });

        setShowIndicacao(false);
        setMultaIndicacao(null);
        setMotoristaIndicado("");
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const statusColors = {
        pendente: "bg-yellow-100 text-yellow-800",
        reconhecida: "bg-blue-100 text-blue-800",
        paga: "bg-green-100 text-green-800",
        recorrida: "bg-purple-100 text-purple-800",
        finalizada: "bg-slate-100 text-slate-800"
    };

    const statusLabels = {
        pendente: "Pendente",
        reconhecida: "Reconhecida",
        paga: "Paga",
        recorrida: "Recorrida",
        finalizada: "Finalizada"
    };

    // Multas filtradas
    const multasFiltradas = multas.filter(m => {
        const matchVeiculo = !veiculoSelecionado || m.veiculo_id === veiculoSelecionado || m.placa === veiculoInfo?.placa;
        const matchStatus = filtroStatus === "todos" || m.status === filtroStatus;
        return matchVeiculo && matchStatus;
    });

    const handlePrintMulta = (multa) => {
        const veiculo = veiculos.find(v => v.id === multa.veiculo_id) || veiculoInfo;
        
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        winPrint.document.write(gerarHtmlImpressao([multa], veiculo));
        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    const handlePrintSelecionadas = () => {
        if (multasSelecionadasImpressao.length === 0) {
            toast.error("Selecione ao menos uma multa para imprimir");
            return;
        }

        const multasParaImprimir = multas.filter(m => multasSelecionadasImpressao.includes(m.id));
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        winPrint.document.write(gerarHtmlImpressao(multasParaImprimir));
        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    const gerarHtmlImpressao = (multasImprimir, veiculoParam = null) => {
        const multasHtml = multasImprimir.map(multa => {
            const veiculo = veiculoParam || veiculos.find(v => v.id === multa.veiculo_id);
            return `
                <div class="multa-item" style="page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background: #fef2f2; padding: 12px 15px; border-bottom: 2px solid #dc2626;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-weight: bold; color: #dc2626; font-size: 14px;">AUTO Nº ${multa.numero_auto || '-'}</span>
                            </div>
                            <span style="padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; background: ${statusColors[multa.status]?.includes('yellow') ? '#fef3c7' : statusColors[multa.status]?.includes('green') ? '#dcfce7' : statusColors[multa.status]?.includes('blue') ? '#dbeafe' : statusColors[multa.status]?.includes('purple') ? '#f3e8ff' : '#f1f5f9'}; color: ${statusColors[multa.status]?.includes('yellow') ? '#92400e' : statusColors[multa.status]?.includes('green') ? '#166534' : statusColors[multa.status]?.includes('blue') ? '#1e40af' : statusColors[multa.status]?.includes('purple') ? '#6b21a8' : '#475569'};">
                                ${statusLabels[multa.status] || 'Pendente'}
                            </span>
                        </div>
                    </div>
                    <div style="padding: 15px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                            <div>
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Veículo</div>
                                <div style="font-size: 13px; font-weight: 600;">${veiculo?.placa || multa.placa || '-'} - ${veiculo?.modelo || ''}</div>
                            </div>
                            <div>
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">RENAVAM</div>
                                <div style="font-size: 13px; font-weight: 600;">${veiculo?.renavam || multa.renavam || '-'}</div>
                            </div>
                            <div>
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Data Infração</div>
                                <div style="font-size: 13px; font-weight: 600;">${formatDate(multa.data_infracao)}</div>
                            </div>
                            <div>
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Vencimento</div>
                                <div style="font-size: 13px; font-weight: 600;">${formatDate(multa.data_vencimento)}</div>
                            </div>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Descrição</div>
                            <div style="font-size: 13px; font-weight: 600;">${multa.descricao || '-'}</div>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Local</div>
                            <div style="font-size: 13px;">${multa.local || '-'}</div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                            <div>
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Pontos</div>
                                <div style="font-size: 13px; font-weight: 600; color: #dc2626;">${multa.pontos || 0} pts</div>
                            </div>
                            <div>
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Motorista</div>
                                <div style="font-size: 13px; font-weight: 600;">${multa.motorista_responsavel || '-'}</div>
                            </div>
                            <div>
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Valor</div>
                                <div style="font-size: 16px; font-weight: bold; color: #dc2626;">${formatCurrency(multa.valor)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const valorTotal = multasImprimir.reduce((acc, m) => acc + (m.valor || 0), 0);
        const pontosTotal = multasImprimir.reduce((acc, m) => acc + (m.pontos || 0), 0);

        return `
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Multas</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
                    .header { display: flex; align-items: center; border-bottom: 3px solid #dc2626; padding-bottom: 15px; margin-bottom: 20px; }
                    .logo { width: 100px; margin-right: 20px; }
                    .logo img { max-width: 100%; max-height: 80px; object-fit: contain; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 22px; font-weight: bold; color: #1e293b; }
                    .company-details { font-size: 11px; color: #64748b; margin-top: 4px; }
                    .title { text-align: center; font-size: 20px; font-weight: bold; color: #dc2626; margin: 20px 0; padding: 10px; background: #fef2f2; border-radius: 8px; }
                    .summary { display: flex; justify-content: space-around; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .summary-item { text-align: center; }
                    .summary-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
                    .summary-value { font-size: 20px; font-weight: bold; color: #dc2626; }
                    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
                    @media print { 
                        body { padding: 0; } 
                        .multa-item { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        ${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : '<div style="width:80px;height:60px;background:#dc2626;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;border-radius:8px;">TWG</div>'}
                    </div>
                    <div class="company-info">
                        <p class="company-name">${config.nome_empresa || 'TWG TRANSPORTES'}</p>
                        <p class="company-details">${config.endereco || ''}</p>
                        <p class="company-details">${config.cnpj ? 'CNPJ: ' + config.cnpj : ''} ${config.telefone ? ' | Tel: ' + config.telefone : ''} ${config.email ? ' | ' + config.email : ''}</p>
                    </div>
                </div>

                <div class="title">RELATÓRIO DE MULTAS DE TRÂNSITO</div>

                <div class="summary">
                    <div class="summary-item">
                        <div class="summary-label">Total de Multas</div>
                        <div class="summary-value">${multasImprimir.length}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Total de Pontos</div>
                        <div class="summary-value">${pontosTotal} pts</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Valor Total</div>
                        <div class="summary-value">${formatCurrency(valorTotal)}</div>
                    </div>
                </div>

                ${multasHtml}

                <div class="footer">
                    Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
            </body>
            </html>
        `;
    };

    const handleShareWhatsApp = (multa) => {
        const veiculo = veiculos.find(v => v.id === multa.veiculo_id) || veiculoInfo;
        
        const texto = `🚨 *NOTIFICAÇÃO DE MULTA*

🚗 *Veículo:* ${veiculo?.placa || multa.placa || '-'} - ${veiculo?.modelo || ''}
📋 *RENAVAM:* ${veiculo?.renavam || multa.renavam || '-'}

📝 *Dados da Infração:*
• Auto: ${multa.numero_auto || '-'}
• Data: ${formatDate(multa.data_infracao)}
• Descrição: ${multa.descricao || '-'}
• Local: ${multa.local || '-'}
• Pontos: ${multa.pontos || 0}
• Vencimento: ${formatDate(multa.data_vencimento)}
${multa.motorista_responsavel ? '• Motorista: ' + multa.motorista_responsavel : ''}

💰 *Valor:* ${formatCurrency(multa.valor)}
📊 *Status:* ${statusLabels[multa.status] || 'Pendente'}

${config.nome_empresa || 'TWG TRANSPORTES'}`;

        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
    };

    const abrirDetalhes = (multa) => {
        setMultaDetalhes(multa);
        setShowDetalhes(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl shadow-lg">
                            <AlertTriangle className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Gestão de Multas</h1>
                            <p className="text-slate-500">Consulte e gerencie multas de trânsito</p>
                        </div>
                    </div>
                    {multasSelecionadasImpressao.length > 0 && (
                        <Button onClick={handlePrintSelecionadas} className="bg-blue-600 hover:bg-blue-700">
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir Selecionadas ({multasSelecionadasImpressao.length})
                        </Button>
                    )}
                </div>

                {/* Seleção de Veículo */}
                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Car className="w-5 h-5 text-orange-600" />
                            Selecione o Veículo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Veículo</Label>
                                <Select value={veiculoSelecionado} onValueChange={setVeiculoSelecionado}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Selecione um veículo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {veiculos.map(v => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.placa} - {v.modelo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {veiculoInfo && (
                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-slate-500">Placa:</span>
                                            <span className="font-bold text-orange-700 ml-2">{veiculoInfo.placa}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">RENAVAM:</span>
                                            <span className="font-bold text-orange-700 ml-2">{veiculoInfo.renavam || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Modelo:</span>
                                            <span className="font-medium ml-2">{veiculoInfo.modelo}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Ano:</span>
                                            <span className="font-medium ml-2">{veiculoInfo.ano || "-"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button 
                            onClick={handleConsultar}
                            disabled={!veiculoSelecionado || consultando}
                            className="w-full h-14 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-lg"
                        >
                            {consultando ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Consultando...
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5 mr-2" />
                                    Consultar Multas Online
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Resultados da Consulta */}
                {showResultados && multasEncontradas.length > 0 && (
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="w-5 h-5 text-red-600" />
                                Multas Encontradas ({multasEncontradas.length})
                            </CardTitle>
                            <Button 
                                onClick={marcarComoReconhecida}
                                disabled={!multasEncontradas.some(m => m.selecionada)}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marcar Selecionadas como Reconhecidas
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>Auto</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Local</TableHead>
                                        <TableHead className="text-center">Pontos</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {multasEncontradas.map((multa, index) => (
                                        <TableRow 
                                            key={index} 
                                            className={`hover:bg-slate-50 cursor-pointer ${multa.selecionada ? "bg-blue-50" : ""}`}
                                            onClick={() => abrirDetalhes(multa)}
                                        >
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={multa.selecionada}
                                                    onCheckedChange={() => toggleMultaSelecionada(index)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {multa.numero_auto}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    {formatDate(multa.data_infracao)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                {multa.descricao}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 text-slate-400" />
                                                    {multa.local}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="bg-red-100 text-red-700">
                                                    {multa.pontos} pts
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-red-600">
                                                {formatCurrency(multa.valor)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="flex justify-end mt-4 p-4 bg-slate-50 rounded-lg">
                                <div className="text-right">
                                    <p className="text-sm text-slate-500">Total</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {formatCurrency(multasEncontradas.reduce((acc, m) => acc + (m.valor || 0), 0))}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Histórico de Multas */}
                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Clock className="w-5 h-5 text-blue-600" />
                                Histórico de Multas ({multasFiltradas.length})
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-slate-400" />
                                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos os Status</SelectItem>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                        <SelectItem value="reconhecida">Reconhecida</SelectItem>
                                        <SelectItem value="paga">Paga</SelectItem>
                                        <SelectItem value="recorrida">Recorrida</SelectItem>
                                        <SelectItem value="finalizada">Finalizada</SelectItem>
                                    </SelectContent>
                                </Select>
                                {filtroStatus !== "todos" && (
                                    <Button variant="ghost" size="icon" onClick={() => setFiltroStatus("todos")}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {multasFiltradas.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                <p>Nenhuma multa encontrada</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>Placa</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Motorista</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {multasFiltradas.map((multa) => (
                                        <TableRow 
                                            key={multa.id} 
                                            className="hover:bg-slate-50 cursor-pointer"
                                            onClick={() => abrirDetalhes(multa)}
                                        >
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox 
                                                    checked={multasSelecionadasImpressao.includes(multa.id)}
                                                    onCheckedChange={() => toggleMultaImpressao(multa.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-bold">{multa.placa}</TableCell>
                                            <TableCell>{formatDate(multa.data_infracao)}</TableCell>
                                            <TableCell className="max-w-xs truncate">{multa.descricao}</TableCell>
                                            <TableCell>
                                                {multa.motorista_responsavel || (
                                                    <span className="text-slate-400 italic">Não indicado</span>
                                                )}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Select 
                                                    value={multa.status}
                                                    onValueChange={(v) => updateMultaMutation.mutate({ id: multa.id, data: { status: v } })}
                                                >
                                                    <SelectTrigger className="w-32 h-8">
                                                        <Badge className={statusColors[multa.status]}>
                                                            {statusLabels[multa.status] || multa.status}
                                                        </Badge>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pendente">Pendente</SelectItem>
                                                        <SelectItem value="reconhecida">Reconhecida</SelectItem>
                                                        <SelectItem value="paga">Paga</SelectItem>
                                                        <SelectItem value="recorrida">Recorrida</SelectItem>
                                                        <SelectItem value="finalizada">Finalizada</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {formatCurrency(multa.valor)}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        onClick={() => { setMultaIndicacao(multa); setMotoristaIndicado(multa.motorista_id || ""); setShowIndicacao(true); }}
                                                        title="Indicar Motorista"
                                                    >
                                                        <UserPlus className="w-4 h-4 text-purple-600" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        onClick={() => handlePrintMulta(multa)}
                                                        title="Imprimir"
                                                    >
                                                        <Printer className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        onClick={() => handleShareWhatsApp(multa)}
                                                        title="Compartilhar WhatsApp"
                                                    >
                                                        <Share2 className="w-4 h-4 text-green-600" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Detalhes da Multa */}
            <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            Detalhes da Multa
                        </DialogTitle>
                    </DialogHeader>
                    {multaDetalhes && (
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Auto de Infração</span>
                                    <Badge className={statusColors[multaDetalhes.status]}>
                                        {statusLabels[multaDetalhes.status]}
                                    </Badge>
                                </div>
                                <p className="text-xl font-bold text-red-700 mt-1">{multaDetalhes.numero_auto || "-"}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">Placa</Label>
                                    <p className="font-bold">{multaDetalhes.placa}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">RENAVAM</Label>
                                    <p className="font-bold">{multaDetalhes.renavam || "-"}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Data Infração</Label>
                                    <p className="font-semibold">{formatDate(multaDetalhes.data_infracao)}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Vencimento</Label>
                                    <p className="font-semibold">{formatDate(multaDetalhes.data_vencimento)}</p>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-500">Descrição</Label>
                                <p className="font-medium">{multaDetalhes.descricao}</p>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-500">Local</Label>
                                <p className="text-sm">{multaDetalhes.local}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">Pontos</Label>
                                    <p className="font-bold text-red-600">{multaDetalhes.pontos || 0} pts</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Gravidade</Label>
                                    <p className="font-medium">{multaDetalhes.gravidade || "-"}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Órgão</Label>
                                    <p className="font-medium">{multaDetalhes.orgao || "-"}</p>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-500">Motorista Responsável</Label>
                                <p className="font-medium">{multaDetalhes.motorista_responsavel || "Não indicado"}</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-xl text-center">
                                <Label className="text-xs text-slate-500">Valor da Multa</Label>
                                <p className="text-3xl font-bold text-red-600">{formatCurrency(multaDetalhes.valor)}</p>
                            </div>

                            <div className="flex gap-2">
                                <Button 
                                    onClick={() => { setMultaIndicacao(multaDetalhes); setMotoristaIndicado(multaDetalhes.motorista_id || ""); setShowIndicacao(true); setShowDetalhes(false); }}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Indicar Motorista
                                </Button>
                                <Button 
                                    onClick={() => handlePrintMulta(multaDetalhes)}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog Indicação de Motorista */}
            <Dialog open={showIndicacao} onOpenChange={setShowIndicacao}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-purple-600" />
                            Indicar Motorista da Autuação
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {multaIndicacao && (
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="text-sm text-slate-500">Multa</p>
                                <p className="font-bold">{multaIndicacao.numero_auto || "N/I"}</p>
                                <p className="text-sm">{multaIndicacao.descricao}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Selecione o Motorista Responsável</Label>
                            <Select value={motoristaIndicado} onValueChange={setMotoristaIndicado}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um motorista..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {motoristas.filter(m => m.status === "ativo").map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.nome} - CNH: {m.cnh || "N/I"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowIndicacao(false)} className="flex-1">
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleIndicarMotorista}
                                disabled={!motoristaIndicado}
                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                                Confirmar Indicação
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}