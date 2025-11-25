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
    Plus, Search, Pencil, Trash2, User, Phone, 
    CreditCard, Calendar, X, Save
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function MotoristaForm({ motorista, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        nome: motorista?.nome || "",
        cpf: motorista?.cpf || "",
        cnh: motorista?.cnh || "",
        categoria_cnh: motorista?.categoria_cnh || "B",
        validade_cnh: motorista?.validade_cnh || "",
        telefone: motorista?.telefone || "",
        email: motorista?.email || "",
        endereco: motorista?.endereco || "",
        data_admissao: motorista?.data_admissao || "",
        status: motorista?.status || "ativo",
        observacoes: motorista?.observacoes || ""
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-amber-50">
                <CardTitle className="flex items-center justify-between">
                    <span>{motorista ? "Editar Motorista" : "Novo Motorista"}</span>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome Completo *</Label>
                            <Input
                                value={form.nome}
                                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>CPF *</Label>
                            <Input
                                value={form.cpf}
                                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                                placeholder="000.000.000-00"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>CNH *</Label>
                            <Input
                                value={form.cnh}
                                onChange={(e) => setForm({ ...form, cnh: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Categoria CNH</Label>
                            <Select value={form.categoria_cnh} onValueChange={(v) => setForm({ ...form, categoria_cnh: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"].map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Validade CNH</Label>
                            <Input
                                type="date"
                                value={form.validade_cnh}
                                onChange={(e) => setForm({ ...form, validade_cnh: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input
                                value={form.telefone}
                                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Endereço</Label>
                        <Input
                            value={form.endereco}
                            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data de Admissão</Label>
                            <Input
                                type="date"
                                value={form.data_admissao}
                                onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ativo">Ativo</SelectItem>
                                    <SelectItem value="inativo">Inativo</SelectItem>
                                    <SelectItem value="ferias">Férias</SelectItem>
                                    <SelectItem value="afastado">Afastado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function Motoristas() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    const { data: motoristas = [], isLoading } = useQuery({
        queryKey: ["motoristas"],
        queryFn: () => base44.entities.Motorista.list("-created_date")
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Motorista.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["motoristas"] });
            setShowForm(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Motorista.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["motoristas"] });
            setShowForm(false);
            setEditing(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Motorista.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["motoristas"] })
    });

    const handleSubmit = (data) => {
        if (editing) {
            updateMutation.mutate({ id: editing.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const filtered = motoristas.filter(m => 
        m.nome?.toLowerCase().includes(search.toLowerCase()) ||
        m.cpf?.includes(search) ||
        m.cnh?.includes(search)
    );

    const statusColors = {
        ativo: "bg-green-100 text-green-800",
        inativo: "bg-gray-100 text-gray-800",
        ferias: "bg-blue-100 text-blue-800",
        afastado: "bg-yellow-100 text-yellow-800"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Motoristas</h1>
                            <p className="text-slate-500">Gerencie os motoristas da frota</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { setEditing(null); setShowForm(true); }}
                        className="bg-gradient-to-r from-orange-500 to-amber-600"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Motorista
                    </Button>
                </div>

                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por nome, CPF ou CNH..."
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
                                    <TableHead>Nome</TableHead>
                                    <TableHead>CPF</TableHead>
                                    <TableHead>CNH</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Telefone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12">
                                            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                                            Nenhum motorista encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((mot) => (
                                        <TableRow key={mot.id} className="hover:bg-slate-50">
                                            <TableCell className="font-medium">{mot.nome}</TableCell>
                                            <TableCell className="font-mono text-sm">{mot.cpf}</TableCell>
                                            <TableCell className="font-mono text-sm">{mot.cnh}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{mot.categoria_cnh}</Badge>
                                            </TableCell>
                                            <TableCell>{mot.telefone || "-"}</TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[mot.status]}>
                                                    {mot.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setEditing(mot); setShowForm(true); }}
                                                    >
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            if (confirm(`Excluir motorista ${mot.nome}?`)) {
                                                                deleteMutation.mutate(mot.id);
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
                    <MotoristaForm
                        motorista={editing}
                        onSubmit={handleSubmit}
                        onCancel={() => { setShowForm(false); setEditing(null); }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}