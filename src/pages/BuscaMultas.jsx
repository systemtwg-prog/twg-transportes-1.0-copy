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
    Calendar, MapPin, CheckCircle, Clock, Loader2
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
                prompt: `Você é um sistema de consulta de multas de veículos.
Simule uma consulta de multas para o veículo:
- Placa: ${veiculoInfo?.placa || ""}
- RENAVAM: ${veiculoInfo?.renavam || ""}

Gere de 0 a 3 multas fictícias realistas para fins de demonstração, com:
- Infrações comuns de trânsito (excesso de velocidade, estacionamento irregular, etc)
- Valores realistas de multas brasileiras
- Datas nos últimos 6 meses
- Locais em São Paulo

Se não houver multas, retorne array vazio.`,
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

    // Multas cadastradas por veículo
    const multasPorVeiculo = veiculoSelecionado 
        ? multas.filter(m => m.veiculo_id === veiculoSelecionado || m.placa === veiculoInfo?.placa)
        : [];

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
                                                            {multa.status}
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