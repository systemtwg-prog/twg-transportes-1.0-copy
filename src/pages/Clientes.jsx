import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
    Plus, Search, Pencil, Trash2, Users, Building2, 
    Phone, MapPin, FileText 
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ClienteForm from "@/components/clientes/ClienteForm";

export default function Clientes() {
    const [showForm, setShowForm] = useState(false);
    const [editingCliente, setEditingCliente] = useState(null);
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    const { data: clientes = [], isLoading } = useQuery({
        queryKey: ["clientes"],
        queryFn: () => base44.entities.Cliente.list("-created_date")
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Cliente.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientes"] });
            setShowForm(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientes"] });
            setShowForm(false);
            setEditingCliente(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Cliente.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clientes"] })
    });

    const handleSubmit = (data) => {
        if (editingCliente) {
            updateMutation.mutate({ id: editingCliente.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (cliente) => {
        setEditingCliente(cliente);
        setShowForm(true);
    };

    const handleDelete = (cliente) => {
        if (confirm(`Deseja excluir o cliente "${cliente.razao_social}"?`)) {
            deleteMutation.mutate(cliente.id);
        }
    };

    const filteredClientes = clientes.filter(c => 
        c.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
        c.codigo?.toLowerCase().includes(search.toLowerCase()) ||
        c.cnpj_cpf?.includes(search)
    );

    const tipoColors = {
        remetente: "bg-amber-100 text-amber-800 border-amber-200",
        destinatario: "bg-emerald-100 text-emerald-800 border-emerald-200",
        ambos: "bg-blue-100 text-blue-800 border-blue-200"
    };

    const tipoLabels = {
        remetente: "Remetente",
        destinatario: "Destinatário",
        ambos: "Ambos"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Clientes</h1>
                            <p className="text-slate-500">Gerencie remetentes e destinatários</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { setEditingCliente(null); setShowForm(true); }}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Cliente
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-xl">
                                <Building2 className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Remetentes</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {clientes.filter(c => c.tipo === "remetente" || c.tipo === "ambos").length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <MapPin className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Destinatários</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {clientes.filter(c => c.tipo === "destinatario" || c.tipo === "ambos").length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Cadastros</p>
                                <p className="text-2xl font-bold text-slate-800">{clientes.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por nome, código ou CNPJ..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 bg-white border-slate-200"
                            />
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
                                        <TableHead>Código</TableHead>
                                        <TableHead>Razão Social</TableHead>
                                        <TableHead>CNPJ/CPF</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Cidade/UF</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12">
                                                    <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredClientes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                                                    Nenhum cliente encontrado
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredClientes.map((cliente) => (
                                                <motion.tr
                                                    key={cliente.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="hover:bg-slate-50 transition-colors"
                                                >
                                                    <TableCell className="font-mono text-slate-600">
                                                        {cliente.codigo || "-"}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-800">
                                                        {cliente.razao_social}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-mono text-sm">
                                                        {cliente.cnpj_cpf || "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${tipoColors[cliente.tipo]} border`}>
                                                            {tipoLabels[cliente.tipo]}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600">
                                                        {cliente.cidade}{cliente.uf ? `/${cliente.uf}` : ""}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600">
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {cliente.telefone || "-"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit(cliente)}
                                                                className="hover:bg-blue-100"
                                                            >
                                                                <Pencil className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(cliente)}
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
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0">
                    <ClienteForm
                        cliente={editingCliente}
                        onSubmit={handleSubmit}
                        onCancel={() => { setShowForm(false); setEditingCliente(null); }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}