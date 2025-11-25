import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Plus, Search, Pencil, Trash2, Calendar, Package,
    X, Save, Star, Copy, Menu
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function ColetaForm({ coleta, onSubmit, onCancel }) {
    const { data: clientes = [] } = useQuery({
        queryKey: ["clientes"],
        queryFn: () => base44.entities.Cliente.list()
    });

    const [searchRemetente, setSearchRemetente] = useState("");
    const [searchDestinatario, setSearchDestinatario] = useState("");
    const [form, setForm] = useState({
        data_coleta: coleta?.data_coleta || format(new Date(), "yyyy-MM-dd"),
        remetente_id: coleta?.remetente_id || "",
        remetente_nome: coleta?.remetente_nome || "",
        remetente_endereco: coleta?.remetente_endereco || "",
        remetente_bairro: coleta?.remetente_bairro || "",
        remetente_cidade: coleta?.remetente_cidade || "",
        remetente_cep: coleta?.remetente_cep || "",
        remetente_telefone: coleta?.remetente_telefone || "",
        remetente_horario: coleta?.remetente_horario || "",
        remetente_intervalo: coleta?.remetente_intervalo || "",
        destinatario_id: coleta?.destinatario_id || "",
        destinatario_nome: coleta?.destinatario_nome || "",
        volume: coleta?.volume || "",
        peso: coleta?.peso || "",
        nfe: coleta?.nfe || "",
        status: coleta?.status || "pendente",
        recado: coleta?.recado || ""
    });

    const remetentes = clientes.filter(c => c.tipo === "remetente" || c.tipo === "ambos");
    const destinatarios = clientes.filter(c => c.tipo === "destinatario" || c.tipo === "ambos");
    const remetentesFavoritos = remetentes.filter(c => c.favorito);
    const destinatariosFavoritos = destinatarios.filter(c => c.favorito);

    // Filtrar remetentes pela pesquisa
    const filteredRemetentes = remetentes.filter(c => {
        if (!searchRemetente) return true;
        const search = searchRemetente.toLowerCase();
        return c.razao_social?.toLowerCase().includes(search) ||
               c.cnpj_cpf?.toLowerCase().includes(search) ||
               c.codigo?.toLowerCase().includes(search);
    });

    // Filtrar destinatários pela pesquisa
    const filteredDestinatarios = destinatarios.filter(c => {
        if (!searchDestinatario) return true;
        const search = searchDestinatario.toLowerCase();
        return c.razao_social?.toLowerCase().includes(search) ||
               c.cnpj_cpf?.toLowerCase().includes(search) ||
               c.codigo?.toLowerCase().includes(search);
    });

    const selectRemetente = (clienteId) => {
        const cliente = clientes.find(c => c.id === clienteId);
        if (cliente) {
            const horario = cliente.horario_funcionamento_inicio && cliente.horario_funcionamento_fim
                ? `${cliente.horario_funcionamento_inicio} AS ${cliente.horario_funcionamento_fim}`
                : "";
            const intervalo = cliente.horario_almoco_inicio && cliente.horario_almoco_fim
                ? `${cliente.horario_almoco_inicio} AS ${cliente.horario_almoco_fim}`
                : "";
            
            setForm(prev => ({
                ...prev,
                remetente_id: cliente.id,
                remetente_nome: cliente.razao_social,
                remetente_endereco: cliente.endereco || "",
                remetente_bairro: cliente.bairro || "",
                remetente_cidade: `${cliente.cidade || ""}${cliente.uf ? "/" + cliente.uf : ""}`,
                remetente_cep: cliente.cep || "",
                remetente_telefone: cliente.telefone || "",
                remetente_horario: horario,
                remetente_intervalo: intervalo
            }));
        }
    };

    const selectDestinatario = (clienteId) => {
        const cliente = clientes.find(c => c.id === clienteId);
        if (cliente) {
            setForm(prev => ({
                ...prev,
                destinatario_id: cliente.id,
                destinatario_nome: cliente.razao_social
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="flex items-center justify-between">
                    <span>{coleta ? "Editar Coleta" : "Nova Coleta Diária"}</span>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Data da Coleta *</Label>
                            <Input
                                type="date"
                                value={form.data_coleta}
                                onChange={(e) => setForm({ ...form, data_coleta: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="realizado">Realizado</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Remetente */}
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <h3 className="font-semibold text-amber-800 mb-4">REMETENTE</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                                <Label>Selecionar Cliente</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar por nome, CNPJ ou CPF..."
                                        value={searchRemetente}
                                        onChange={(e) => setSearchRemetente(e.target.value)}
                                        className="pl-9 mb-2"
                                    />
                                </div>
                                <Select value={form.remetente_id} onValueChange={selectRemetente}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o remetente..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {!searchRemetente && remetentesFavoritos.length > 0 && (
                                            <>
                                                <div className="px-2 py-1 text-xs text-amber-600 font-semibold flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-amber-500" /> Favoritos
                                                </div>
                                                {remetentesFavoritos.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        ⭐ {c.razao_social}
                                                    </SelectItem>
                                                ))}
                                                <div className="border-t my-1" />
                                            </>
                                        )}
                                        {filteredRemetentes.filter(c => !c.favorito || searchRemetente).map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.razao_social} {c.cnpj_cpf ? `(${c.cnpj_cpf})` : ""}
                                            </SelectItem>
                                        ))}
                                        {filteredRemetentes.length === 0 && (
                                            <div className="p-2 text-sm text-slate-500 text-center">Nenhum resultado</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nome *</Label>
                                <Input
                                    value={form.remetente_nome}
                                    onChange={(e) => setForm({ ...form, remetente_nome: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Endereço</Label>
                                <Input
                                    value={form.remetente_endereco}
                                    onChange={(e) => setForm({ ...form, remetente_endereco: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Bairro - Cidade</Label>
                                <Input
                                    value={`${form.remetente_bairro}${form.remetente_cidade ? " - " + form.remetente_cidade : ""}`}
                                    onChange={(e) => setForm({ ...form, remetente_bairro: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="space-y-2">
                                <Label>CEP</Label>
                                <Input
                                    value={form.remetente_cep}
                                    onChange={(e) => setForm({ ...form, remetente_cep: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefone</Label>
                                <Input
                                    value={form.remetente_telefone}
                                    onChange={(e) => setForm({ ...form, remetente_telefone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Horário</Label>
                                <Input
                                    value={form.remetente_horario}
                                    onChange={(e) => setForm({ ...form, remetente_horario: e.target.value })}
                                    placeholder="08:00 AS 17:00"
                                />
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Label>Intervalo</Label>
                            <Input
                                value={form.remetente_intervalo}
                                onChange={(e) => setForm({ ...form, remetente_intervalo: e.target.value })}
                                placeholder="12:00 AS 13:00"
                            />
                        </div>
                    </div>

                    {/* Destinatário */}
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <h3 className="font-semibold text-emerald-800 mb-4">DESTINATÁRIO</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Selecionar Cliente</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar por nome, CNPJ ou CPF..."
                                        value={searchDestinatario}
                                        onChange={(e) => setSearchDestinatario(e.target.value)}
                                        className="pl-9 mb-2"
                                    />
                                </div>
                                <Select value={form.destinatario_id} onValueChange={selectDestinatario}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o destinatário..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {!searchDestinatario && destinatariosFavoritos.length > 0 && (
                                            <>
                                                <div className="px-2 py-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-emerald-500" /> Favoritos
                                                </div>
                                                {destinatariosFavoritos.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        ⭐ {c.razao_social}
                                                    </SelectItem>
                                                ))}
                                                <div className="border-t my-1" />
                                            </>
                                        )}
                                        {filteredDestinatarios.filter(c => !c.favorito || searchDestinatario).map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.razao_social} {c.cnpj_cpf ? `(${c.cnpj_cpf})` : ""}
                                            </SelectItem>
                                        ))}
                                        {filteredDestinatarios.length === 0 && (
                                            <div className="p-2 text-sm text-slate-500 text-center">Nenhum resultado</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nome *</Label>
                                <Input
                                    value={form.destinatario_nome}
                                    onChange={(e) => setForm({ ...form, destinatario_nome: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dados Carga */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h3 className="font-semibold text-blue-800 mb-4">DADOS DA CARGA</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Volume</Label>
                                <Input
                                    value={form.volume}
                                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                                    placeholder="02 VOL"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Peso</Label>
                                <Input
                                    value={form.peso}
                                    onChange={(e) => setForm({ ...form, peso: e.target.value })}
                                    placeholder="10 KG"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>NFe</Label>
                                <Input
                                    value={form.nfe}
                                    onChange={(e) => setForm({ ...form, nfe: e.target.value })}
                                    placeholder="10000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Recado */}
                    <div className="space-y-2">
                        <Label>Recado / Observação</Label>
                        <Textarea
                            value={form.recado}
                            onChange={(e) => setForm({ ...form, recado: e.target.value })}
                            placeholder="Observações importantes..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function AdicionarColetaDiaria() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("todos");
    const queryClient = useQueryClient();

    const { data: coletas = [], isLoading } = useQuery({
        queryKey: ["coletas-diarias"],
        queryFn: () => base44.entities.ColetaDiaria.list("-created_date")
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ColetaDiaria.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["coletas-diarias"] });
            setShowForm(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ColetaDiaria.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["coletas-diarias"] });
            setShowForm(false);
            setEditing(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ColetaDiaria.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coletas-diarias"] })
    });

    const handleSubmit = (data) => {
        if (editing && editing.id) {
            updateMutation.mutate({ id: editing.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDuplicate = (coleta) => {
        const nova = { ...coleta };
        delete nova.id;
        delete nova.created_date;
        delete nova.updated_date;
        delete nova.created_by;
        nova.data_coleta = new Date().toISOString().split("T")[0];
        nova.status = "pendente";
        setEditing(nova);
        setShowForm(true);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    let filtered = coletas.filter(c => 
        c.remetente_nome?.toLowerCase().includes(search.toLowerCase()) ||
        c.destinatario_nome?.toLowerCase().includes(search.toLowerCase())
    );

    if (statusFilter !== "todos") {
        filtered = filtered.filter(c => c.status === statusFilter);
    }

    const statusColors = {
        pendente: "bg-yellow-100 text-yellow-800",
        realizado: "bg-green-100 text-green-800",
        cancelado: "bg-red-100 text-red-800"
    };

    const statusLabels = {
        pendente: "Pendente",
        realizado: "Realizado",
        cancelado: "Cancelado"
    };

    const menuItems = [
        { name: "Home", href: "Home" },
        { name: "Ordens de Coleta", href: "OrdensColeta" },
        { name: "Adicionar Coletas", href: "AdicionarColetaDiaria" },
        { name: "Coletas Diárias", href: "ColetasDiarias" },
        { name: "Clientes", href: "Clientes" },
        { name: "Colaboradores", href: "Motoristas" },
        { name: "Veículos", href: "Veiculos" },
        { name: "Rastreamento", href: "Rastreamento" },
        { name: "Comprovantes", href: "Comprovantes" },
        { name: "Relatórios", href: "Relatorios" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Menu rápido no topo */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <Menu className="w-5 h-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64">
                            <h2 className="font-bold text-lg mb-4">Menu</h2>
                            <div className="space-y-2">
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        to={createPageUrl(item.href)}
                                        className="block p-3 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>
                    {menuItems.slice(0, 6).map((item) => (
                        <Link key={item.href} to={createPageUrl(item.href)}>
                            <Button 
                                variant={item.href === "AdicionarColetaDiaria" ? "default" : "outline"} 
                                size="sm"
                                className={item.href === "AdicionarColetaDiaria" ? "bg-indigo-600" : ""}
                            >
                                {item.name}
                            </Button>
                        </Link>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Adicionar Coletas</h1>
                            <p className="text-slate-500">Cadastre novas coletas diárias</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { setEditing(null); setShowForm(true); }}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nova Coleta
                    </Button>
                </div>

                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Buscar por remetente ou destinatário..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-48 bg-white">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="realizado">Realizado</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Data</TableHead>
                                    <TableHead>Remetente</TableHead>
                                    <TableHead>Destinatário</TableHead>
                                    <TableHead>Carga</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                            Nenhuma coleta encontrada
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((coleta) => (
                                        <TableRow key={coleta.id} className="hover:bg-slate-50">
                                            <TableCell className="font-medium">
                                                {formatDate(coleta.data_coleta)}
                                            </TableCell>
                                            <TableCell>{coleta.remetente_nome}</TableCell>
                                            <TableCell>{coleta.destinatario_nome}</TableCell>
                                            <TableCell className="text-sm">
                                                {coleta.volume} / {coleta.peso}
                                                {coleta.nfe && <span className="block text-xs text-slate-500">NFe: {coleta.nfe}</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[coleta.status]}>
                                                    {statusLabels[coleta.status]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDuplicate(coleta)}
                                                        title="Duplicar"
                                                    >
                                                        <Copy className="w-4 h-4 text-purple-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setEditing(coleta); setShowForm(true); }}
                                                    >
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            if (confirm("Excluir esta coleta?")) {
                                                                deleteMutation.mutate(coleta.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0">
                    <ColetaForm
                        coleta={editing}
                        onSubmit={handleSubmit}
                        onCancel={() => { setShowForm(false); setEditing(null); }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}