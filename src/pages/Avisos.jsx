import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Plus, Bell, AlertTriangle, Info, Trash2, Pencil, 
    Eye, EyeOff
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Avisos() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const queryClient = useQueryClient();

    const { data: avisos = [], isLoading } = useQuery({
        queryKey: ["avisos"],
        queryFn: () => base44.entities.Aviso.list("-created_date")
    });

    const [form, setForm] = useState({
        titulo: "",
        mensagem: "",
        tipo: "info",
        ativo: true,
        data_inicio: format(new Date(), "yyyy-MM-dd"),
        data_fim: ""
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Aviso.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["avisos"] });
            setShowForm(false);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Aviso.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["avisos"] });
            setShowForm(false);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Aviso.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["avisos"] })
    });

    const resetForm = () => {
        setForm({
            titulo: "",
            mensagem: "",
            tipo: "info",
            ativo: true,
            data_inicio: format(new Date(), "yyyy-MM-dd"),
            data_fim: ""
        });
        setEditing(null);
    };

    const handleEdit = (aviso) => {
        setForm(aviso);
        setEditing(aviso);
        setShowForm(true);
    };

    const handleToggleAtivo = (aviso) => {
        updateMutation.mutate({ id: aviso.id, data: { ...aviso, ativo: !aviso.ativo } });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: form });
        } else {
            createMutation.mutate(form);
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

    const tipoColors = {
        info: "bg-blue-100 text-blue-800 border-blue-200",
        alerta: "bg-yellow-100 text-yellow-800 border-yellow-200",
        urgente: "bg-red-100 text-red-800 border-red-200"
    };

    const tipoIcons = {
        info: Info,
        alerta: AlertTriangle,
        urgente: AlertTriangle
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                            <Bell className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Avisos</h1>
                            <p className="text-slate-500">Gerencie avisos do sistema</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-gradient-to-r from-amber-500 to-orange-600"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Aviso
                    </Button>
                </div>

                {/* Lista de Avisos */}
                <div className="space-y-4">
                    {isLoading ? (
                        <Card className="bg-white/80">
                            <CardContent className="p-12 text-center">
                                <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" />
                            </CardContent>
                        </Card>
                    ) : avisos.length === 0 ? (
                        <Card className="bg-white/80">
                            <CardContent className="p-12 text-center text-slate-500">
                                <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                Nenhum aviso cadastrado
                            </CardContent>
                        </Card>
                    ) : (
                        avisos.map((aviso) => {
                            const TipoIcon = tipoIcons[aviso.tipo];
                            return (
                                <Card key={aviso.id} className={`bg-white/90 border-l-4 ${aviso.ativo ? "border-l-amber-500" : "border-l-slate-300 opacity-60"}`}>
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-lg ${tipoColors[aviso.tipo]}`}>
                                                    <TipoIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-slate-800">{aviso.titulo}</h3>
                                                        <Badge className={tipoColors[aviso.tipo]}>
                                                            {aviso.tipo === "info" ? "Informativo" : aviso.tipo === "alerta" ? "Alerta" : "Urgente"}
                                                        </Badge>
                                                        {!aviso.ativo && (
                                                            <Badge variant="outline" className="text-slate-500">Inativo</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-600 mb-2">{aviso.mensagem}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {formatDate(aviso.data_inicio)}
                                                        {aviso.data_fim && ` até ${formatDate(aviso.data_fim)}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => handleToggleAtivo(aviso)}
                                                    title={aviso.ativo ? "Desativar" : "Ativar"}
                                                >
                                                    {aviso.ativo ? (
                                                        <Eye className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <EyeOff className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(aviso)}>
                                                    <Pencil className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => {
                                                    if (confirm("Excluir este aviso?")) deleteMutation.mutate(aviso.id);
                                                }}>
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-amber-600" />
                            {editing ? "Editar Aviso" : "Novo Aviso"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Título *</Label>
                            <Input
                                value={form.titulo}
                                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Mensagem *</Label>
                            <Textarea
                                value={form.mensagem}
                                onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                                rows={4}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">Informativo</SelectItem>
                                        <SelectItem value="alerta">Alerta</SelectItem>
                                        <SelectItem value="urgente">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Ativo</Label>
                                <div className="flex items-center gap-2 pt-2">
                                    <Switch
                                        checked={form.ativo}
                                        onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                                    />
                                    <span className="text-sm text-slate-600">{form.ativo ? "Sim" : "Não"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data Início</Label>
                                <Input
                                    type="date"
                                    value={form.data_inicio}
                                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data Fim</Label>
                                <Input
                                    type="date"
                                    value={form.data_fim}
                                    onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                                {editing ? "Salvar" : "Criar Aviso"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}