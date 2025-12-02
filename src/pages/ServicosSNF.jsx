import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Plus, Search, Pencil, Trash2, FileText, Truck, 
    Upload, ClipboardPaste, Sparkles, X, DollarSign, MapPin, Calendar, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ImportadorServicos from "@/components/servicos/ImportadorServicos";

export default function ServicosSNF() {
    const [showForm, setShowForm] = useState(false);
    const [editingServico, setEditingServico] = useState(null);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [showImportador, setShowImportador] = useState(false);
    const [showPasteForm, setShowPasteForm] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [processingPaste, setProcessingPaste] = useState(false);
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        numero: "",
        data: format(new Date(), "yyyy-MM-dd"),
        cliente: "",
        descricao: "",
        origem: "",
        destino: "",
        valor: "",
        motorista_nome: "",
        veiculo_placa: "",
        status: "pendente",
        observacoes: ""
    });

    const { data: servicos = [], isLoading } = useQuery({
        queryKey: ["servicos-snf"],
        queryFn: () => base44.entities.ServicoSNF.list("-created_date")
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas"],
        queryFn: () => base44.entities.Motorista.filter({ status: "ativo" })
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ServicoSNF.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["servicos-snf"] });
            setShowForm(false);
            resetForm();
            toast.success("Serviço cadastrado!");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ServicoSNF.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["servicos-snf"] });
            setShowForm(false);
            setEditingServico(null);
            resetForm();
            toast.success("Serviço atualizado!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ServicoSNF.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["servicos-snf"] });
            toast.success("Serviço excluído!");
        }
    });

    const resetForm = () => {
        setForm({
            numero: "",
            data: format(new Date(), "yyyy-MM-dd"),
            cliente: "",
            descricao: "",
            origem: "",
            destino: "",
            valor: "",
            motorista_nome: "",
            veiculo_placa: "",
            status: "pendente",
            observacoes: ""
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
            ...form,
            valor: parseFloat(form.valor?.toString().replace(/[^\d.,]/g, "").replace(",", ".")) || 0
        };
        
        if (editingServico) {
            updateMutation.mutate({ id: editingServico.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (servico) => {
        setEditingServico(servico);
        setForm({
            numero: servico.numero || "",
            data: servico.data || format(new Date(), "yyyy-MM-dd"),
            cliente: servico.cliente || "",
            descricao: servico.descricao || "",
            origem: servico.origem || "",
            destino: servico.destino || "",
            valor: servico.valor?.toString() || "",
            motorista_nome: servico.motorista_nome || "",
            veiculo_placa: servico.veiculo_placa || "",
            status: servico.status || "pendente",
            observacoes: servico.observacoes || ""
        });
        setShowForm(true);
    };

    const handleDelete = (servico) => {
        if (confirm(`Deseja excluir o serviço "${servico.cliente}"?`)) {
            deleteMutation.mutate(servico.id);
        }
    };

    const handleProcessPaste = async () => {
        if (!pasteText.trim()) return;
        
        setProcessingPaste(true);
        
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Analise o texto abaixo e extraia informações de serviços de transporte sem nota fiscal.

TEXTO:
"""
${pasteText}
"""

Extraia: número, data, cliente, descrição do serviço, origem, destino, valor, motorista, placa do veículo e observações.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        servicos: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    numero: { type: "string" },
                                    data: { type: "string" },
                                    cliente: { type: "string" },
                                    descricao: { type: "string" },
                                    origem: { type: "string" },
                                    destino: { type: "string" },
                                    valor: { type: "string" },
                                    motorista_nome: { type: "string" },
                                    veiculo_placa: { type: "string" },
                                    observacoes: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            const servicosEncontrados = result?.servicos || [];
            
            if (servicosEncontrados.length > 0) {
                let importados = 0;
                
                for (const servico of servicosEncontrados) {
                    if (servico.cliente) {
                        await base44.entities.ServicoSNF.create({
                            ...servico,
                            valor: parseFloat(servico.valor?.replace(/[^\d.,]/g, "").replace(",", ".")) || 0,
                            status: "pendente"
                        });
                        importados++;
                    }
                }
                
                queryClient.invalidateQueries({ queryKey: ["servicos-snf"] });
                toast.success(`${importados} serviço(s) criado(s) com sucesso!`);
                setShowPasteForm(false);
                setPasteText("");
            } else {
                toast.error("Não foi possível identificar serviços no texto.");
            }
        } catch (error) {
            console.error("Erro ao processar texto:", error);
            toast.error("Erro ao processar texto. Tente novamente.");
        }
        
        setProcessingPaste(false);
    };

    let filteredServicos = servicos.filter(s => 
        s.cliente?.toLowerCase().includes(search.toLowerCase()) ||
        s.numero?.toLowerCase().includes(search.toLowerCase()) ||
        s.descricao?.toLowerCase().includes(search.toLowerCase())
    );

    if (filterStatus && filterStatus !== "todos") {
        filteredServicos = filteredServicos.filter(s => s.status === filterStatus);
    }

    const statusColors = {
        pendente: "bg-amber-100 text-amber-800 border-amber-200",
        em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
        concluido: "bg-emerald-100 text-emerald-800 border-emerald-200",
        cancelado: "bg-red-100 text-red-800 border-red-200"
    };

    const statusLabels = {
        pendente: "Pendente",
        em_andamento: "Em Andamento",
        concluido: "Concluído",
        cancelado: "Cancelado"
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
        if (!value) return "-";
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    };

    // Calcular totais
    const totalValor = filteredServicos.reduce((acc, s) => acc + (s.valor || 0), 0);
    const totalPendentes = servicos.filter(s => s.status === "pendente").length;
    const totalConcluidos = servicos.filter(s => s.status === "concluido").length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Serviços S/NF</h1>
                            <p className="text-slate-500">Serviços sem nota fiscal</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button 
                            onClick={() => setShowImportador(true)}
                            variant="outline"
                            className="border-purple-500 text-purple-700 hover:bg-purple-50"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar Arquivo
                        </Button>
                        <Button 
                            onClick={() => setShowPasteForm(true)}
                            variant="outline"
                            className="border-indigo-500 text-indigo-700 hover:bg-indigo-50"
                        >
                            <ClipboardPaste className="w-4 h-4 mr-2" />
                            Colar Texto
                        </Button>
                        <Button 
                            onClick={() => { setEditingServico(null); resetForm(); setShowForm(true); }}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Novo Serviço
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <FileText className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Serviços</p>
                                <p className="text-2xl font-bold text-slate-800">{servicos.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-xl">
                                <Truck className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Pendentes</p>
                                <p className="text-2xl font-bold text-slate-800">{totalPendentes}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <MapPin className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Concluídos</p>
                                <p className="text-2xl font-bold text-slate-800">{totalConcluidos}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Valor Total</p>
                                <p className="text-xl font-bold text-slate-800">{formatCurrency(totalValor)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filters */}
                <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Buscar por cliente, número ou descrição..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-white border-slate-200"
                                />
                            </div>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-40 bg-white">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                    <SelectItem value="concluido">Concluído</SelectItem>
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
                                        <TableHead>Nº</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Origem/Destino</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12">
                                                    <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredServicos.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                                                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                    Nenhum serviço encontrado
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredServicos.map((servico) => (
                                                <motion.tr
                                                    key={servico.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="hover:bg-slate-50 transition-colors"
                                                >
                                                    <TableCell className="font-mono text-slate-600">
                                                        {servico.numero || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600">
                                                        {formatDate(servico.data)}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-800">
                                                        {servico.cliente}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 max-w-[200px] truncate">
                                                        {servico.descricao || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 text-sm">
                                                        <div>
                                                            {servico.origem && <p>De: {servico.origem}</p>}
                                                            {servico.destino && <p>Para: {servico.destino}</p>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-green-600">
                                                        {formatCurrency(servico.valor)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${statusColors[servico.status]} border`}>
                                                            {statusLabels[servico.status]}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit(servico)}
                                                                className="hover:bg-blue-100"
                                                            >
                                                                <Pencil className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(servico)}
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-600" />
                            {editingServico ? "Editar Serviço" : "Novo Serviço S/NF"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Número</Label>
                                <Input
                                    value={form.numero}
                                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                                    placeholder="Nº do serviço"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data *</Label>
                                <Input
                                    type="date"
                                    value={form.data}
                                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Cliente *</Label>
                            <Input
                                value={form.cliente}
                                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                                placeholder="Nome do cliente"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição do Serviço</Label>
                            <Textarea
                                value={form.descricao}
                                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                placeholder="Descreva o serviço..."
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Origem</Label>
                                <Input
                                    value={form.origem}
                                    onChange={(e) => setForm({ ...form, origem: e.target.value })}
                                    placeholder="Local de origem"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Destino</Label>
                                <Input
                                    value={form.destino}
                                    onChange={(e) => setForm({ ...form, destino: e.target.value })}
                                    placeholder="Local de destino"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Valor (R$)</Label>
                                <Input
                                    value={form.valor}
                                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Motorista</Label>
                                <Select value={form.motorista_nome} onValueChange={(v) => setForm({ ...form, motorista_nome: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {motoristas.map(m => (
                                            <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Veículo</Label>
                                <Select value={form.veiculo_placa} onValueChange={(v) => setForm({ ...form, veiculo_placa: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {veiculos.map(v => (
                                            <SelectItem key={v.id} value={v.placa}>{v.placa} - {v.modelo}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                    <SelectItem value="concluido">Concluído</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={form.observacoes}
                                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                                placeholder="Observações..."
                                rows={2}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingServico(null); resetForm(); }}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                                {editingServico ? "Atualizar" : "Cadastrar"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Paste Dialog */}
            <Dialog open={showPasteForm} onOpenChange={setShowPasteForm}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardPaste className="w-5 h-5 text-indigo-600" />
                            Colar Informações de Serviços
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Cole abaixo as informações dos serviços. O sistema irá identificar automaticamente os dados.
                        </p>
                        <Textarea
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            placeholder="Cole aqui as informações dos serviços..."
                            rows={10}
                            className="font-mono text-sm"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setShowPasteForm(false); setPasteText(""); }}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button 
                                onClick={handleProcessPaste}
                                disabled={processingPaste || !pasteText.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                {processingPaste ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-1" /> Processar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Importador */}
            <ImportadorServicos 
                open={showImportador} 
                onClose={() => setShowImportador(false)} 
                onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["servicos-snf"] })}
            />
        </div>
    );
}