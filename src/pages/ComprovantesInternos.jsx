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
import { 
    Plus, FileText, Upload, Trash2, Pencil, Eye, 
    Camera, File, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download, Search, CameraIcon, Save, Share2, Building2, Calendar
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AudioRecorderWithTranscription from "@/components/shared/AudioRecorderWithTranscription";

function FlipbookViewer({ files, onClose }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [zoom, setZoom] = useState(1);

    if (!files || files.length === 0) return null;

    const currentFile = files[currentPage];
    const isPdf = currentFile?.tipo === "application/pdf" || currentFile?.url?.endsWith(".pdf");

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50">
                <div className="text-white">
                    <span className="font-medium">{currentFile?.nome}</span>
                    <span className="text-white/60 ml-2">({currentPage + 1} de {files.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="text-white hover:bg-white/20">
                        <ZoomOut className="w-5 h-5" />
                    </Button>
                    <span className="text-white px-2">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="text-white hover:bg-white/20">
                        <ZoomIn className="w-5 h-5" />
                    </Button>
                    <a href={currentFile?.url} download target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <Download className="w-5 h-5" />
                        </Button>
                    </a>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center overflow-auto p-4">
                {isPdf ? (
                    <iframe 
                        src={currentFile?.url} 
                        className="w-full h-full bg-white rounded-lg"
                        style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                    />
                ) : (
                    <img 
                        src={currentFile?.url} 
                        alt={currentFile?.nome}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform"
                        style={{ transform: `scale(${zoom})` }}
                    />
                )}
            </div>

            {/* Navigation */}
            {files.length > 1 && (
                <div className="flex items-center justify-center gap-4 p-4 bg-black/50">
                    <Button 
                        variant="ghost" 
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="text-white hover:bg-white/20"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <div className="flex gap-2">
                        {files.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`w-3 h-3 rounded-full transition-colors ${i === currentPage ? "bg-white" : "bg-white/40 hover:bg-white/60"}`}
                            />
                        ))}
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={() => setCurrentPage(p => Math.min(files.length - 1, p + 1))}
                        disabled={currentPage === files.length - 1}
                        className="text-white hover:bg-white/20"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function ComprovantesInternos() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [filterData, setFilterData] = useState("");
    const [filterNF, setFilterNF] = useState("");
    const [filterEmpresa, setFilterEmpresa] = useState("");
    const [viewFiles, setViewFiles] = useState(null);
    const [uploading, setUploading] = useState(false);
    const queryClient = useQueryClient();

    const { data: comprovantes = [], isLoading } = useQuery({
        queryKey: ["comprovantes-internos"],
        queryFn: () => base44.entities.ComprovanteInterno.list("-created_date")
    });

    const [form, setForm] = useState({
        nota_fiscal: "",
        empresa: "",
        data: format(new Date(), "yyyy-MM-dd"),
        arquivos: [],
        texto_extraido: "",
        romaneio_id: "",
        observacoes: ""
    });

    // Lista de empresas únicas
    const empresasUnicas = [...new Set(comprovantes.map(c => c.empresa).filter(Boolean))];



    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ComprovanteInterno.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-internos"] });
            setShowForm(false);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ComprovanteInterno.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-internos"] });
            setShowForm(false);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ComprovanteInterno.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comprovantes-internos"] })
    });

    const resetForm = () => {
        setForm({
            nota_fiscal: "",
            empresa: "",
            data: format(new Date(), "yyyy-MM-dd"),
            arquivos: [],
            texto_extraido: "",
            romaneio_id: "",
            observacoes: ""
        });
        setEditing(null);
    };

    const handleEdit = (comprovante) => {
        setForm(comprovante);
        setEditing(comprovante);
        setShowForm(true);
    };

    const handleUploadFiles = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        const novosArquivos = [];

        for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            novosArquivos.push({
                nome: file.name,
                url: file_url,
                tipo: file.type
            });

            // Tentar extrair texto de PDFs
            if (file.type === "application/pdf") {
                try {
                    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                        file_url,
                        json_schema: {
                            type: "object",
                            properties: {
                                texto_completo: { type: "string" }
                            }
                        }
                    });
                    if (result.status === "success" && result.output?.texto_completo) {
                        setForm(prev => ({
                            ...prev,
                            texto_extraido: (prev.texto_extraido || "") + "\n" + result.output.texto_completo
                        }));
                    }
                } catch (err) {
                    console.log("Erro ao extrair texto do PDF:", err);
                }
            }
        }

        setForm(prev => ({
            ...prev,
            arquivos: [...prev.arquivos, ...novosArquivos]
        }));
        setUploading(false);
    };

    const removeArquivo = (index) => {
        setForm(prev => ({
            ...prev,
            arquivos: prev.arquivos.filter((_, i) => i !== index)
        }));
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

    const filtered = comprovantes.filter(c => {
        const matchData = !filterData || c.data === filterData;
        const matchNF = !filterNF || c.nota_fiscal?.toLowerCase().includes(filterNF.toLowerCase());
        const matchEmpresa = !filterEmpresa || c.empresa === filterEmpresa;
        return matchData && matchNF && matchEmpresa;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Comprovantes de Entrega</h1>
                            <p className="text-slate-500">Gerencie documentos e comprovantes</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="bg-gradient-to-r from-sky-500 to-cyan-600"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Comprovante
                    </Button>
                </div>

                {/* Filtros */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Filtrar por Data
                                </Label>
                                <div className="flex gap-1">
                                    <Input
                                        type="date"
                                        value={filterData}
                                        onChange={(e) => setFilterData(e.target.value)}
                                        className="bg-white"
                                    />
                                    {filterData && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterData("")}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Filtrar por Nota Fiscal
                                </Label>
                                <div className="flex gap-1">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="Número da NF..."
                                            value={filterNF}
                                            onChange={(e) => setFilterNF(e.target.value)}
                                            className="pl-9 bg-white"
                                        />
                                    </div>
                                    {filterNF && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterNF("")}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> Filtrar por Empresa
                                </Label>
                                <div className="flex gap-1">
                                    <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Todas as empresas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={null}>Todas as empresas</SelectItem>
                                            {empresasUnicas.map(emp => (
                                                <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {filterEmpresa && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterEmpresa("")}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full text-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            Nenhum comprovante encontrado
                        </div>
                    ) : (
                        filtered.map((comprovante) => (
                            <Card key={comprovante.id} className="bg-white/90 border-0 shadow-md hover:shadow-lg transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-slate-800">NF: {comprovante.nota_fiscal}</h3>
                                            {comprovante.empresa && (
                                                <p className="text-sm text-sky-600 font-medium">{comprovante.empresa}</p>
                                            )}
                                            <p className="text-sm text-slate-500">{formatDate(comprovante.data)}</p>
                                        </div>
                                        <Badge variant="outline">
                                            {comprovante.arquivos?.length || 0} arquivo(s)
                                        </Badge>
                                    </div>

                                    {/* Preview dos arquivos - maior */}
                                    {comprovante.arquivos?.length > 0 && (
                                        <div className="mb-3">
                                            <div 
                                                className="w-full h-40 bg-slate-100 rounded-lg overflow-hidden cursor-pointer"
                                                onClick={() => setViewFiles(comprovante.arquivos)}
                                            >
                                                {comprovante.arquivos[0]?.tipo?.startsWith("image/") ? (
                                                    <img src={comprovante.arquivos[0].url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <File className="w-12 h-12 text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                            {comprovante.arquivos.length > 1 && (
                                                <p className="text-xs text-slate-500 mt-1 text-center">+ {comprovante.arquivos.length - 1} arquivo(s)</p>
                                            )}
                                        </div>
                                    )}

                                    {comprovante.observacoes && (
                                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{comprovante.observacoes}</p>
                                    )}

                                    <div className="flex justify-between">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-green-600 hover:bg-green-50"
                                            onClick={() => {
                                                const texto = `*COMPROVANTE DE ENTREGA*\nNF: ${comprovante.nota_fiscal}\nData: ${formatDate(comprovante.data)}\n${comprovante.observacoes ? `Obs: ${comprovante.observacoes}` : ""}\n${comprovante.arquivos?.[0]?.url || ""}`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
                                            }}
                                        >
                                            <Share2 className="w-4 h-4 mr-1" /> Compartilhar
                                        </Button>
                                        <div className="flex gap-1">
                                            {comprovante.arquivos?.length > 0 && (
                                                <Button variant="ghost" size="sm" onClick={() => setViewFiles(comprovante.arquivos)}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(comprovante)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => {
                                                if (confirm("Excluir este comprovante?")) deleteMutation.mutate(comprovante.id);
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

            {/* Flipbook Viewer */}
            {viewFiles && (
                <FlipbookViewer files={viewFiles} onClose={() => setViewFiles(null)} />
            )}

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-sky-600" />
                            {editing ? "Editar Comprovante" : "Novo Comprovante"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nota Fiscal *</Label>
                                <Input
                                    value={form.nota_fiscal}
                                    onChange={(e) => setForm({ ...form, nota_fiscal: e.target.value })}
                                    required
                                    placeholder="Número da NF"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Empresa</Label>
                                <Input
                                    value={form.empresa}
                                    onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                                    placeholder="Nome da empresa"
                                    list="empresas-list"
                                />
                                <datalist id="empresas-list">
                                    {empresasUnicas.map(emp => (
                                        <option key={emp} value={emp} />
                                    ))}
                                </datalist>
                            </div>
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

                        {/* Upload de arquivos */}
                        <div className="space-y-2">
                            <Label>Arquivos</Label>
                            <div className="flex gap-2">
                                <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-sky-500 transition-colors">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf"
                                        onChange={handleUploadFiles}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <div className="flex flex-col items-center gap-2">
                                            {uploading ? (
                                                <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 text-slate-400" />
                                                    <span className="text-sm text-slate-600">Adicionar arquivos</span>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                </div>
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-sky-500 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleUploadFiles}
                                        className="hidden"
                                        id="camera-upload"
                                    />
                                    <label htmlFor="camera-upload" className="cursor-pointer">
                                        <div className="flex flex-col items-center gap-2">
                                            <CameraIcon className="w-8 h-8 text-slate-400" />
                                            <span className="text-sm text-slate-600">Tirar Foto</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Lista de arquivos */}
                            {form.arquivos.length > 0 && (
                                <div className="space-y-2 mt-3">
                                    {form.arquivos.map((arq, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                {arq.tipo?.startsWith("image/") ? (
                                                    <img src={arq.url} alt="" className="w-10 h-10 object-cover rounded" />
                                                ) : (
                                                    <File className="w-10 h-10 p-2 bg-slate-200 rounded text-slate-600" />
                                                )}
                                                <span className="text-sm text-slate-700 truncate max-w-[200px]">{arq.nome}</span>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeArquivo(index)}>
                                                <X className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {form.texto_extraido && (
                            <div className="space-y-2">
                                <Label>Texto Extraído do PDF</Label>
                                <Textarea
                                    value={form.texto_extraido}
                                    onChange={(e) => setForm({ ...form, texto_extraido: e.target.value })}
                                    rows={4}
                                    className="text-sm"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={form.observacoes}
                                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                                rows={3}
                                placeholder="Digite suas observações ou grave um áudio..."
                            />
                            <AudioRecorderWithTranscription 
                                onRecordingComplete={(audioUrl, transcricao) => {
                                    setForm(prev => ({
                                        ...prev,
                                        observacoes: (prev.observacoes || "") + (transcricao ? `\n${transcricao}` : "") + `\n[Áudio: ${audioUrl}]`
                                    }));
                                }}
                            />
                        </div>

                        <Button type="submit" className="w-full h-14 text-lg bg-sky-600 hover:bg-sky-700">
                            <Save className="w-6 h-6 mr-2" />
                            {editing ? "Salvar Comprovante" : "Gravar Comprovante"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}