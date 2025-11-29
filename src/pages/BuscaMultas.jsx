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
import { 
    Car, Search, AlertTriangle, FileText, DollarSign, 
    Calendar, MapPin, CheckCircle, Clock, Loader2, Printer, Share2, Eye
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BuscaMultas() {
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
    const [consultando, setConsultando] = useState(false);
    const [multasEncontradas, setMultasEncontradas] = useState([]);
    const [showResultados, setShowResultados] = useState(false);
    const queryClient = useQueryClient();

    const { data: veiculos = [], isLoading } = useQuery({
        queryKey: ["veiculos-multas"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const { data: multas = [] } = useQuery({
        queryKey: ["multas"],
        queryFn: () => base44.entities.Multa.list("-created_date")
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

IMPORTANTE: Gere pelo menos 2 multas de 2025, sendo 1 vencida e 1 a vencer.

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
                                    data_vencimento: { type: "string" }
                                }
                            }
                        },
                        total_multas: { type: "number" },
                        valor_total: { type: "number" }
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
        recorrida: "bg-purple-100 text-purple-800"
    };

    const statusLabels = {
        pendente: "Pendente",
        reconhecida: "Reconhecida",
        paga: "Paga",
        recorrida: "Recorrida"
    };

    // Multas cadastradas por veículo
    const multasPorVeiculo = veiculoSelecionado 
        ? multas.filter(m => m.veiculo_id === veiculoSelecionado || m.placa === veiculoInfo?.placa)
        : [];

    const handlePrintMulta = (multa) => {
        const veiculo = veiculos.find(v => v.id === multa.veiculo_id) || veiculoInfo;
        
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Multa - ${multa.numero_auto || 'N/I'}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { display: flex; align-items: center; border-bottom: 3px solid #dc2626; padding-bottom: 15px; margin-bottom: 20px; }
                    .logo { width: 100px; margin-right: 20px; }
                    .logo img { max-width: 100%; max-height: 80px; object-fit: contain; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 22px; font-weight: bold; color: #1e293b; }
                    .company-address { font-size: 12px; color: #64748b; }
                    .title { text-align: center; font-size: 24px; font-weight: bold; color: #dc2626; margin: 20px 0; padding: 10px; background: #fef2f2; border-radius: 8px; }
                    .section { margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6; }
                    .section-title { font-size: 14px; font-weight: bold; color: #3b82f6; margin-bottom: 10px; text-transform: uppercase; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                    .field { margin-bottom: 8px; }
                    .field-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
                    .field-value { font-size: 14px; font-weight: 600; color: #1e293b; }
                    .highlight { background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px; }
                    .highlight .label { font-size: 12px; color: #64748b; }
                    .highlight .value { font-size: 28px; font-weight: bold; color: #dc2626; }
                    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                    .status-pendente { background: #fef3c7; color: #92400e; }
                    .status-reconhecida { background: #dbeafe; color: #1e40af; }
                    .status-paga { background: #dcfce7; color: #166534; }
                    .status-recorrida { background: #f3e8ff; color: #6b21a8; }
                    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        ${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : '<div style="width:80px;height:60px;background:#dc2626;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;border-radius:8px;">TWG</div>'}
                    </div>
                    <div class="company-info">
                        <p class="company-name">${config.nome_empresa || 'TWG TRANSPORTES'}</p>
                        <p class="company-address">${config.endereco || ''}</p>
                        <p class="company-address">${config.telefone ? 'Tel: ' + config.telefone : ''} ${config.cnpj ? ' | CNPJ: ' + config.cnpj : ''}</p>
                    </div>
                </div>

                <div class="title">NOTIFICAÇÃO DE MULTA DE TRÂNSITO</div>

                <div class="section">
                    <div class="section-title">Dados do Veículo</div>
                    <div class="grid">
                        <div class="field">
                            <div class="field-label">Placa</div>
                            <div class="field-value">${veiculo?.placa || multa.placa || '-'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">RENAVAM</div>
                            <div class="field-value">${veiculo?.renavam || multa.renavam || '-'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Modelo</div>
                            <div class="field-value">${veiculo?.modelo || '-'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Ano</div>
                            <div class="field-value">${veiculo?.ano || '-'}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Dados da Infração</div>
                    <div class="grid">
                        <div class="field">
                            <div class="field-label">Número do Auto</div>
                            <div class="field-value">${multa.numero_auto || '-'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Data da Infração</div>
                            <div class="field-value">${formatDate(multa.data_infracao)}</div>
                        </div>
                        <div class="field" style="grid-column: span 2;">
                            <div class="field-label">Descrição</div>
                            <div class="field-value">${multa.descricao || '-'}</div>
                        </div>
                        <div class="field" style="grid-column: span 2;">
                            <div class="field-label">Local</div>
                            <div class="field-value">${multa.local || '-'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Pontuação</div>
                            <div class="field-value">${multa.pontos || 0} pontos</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Data de Vencimento</div>
                            <div class="field-value">${formatDate(multa.data_vencimento)}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Motorista Responsável</div>
                            <div class="field-value">${multa.motorista_responsavel || '-'}</div>
                        </div>
                        <div class="field">
                            <div class="field-label">Status</div>
                            <div class="field-value">
                                <span class="status status-${multa.status || 'pendente'}">${statusLabels[multa.status] || 'Pendente'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="highlight">
                    <div class="label">VALOR DA MULTA</div>
                    <div class="value">${formatCurrency(multa.valor)}</div>
                </div>

                ${multa.observacoes ? '<div class="section"><div class="section-title">Observações</div><p style="font-size:13px;color:#475569;">' + multa.observacoes + '</p></div>' : ''}

                <div class="footer">
                    Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
            </body>
            </html>
        `);

        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
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

💰 *Valor:* ${formatCurrency(multa.valor)}
📊 *Status:* ${statusLabels[multa.status] || 'Pendente'}

${config.nome_empresa || 'TWG TRANSPORTES'}`;

        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl shadow-lg">
                        <AlertTriangle className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Busca de Multas</h1>
                        <p className="text-slate-500">Consulte multas de trânsito dos veículos</p>
                    </div>
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
                                    Consultar Multas
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
                                            className={`hover:bg-slate-50 ${multa.selecionada ? "bg-blue-50" : ""}`}
                                        >
                                            <TableCell>
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

                {/* Multas Cadastradas */}
                {veiculoSelecionado && multasPorVeiculo.length > 0 && (
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Clock className="w-5 h-5 text-blue-600" />
                                Histórico de Multas ({multasPorVeiculo.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {multasPorVeiculo.map((multa) => (
                                        <TableRow key={multa.id} className="hover:bg-slate-50">
                                            <TableCell>{formatDate(multa.data_infracao)}</TableCell>
                                            <TableCell>{multa.descricao}</TableCell>
                                            <TableCell>
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
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {formatCurrency(multa.valor)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
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
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}