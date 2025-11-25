import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    FileText, Search, Download, Calendar, Filter,
    TrendingUp, Package, Truck, CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Relatorios() {
    const [filters, setFilters] = useState({
        dataInicio: "",
        dataFim: "",
        status: "todos",
        remetente: "",
        destinatario: ""
    });

    const { data: ordens = [], isLoading } = useQuery({
        queryKey: ["ordens"],
        queryFn: () => base44.entities.OrdemColeta.list("-created_date")
    });

    const { data: clientes = [] } = useQuery({
        queryKey: ["clientes"],
        queryFn: () => base44.entities.Cliente.list()
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const filteredOrdens = ordens.filter(o => {
        let match = true;
        
        if (filters.dataInicio && o.data_ordem) {
            match = match && o.data_ordem >= filters.dataInicio;
        }
        if (filters.dataFim && o.data_ordem) {
            match = match && o.data_ordem <= filters.dataFim;
        }
        if (filters.status !== "todos") {
            match = match && o.status === filters.status;
        }
        if (filters.remetente) {
            match = match && o.remetente_nome?.toLowerCase().includes(filters.remetente.toLowerCase());
        }
        if (filters.destinatario) {
            match = match && o.destinatario_nome?.toLowerCase().includes(filters.destinatario.toLowerCase());
        }
        
        return match;
    });

    const statusColors = {
        pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
        em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
        coletado: "bg-purple-100 text-purple-800 border-purple-200",
        entregue: "bg-green-100 text-green-800 border-green-200",
        cancelado: "bg-red-100 text-red-800 border-red-200"
    };

    const statusLabels = {
        pendente: "Pendente",
        em_andamento: "Em Andamento",
        coletado: "Coletado",
        entregue: "Entregue",
        cancelado: "Cancelado"
    };

    // Stats
    const stats = {
        total: filteredOrdens.length,
        pendentes: filteredOrdens.filter(o => o.status === "pendente").length,
        concluidas: filteredOrdens.filter(o => o.status === "entregue").length,
        volumeTotal: filteredOrdens.reduce((acc, o) => {
            const vol = parseInt(o.volume?.replace(/\D/g, "") || "0");
            return acc + vol;
        }, 0)
    };

    // Chart data
    const statusData = [
        { name: "Pendentes", value: filteredOrdens.filter(o => o.status === "pendente").length, color: "#EAB308" },
        { name: "Em Andamento", value: filteredOrdens.filter(o => o.status === "em_andamento").length, color: "#3B82F6" },
        { name: "Coletados", value: filteredOrdens.filter(o => o.status === "coletado").length, color: "#A855F7" },
        { name: "Entregues", value: filteredOrdens.filter(o => o.status === "entregue").length, color: "#22C55E" },
        { name: "Cancelados", value: filteredOrdens.filter(o => o.status === "cancelado").length, color: "#EF4444" }
    ].filter(d => d.value > 0);

    // Top remetentes
    const topRemetentes = Object.entries(
        filteredOrdens.reduce((acc, o) => {
            if (o.remetente_nome) {
                acc[o.remetente_nome] = (acc[o.remetente_nome] || 0) + 1;
            }
            return acc;
        }, {})
    )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name: name.substring(0, 20), coletas: count }));

    const exportCSV = () => {
        const headers = ["Nº Ordem", "Data", "Status", "Remetente", "Destinatário", "NFe", "Peso", "Volume"];
        const rows = filteredOrdens.map(o => [
            o.numero,
            formatDate(o.data_ordem),
            statusLabels[o.status] || o.status,
            o.remetente_nome,
            o.destinatario_nome,
            o.nfe,
            o.peso,
            o.volume
        ]);
        
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_coletas_${format(new Date(), "yyyy-MM-dd")}.csv`;
        link.click();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Relatórios</h1>
                            <p className="text-slate-500">Consulte e analise suas coletas</p>
                        </div>
                    </div>
                    <Button onClick={exportCSV} className="bg-green-600 hover:bg-green-700">
                        <Download className="w-5 h-5 mr-2" />
                        Exportar CSV
                    </Button>
                </div>

                {/* Filters */}
                <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Filter className="w-5 h-5 text-purple-600" />
                            Filtros
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-600">Data Início</Label>
                                <Input
                                    type="date"
                                    value={filters.dataInicio}
                                    onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Data Fim</Label>
                                <Input
                                    type="date"
                                    value={filters.dataFim}
                                    onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Status</Label>
                                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos</SelectItem>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                        <SelectItem value="coletado">Coletado</SelectItem>
                                        <SelectItem value="entregue">Entregue</SelectItem>
                                        <SelectItem value="cancelado">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Remetente</Label>
                                <Input
                                    placeholder="Filtrar por remetente..."
                                    value={filters.remetente}
                                    onChange={(e) => setFilters({ ...filters, remetente: e.target.value })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Destinatário</Label>
                                <Input
                                    placeholder="Filtrar por destinatário..."
                                    value={filters.destinatario}
                                    onChange={(e) => setFilters({ ...filters, destinatario: e.target.value })}
                                    className="bg-white"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Coletas</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-yellow-100 rounded-xl">
                                <Calendar className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Pendentes</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.pendentes}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Concluídas</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.concluidas}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <Truck className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Volumes</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.volumeTotal}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Status das Coletas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Top 5 Remetentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topRemetentes} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="coletas" fill="#6366F1" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Table */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg flex items-center justify-between">
                            <span>Detalhes das Coletas</span>
                            <Badge variant="outline" className="font-normal">
                                {filteredOrdens.length} registros
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-96">
                            <Table>
                                <TableHeader className="sticky top-0 bg-slate-50">
                                    <TableRow>
                                        <TableHead>Nº</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Remetente</TableHead>
                                        <TableHead>Destinatário</TableHead>
                                        <TableHead>NFe</TableHead>
                                        <TableHead>Peso</TableHead>
                                        <TableHead>Volume</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12">
                                                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredOrdens.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                                                Nenhuma coleta encontrada
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredOrdens.map((ordem) => (
                                            <TableRow key={ordem.id} className="hover:bg-slate-50">
                                                <TableCell className="font-bold text-purple-600">
                                                    #{ordem.numero}
                                                </TableCell>
                                                <TableCell>{formatDate(ordem.data_ordem)}</TableCell>
                                                <TableCell className="font-medium">{ordem.remetente_nome}</TableCell>
                                                <TableCell>{ordem.destinatario_nome}</TableCell>
                                                <TableCell className="font-mono text-sm">{ordem.nfe || "-"}</TableCell>
                                                <TableCell>{ordem.peso || "-"}</TableCell>
                                                <TableCell>{ordem.volume || "-"}</TableCell>
                                                <TableCell>
                                                    <Badge className={`${statusColors[ordem.status]} border`}>
                                                        {statusLabels[ordem.status]}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}