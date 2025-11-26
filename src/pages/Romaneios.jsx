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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Plus, FileText, Truck, Camera, Trash2, Pencil, 
    CheckCircle, Package, X, Upload, Search
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Romaneios() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [uploading, setUploading] = useState(false);
    const queryClient = useQueryClient();

    const { data: romaneios = [], isLoading } = useQuery({
        queryKey: ["romaneios"],
        queryFn: () => base44.entities.Romaneio.list("-created_date")
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas-ativos"],
        queryFn: () => base44.entities.Motorista.filter({ status: "ativo" })
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-disponiveis"],
        queryFn: () => base44.entities.Veiculo.filter({ status: "disponivel" })
    });

    const [form, setForm] = useState({
        data: format(new Date(), "yyyy-MM-dd"),
        motorista_id: "",
        motorista_nome: "",
        veiculo_id: "",
        placa: "",
        notas_fiscais: [{ numero_nf: "", valor: "", destinatario: "" }],
        comprovante_url: "",
        status: "pendente",
        observacoes: ""
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Romaneio.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["romaneios"] });
            setShowForm(false);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Romaneio.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["romaneios"] });
            setShowForm(false);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Romaneio.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["romaneios"] })
    });

    const resetForm = () => {
        setForm({
            data: format(new Date(), "yyyy-MM-dd"),
            motorista_id: "",
            motorista_nome: "",
            veiculo_id: "",
            placa: "",
            notas_fiscais: [{ numero_nf: "", valor: "", destinatario: "" }],
            comprovante_url: "",
            status: "pendente",
            observacoes: ""
        });
        setEditing(null);
    };

    const handleEdit = (romaneio) => {
        setForm({
            ...romaneio,
            notas_fiscais: romaneio.notas_fiscais || [{ numero_nf: "", valor: "", destinatario: "" }]
        });
        setEditing(romaneio);
        setShowForm(true);
    };

    const handleSelectMotorista = (id) => {
        const motorista = motoristas.find(m => m.id === id);
        if (motorista) {
            setForm({ ...form, motorista_id: id, motorista_nome: motorista.nome });
        }
    };

    const handleSelectVeiculo = (id) => {
        const veiculo = veiculos.find(v => v.id === id);
        if (veiculo) {
            setForm({ ...form, veiculo_id: id, placa: veiculo.placa });
        }
    };

    const addNotaFiscal = () => {
        setForm({
            ...form,
            notas_fiscais: [...form.notas_fiscais, { numero_nf: "", valor: "", destinatario: "" }]
        });
    };

    const removeNotaFiscal = (index) => {
        setForm({
            ...form,
            notas_fiscais: form.notas_fiscais.filter((_, i) => i !== index)
        });
    };

    const updateNotaFiscal = (index, field, value) => {
        const updated = [...form.notas_fiscais];
        updated[index] = { ...updated[index], [field]: value };
        setForm({ ...form, notas_fiscais: updated });
    };

    const handleUploadComprovante = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setForm({ ...form, comprovante_url: file_url });
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

    const handleChangeStatus = (romaneio, newStatus) => {
        updateMutation.mutate({ id: romaneio.id, data: { ...romaneio, status: newStatus } });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const filtered = romaneios.filter(r =>
        r.motorista_nome?.toLowerCase().includes(search.toLowerCase()) ||
        r.placa?.toLowerCase().includes(search.toLowerCase())
    );

    const statusColors = {
        pendente: "bg-yellow-100 text-yellow-800",
        coletado: "bg-purple-100 text-purple-800",
        entregue: "bg-green-100 text-green-800",
        cancelado: "bg-red-100 text-red-800"
    };

    const statusLabels = {
        pendente: "Pendente",
        coletado: "Coletado",
        entregue: "Entregue",
        cancelado: "Cancelado"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Romaneios / Entregas</h1>
                            <p className="text-slate-500">Gerencie romaneios e notas fiscais</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-gradient-to-r from-orange-500 to-red-600"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Romaneio
                    </Button>
                </div>

                {/* Search */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por motorista ou placa..."
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
                                    <TableHead>Data</TableHead>
                                    <TableHead>Motorista</TableHead>
                                    <TableHead>Veículo</TableHead>
                                    <TableHead>Notas Fiscais</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                            Nenhum romaneio encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((romaneio) => (
                                        <TableRow key={romaneio.id} className="hover:bg-slate-50">
                                            <TableCell className="font-medium">{formatDate(romaneio.data)}</TableCell>
                                            <TableCell>{romaneio.motorista_nome}</TableCell>
                                            <TableCell>{romaneio.placa}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {romaneio.notas_fiscais?.length || 0} NF(s)
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Select 
                                                    value={romaneio.status}
                                                    onValueChange={(v) => handleChangeStatus(romaneio, v)}
                                                >
                                                    <SelectTrigger className="w-32 h-8">
                                                        <Badge className={statusColors[romaneio.status]}>
                                                            {statusLabels[romaneio.status]}
                                                        </Badge>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pendente">Pendente</SelectItem>
                                                        <SelectItem value="coletado">Coletado</SelectItem>
                                                        <SelectItem value="entregue">Entregue</SelectItem>
                                                        <SelectItem value="cancelado">Cancelado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(romaneio)}>
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        if (confirm("Excluir este romaneio?")) deleteMutation.mutate(romaneio.id);
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-orange-600" />
                            {editing ? "Editar Romaneio" : "Novo Romaneio"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data *</Label>
                                <Input
                                    type="date"
                                    value={form.data}
                                    onChange={(e) => setForm({ ...form, data: e.target.value })}
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
                                        <SelectItem value="coletado">Coletado</SelectItem>
                                        <SelectItem value="entregue">Entregue</SelectItem>
                                        <SelectItem value="cancelado">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Motorista *</Label>
                                <Select value={form.motorista_id} onValueChange={handleSelectMotorista}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o motorista" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {motoristas.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Veículo</Label>
                                <Select value={form.veiculo_id} onValueChange={handleSelectVeiculo}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o veículo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {veiculos.map(v => (
                                            <SelectItem key={v.id} value={v.id}>{v.placa} - {v.modelo}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Notas Fiscais */}
                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                            <div className="flex items-center justify-between mb-4">
                                <Label className="font-semibold text-orange-800">Notas Fiscais</Label>
                                <Button type="button" size="sm" variant="outline" onClick={addNotaFiscal}>
                                    <Plus className="w-4 h-4 mr-1" /> Adicionar NF
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {form.notas_fiscais.map((nf, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            placeholder="Nº NF"
                                            value={nf.numero_nf}
                                            onChange={(e) => updateNotaFiscal(index, "numero_nf", e.target.value)}
                                            className="flex-1"
                                        />
                                        <Input
                                            placeholder="Valor"
                                            type="number"
                                            value={nf.valor}
                                            onChange={(e) => updateNotaFiscal(index, "valor", e.target.value)}
                                            className="w-24"
                                        />
                                        <Input
                                            placeholder="Destinatário"
                                            value={nf.destinatario}
                                            onChange={(e) => updateNotaFiscal(index, "destinatario", e.target.value)}
                                            className="flex-1"
                                        />
                                        {form.notas_fiscais.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeNotaFiscal(index)}>
                                                <X className="w-4 h-4 text-red-600" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comprovante */}
                        <div className="space-y-2">
                            <Label>Comprovante (Foto)</Label>
                            <div className="flex items-center gap-4">
                                <Input type="file" accept="image/*" onChange={handleUploadComprovante} className="flex-1" />
                                {uploading && <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full" />}
                            </div>
                            {form.comprovante_url && (
                                <img src={form.comprovante_url} alt="Comprovante" className="w-32 h-32 object-cover rounded-lg border" />
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
                            <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                                {editing ? "Salvar" : "Criar Romaneio"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}