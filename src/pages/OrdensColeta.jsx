import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
    Plus, Search, Pencil, Trash2, Package, Printer,
    Calendar, Truck, Clock, Eye, Filter, X, MapPin, Share2, AlertTriangle
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import OrdemForm from "@/components/ordens/OrdemForm";
import OrdemPrint from "@/components/ordens/OrdemPrint";

export default function OrdensColeta() {
    const [showForm, setShowForm] = useState(false);
    const [showPrint, setShowPrint] = useState(false);
    const [editingOrdem, setEditingOrdem] = useState(null);
    const [selectedOrdem, setSelectedOrdem] = useState(null);
    
    // Filtros avançados
    const [filters, setFilters] = useState({
        search: "",
        status: "todos",
        dataInicio: "",
        dataFim: "",
        remetente: "",
        destinatario: "",
        motorista: ""
    });
    const [showFilters, setShowFilters] = useState(false);

    const queryClient = useQueryClient();

    const { data: ordens = [], isLoading } = useQuery({
        queryKey: ["ordens"],
        queryFn: () => base44.entities.OrdemColeta.list("-created_date")
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const result = await base44.entities.OrdemColeta.create(data);
            // Atualizar o último número
            if (config.id) {
                await base44.entities.Configuracoes.update(config.id, {
                    ultimo_numero_ordem: parseInt(data.numero) || 0
                });
            } else {
                await base44.entities.Configuracoes.create({
                    ultimo_numero_ordem: parseInt(data.numero) || 0
                });
            }
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ordens"] });
            queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
            setShowForm(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.OrdemColeta.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ordens"] });
            setShowForm(false);
            setEditingOrdem(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.OrdemColeta.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ordens"] })
    });

    const getProximoNumero = () => {
        const ultimoConfig = config.ultimo_numero_ordem || 0;
        const ultimoOrdens = ordens.length > 0 
            ? Math.max(...ordens.map(o => parseInt(o.numero) || 0))
            : 0;
        return String(Math.max(ultimoConfig, ultimoOrdens) + 1);
    };

    const handleSubmit = (data) => {
        if (editingOrdem) {
            updateMutation.mutate({ id: editingOrdem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (ordem) => {
        setEditingOrdem(ordem);
        setShowForm(true);
    };

    const handleDelete = (ordem) => {
        if (confirm(`Deseja excluir a ordem nº ${ordem.numero}?`)) {
            deleteMutation.mutate(ordem.id);
        }
    };

    const handlePrint = (ordem) => {
        setSelectedOrdem(ordem);
        setShowPrint(true);
    };

    const handleWhatsApp = (ordem) => {
        const texto = `*ORDEM DE COLETA Nº ${ordem.numero}*
Data: ${formatDate(ordem.data_ordem)}

*REMETENTE:*
${ordem.remetente_nome}
${ordem.remetente_endereco || ""} - ${ordem.remetente_bairro || ""} - ${ordem.remetente_cidade || ""}
CEP: ${ordem.remetente_cep || ""} - Tel: ${ordem.remetente_telefone || ""}

*DESTINATÁRIO:*
${ordem.destinatario_nome}
Tel: ${ordem.destinatario_telefone || ""}

*DADOS TRANSPORTE:*
Peso: ${ordem.peso || "-"} | Volume: ${ordem.volume || "-"}
NFe: ${ordem.nfe || "-"}
Data Coleta: ${formatDate(ordem.data_coleta)}
Horário: ${ordem.horario || "-"}

*MOTORISTA:* ${ordem.motorista || "-"} | Placa: ${ordem.placa || "-"}`;

        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
    };

    // Verificar ordens atrasadas
    const hoje = new Date().toISOString().split("T")[0];
    const ordensAtrasadas = ordens.filter(o => 
        o.data_coleta && o.data_coleta < hoje && 
        (o.status === "pendente" || o.status === "em_andamento")
    );

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    // Aplicar filtros
    const filteredOrdens = ordens.filter(o => {
        // Busca geral
        const matchSearch = !filters.search || 
            o.numero?.toLowerCase().includes(filters.search.toLowerCase()) ||
            o.remetente_nome?.toLowerCase().includes(filters.search.toLowerCase()) ||
            o.destinatario_nome?.toLowerCase().includes(filters.search.toLowerCase()) ||
            o.nfe?.includes(filters.search);
        
        // Status
        const matchStatus = filters.status === "todos" || o.status === filters.status;
        
        // Datas
        const matchDataInicio = !filters.dataInicio || (o.data_ordem && o.data_ordem >= filters.dataInicio);
        const matchDataFim = !filters.dataFim || (o.data_ordem && o.data_ordem <= filters.dataFim);
        
        // Remetente
        const matchRemetente = !filters.remetente || 
            o.remetente_nome?.toLowerCase().includes(filters.remetente.toLowerCase());
        
        // Destinatário
        const matchDestinatario = !filters.destinatario || 
            o.destinatario_nome?.toLowerCase().includes(filters.destinatario.toLowerCase());
        
        // Motorista
        const matchMotorista = !filters.motorista || 
            o.motorista?.toLowerCase().includes(filters.motorista.toLowerCase());

        return matchSearch && matchStatus && matchDataInicio && matchDataFim && 
               matchRemetente && matchDestinatario && matchMotorista;
    });

    const clearFilters = () => {
        setFilters({
            search: "",
            status: "todos",
            dataInicio: "",
            dataFim: "",
            remetente: "",
            destinatario: "",
            motorista: ""
        });
    };

    const hasActiveFilters = filters.status !== "todos" || filters.dataInicio || 
        filters.dataFim || filters.remetente || filters.destinatario || filters.motorista;

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

    const statusCounts = {
        pendente: ordens.filter(o => o.status === "pendente").length,
        em_andamento: ordens.filter(o => o.status === "em_andamento").length,
        coletado: ordens.filter(o => o.status === "coletado").length,
        entregue: ordens.filter(o => o.status === "entregue").length
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 md:p-8 print:p-0 print:bg-white">
            <div className="max-w-7xl mx-auto space-y-6 print:hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Ordens de Coleta</h1>
                            <p className="text-slate-500">Gerencie suas ordens de coleta</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { setEditingOrdem(null); setShowForm(true); }}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nova Ordem
                    </Button>
                </div>

                {/* Alerta de Ordens Atrasadas */}
                {ordensAtrasadas.length > 0 && (
                    <Card className="bg-red-50 border-red-200 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-red-100 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-red-800">⚠️ ATENÇÃO: {ordensAtrasadas.length} ordem(ns) atrasada(s)!</p>
                                <p className="text-sm text-red-600">
                                    Ordens: {ordensAtrasadas.map(o => `#${o.numero}`).join(", ")}
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                className="border-red-300 text-red-700 hover:bg-red-100"
                                onClick={() => setFilters({ ...filters, status: "pendente" })}
                            >
                                Ver Atrasadas
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setFilters({ ...filters, status: "pendente" })}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-yellow-100 rounded-xl">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Pendentes</p>
                                <p className="text-2xl font-bold text-slate-800">{statusCounts.pendente}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setFilters({ ...filters, status: "em_andamento" })}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Truck className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Em Andamento</p>
                                <p className="text-2xl font-bold text-slate-800">{statusCounts.em_andamento}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setFilters({ ...filters, status: "coletado" })}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <Package className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Coletados</p>
                                <p className="text-2xl font-bold text-slate-800">{statusCounts.coletado}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setFilters({ ...filters, status: "entregue" })}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <Calendar className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Entregues</p>
                                <p className="text-2xl font-bold text-slate-800">{statusCounts.entregue}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Buscar por número, remetente, destinatário ou NFe..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="pl-10 bg-white border-slate-200"
                                />
                            </div>
                            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                                <SelectTrigger className="w-full md:w-48 bg-white">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os Status</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                    <SelectItem value="coletado">Coletado</SelectItem>
                                    <SelectItem value="entregue">Entregue</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                            <Popover open={showFilters} onOpenChange={setShowFilters}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={hasActiveFilters ? "border-blue-500 text-blue-600" : ""}>
                                        <Filter className="w-4 h-4 mr-2" />
                                        Filtros Avançados
                                        {hasActiveFilters && <Badge className="ml-2 bg-blue-500">!</Badge>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4" align="end">
                                    <div className="space-y-4">
                                        <h4 className="font-semibold">Filtros Avançados</h4>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Data Início</Label>
                                                <Input
                                                    type="date"
                                                    value={filters.dataInicio}
                                                    onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Data Fim</Label>
                                                <Input
                                                    type="date"
                                                    value={filters.dataFim}
                                                    onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Remetente</Label>
                                            <Input
                                                placeholder="Nome do remetente..."
                                                value={filters.remetente}
                                                onChange={(e) => setFilters({ ...filters, remetente: e.target.value })}
                                                className="h-8 text-sm"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Destinatário</Label>
                                            <Input
                                                placeholder="Nome do destinatário..."
                                                value={filters.destinatario}
                                                onChange={(e) => setFilters({ ...filters, destinatario: e.target.value })}
                                                className="h-8 text-sm"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Motorista</Label>
                                            <Input
                                                placeholder="Nome do motorista..."
                                                value={filters.motorista}
                                                onChange={(e) => setFilters({ ...filters, motorista: e.target.value })}
                                                className="h-8 text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-2 border-t">
                                            <Button variant="outline" size="sm" onClick={clearFilters} className="flex-1">
                                                <X className="w-3 h-3 mr-1" />
                                                Limpar
                                            </Button>
                                            <Button size="sm" onClick={() => setShowFilters(false)} className="flex-1">
                                                Aplicar
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Nº Ordem</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Remetente</TableHead>
                                        <TableHead>Destinatário</TableHead>
                                        <TableHead>Motorista</TableHead>
                                        <TableHead>NFe</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12">
                                                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredOrdens.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                                                    Nenhuma ordem encontrada
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredOrdens.map((ordem) => (
                                                <motion.tr
                                                    key={ordem.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="hover:bg-slate-50 transition-colors"
                                                >
                                                    <TableCell className="font-bold text-blue-600">
                                                        #{ordem.numero}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600">
                                                        {formatDate(ordem.data_ordem)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-slate-800">{ordem.remetente_nome}</p>
                                                            <p className="text-xs text-slate-500">{ordem.remetente_cidade}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-slate-800">{ordem.destinatario_nome}</p>
                                                            <p className="text-xs text-slate-500">{ordem.destinatario_telefone}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{ordem.motorista || "-"}</span>
                                                            {ordem.localizacao_latitude && (
                                                                <MapPin className="w-3 h-3 text-green-500" />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm text-slate-600">
                                                        {ordem.nfe || "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${statusColors[ordem.status]} border`}>
                                                            {statusLabels[ordem.status]}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleWhatsApp(ordem)}
                                                                className="hover:bg-green-100"
                                                                title="Enviar WhatsApp"
                                                            >
                                                                <Share2 className="w-4 h-4 text-green-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => { setSelectedOrdem(ordem); setShowPrint(true); }}
                                                                className="hover:bg-slate-100"
                                                            >
                                                                <Eye className="w-4 h-4 text-slate-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handlePrint(ordem)}
                                                                className="hover:bg-blue-100"
                                                            >
                                                                <Printer className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit(ordem)}
                                                                className="hover:bg-amber-100"
                                                            >
                                                                <Pencil className="w-4 h-4 text-amber-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(ordem)}
                                                                className="hover:bg-red-100"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-600" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 bg-transparent border-0">
                    <OrdemForm
                        ordem={editingOrdem}
                        onSubmit={handleSubmit}
                        onCancel={() => { setShowForm(false); setEditingOrdem(null); }}
                        proximoNumero={getProximoNumero()}
                    />
                </DialogContent>
            </Dialog>

            {/* Print Dialog */}
            <Dialog open={showPrint} onOpenChange={setShowPrint}>
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
                    <OrdemPrint ordem={selectedOrdem} showActions={true} />
                </DialogContent>
            </Dialog>
        </div>
    );
}