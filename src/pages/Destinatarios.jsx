import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pencil, Trash2, Users, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function Destinatarios() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [form, setForm] = useState({
        nome: "",
        cnpj_cpf: "",
        endereco: "",
        cidade: "",
        uf: "",
        telefone: "",
        observacoes: ""
    });

    const queryClient = useQueryClient();

    const { data: destinatarios = [], isLoading } = useQuery({
        queryKey: ["destinatarios"],
        queryFn: () => base44.entities.Destinatario.list()
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Destinatario.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["destinatarios"] });
            setShowForm(false);
            resetForm();
            toast.success("Destinatário cadastrado!");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Destinatario.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["destinatarios"] });
            setShowForm(false);
            resetForm();
            toast.success("Destinatário atualizado!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Destinatario.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["destinatarios"] });
            toast.success("Destinatário excluído!");
        }
    });

    const resetForm = () => {
        setForm({
            nome: "",
            cnpj_cpf: "",
            endereco: "",
            cidade: "",
            uf: "",
            telefone: "",
            observacoes: ""
        });
        setEditing(null);
    };

    const handleEdit = (dest) => {
        setForm(dest);
        setEditing(dest);
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

    const filtered = destinatarios.filter(d =>
        d.nome?.toLowerCase().includes(search.toLowerCase()) ||
        d.cidade?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Destinatários</h1>
                            <p className="text-slate-500">Gerencie destinatários de notas fiscais</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Destinatário
                    </Button>
                </div>

                {/* Search */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por nome ou cidade..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 bg-white"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="bg-white/80 border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead>Nome</TableHead>
                                    <TableHead>CNPJ/CPF</TableHead>
                                    <TableHead>Cidade/UF</TableHead>
                                    <TableHead>Telefone</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                            Nenhum destinatário encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((dest) => (
                                        <TableRow key={dest.id} className="hover:bg-slate-50">
                                            <TableCell className="font-semibold">{dest.nome}</TableCell>
                                            <TableCell>{dest.cnpj_cpf || "-"}</TableCell>
                                            <TableCell>{dest.cidade ? `${dest.cidade}/${dest.uf || ""}` : "-"}</TableCell>
                                            <TableCell>{dest.telefone || "-"}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(dest)}>
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        if (confirm("Excluir este destinatário?")) deleteMutation.mutate(dest.id);
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
                    </CardContent>
                </Card>
            </div>

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            {editing ? "Editar Destinatário" : "Novo Destinatário"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome *</Label>
                            <Input
                                value={form.nome}
                                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                required
                                placeholder="Nome do destinatário"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>CNPJ/CPF</Label>
                                <Input
                                    value={form.cnpj_cpf}
                                    onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })}
                                    placeholder="00.000.000/0001-00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefone</Label>
                                <Input
                                    value={form.telefone}
                                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                                    placeholder="(00) 0000-0000"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Endereço</Label>
                            <Input
                                value={form.endereco}
                                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                                placeholder="Rua, número, bairro"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label>Cidade</Label>
                                <Input
                                    value={form.cidade}
                                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                                    placeholder="Cidade"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>UF</Label>
                                <Input
                                    value={form.uf}
                                    onChange={(e) => setForm({ ...form, uf: e.target.value })}
                                    placeholder="SP"
                                    maxLength={2}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={form.observacoes}
                                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                                placeholder="Observações adicionais..."
                                rows={3}
                            />
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