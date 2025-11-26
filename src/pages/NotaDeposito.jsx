import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Plus, Receipt, Camera, Trash2, Pencil, Eye, 
    Upload, Search, CheckCircle, Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NotaDeposito() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [uploading, setUploading] = useState(false);
    const [viewImage, setViewImage] = useState(null);
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const isAdmin = currentUser?.role === "admin";

    const { data: notas = [], isLoading } = useQuery({
        queryKey: ["notas-deposito"],
        queryFn: () => base44.entities.NotaDeposito.list("-created_date")
    });

    const [form, setForm] = useState({
        titulo: "",
        data: format(new Date(), "yyyy-MM-dd"),
        foto_url: "",
        status: "pendente",
        observacoes: ""
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.NotaDeposito.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-deposito"] });
            setShowForm(false);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.NotaDeposito.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-deposito"] });
            setShowForm(false);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.NotaDeposito.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notas-deposito"] })
    });

    const resetForm = () => {
        setForm({
            titulo: "",
            data: format(new Date(), "yyyy-MM-dd"),
            foto_url: "",
            status: "pendente",
            observacoes: ""
        });
        setEditing(null);
    };

    const handleEdit = (nota) => {
        setForm(nota);
        setEditing(nota);
        setShowForm(true);
    };

    const handleUploadFoto = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setForm({ ...form, foto_url: file_url });
        setUploading(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const handleChangeStatus = (nota, newStatus) => {
        if (!isAdmin) return;
        updateMutation.mutate({ id: nota.id, data: { ...nota, status: newStatus } });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const filtered = notas.filter(n =>
        n.titulo?.toLowerCase().includes(search.toLowerCase())
    );

    const statusColors = {
        pendente: "bg-yellow-100 text-yellow-800",
        finalizado: "bg-green-100 text-green-800"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
                            <Receipt className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Nota Depósito</h1>
                            <p className="text-slate-500">Registre notas de depósito com foto</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-gradient-to-r from-violet-500 to-purple-600"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Nova Nota
                    </Button>
                </div>

                {/* Search */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por título..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 bg-white"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Grid de Notas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full text-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            Nenhuma nota encontrada
                        </div>
                    ) : (
                        filtered.map((nota) => (
                            <Card key={nota.id} className="bg-white/90 border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                                {nota.foto_url && (
                                    <div 
                                        className="h-40 bg-slate-100 cursor-pointer"
                                        onClick={() => setViewImage(nota.foto_url)}
                                    >
                                        <img src={nota.foto_url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="font-semibold text-slate-800">{nota.titulo || "Sem título"}</h3>
                                            <p className="text-sm text-slate-500">{formatDate(nota.data)}</p>
                                        </div>
                                        {isAdmin ? (
                                            <Select 
                                                value={nota.status}
                                                onValueChange={(v) => handleChangeStatus(nota, v)}
                                            >
                                                <SelectTrigger className="w-28 h-8">
                                                    <Badge className={statusColors[nota.status]}>
                                                        {nota.status === "pendente" ? "Pendente" : "Finalizado"}
                                                    </Badge>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pendente">
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</span>
                                                    </SelectItem>
                                                    <SelectItem value="finalizado">
                                                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Finalizado</span>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge className={statusColors[nota.status]}>
                                                {nota.status === "pendente" ? "Pendente" : "Finalizado"}
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    {nota.observacoes && (
                                        <p className="text-sm text-slate-600 line-clamp-2">{nota.observacoes}</p>
                                    )}

                                    <div className="flex justify-end gap-2 mt-3">
                                        {nota.foto_url && (
                                            <Button variant="ghost" size="sm" onClick={() => setViewImage(nota.foto_url)}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(nota)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            if (confirm("Excluir esta nota?")) deleteMutation.mutate(nota.id);
                                        }}>
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* View Image */}
            {viewImage && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
                    <img src={viewImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
            )}

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-violet-600" />
                            {editing ? "Editar Nota" : "Nova Nota Depósito"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input
                                value={form.titulo}
                                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                placeholder="Descrição da nota"
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

                        {/* Foto */}
                        <div className="space-y-2">
                            <Label>Foto do Comprovante</Label>
                            <div className="flex gap-2">
                                <input type="file" accept="image/*" onChange={handleUploadFoto} className="hidden" id="foto-nota" />
                                <label htmlFor="foto-nota" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-violet-500 cursor-pointer">
                                    <Upload className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm text-slate-600">Escolher arquivo</span>
                                </label>
                                <input type="file" accept="image/*" capture="environment" onChange={handleUploadFoto} className="hidden" id="camera-nota" />
                                <label htmlFor="camera-nota" className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-violet-500 cursor-pointer">
                                    <Camera className="w-5 h-5 text-slate-400" />
                                    <span className="text-sm text-slate-600">Tirar Foto</span>
                                </label>
                            </div>
                            {uploading && (
                                <div className="flex items-center gap-2 text-violet-600">
                                    <div className="animate-spin w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full" />
                                    <span className="text-sm">Enviando...</span>
                                </div>
                            )}
                            {form.foto_url && (
                                <img src={form.foto_url} alt="" className="w-full h-40 object-cover rounded-lg border" />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={form.observacoes}
                                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit" className="bg-violet-600 hover:bg-violet-700">
                                {editing ? "Salvar" : "Criar Nota"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}