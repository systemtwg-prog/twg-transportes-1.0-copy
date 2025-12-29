import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Plus, FileText, Trash2, Pencil, Search, Save, X, Car, Truck, Package, Building2, Users
} from "lucide-react";
import TableColumnFilter from "@/components/shared/TableColumnFilter";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotasFiscais() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [columnFilters, setColumnFilters] = useState({
        destinatario: [],
        transportadora: [],
        filial: [],
        placa: []
    });
    const [filterFilial, setFilterFilial] = useState("");
    const [selecionados, setSelecionados] = useState([]);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [placaEmMassa, setPlacaEmMassa] = useState("");
    const [showCadastroDestinatario, setShowCadastroDestinatario] = useState(false);
    const [novoDestinatario, setNovoDestinatario] = useState({ nome: "" });
    
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        numero_nf: "",
        destinatario: "",
        peso: "",
        volume: "",
        transportadora: "",
        filial: "",
        placa: "",
        data: format(new Date(), "yyyy-MM-dd"),
        observacoes: ""
    });

    const { data: notas = [], isLoading } = useQuery({
        queryKey: ["notas-fiscais"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-notas"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const { data: transportadoras = [] } = useQuery({
        queryKey: ["transportadoras-notas"],
        queryFn: () => base44.entities.Transportadora.list()
    });

    const { data: destinatarios = [] } = useQuery({
        queryKey: ["destinatarios-notas"],
        queryFn: () => base44.entities.Destinatario.list()
    });

    // Criar destinatário
    const createDestinatarioMutation = useMutation({
        mutationFn: (data) => base44.entities.Destinatario.create(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["destinatarios-notas"] });
            setForm({ ...form, destinatario: data.nome });
            setShowCadastroDestinatario(false);
            setNovoDestinatario({ nome: "" });
            toast.success("Destinatário cadastrado!");
        }
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.NotaFiscal.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setShowForm(false);
            resetForm();
            toast.success("Nota fiscal cadastrada com sucesso!");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.NotaFiscal.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setShowForm(false);
            resetForm();
            toast.success("Nota fiscal atualizada!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.NotaFiscal.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            toast.success("Nota fiscal excluída!");
        }
    });

    // Mutation para atualizar em massa
    const updateEmMassaMutation = useMutation({
        mutationFn: async ({ ids, data }) => {
            for (const id of ids) {
                await base44.entities.NotaFiscal.update(id, data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setShowEditDialog(false);
            setSelecionados([]);
            setPlacaEmMassa("");
            toast.success("Notas fiscais atualizadas!");
        }
    });

    // Mutation para excluir em massa
    const deleteEmMassaMutation = useMutation({
        mutationFn: async (ids) => {
            for (const id of ids) {
                await base44.entities.NotaFiscal.delete(id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setSelecionados([]);
            toast.success("Notas fiscais excluídas!");
        }
    });

    const resetForm = () => {
        setForm({
            numero_nf: "",
            destinatario: "",
            peso: "",
            volume: "",
            transportadora: "",
            filial: "",
            placa: "",
            data: format(new Date(), "yyyy-MM-dd"),
            observacoes: ""
        });
        setEditing(null);
    };

    const handleEdit = (nota) => {
        setForm(nota);
        setEditing(nota);
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const toggleSelecionado = (id) => {
        setSelecionados(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selecionarTodos = () => {
        if (selecionados.length === filtered.length) {
            setSelecionados([]);
        } else {
            setSelecionados(filtered.map(n => n.id));
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const filtered = notas.filter(n => {
        // Busca geral
        const matchSearch = !search || 
            n.numero_nf?.toLowerCase().includes(search.toLowerCase()) ||
            n.destinatario?.toLowerCase().includes(search.toLowerCase()) ||
            n.transportadora?.toLowerCase().includes(search.toLowerCase());

        // Filtro de filial (select)
        const matchFilialSelect = !filterFilial || filterFilial === "todas" || n.filial === filterFilial;

        // Filtros de coluna
        const matchDestinatario = columnFilters.destinatario.length === 0 || 
            columnFilters.destinatario.includes(n.destinatario || "");
        const matchTransportadora = columnFilters.transportadora.length === 0 || 
            columnFilters.transportadora.includes(n.transportadora || "");
        const matchFilial = columnFilters.filial.length === 0 || 
            columnFilters.filial.includes(n.filial || "");
        const matchPlaca = columnFilters.placa.length === 0 || 
            columnFilters.placa.includes(n.placa || "");

        return matchSearch && matchFilialSelect && matchDestinatario && matchTransportadora && matchFilial && matchPlaca;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Notas Fiscais</h1>
                            <p className="text-slate-500">Gerencie notas fiscais para romaneios</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link to={createPageUrl("MascaraRomaneio")}>
                            <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                                <Truck className="w-4 h-4 mr-2" />
                                Máscara Romaneio
                            </Button>
                        </Link>
                        <Link to={createPageUrl("RomaneiosGerados")}>
                            <Button variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50">
                                <Package className="w-4 h-4 mr-2" />
                                Romaneios Gerados
                            </Button>
                        </Link>
                    </div>
                    <Button 
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nova Nota
                    </Button>
                </div>

                {/* Search e Ações em Massa */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Buscar por NF, destinatário ou transportadora..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                            <Select value={filterFilial} onValueChange={setFilterFilial}>
                                <SelectTrigger className="w-40 bg-white">
                                    <SelectValue placeholder="Filial" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todas Filiais</SelectItem>
                                    {[...new Set(notas.map(n => n.filial).filter(Boolean))].map(filial => (
                                        <SelectItem key={filial} value={filial}>{filial}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2 flex-wrap">
                                <Button variant="outline" onClick={selecionarTodos}>
                                    {selecionados.length === filtered.length && filtered.length > 0 ? "Desmarcar Todos" : "Selecionar Todos"}
                                </Button>
                                {selecionados.length > 0 && (
                                    <>
                                        <Button 
                                            variant="outline"
                                            className="border-green-500 text-green-700 hover:bg-green-50"
                                            onClick={() => setShowEditDialog(true)}
                                        >
                                            <Car className="w-4 h-4 mr-1" />
                                            Atribuir Placa ({selecionados.length})
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            className="border-blue-500 text-blue-700 hover:bg-blue-50"
                                            onClick={() => {
                                                const notasSelecionadas = notas.filter(n => selecionados.includes(n.id));
                                                const destinatariosUnicos = [...new Set(notasSelecionadas.map(n => n.destinatario).filter(Boolean))];
                                                
                                                const novosDestinatarios = destinatariosUnicos.filter(nome => 
                                                    !destinatarios.some(d => d.nome.toLowerCase() === nome.toLowerCase())
                                                );
                                                
                                                if (novosDestinatarios.length === 0) {
                                                    toast.info("Todos os destinatários já estão cadastrados!");
                                                    return;
                                                }
                                                
                                                if (confirm(`Cadastrar ${novosDestinatarios.length} destinatário(s) novo(s)?`)) {
                                                    Promise.all(
                                                        novosDestinatarios.map(nome => 
                                                            base44.entities.Destinatario.create({ nome })
                                                        )
                                                    ).then(() => {
                                                        queryClient.invalidateQueries({ queryKey: ["destinatarios-notas"] });
                                                        toast.success(`${novosDestinatarios.length} destinatário(s) cadastrado(s)!`);
                                                    }).catch(err => {
                                                        console.error(err);
                                                        toast.error("Erro ao cadastrar destinatários");
                                                    });
                                                }
                                            }}
                                        >
                                            <Users className="w-4 h-4 mr-1" />
                                            Cadastrar Destinatários ({selecionados.length})
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            className="border-red-500 text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                if (confirm(`Excluir ${selecionados.length} nota(s) fiscal(is)?`)) {
                                                    deleteEmMassaMutation.mutate(selecionados);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Excluir ({selecionados.length})
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabela */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-10">
                                            <Checkbox 
                                                checked={selecionados.length === filtered.length && filtered.length > 0}
                                                onCheckedChange={selecionarTodos}
                                            />
                                        </TableHead>
                                        <TableHead>NF</TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Destinatário
                                                <TableColumnFilter
                                                    data={notas}
                                                    columnKey="destinatario"
                                                    columnLabel="Destinatário"
                                                    selectedValues={columnFilters.destinatario}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, destinatario: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead>Peso</TableHead>
                                        <TableHead>Volume</TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Transportadora
                                                <TableColumnFilter
                                                    data={notas}
                                                    columnKey="transportadora"
                                                    columnLabel="Transportadora"
                                                    selectedValues={columnFilters.transportadora}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, transportadora: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Filial
                                                <TableColumnFilter
                                                    data={notas}
                                                    columnKey="filial"
                                                    columnLabel="Filial"
                                                    selectedValues={columnFilters.filial}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, filial: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Placa
                                                <TableColumnFilter
                                                    data={notas}
                                                    columnKey="placa"
                                                    columnLabel="Placa"
                                                    selectedValues={columnFilters.placa}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, placa: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-12">
                                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-12 text-slate-500">
                                                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                Nenhuma nota fiscal encontrada
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((nota) => (
                                            <TableRow key={nota.id} className={`hover:bg-slate-50 ${selecionados.includes(nota.id) ? "bg-blue-50" : ""}`}>
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={selecionados.includes(nota.id)}
                                                        onCheckedChange={() => toggleSelecionado(nota.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-bold text-blue-600">{nota.numero_nf}</TableCell>
                                                <TableCell className="font-medium">{nota.destinatario}</TableCell>
                                                <TableCell>{nota.peso || "-"}</TableCell>
                                                <TableCell>{nota.volume || "-"}</TableCell>
                                                <TableCell>{nota.transportadora || "-"}</TableCell>
                                                <TableCell className="font-medium text-purple-600">{nota.filial || "-"}</TableCell>
                                                <TableCell className="font-medium text-emerald-600">{nota.placa || "-"}</TableCell>
                                                <TableCell>{formatDate(nota.data)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(nota)}>
                                                            <Pencil className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => {
                                                            if (confirm("Excluir esta nota fiscal?")) deleteMutation.mutate(nota.id);
                                                        }}>
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
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

            {/* Dialog Atribuir Placa em Massa */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-green-600" />
                            Atribuir Placa
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Atribuir placa a <strong>{selecionados.length}</strong> nota(s) fiscal(is) selecionada(s).
                        </p>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Car className="w-4 h-4" /> Placa do Veículo
                            </Label>
                            <Select value={placaEmMassa} onValueChange={setPlacaEmMassa}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione a placa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {veiculos.map(v => (
                                        <SelectItem key={v.id} value={v.placa}>
                                            {v.placa} - {v.modelo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => {
                                    if (placaEmMassa) {
                                        updateEmMassaMutation.mutate({ ids: selecionados, data: { placa: placaEmMassa } });
                                    }
                                }}
                                disabled={updateEmMassaMutation.isPending || !placaEmMassa}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {updateEmMassaMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Cadastrar Destinatário */}
            <Dialog open={showCadastroDestinatario} onOpenChange={setShowCadastroDestinatario}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-600" />
                            Cadastrar Destinatário
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Cadastre um novo destinatário para usar nas notas fiscais.
                        </p>
                        <div className="space-y-2">
                            <Label>Nome *</Label>
                            <Input
                                value={novoDestinatario.nome}
                                onChange={(e) => setNovoDestinatario({ nome: e.target.value })}
                                placeholder="Nome do destinatário"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => { setShowCadastroDestinatario(false); setNovoDestinatario({ nome: "" }); }}
                            >
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button 
                                onClick={() => createDestinatarioMutation.mutate(novoDestinatario)}
                                disabled={!novoDestinatario.nome || createDestinatarioMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {createDestinatarioMutation.isPending ? "Salvando..." : (
                                    <>
                                        <Save className="w-4 h-4 mr-1" /> Salvar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            {editing ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Número NF *</Label>
                                <Input
                                    value={form.numero_nf}
                                    onChange={(e) => setForm({ ...form, numero_nf: e.target.value })}
                                    required
                                    placeholder="Ex: 123456"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    value={form.data}
                                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center justify-between">
                                <span>Destinatário *</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowCadastroDestinatario(true)}
                                    className="text-blue-600 hover:text-blue-700 h-auto p-0"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Cadastrar Novo
                                </Button>
                            </Label>
                            <div className="space-y-2">
                                <Input
                                    value={form.destinatario}
                                    onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                                    required
                                    placeholder="Digite o nome do destinatário..."
                                    className="bg-white"
                                    list="destinatarios-list"
                                />
                                <datalist id="destinatarios-list">
                                    {destinatarios
                                        .sort((a, b) => a.nome.localeCompare(b.nome))
                                        .filter(d => d.nome.toLowerCase().includes(form.destinatario.toLowerCase()))
                                        .map(d => (
                                            <option key={d.id} value={d.nome}>
                                                {d.cidade && `${d.nome} (${d.cidade})`}
                                            </option>
                                        ))}
                                </datalist>
                                {form.destinatario && (
                                    <div className="text-xs text-slate-500">
                                        {destinatarios.filter(d => 
                                            d.nome.toLowerCase().includes(form.destinatario.toLowerCase())
                                        ).length} destinatário(s) encontrado(s)
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Peso</Label>
                                <Input
                                    value={form.peso}
                                    onChange={(e) => setForm({ ...form, peso: e.target.value })}
                                    placeholder="Ex: 100kg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Volume</Label>
                                <Input
                                    value={form.volume}
                                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                                    placeholder="Ex: 5"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Transportadora</Label>
                                <Input
                                    value={form.transportadora}
                                    onChange={(e) => setForm({ ...form, transportadora: e.target.value })}
                                    placeholder="Nome da transportadora"
                                    className="bg-white"
                                    list="transportadoras-list"
                                />
                                <datalist id="transportadoras-list">
                                    {transportadoras
                                        .sort((a, b) => (a.razao_social || a.nome_fantasia || "").localeCompare(b.razao_social || b.nome_fantasia || ""))
                                        .filter(t => {
                                            const nome = (t.razao_social || t.nome_fantasia || "").toLowerCase();
                                            return nome.includes((form.transportadora || "").toLowerCase());
                                        })
                                        .map(t => (
                                            <option key={t.id} value={t.razao_social || t.nome_fantasia}>
                                                {t.cidade && `${t.razao_social || t.nome_fantasia} (${t.cidade})`}
                                            </option>
                                        ))}
                                </datalist>
                                {form.transportadora && (
                                    <div className="text-xs text-slate-500">
                                        {transportadoras.filter(t => 
                                            (t.razao_social || t.nome_fantasia || "").toLowerCase().includes(form.transportadora.toLowerCase())
                                        ).length} transportadora(s) encontrada(s)
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Filial
                                </Label>
                                <Input
                                    value={form.filial}
                                    onChange={(e) => setForm({ ...form, filial: e.target.value })}
                                    placeholder="Ex: SP, RJ, MG..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Car className="w-4 h-4" /> Placa do Veículo
                            </Label>
                            <Select value={form.placa} onValueChange={(v) => setForm({ ...form, placa: v })}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione a placa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {veiculos.map(v => (
                                        <SelectItem key={v.id} value={v.placa}>
                                            {v.placa} - {v.modelo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                <Save className="w-4 h-4 mr-1" /> Salvar
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}