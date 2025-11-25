import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    FileText, Upload, Search, Eye, Trash2, Plus,
    ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Download
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Componente Flipbook Viewer
function FlipbookViewer({ files, onClose }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [zoom, setZoom] = useState(1);

    if (!files || files.length === 0) return null;

    const nextPage = () => {
        if (currentPage < files.length - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    const currentFile = files[currentPage];
    const isImage = currentFile?.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = currentFile?.url?.match(/\.pdf$/i);

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50">
                <div className="flex items-center gap-4">
                    <span className="text-white font-medium">
                        Página {currentPage + 1} de {files.length}
                    </span>
                    <Badge className="bg-white/20 text-white">
                        {currentFile?.nome || `Arquivo ${currentPage + 1}`}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                        className="text-white hover:bg-white/20"
                    >
                        <ZoomOut className="w-5 h-5" />
                    </Button>
                    <span className="text-white text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                        className="text-white hover:bg-white/20"
                    >
                        <ZoomIn className="w-5 h-5" />
                    </Button>
                    <a href={currentFile?.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <Download className="w-5 h-5" />
                        </Button>
                    </a>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-white hover:bg-white/20"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center overflow-auto p-4">
                <div 
                    className="transition-transform duration-300"
                    style={{ transform: `scale(${zoom})` }}
                >
                    {isImage && (
                        <img 
                            src={currentFile.url} 
                            alt={currentFile.nome}
                            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                        />
                    )}
                    {isPdf && (
                        <iframe
                            src={currentFile.url}
                            className="w-[80vw] h-[70vh] bg-white rounded-lg"
                            title={currentFile.nome}
                        />
                    )}
                    {!isImage && !isPdf && (
                        <div className="bg-white p-8 rounded-lg text-center">
                            <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                            <p className="text-slate-600">Visualização não disponível</p>
                            <a href={currentFile.url} target="_blank" rel="noopener noreferrer">
                                <Button className="mt-4">
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar Arquivo
                                </Button>
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            {files.length > 1 && (
                <div className="flex items-center justify-center gap-4 p-4 bg-black/50">
                    <Button
                        onClick={prevPage}
                        disabled={currentPage === 0}
                        className="bg-white/20 hover:bg-white/30 text-white"
                    >
                        <ChevronLeft className="w-5 h-5 mr-2" />
                        Anterior
                    </Button>
                    
                    {/* Thumbnails */}
                    <div className="flex gap-2 overflow-x-auto max-w-md">
                        {files.map((file, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentPage(index)}
                                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                                    currentPage === index 
                                        ? "border-white scale-110" 
                                        : "border-transparent opacity-60 hover:opacity-100"
                                }`}
                            >
                                {file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <img src={file.url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-white/20 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    <Button
                        onClick={nextPage}
                        disabled={currentPage === files.length - 1}
                        className="bg-white/20 hover:bg-white/30 text-white"
                    >
                        Próximo
                        <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function Comprovantes() {
    const [search, setSearch] = useState("");
    const [showUpload, setShowUpload] = useState(false);
    const [showViewer, setShowViewer] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        titulo: "",
        ordem_id: "",
        tipo: "comprovante_entrega"
    });
    const queryClient = useQueryClient();

    const { data: comprovantes = [], isLoading } = useQuery({
        queryKey: ["comprovantes"],
        queryFn: () => base44.entities.Comprovante.list("-created_date")
    });

    const { data: ordens = [] } = useQuery({
        queryKey: ["ordens"],
        queryFn: () => base44.entities.OrdemColeta.list("-created_date")
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Comprovante.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes"] });
            setShowUpload(false);
            setUploadForm({ titulo: "", ordem_id: "", tipo: "comprovante_entrega" });
            toast.success("Comprovante salvo!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Comprovante.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes"] });
            toast.success("Comprovante excluído!");
        }
    });

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        const uploadedFiles = [];

        for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            uploadedFiles.push({
                nome: file.name,
                url: file_url
            });
        }

        createMutation.mutate({
            ...uploadForm,
            arquivos: uploadedFiles,
            data_upload: new Date().toISOString()
        });

        setUploading(false);
    };

    const handleViewFiles = (comprovante) => {
        setSelectedFiles(comprovante.arquivos || []);
        setShowViewer(true);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const filtered = comprovantes.filter(c =>
        c.titulo?.toLowerCase().includes(search.toLowerCase()) ||
        c.ordem_id?.includes(search)
    );

    const tipoLabels = {
        comprovante_entrega: "Comprovante de Entrega",
        nota_fiscal: "Nota Fiscal",
        canhoto: "Canhoto",
        outro: "Outro"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Comprovantes</h1>
                            <p className="text-slate-500">Gerencie comprovantes e documentos</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => setShowUpload(true)}
                        className="bg-gradient-to-r from-teal-500 to-cyan-600"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Novo Comprovante
                    </Button>
                </div>

                {/* Search */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por título ou ordem..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 bg-white"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full text-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            Nenhum comprovante encontrado
                        </div>
                    ) : (
                        filtered.map((comp) => (
                            <Card key={comp.id} className="bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all">
                                <CardContent className="p-4">
                                    {/* Preview */}
                                    <div 
                                        className="h-40 bg-slate-100 rounded-lg mb-4 overflow-hidden cursor-pointer relative group"
                                        onClick={() => handleViewFiles(comp)}
                                    >
                                        {comp.arquivos?.[0]?.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                            <img 
                                                src={comp.arquivos[0].url} 
                                                alt="" 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FileText className="w-16 h-16 text-slate-300" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Eye className="w-8 h-8 text-white" />
                                        </div>
                                        {comp.arquivos?.length > 1 && (
                                            <Badge className="absolute top-2 right-2 bg-black/70">
                                                +{comp.arquivos.length - 1}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <h3 className="font-semibold text-slate-800 truncate">{comp.titulo || "Sem título"}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline" className="text-xs">
                                            {tipoLabels[comp.tipo] || comp.tipo}
                                        </Badge>
                                        {comp.ordem_id && (
                                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                                                Ordem #{comp.ordem_id}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">{formatDate(comp.data_upload)}</p>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewFiles(comp)}
                                        >
                                            <Eye className="w-4 h-4 mr-1" />
                                            Ver
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm("Excluir este comprovante?")) {
                                                    deleteMutation.mutate(comp.id);
                                                }
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Upload Dialog */}
            <Dialog open={showUpload} onOpenChange={setShowUpload}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Novo Comprovante</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input
                                value={uploadForm.titulo}
                                onChange={(e) => setUploadForm({ ...uploadForm, titulo: e.target.value })}
                                placeholder="Ex: Comprovante Ordem 123"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ordem Relacionada (opcional)</Label>
                            <select
                                value={uploadForm.ordem_id}
                                onChange={(e) => setUploadForm({ ...uploadForm, ordem_id: e.target.value })}
                                className="w-full border rounded-md p-2"
                            >
                                <option value="">Nenhuma</option>
                                {ordens.map(o => (
                                    <option key={o.id} value={o.numero}>
                                        #{o.numero} - {o.remetente_nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <select
                                value={uploadForm.tipo}
                                onChange={(e) => setUploadForm({ ...uploadForm, tipo: e.target.value })}
                                className="w-full border rounded-md p-2"
                            >
                                <option value="comprovante_entrega">Comprovante de Entrega</option>
                                <option value="nota_fiscal">Nota Fiscal</option>
                                <option value="canhoto">Canhoto</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Arquivos</Label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                <p className="text-sm text-slate-600 mb-2">Clique ou arraste arquivos</p>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="w-full"
                                />
                                {uploading && (
                                    <p className="text-teal-600 mt-2">Enviando...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Flipbook Viewer */}
            {showViewer && (
                <FlipbookViewer 
                    files={selectedFiles} 
                    onClose={() => setShowViewer(false)} 
                />
            )}
        </div>
    );
}