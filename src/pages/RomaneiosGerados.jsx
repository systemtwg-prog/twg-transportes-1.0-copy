import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Truck, Calendar, Search, Car, Package, Scale, FileText, 
    BarChart3, Pencil, Trash2, Eye, X, Save, Building2, ChevronDown, ChevronUp, AlertTriangle, Printer
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function RomaneiosGerados() {
    const [filterData, setFilterData] = useState("");
    const [filterDataFim, setFilterDataFim] = useState("");
    const [filterDestinatario, setFilterDestinatario] = useState("");
    const [filterPlaca, setFilterPlaca] = useState("");
    const [expandedRomaneio, setExpandedRomaneio] = useState(null);
    const [showEdit, setShowEdit] = useState(false);
    const [editingRomaneio, setEditingRomaneio] = useState(null);
    const [editForm, setEditForm] = useState({ nome: "", placa: "", data: "", observacoes: "" });
    const [showNotasVeiculo, setShowNotasVeiculo] = useState(null);
    const queryClient = useQueryClient();

    const { data: romaneios = [], isLoading } = useQuery({
        queryKey: ["romaneios-gerados"],
        queryFn: () => base44.entities.RomaneioGerado.list("-created_date")
    });

    const { data: notasFiscais = [] } = useQuery({
        queryKey: ["notas-fiscais-romaneios"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.RomaneioGerado.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["romaneios-gerados"] });
            setShowEdit(false);
            setEditingRomaneio(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.RomaneioGerado.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["romaneios-gerados"] })
    });

    // Filtrar romaneios
        const filtered = useMemo(() => {
            return romaneios.filter(r => {
                const matchDataInicio = !filterData || r.data >= filterData;
                const matchDataFim = !filterDataFim || r.data <= filterDataFim;
                const matchDestinatario = !filterDestinatario || 
                    r.destinatarios?.some(d => d.toLowerCase().includes(filterDestinatario.toLowerCase()));
                const matchPlaca = !filterPlaca || filterPlaca === "all" || r.placa === filterPlaca;
                return matchDataInicio && matchDataFim && matchDestinatario && matchPlaca;
            });
        }, [romaneios, filterData, filterDataFim, filterDestinatario, filterPlaca]);

        // Todas as notas dos romaneios filtrados
        const todasNotasIds = useMemo(() => {
            const ids = new Set();
            filtered.forEach(r => {
                (r.notas_ids || []).forEach(id => ids.add(id));
            });
            return ids;
        }, [filtered]);

        const notasDosFiltrados = useMemo(() => {
            return notasFiscais.filter(n => todasNotasIds.has(n.id));
        }, [notasFiscais, todasNotasIds]);

    // Dashboard geral
    const dashboard = useMemo(() => {
        const totalNotas = filtered.reduce((acc, r) => acc + (r.total_notas || 0), 0);
        const totalEntregas = filtered.reduce((acc, r) => acc + (r.total_entregas || 0), 0);
        const pesoTotal = filtered.reduce((acc, r) => acc + (r.peso_total || 0), 0);
        
        // Por transportadora
        const porTransportadora = {};
        filtered.forEach(r => {
            (r.notas_por_transportadora || []).forEach(t => {
                if (!porTransportadora[t.transportadora]) {
                    porTransportadora[t.transportadora] = 0;
                }
                porTransportadora[t.transportadora] += t.quantidade;
            });
        });

        // Por placa
        const porPlaca = {};
        filtered.forEach(r => {
            const placa = r.placa || "SEM_PLACA";
            if (!porPlaca[placa]) {
                porPlaca[placa] = { notas: 0, entregas: 0, peso: 0 };
            }
            porPlaca[placa].notas += r.total_notas || 0;
            porPlaca[placa].entregas += r.total_entregas || 0;
            porPlaca[placa].peso += r.peso_total || 0;
        });

        return { totalNotas, totalEntregas, pesoTotal, porTransportadora, porPlaca };
    }, [filtered]);

    const placasUnicas = [...new Set(romaneios.map(r => r.placa).filter(Boolean))];

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const handleEdit = (romaneio) => {
        setEditingRomaneio(romaneio);
        setEditForm({
            nome: romaneio.nome || "",
            placa: romaneio.placa || "",
            data: romaneio.data || "",
            observacoes: romaneio.observacoes || ""
        });
        setShowEdit(true);
    };

    const statusColors = {
        gerado: "bg-blue-100 text-blue-700",
        em_transito: "bg-amber-100 text-amber-700",
        entregue: "bg-emerald-100 text-emerald-700",
        cancelado: "bg-red-100 text-red-700"
    };

    const statusLabels = {
        gerado: "Gerado",
        em_transito: "Em Trânsito",
        entregue: "Entregue",
        cancelado: "Cancelado"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                        <Truck className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Romaneios Gerados</h1>
                        <p className="text-slate-500">Histórico de cargas e entregas realizadas</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link to={createPageUrl("NotasFiscais")}>
                        <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                            <FileText className="w-4 h-4 mr-2" />
                            Notas Fiscais
                        </Button>
                    </Link>
                    <Link to={createPageUrl("MascaraRomaneio")}>
                        <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                            <Truck className="w-4 h-4 mr-2" />
                            Máscara Romaneio
                        </Button>
                    </Link>
                </div>

                {/* Filtros */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Data Início</Label>
                                <Input
                                    type="date"
                                    value={filterData}
                                    onChange={(e) => setFilterData(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Data Fim</Label>
                                <Input
                                    type="date"
                                    value={filterDataFim}
                                    onChange={(e) => setFilterDataFim(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Destinatário</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar destinatário..."
                                        value={filterDestinatario}
                                        onChange={(e) => setFilterDestinatario(e.target.value)}
                                        className="pl-9 bg-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Placa</Label>
                                <Select value={filterPlaca} onValueChange={setFilterPlaca}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as placas</SelectItem>
                                        {placasUnicas.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button 
                                    variant="outline" 
                                    onClick={() => { setFilterData(""); setFilterDataFim(""); setFilterDestinatario(""); setFilterPlaca(""); }}
                                >
                                    <X className="w-4 h-4 mr-1" /> Limpar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Dashboard Resumo Geral */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Truck className="w-4 h-4" />
                                Romaneios
                            </div>
                            <p className="text-2xl font-bold text-indigo-600">{filtered.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <FileText className="w-4 h-4" />
                                Total Notas
                            </div>
                            <p className="text-2xl font-bold text-blue-600">{dashboard.totalNotas}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Package className="w-4 h-4" />
                                Total Entregas
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">{dashboard.totalEntregas}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Scale className="w-4 h-4" />
                                Peso Total
                            </div>
                            <p className="text-2xl font-bold text-orange-600">{dashboard.pesoTotal.toFixed(2)} kg</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Dashboard por Transportadora */}
                {Object.keys(dashboard.porTransportadora).length > 0 && (
                    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="w-5 h-5 text-purple-600" />
                                Notas por Transportadora
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {Object.entries(dashboard.porTransportadora)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([transp, qtd]) => (
                                        <div key={transp} className="bg-white rounded-xl p-3 shadow-sm">
                                            <p className="text-xs text-slate-500 truncate" title={transp}>{transp || "Sem transportadora"}</p>
                                            <p className="text-xl font-bold text-purple-600">{qtd}</p>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Dashboard Pendências por Veículo - Clicável */}
                {Object.entries(dashboard.porPlaca).filter(([placa, dados]) => 
                    filtered.some(r => r.placa === placa && (r.status === "gerado" || r.status === "em_transito"))
                ).length > 0 && (
                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                Pendências por Veículo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {Object.entries(dashboard.porPlaca)
                                    .filter(([placa]) => filtered.some(r => r.placa === placa && (r.status === "gerado" || r.status === "em_transito")))
                                    .map(([placa, dados]) => {
                                        const notasDoVeiculo = notasDosFiltrados.filter(n => {
                                            const romaneio = filtered.find(r => r.placa === placa && (r.notas_ids || []).includes(n.id));
                                            return !!romaneio;
                                        });
                                        const transportadoras = {};
                                        filtered.filter(r => r.placa === placa).forEach(r => {
                                            (r.notas_por_transportadora || []).forEach(t => {
                                                if (!transportadoras[t.transportadora]) transportadoras[t.transportadora] = 0;
                                                transportadoras[t.transportadora] += t.quantidade;
                                            });
                                        });
                                        
                                        return (
                                            <div 
                                                key={placa}
                                                className="p-3 bg-white rounded-xl border-l-4 border-orange-500 shadow-sm cursor-pointer hover:shadow-md hover:bg-orange-50 transition-all"
                                                onClick={() => setShowNotasVeiculo({ placa, dados, notas: notasDoVeiculo, transportadoras })}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Car className="w-4 h-4 text-orange-600" />
                                                    <span className="font-bold text-sm text-orange-700">
                                                        {placa === "SEM_PLACA" ? "Sem Placa" : placa}
                                                    </span>
                                                </div>
                                                <div className="flex gap-3 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Package className="w-3 h-3 text-orange-500" />
                                                        <span className="font-semibold text-orange-600">{dados.entregas}</span>
                                                        <span className="text-xs text-slate-400">entregas</span>
                                                    </div>
                                                </div>
                                                {Object.keys(transportadoras).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {Object.entries(transportadoras).slice(0, 2).map(([transp, qtd]) => (
                                                            <span key={transp} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                                                {transp}: {qtd}
                                                            </span>
                                                        ))}
                                                        {Object.keys(transportadoras).length > 2 && (
                                                            <span className="text-xs text-slate-400">+{Object.keys(transportadoras).length - 2}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Lista de Notas do Período por Placa do Romaneio */}
                {notasDosFiltrados.length > 0 && (
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="w-5 h-5 text-blue-600" />
                                Notas Fiscais do Período ({notasDosFiltrados.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {Object.entries(
                                    filtered.reduce((acc, romaneio) => {
                                        const placa = romaneio.placa || "SEM_PLACA";
                                        if (!acc[placa]) acc[placa] = [];
                                        (romaneio.notas_ids || []).forEach(id => {
                                            const nota = notasFiscais.find(n => n.id === id);
                                            if (nota && !acc[placa].find(n => n.id === nota.id)) {
                                                acc[placa].push(nota);
                                            }
                                        });
                                        return acc;
                                    }, {})
                                ).map(([placa, notas]) => (
                                    <div key={placa} className="bg-white rounded-xl p-4 border-l-4 border-indigo-500">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Car className="w-5 h-5 text-indigo-600" />
                                            <span className="font-bold text-indigo-700">
                                                {placa === "SEM_PLACA" ? "Sem Placa" : placa}
                                            </span>
                                            <Badge className="bg-indigo-100 text-indigo-700 ml-auto">
                                                {notas.length} nota{notas.length > 1 ? "s" : ""}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {notas.map(nota => (
                                                <Badge key={nota.id} className="bg-blue-100 text-blue-700 text-sm">
                                                    {nota.numero_nf}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Dashboard por Placa */}
                {Object.keys(dashboard.porPlaca).length > 0 && (
                    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Car className="w-5 h-5 text-indigo-600" />
                                Resumo por Placa
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(dashboard.porPlaca).map(([placa, dados]) => (
                                    <div key={placa} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-indigo-500">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Car className="w-5 h-5 text-indigo-600" />
                                            <span className="font-bold text-lg text-indigo-700">
                                                {placa === "SEM_PLACA" ? "Sem Placa" : placa}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                                <p className="text-slate-500">Notas</p>
                                                <p className="font-bold text-blue-600">{dados.notas}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Entregas</p>
                                                <p className="font-bold text-emerald-600">{dados.entregas}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Peso</p>
                                                <p className="font-bold text-orange-600">{dados.peso.toFixed(1)}kg</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tabela de Romaneios */}
                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Data</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Placa</TableHead>
                                        <TableHead>Motorista</TableHead>
                                        <TableHead className="text-center">Notas</TableHead>
                                        <TableHead className="text-center">Entregas</TableHead>
                                        <TableHead className="text-center">Peso</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-12">
                                                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                                                <Truck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                Nenhum romaneio encontrado
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((romaneio) => (
                                            <React.Fragment key={romaneio.id}>
                                                <TableRow className="hover:bg-slate-50">
                                                    <TableCell className="font-medium">{formatDate(romaneio.data)}</TableCell>
                                                    <TableCell>{romaneio.nome || "-"}</TableCell>
                                                    <TableCell className="font-bold text-indigo-600">{romaneio.placa || "-"}</TableCell>
                                                    <TableCell>{romaneio.motorista_nome || "-"}</TableCell>
                                                    <TableCell className="text-center">{romaneio.total_notas || 0}</TableCell>
                                                    <TableCell className="text-center">{romaneio.total_entregas || 0}</TableCell>
                                                    <TableCell className="text-center">{(romaneio.peso_total || 0).toFixed(1)}kg</TableCell>
                                                    <TableCell>
                                                        <Select 
                                                            value={romaneio.status || "gerado"}
                                                            onValueChange={(v) => updateMutation.mutate({ id: romaneio.id, data: { status: v } })}
                                                        >
                                                            <SelectTrigger className="w-32 h-8">
                                                                <Badge className={statusColors[romaneio.status || "gerado"]}>
                                                                    {statusLabels[romaneio.status || "gerado"]}
                                                                </Badge>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="gerado">Gerado</SelectItem>
                                                                <SelectItem value="em_transito">Em Trânsito</SelectItem>
                                                                <SelectItem value="entregue">Entregue</SelectItem>
                                                                <SelectItem value="cancelado">Cancelado</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => setExpandedRomaneio(expandedRomaneio === romaneio.id ? null : romaneio.id)}
                                                            >
                                                                {expandedRomaneio === romaneio.id ? (
                                                                    <ChevronUp className="w-4 h-4 text-slate-600" />
                                                                ) : (
                                                                    <ChevronDown className="w-4 h-4 text-slate-600" />
                                                                )}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(romaneio)}>
                                                                <Pencil className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => {
                                                                if (confirm("Excluir este romaneio?")) deleteMutation.mutate(romaneio.id);
                                                            }}>
                                                                <Trash2 className="w-4 h-4 text-red-600" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedRomaneio === romaneio.id && (
                                                    <TableRow>
                                                        <TableCell colSpan={9} className="bg-slate-50 p-4">
                                                            <div className="space-y-2">
                                                                <p className="text-sm font-medium text-slate-600">Notas Fiscais:</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {(romaneio.notas_ids || []).map(id => {
                                                                        const nota = notasFiscais.find(n => n.id === id);
                                                                        return nota ? (
                                                                            <Badge key={id} className="bg-blue-100 text-blue-700">
                                                                                {nota.numero_nf} - {nota.destinatario}
                                                                            </Badge>
                                                                        ) : null;
                                                                    })}
                                                                    {(!romaneio.notas_ids || romaneio.notas_ids.length === 0) && (
                                                                        <span className="text-slate-400 text-sm">Nenhuma nota vinculada</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Notas do Veículo */}
            <Dialog open={!!showNotasVeiculo} onOpenChange={() => setShowNotasVeiculo(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-orange-600" />
                            Notas Pendentes - {showNotasVeiculo?.placa === "SEM_PLACA" ? "Sem Placa" : showNotasVeiculo?.placa}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        {/* Resumo por Transportadora */}
                        {showNotasVeiculo?.transportadoras && Object.keys(showNotasVeiculo.transportadoras).length > 0 && (
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 mb-4">
                                <p className="text-sm font-semibold text-purple-700 mb-2">Por Transportadora:</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(showNotasVeiculo.transportadoras).map(([transp, qtd]) => (
                                        <Badge key={transp} className="bg-purple-100 text-purple-700">
                                            {transp}: {qtd}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {showNotasVeiculo?.notas?.length === 0 ? (
                            <p className="text-center text-slate-500 py-4">Nenhuma nota encontrada</p>
                        ) : (
                            showNotasVeiculo?.notas?.map((nota, idx) => (
                                <div key={nota.id || idx} className="p-3 bg-slate-50 rounded-lg border">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-indigo-700">NF: {nota.numero_nf}</span>
                                        <Badge className="bg-orange-100 text-orange-700">Pendente</Badge>
                                    </div>
                                    <p className="text-sm text-slate-600">{nota.destinatario}</p>
                                    <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                        {nota.volume && <span>Vol: {nota.volume}</span>}
                                        {nota.peso && <span>Peso: {nota.peso}</span>}
                                        {nota.transportadora && <span>Transp: {nota.transportadora}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Editar Romaneio */}
            <Dialog open={showEdit} onOpenChange={setShowEdit}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-blue-600" />
                            Editar Romaneio
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                                value={editForm.nome}
                                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                                placeholder="Nome do romaneio"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Placa</Label>
                                <Input
                                    value={editForm.placa}
                                    onChange={(e) => setEditForm({ ...editForm, placa: e.target.value })}
                                    placeholder="ABC-1234"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    value={editForm.data}
                                    onChange={(e) => setEditForm({ ...editForm, data: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Input
                                value={editForm.observacoes}
                                onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                                placeholder="Observações..."
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowEdit(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => updateMutation.mutate({ id: editingRomaneio.id, data: editForm })}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Save className="w-4 h-4 mr-1" /> Salvar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}