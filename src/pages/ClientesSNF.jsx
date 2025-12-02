import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
    Plus, Search, Pencil, Trash2, Users, Building2, Upload, Loader2, X, Save
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import ImportadorClientesSNF from "@/components/clientes/ImportadorClientesSNF";

export default function ClientesSNF() {
    const [showForm, setShowForm] = useState(false);
    const [showImportador, setShowImportador] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        endereco: "",
        cidade: "",
        uf: "",
        telefone: "",
        email: "",
        contato: "",
        observacoes: ""
    });

    const { data: clientes = [], isLoading } = useQuery({
        queryKey: ["clientes-snf"],
        queryFn: () => base44.entities.ClienteSNF.list("-created_date")
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ClienteSNF.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientes-snf"] });
            setShowForm(false);
            resetForm();
            toast.success("Cliente cadastrado!");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ClienteSNF.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientes-snf"] });
            setShowForm(false);
            setEditing(null);
            resetForm();
            toast.success("Cliente atualizado!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ClienteSNF.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientes-snf"] });
            toast.success("Cliente excluído!");
        }
    });

    const resetForm = () => {
        setForm({
            razao_social: "",
            nome_fantasia: "",
            cnpj: "",
            endereco: "",
            cidade: "",
            uf: "",
            telefone: "",
            email: "",
            contato: "",
            observacoes: ""
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const handleEdit = (cliente) => {
        setEditing(cliente);
        setForm({
            razao_social: cliente.razao_social || "",
            nome_fantasia: cliente.nome_fantasia || "",
            cnpj: cliente.cnpj || "",
            endereco: cliente.endereco || "",
            cidade: cliente.cidade || "",
            uf: cliente.uf || "",
            telefone: cliente.telefone || "",
            email: cliente.email || "",
            contato: cliente.contato || "",
            observacoes: cliente.observacoes || ""
        });
        setShowForm(true);
    };

    const filtered = clientes.filter(c => 
        c.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
        c.cnpj?.includes(search)
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Clientes S/NF</h1>
                            <p className="text-slate-500">Cadastro de clientes para serviços sem nota fiscal</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button 
                            onClick={() => setShowImportador(true)}
                            variant="outline" 
                            className="border-indigo-500 text-indigo-700"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar Arquivo
                        </Button>
                        <Button 
                            onClick={() => { setEditing(null); resetForm(); setShowForm(true); }}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Novo Cliente
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-indigo-100 rounded-xl">
                                <Building2 className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Clientes</p>
                                <p className="text-2xl font-bold text-slate-800">{clientes.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por razão social ou CNPJ..."
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
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>CNPJ</TableHead>
                                        <TableHead>Razão Social</TableHead>
                                        <TableHead>Cidade/UF</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12">
                                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filtered.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                                    Nenhum cliente encontrado
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filtered.map((cliente) => (
                                                <motion.tr
                                                    key={cliente.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="hover:bg-slate-50"
                                                >
                                                    <TableCell className="font-mono text-sm">{cliente.cnpj}</TableCell>
                                                    <TableCell className="font-medium">
                                                        <div>
                                                            <p>{cliente.razao_social}</p>
                                                            {cliente.nome_fantasia && (
                                                                <p className="text-xs text-slate-500">{cliente.nome_fantasia}</p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{cliente.cidade}{cliente.uf ? `/${cliente.uf}` : ""}</TableCell>
                                                    <TableCell>{cliente.telefone || "-"}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(cliente)}>
                                                                <Pencil className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => {
                                                                if (confirm("Excluir este cliente?")) deleteMutation.mutate(cliente.id);
                                                            }}>
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
                            <Users className="w-5 h-5 text-indigo-600" />
                            {editing ? "Editar Cliente" : "Novo Cliente S/NF"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label>Razão Social *</Label>
                                <Input
                                    value={form.razao_social}
                                    onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nome Fantasia</Label>
                                <Input
                                    value={form.nome_fantasia}
                                    onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CNPJ *</Label>
                                <Input
                                    value={form.cnpj}
                                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                                    placeholder="00.000.000/0001-00"
                                    required
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Endereço</Label>
                                <Input
                                    value={form.endereco}
                                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cidade</Label>
                                <Input
                                    value={form.cidade}
                                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>UF</Label>
                                <Input
                                    value={form.uf}
                                    onChange={(e) => setForm({ ...form, uf: e.target.value })}
                                    maxLength={2}
                                />
                            </div>
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
                            <div className="space-y-2">
                                <Label>Contato</Label>
                                <Input
                                    value={form.contato}
                                    onChange={(e) => setForm({ ...form, contato: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Observações</Label>
                                <Textarea
                                    value={form.observacoes}
                                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                                <Save className="w-4 h-4 mr-1" /> {editing ? "Atualizar" : "Cadastrar"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Importador */}
            <ImportadorClientesSNF 
                open={showImportador} 
                onClose={() => setShowImportador(false)} 
                onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["clientes-snf"] })}
                clientesExistentes={clientes}
            />
        </div>
    );
}