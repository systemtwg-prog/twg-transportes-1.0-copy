import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    User, Award, TrendingUp, Package, CheckCircle,
    Clock, Calendar, Filter
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function RelatorioMotoristas() {
    const [filters, setFilters] = useState({
        dataInicio: format(startOfMonth(new Date()), "yyyy-MM-dd"),
        dataFim: format(endOfMonth(new Date()), "yyyy-MM-dd")
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas"],
        queryFn: () => base44.entities.Motorista.list()
    });

    const { data: ordens = [] } = useQuery({
        queryKey: ["ordens-relatorio"],
        queryFn: () => base44.entities.OrdemColeta.list()
    });

    // Filtrar ordens pelo período
    const ordensFiltradas = ordens.filter(o => {
        if (!o.data_ordem) return false;
        return o.data_ordem >= filters.dataInicio && o.data_ordem <= filters.dataFim;
    });

    // Calcular métricas por motorista
    const metricas = motoristas.map(motorista => {
        const ordensMotorista = ordensFiltradas.filter(o => o.motorista_id === motorista.id);
        const entregues = ordensMotorista.filter(o => o.status === "entregue").length;
        const coletados = ordensMotorista.filter(o => o.status === "coletado").length;
        const emAndamento = ordensMotorista.filter(o => o.status === "em_andamento").length;
        const total = ordensMotorista.length;
        const taxaConclusao = total > 0 ? ((entregues / total) * 100).toFixed(1) : 0;

        return {
            id: motorista.id,
            nome: motorista.nome,
            cpf: motorista.cpf,
            status: motorista.status,
            total,
            entregues,
            coletados,
            emAndamento,
            taxaConclusao: parseFloat(taxaConclusao)
        };
    }).sort((a, b) => b.total - a.total);

    // Top 5 motoristas
    const top5 = metricas.slice(0, 5);

    // Dados para gráficos
    const chartData = top5.map(m => ({
        nome: m.nome.split(" ")[0],
        coletas: m.total,
        entregues: m.entregues
    }));

    const statusDistribution = [
        { name: "Entregues", value: ordensFiltradas.filter(o => o.status === "entregue").length, color: "#22C55E" },
        { name: "Coletados", value: ordensFiltradas.filter(o => o.status === "coletado").length, color: "#A855F7" },
        { name: "Em Andamento", value: ordensFiltradas.filter(o => o.status === "em_andamento").length, color: "#3B82F6" },
        { name: "Pendentes", value: ordensFiltradas.filter(o => o.status === "pendente").length, color: "#EAB308" }
    ].filter(d => d.value > 0);

    // Estatísticas gerais
    const stats = {
        totalColetas: ordensFiltradas.length,
        totalEntregues: ordensFiltradas.filter(o => o.status === "entregue").length,
        motoristasAtivos: motoristas.filter(m => m.status === "ativo").length,
        mediaPorMotorista: motoristas.length > 0 ? (ordensFiltradas.length / motoristas.filter(m => m.status === "ativo").length).toFixed(1) : 0
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
                            <Award className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Performance de Motoristas</h1>
                            <p className="text-slate-500">Relatório de desempenho por período</p>
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <Card className="bg-white/70 border-0 shadow-md">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Filter className="w-5 h-5 text-orange-600" />
                            Período de Análise
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            <div className="space-y-1">
                                <Label className="text-sm">Data Início</Label>
                                <Input
                                    type="date"
                                    value={filters.dataInicio}
                                    onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                                    className="w-40"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm">Data Fim</Label>
                                <Input
                                    type="date"
                                    value={filters.dataFim}
                                    onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                                    className="w-40"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Coletas</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.totalColetas}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Entregues</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.totalEntregues}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-orange-100 rounded-xl">
                                <User className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Motoristas Ativos</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.motoristasAtivos}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Média/Motorista</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.mediaPorMotorista}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Top 5 Motoristas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="nome" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="coletas" fill="#F97316" name="Total Coletas" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="entregues" fill="#22C55E" name="Entregues" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Distribuição de Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusDistribution}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {statusDistribution.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabela Detalhada */}
                <Card className="bg-white/80 border-0 shadow-xl overflow-hidden">
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg">Detalhamento por Motorista</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Ranking</TableHead>
                                    <TableHead>Motorista</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">Total Coletas</TableHead>
                                    <TableHead className="text-center">Entregues</TableHead>
                                    <TableHead className="text-center">Em Andamento</TableHead>
                                    <TableHead className="text-center">Taxa Conclusão</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {metricas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                                            Nenhum dado encontrado para o período
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    metricas.map((m, index) => (
                                        <TableRow key={m.id} className="hover:bg-slate-50">
                                            <TableCell>
                                                {index < 3 ? (
                                                    <Badge className={`${
                                                        index === 0 ? "bg-yellow-400 text-yellow-900" :
                                                        index === 1 ? "bg-gray-300 text-gray-800" :
                                                        "bg-orange-300 text-orange-900"
                                                    }`}>
                                                        #{index + 1}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-500">#{index + 1}</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{m.nome}</p>
                                                    <p className="text-xs text-slate-500">{m.cpf}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${
                                                    m.status === "ativo" ? "bg-green-100 text-green-800" :
                                                    m.status === "inativo" ? "bg-gray-100 text-gray-800" :
                                                    "bg-blue-100 text-blue-800"
                                                }`}>
                                                    {m.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-blue-600">
                                                {m.total}
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-green-600">
                                                {m.entregues}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {m.emAndamento}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={`${
                                                    m.taxaConclusao >= 80 ? "bg-green-100 text-green-800" :
                                                    m.taxaConclusao >= 50 ? "bg-yellow-100 text-yellow-800" :
                                                    "bg-red-100 text-red-800"
                                                }`}>
                                                    {m.taxaConclusao}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}