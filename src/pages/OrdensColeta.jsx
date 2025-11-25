import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Plus, Search, Pencil, Trash2, Package, Printer,
    Calendar, Truck, Clock, Eye
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
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("todos");
    const queryClient = useQueryClient();

    const { data: ordens = [], isLoading } = useQuery({
        queryKey: ["ordens"],
        queryFn: () => base44.entities.OrdemColeta.list("-created_date")
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.OrdemColeta.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ordens"] });
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
        if (ordens.length === 0) return "1";
        const numeros = ordens.map(o => parseInt(o.numero) || 0);
        return String(Math.max(...numeros) + 1);
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
        setTimeout(() => window.print(), 500);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const filteredOrdens = ordens.filter(o => {
        const matchSearch = 
            o.numero?.toLowerCase().includes(search.toLowerCase()) ||
            o.remetente_nome?.toLowerCase().includes(search.toLowerCase()) ||
            o.destinatario_nome?.toLowerCase().includes(search.toLowerCase()) ||
            o.nfe?.includes(search);
        const matchStatus = statusFilter === "todos" || o.status === statusFilter;
        return matchSearch && matchStatus;
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

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setStatusFilter("pendente")}>
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
                          onClick={() => setStatusFilter("em_andamento")}>
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
                          onClick={() => setStatusFilter("coletado")}>
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
                          onClick={() => setStatusFilter("entregue")}>
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
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-white border-slate-200"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                                        <TableHead>NFe</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12">
                                                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredOrdens.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
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
                                                                onClick={() => { setSelectedOrdem(ordem); setShowPrint(true); }}
                                                                className="hover:bg-slate-100"
                                                            >
                                                                <Eye className="w-4 h-4 text-slate-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handlePrint(ordem)}
                                                                className="hover:bg-green-100"
                                                            >
                                                                <Printer className="w-4 h-4 text-green-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit(ordem)}
                                                                className="hover:bg-blue-100"
                                                            >
                                                                <Pencil className="w-4 h-4 text-blue-600" />
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
                    <div className="flex justify-end mb-4 print:hidden">
                        <Button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700">
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                        </Button>
                    </div>
                    <OrdemPrint ordem={selectedOrdem} />
                </DialogContent>
            </Dialog>
        </div>
    );
}