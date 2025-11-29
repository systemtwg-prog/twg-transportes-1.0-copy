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
    Upload, Search, CheckCircle, Clock, Save, X, ZoomIn, ZoomOut, Download, CheckSquare, Square, ChevronLeft, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AudioRecorder from "@/components/shared/AudioRecorder";
import QuickPhotoCapture from "@/components/shared/QuickPhotoCapture";
import { toast } from "sonner";

export default function NotaDeposito() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [uploading, setUploading] = useState(false);
    const [viewImage, setViewImage] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [carouselImages, setCarouselImages] = useState(null);
    const [carouselIndex, setCarouselIndex] = useState(0);
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
        fotos: [],
        status: "pendente",
        nota_fiscal: "",
        cadastrada: false,
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
            fotos: [],
            status: "pendente",
            nota_fiscal: "",
            cadastrada: false,
            observacoes: ""
        });
        setEditing(null);
    };

    const handleEdit = (nota) => {
        setForm({
            ...nota,
            fotos: nota.fotos || (nota.foto_url ? [{ url: nota.foto_url, nome: "foto" }] : []),
            nota_fiscal: nota.nota_fiscal || "",
            cadastrada: nota.cadastrada || false
        });
        setEditing(nota);
        setShowForm(true);
    };

    const toggleCadastrada = (nota) => {
        updateMutation.mutate({ id: nota.id, data: { ...nota, cadastrada: !nota.cadastrada } });
    };

    const handleUploadFotos = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploading(true);
        const novasFotos = [];
        for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            novasFotos.push({ url: file_url, nome: file.name, tipo: file.type });
        }
        setForm({ ...form, fotos: [...(form.fotos || []), ...novasFotos] });
        setUploading(false);
    };

    const removeFoto = (index) => {
        setForm({ ...form, fotos: form.fotos.filter((_, i) => i !== index) });
    };

    const handlePhotoCapture = async (file) => {
        setShowCamera(false);
        setUploading(true);
        toast.info("Salvando foto...");
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            // Se o formulário está aberto, adiciona ao formulário
            if (showForm) {
                setForm(prev => ({ ...prev, fotos: [...(prev.fotos || []), { url: file_url, nome: file.name, tipo: file.type }] }));
                toast.success("Foto adicionada!");
            } else {
                // Senão, salva direto como nova nota de depósito
                const dataFormatada = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
                await base44.entities.NotaDeposito.create({
                    titulo: `Depósito ${dataFormatada}`,
                    data: format(new Date(), "yyyy-MM-dd"),
                    fotos: [{ url: file_url, nome: file.name, tipo: file.type }],
                    status: "pendente",
                    usuario_foto: currentUser?.full_name || currentUser?.email || ""
                });
                queryClient.invalidateQueries({ queryKey: ["notas-deposito"] });
                toast.success("Nota salva com sucesso!");
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao salvar foto");
        }
        setUploading(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataFormatada = form.data ? format(new Date(form.data), "dd/MM/yyyy", { locale: ptBR }) : "";
        const tituloFinal = form.titulo || `Depósito ${dataFormatada}`;
        const dadosParaSalvar = {
            ...form,
            titulo: tituloFinal,
            usuario_foto: currentUser?.full_name || currentUser?.email || ""
        };
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: dadosParaSalvar });
        } else {
            createMutation.mutate(dadosParaSalvar);
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
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
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
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => setShowCamera(true)}
                            className="bg-gradient-to-r from-green-500 to-emerald-600 h-14 px-6 text-lg"
                        >
                            <Camera className="w-6 h-6 mr-2" />
                            Foto Rápida
                        </Button>
                        <Button 
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="bg-gradient-to-r from-violet-500 to-purple-600 h-14 px-8 text-lg"
                        >
                            <Plus className="w-6 h-6 mr-2" />
                            Nova Nota
                        </Button>
                    </div>
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
                                {(nota.fotos?.length > 0 || nota.foto_url) && (
                                    <div 
                                        className="h-40 bg-slate-100 cursor-pointer relative"
                                        onClick={() => {
                                            const fotos = nota.fotos?.length > 0 ? nota.fotos : [{ url: nota.foto_url }];
                                            setCarouselImages(fotos);
                                            setCarouselIndex(0);
                                        }}
                                    >
                                        <img src={nota.fotos?.[0]?.url || nota.foto_url} alt="" className="w-full h-full object-cover" />
                                        {nota.fotos?.length > 1 && (
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                                +{nota.fotos.length - 1} fotos
                                            </div>
                                        )}
                                    </div>
                                )}
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="font-semibold text-slate-800">{nota.titulo || "Sem título"}</h3>
                                            {nota.nota_fiscal && (
                                                <p className="text-sm font-medium text-blue-600">NF: {nota.nota_fiscal}</p>
                                            )}
                                            <p className="text-sm text-slate-500">{formatDate(nota.data)}</p>
                                            {nota.usuario_foto && (
                                                <p className="text-xs text-violet-600">📷 {nota.usuario_foto}</p>
                                            )}
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

                                    <div className="flex justify-between items-center mt-3">
                                        <Button 
                                            variant={nota.cadastrada ? "default" : "outline"}
                                            size="sm" 
                                            onClick={() => toggleCadastrada(nota)}
                                            className={nota.cadastrada ? "bg-green-500 hover:bg-green-600 text-white" : "border-green-500 text-green-600 hover:bg-green-50"}
                                        >
                                            {nota.cadastrada ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                                            {nota.cadastrada ? "Cadastrada" : "Cadastrar"}
                                        </Button>
                                        <div className="flex gap-1">
                                            {(nota.fotos?.length > 0 || nota.foto_url) && (
                                                <Button variant="ghost" size="sm" onClick={() => {
                                                    const fotos = nota.fotos?.length > 0 ? nota.fotos : [{ url: nota.foto_url }];
                                                    setCarouselImages(fotos);
                                                    setCarouselIndex(0);
                                                }}>
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
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Carousel Viewer */}
            {carouselImages && (
                <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
                    <div className="flex items-center justify-between p-4 bg-black/50">
                        <span className="text-white font-medium">
                            {carouselIndex + 1} de {carouselImages.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <a href={carouselImages[carouselIndex]?.url} download target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                                    <Download className="w-5 h-5" />
                                </Button>
                            </a>
                            <Button variant="ghost" size="icon" onClick={() => setCarouselImages(null)} className="text-white hover:bg-white/20">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 relative">
                        {carouselImages.length > 1 && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute left-4 text-white hover:bg-white/20 h-12 w-12"
                                onClick={() => setCarouselIndex(i => (i - 1 + carouselImages.length) % carouselImages.length)}
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </Button>
                        )}
                        <img 
                            src={carouselImages[carouselIndex]?.url} 
                            alt="" 
                            className="max-w-full max-h-full object-contain rounded-lg" 
                        />
                        {carouselImages.length > 1 && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute right-4 text-white hover:bg-white/20 h-12 w-12"
                                onClick={() => setCarouselIndex(i => (i + 1) % carouselImages.length)}
                            >
                                <ChevronRight className="w-8 h-8" />
                            </Button>
                        )}
                    </div>
                    {carouselImages.length > 1 && (
                        <div className="flex justify-center gap-2 p-4">
                            {carouselImages.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCarouselIndex(i)}
                                    className={`w-3 h-3 rounded-full transition-colors ${i === carouselIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"}`}
                                />
                            ))}
                        </div>
                    )}
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
                                <Label>Nota Fiscal</Label>
                                <Input
                                    value={form.nota_fiscal}
                                    onChange={(e) => setForm({ ...form, nota_fiscal: e.target.value })}
                                    placeholder="Número da NF"
                                />
                            </div>
                        </div>

                        {/* Fotos */}
                        <div className="space-y-2">
                            <Label>Fotos do Comprovante</Label>
                            <div className="flex flex-col gap-2">
                                <Button 
                                    type="button"
                                    onClick={() => setShowCamera(true)}
                                    className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                >
                                    <Camera className="w-5 h-5 mr-2" />
                                    Tirar Foto
                                </Button>
                                <div className="flex gap-2">
                                    <input type="file" accept="image/*" multiple onChange={handleUploadFotos} className="hidden" id="foto-nota" />
                                    <label htmlFor="foto-nota" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-violet-500 cursor-pointer">
                                        <Upload className="w-5 h-5 text-slate-400" />
                                        <span className="text-sm text-slate-600">Galeria</span>
                                    </label>
                                </div>
                            </div>
                            {uploading && (
                                <div className="flex items-center gap-2 text-violet-600">
                                    <div className="animate-spin w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full" />
                                    <span className="text-sm">Enviando...</span>
                                </div>
                            )}
                            {form.fotos?.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {form.fotos.map((foto, i) => (
                                        <div key={i} className="relative">
                                            <img src={foto.url} alt="" className="w-full h-20 object-cover rounded-lg border" />
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute top-1 right-1 h-6 w-6 bg-red-500 hover:bg-red-600 text-white"
                                                onClick={() => removeFoto(i)}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={form.observacoes}
                                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                                rows={3}
                                placeholder="Digite suas observações ou grave um áudio..."
                            />
                            <AudioRecorder 
                                onRecordingComplete={async (blob, url) => {
                                    const file = new File([blob], "audio_deposito.webm", { type: "audio/webm" });
                                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                    setForm(prev => ({
                                        ...prev,
                                        observacoes: (prev.observacoes || "") + "\n[Áudio: " + file_url + "]"
                                    }));
                                }}
                            />
                        </div>

                        <Button type="submit" className="w-full h-14 text-lg bg-violet-600 hover:bg-violet-700">
                            <Save className="w-6 h-6 mr-2" />
                            Salvar Notas
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Quick Photo Camera */}
            {showCamera && (
                <QuickPhotoCapture 
                    onCapture={handlePhotoCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </div>
    );
}