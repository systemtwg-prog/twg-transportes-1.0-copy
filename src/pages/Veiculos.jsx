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
    Plus, Search, Pencil, Trash2, Truck, X, Save, Upload, Camera, FileText, Eye, Share2, Printer
} from "lucide-react";
import FlipbookViewer from "@/components/shared/FlipbookViewer";

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
        documentos_veiculo: veiculo?.documentos_veiculo || [],
        documentos_carroceria: veiculo?.documentos_carroceria || [],
        observacoes: veiculo?.observacoes || ""
    });
    const [uploadingVeiculo, setUploadingVeiculo] = useState(false);
    const [uploadingCarroceria, setUploadingCarroceria] = useState(false);
    const [viewDocs, setViewDocs] = useState(null);

    const handleDocVeiculoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploadingVeiculo(true);
        const novosArquivos = [];
        for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            novosArquivos.push({ nome: file.name, url: file_url, tipo: file.type });
        }
        setForm({ ...form, documentos_veiculo: [...form.documentos_veiculo, ...novosArquivos] });
        setUploadingVeiculo(false);
    };

    const handleDocCarroceriaUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploadingCarroceria(true);
        const novosArquivos = [];
        for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            novosArquivos.push({ nome: file.name, url: file_url, tipo: file.type });
        }
        setForm({ ...form, documentos_carroceria: [...form.documentos_carroceria, ...novosArquivos] });
        setUploadingCarroceria(false);
    };

    const removeDocVeiculo = (index) => {
        setForm({ ...form, documentos_veiculo: form.documentos_veiculo.filter((_, i) => i !== index) });
    };

    const removeDocCarroceria = (index) => {
        setForm({ ...form, documentos_carroceria: form.documentos_carroceria.filter((_, i) => i !== index) });
    };

    const handleShareWhatsApp = () => {
        const texto = `*VEÍCULO: ${form.placa}*\nModelo: ${form.modelo}\nMarca: ${form.marca}\nAno: ${form.ano}\nTipo: ${form.tipo}\nCapacidade: ${form.capacidade_kg} KG`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
    };

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
            <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-cyan-50">
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

                    {/* Documentos do Veículo */}
                    <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                        <Label className="font-semibold text-teal-800 mb-3 block">Documentos do Veículo (CRLV)</Label>
                        <div className="flex gap-2 mb-3">
                            <input type="file" accept="image/*,.pdf" multiple onChange={handleDocVeiculoUpload} className="hidden" id="doc-veiculo" />
                            <label htmlFor="doc-veiculo" className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-teal-300 rounded-lg hover:border-teal-500 cursor-pointer">
                                <Upload className="w-4 h-4 text-teal-600" />
                                <span className="text-sm text-teal-700">Adicionar</span>
                            </label>
                            <input type="file" accept="image/*" capture="environment" onChange={handleDocVeiculoUpload} className="hidden" id="camera-veiculo" />
                            <label htmlFor="camera-veiculo" className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-teal-300 rounded-lg hover:border-teal-500 cursor-pointer">
                                <Camera className="w-4 h-4 text-teal-600" />
                                <span className="text-sm text-teal-700">Foto</span>
                            </label>
                            {uploadingVeiculo && <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full" />}
                        </div>
                        {form.documentos_veiculo.length > 0 && (
                            <div className="space-y-2">
                                {form.documentos_veiculo.map((doc, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-teal-600" />
                                            <span className="text-sm truncate max-w-[150px]">{doc.nome}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewDocs(form.documentos_veiculo)}>
                                                <Eye className="w-4 h-4 text-blue-600" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDocVeiculo(i)}>
                                                <X className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Documentos da Carroceria */}
                    <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                        <Label className="font-semibold text-cyan-800 mb-3 block">Documentos da Carroceria</Label>
                        <div className="flex gap-2 mb-3">
                            <input type="file" accept="image/*,.pdf" multiple onChange={handleDocCarroceriaUpload} className="hidden" id="doc-carroceria" />
                            <label htmlFor="doc-carroceria" className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-cyan-300 rounded-lg hover:border-cyan-500 cursor-pointer">
                                <Upload className="w-4 h-4 text-cyan-600" />
                                <span className="text-sm text-cyan-700">Adicionar</span>
                            </label>
                            <input type="file" accept="image/*" capture="environment" onChange={handleDocCarroceriaUpload} className="hidden" id="camera-carroceria" />
                            <label htmlFor="camera-carroceria" className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-cyan-300 rounded-lg hover:border-cyan-500 cursor-pointer">
                                <Camera className="w-4 h-4 text-cyan-600" />
                                <span className="text-sm text-cyan-700">Foto</span>
                            </label>
                            {uploadingCarroceria && <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />}
                        </div>
                        {form.documentos_carroceria.length > 0 && (
                            <div className="space-y-2">
                                {form.documentos_carroceria.map((doc, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-cyan-600" />
                                            <span className="text-sm truncate max-w-[150px]">{doc.nome}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewDocs(form.documentos_carroceria)}>
                                                <Eye className="w-4 h-4 text-blue-600" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDocCarroceria(i)}>
                                                <X className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={handleShareWhatsApp}>
                            <Share2 className="w-4 h-4 mr-2" />
                            WhatsApp
                        </Button>
                        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" className="bg-sky-500 hover:bg-sky-600">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                        </Button>
                    </div>
                    
                    {viewDocs && (
                        <FlipbookViewer 
                            files={viewDocs} 
                            onClose={() => setViewDocs(null)} 
                            title={`Documentos - ${form.placa}`}
                        />
                    )}
                </form>
            </CardContent>
        </Card>
    );
}

export default function Veiculos() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [viewDocsModal, setViewDocsModal] = useState(null);
    const queryClient = useQueryClient();

    const handlePrintVeiculo = (vei) => {
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Veículo - ${vei.placa}</title>
                <style>
                    @media print { .print-btn { display: none; } }
                    body { font-family: Arial, sans-serif; margin: 30px; }
                    .print-btn { display: block; width: 100%; max-width: 300px; margin: 0 auto 20px; padding: 15px; font-size: 18px; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer; }
                    .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #0ea5e9; }
                    .title { font-size: 24px; font-weight: bold; color: #0369a1; }
                    .section { margin: 15px 0; padding: 10px; background: #f8fafc; border-radius: 8px; }
                    .row { display: flex; margin: 5px 0; }
                    .label { font-weight: bold; width: 120px; color: #64748b; }
                </style>
            </head>
            <body>
                <button class="print-btn" onclick="window.print()">📄 Imprimir / Salvar PDF</button>
                <div class="header">
                    <div class="title">CADASTRO DE VEÍCULO</div>
                    <h2>${vei.placa}</h2>
                </div>
                <div class="section">
                    <div class="row"><span class="label">Modelo:</span> ${vei.modelo}</div>
                    <div class="row"><span class="label">Marca:</span> ${vei.marca || "-"}</div>
                    <div class="row"><span class="label">Ano:</span> ${vei.ano || "-"}</div>
                    <div class="row"><span class="label">Cor:</span> ${vei.cor || "-"}</div>
                    <div class="row"><span class="label">Tipo:</span> ${vei.tipo}</div>
                    <div class="row"><span class="label">Capacidade:</span> ${vei.capacidade_kg || "-"} KG / ${vei.capacidade_m3 || "-"} M³</div>
                    <div class="row"><span class="label">RENAVAM:</span> ${vei.renavam || "-"}</div>
                    <div class="row"><span class="label">Chassi:</span> ${vei.chassi || "-"}</div>
                    <div class="row"><span class="label">KM Atual:</span> ${vei.km_atual || "-"}</div>
                    <div class="row"><span class="label">Status:</span> ${vei.status}</div>
                </div>
            </body>
            </html>
        `);
        winPrint.document.close();
    };

    const handleShareVeiculoWhatsApp = (vei) => {
        const texto = `*VEÍCULO: ${vei.placa}*\nModelo: ${vei.modelo}\nMarca: ${vei.marca || "-"}\nAno: ${vei.ano || "-"}\nTipo: ${vei.tipo}\nCapacidade: ${vei.capacidade_kg || "-"} KG`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
    };

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
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl shadow-lg">
                            <Truck className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Veículos</h1>
                            <p className="text-slate-500">Gerencie a frota de veículos</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { setEditing(null); setShowForm(true); }}
                        className="bg-gradient-to-r from-sky-400 to-cyan-500"
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
                                            <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto" />
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
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <span className="font-bold text-sky-600">{vei.placa}</span>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 hover:bg-sky-100"
                                                            onClick={() => {
                                                                const docs = [...(vei.documentos_veiculo || []), ...(vei.documentos_carroceria || [])];
                                                                if (docs.length > 0) {
                                                                    setViewDocsModal(docs);
                                                                } else {
                                                                    alert("Nenhum documento anexado");
                                                                }
                                                            }}
                                                        >
                                                            <Eye className="w-3 h-3 mr-1" /> Ver Docs
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 hover:bg-blue-100"
                                                            onClick={() => handlePrintVeiculo(vei)}
                                                        >
                                                            <Printer className="w-3 h-3 mr-1" /> PDF
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 hover:bg-green-100"
                                                            onClick={() => handleShareVeiculoWhatsApp(vei)}
                                                        >
                                                            <Share2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </TableCell>
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

            {viewDocsModal && (
                <FlipbookViewer files={viewDocsModal} onClose={() => setViewDocsModal(null)} title="Documentos do Veículo" />
            )}
        </div>
    );
}