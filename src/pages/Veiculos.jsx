import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Plus, Search, Pencil, Trash2, Truck, X, Save
} from "lucide-react";

function VeiculoForm({ veiculo, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        placa: veiculo?.placa || "",
        modelo: veiculo?.modelo || "",
        marca: veiculo?.marca || "",
        ano: veiculo?.ano || "",
        cor: veiculo?.cor || "",
        tipo: veiculo?.tipo || "van",
        capacidade_kg: veiculo?.capacidade_kg || "",
        capacidade_m3: veiculo?.capacidade_m3 || "",
        renavam: veiculo?.renavam || "",
        chassi: veiculo?.chassi || "",
        km_atual: veiculo?.km_atual || "",
        status: veiculo?.status || "disponivel",
        observacoes: veiculo?.observacoes || ""
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...form,
            capacidade_kg: form.capacidade_kg ? Number(form.capacidade_kg) : null,
            capacidade_m3: form.capacidade_m3 ? Number(form.capacidade_m3) : null,
            km_atual: form.km_atual ? Number(form.km_atual) : null
        });
    };

    const tipoLabels = {
        van: "Van",
        caminhao_leve: "Caminhão Leve",
        caminhao_medio: "Caminhão Médio",
        caminhao_pesado: "Caminhão Pesado",
        carreta: "Carreta",
        utilitario: "Utilitário"
    };

    return (
        <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-teal-50 to-cyan-50">
                <CardTitle className="flex items-center justify-between">
                    <span>{veiculo ? "Editar Veículo" : "Novo Veículo"}</span>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Placa *</Label>
                            <Input
                                value={form.placa}
                                onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                                placeholder="ABC1D23"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Modelo *</Label>
                            <Input
                                value={form.modelo}
                                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Marca</Label>
                            <Input
                                value={form.marca}
                                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Ano</Label>
                            <Input
                                value={form.ano}
                                onChange={(e) => setForm({ ...form, ano: e.target.value })}
                                placeholder="2024"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Cor</Label>
                            <Input
                                value={form.cor}
                                onChange={(e) => setForm({ ...form, cor: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(tipoLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="disponivel">Disponível</SelectItem>
                                    <SelectItem value="em_uso">Em Uso</SelectItem>
                                    <SelectItem value="manutencao">Manutenção</SelectItem>
                                    <SelectItem value="inativo">Inativo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Capacidade (KG)</Label>
                            <Input
                                type="number"
                                value={form.capacidade_kg}
                                onChange={(e) => setForm({ ...form, capacidade_kg: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Capacidade (M³)</Label>
                            <Input
                                type="number"
                                value={form.capacidade_m3}
                                onChange={(e) => setForm({ ...form, capacidade_m3: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>KM Atual</Label>
                            <Input
                                type="number"
                                value={form.km_atual}
                                onChange={(e) => setForm({ ...form, km_atual: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>RENAVAM</Label>
                            <Input
                                value={form.renavam}
                                onChange={(e) => setForm({ ...form, renavam: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Chassi</Label>
                            <Input
                                value={form.chassi}
                                onChange={(e) => setForm({ ...form, chassi: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function Veiculos() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    const { data: veiculos = [], isLoading } = useQuery({
        queryKey: ["veiculos"],
        queryFn: () => base44.entities.Veiculo.list("-created_date")
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Veiculo.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["veiculos"] });
            setShowForm(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Veiculo.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["veiculos"] });
            setShowForm(false);
            setEditing(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Veiculo.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["veiculos"] })
    });

    const handleSubmit = (data) => {
        if (editing) {
            updateMutation.mutate({ id: editing.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const filtered = veiculos.filter(v => 
        v.placa?.toLowerCase().includes(search.toLowerCase()) ||
        v.modelo?.toLowerCase().includes(search.toLowerCase()) ||
        v.marca?.toLowerCase().includes(search.toLowerCase())
    );

    const statusColors = {
        disponivel: "bg-green-100 text-green-800",
        em_uso: "bg-blue-100 text-blue-800",
        manutencao: "bg-yellow-100 text-yellow-800",
        inativo: "bg-gray-100 text-gray-800"
    };

    const tipoLabels = {
        van: "Van",
        caminhao_leve: "Caminhão Leve",
        caminhao_medio: "Caminhão Médio",
        caminhao_pesado: "Caminhão Pesado",
        carreta: "Carreta",
        utilitario: "Utilitário"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg">
                            <Truck className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Veículos</h1>
                            <p className="text-slate-500">Gerencie a frota de veículos</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { setEditing(null); setShowForm(true); }}
                        className="bg-gradient-to-r from-teal-500 to-cyan-600"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Veículo
                    </Button>
                </div>

                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por placa, modelo ou marca..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 bg-white"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/80 border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Placa</TableHead>
                                    <TableHead>Modelo</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Capacidade</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12">
                                            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                                            Nenhum veículo encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((vei) => (
                                        <TableRow key={vei.id} className="hover:bg-slate-50">
                                            <TableCell className="font-bold text-teal-600">{vei.placa}</TableCell>
                                            <TableCell className="font-medium">{vei.modelo}</TableCell>
                                            <TableCell>{vei.marca || "-"}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{tipoLabels[vei.tipo] || vei.tipo}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {vei.capacidade_kg ? `${vei.capacidade_kg} KG` : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[vei.status]}>
                                                    {vei.status === "disponivel" ? "Disponível" : 
                                                     vei.status === "em_uso" ? "Em Uso" :
                                                     vei.status === "manutencao" ? "Manutenção" : "Inativo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setEditing(vei); setShowForm(true); }}
                                                    >
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            if (confirm(`Excluir veículo ${vei.placa}?`)) {
                                                                deleteMutation.mutate(vei.id);
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0">
                    <VeiculoForm
                        veiculo={editing}
                        onSubmit={handleSubmit}
                        onCancel={() => { setShowForm(false); setEditing(null); }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}