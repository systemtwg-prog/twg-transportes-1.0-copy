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
    Camera, File, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download, Search, Save, Share2, Building2, Calendar, RotateCw, RefreshCw, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import QuickPhotoCapture from "@/components/shared/QuickPhotoCapture";

function FlipbookViewer({ files, onClose }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    if (!files || files.length === 0) return null;

    const currentFile = files[currentPage];
    const isPdf = currentFile?.tipo === "application/pdf" || currentFile?.url?.endsWith(".pdf");

    const rotateImage = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
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
                    {!isPdf && (
                        <Button variant="ghost" size="icon" onClick={rotateImage} className="text-white hover:bg-white/20">
                            <RotateCw className="w-5 h-5" />
                        </Button>
                    )}
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
                        style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                    />
                )}
            </div>

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
    const [showCadastroEmpresa, setShowCadastroEmpresa] = useState(false);
    const [empresaForm, setEmpresaForm] = useState({ nome: "", logo_url: "" });
    const [editingEmpresa, setEditingEmpresa] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [processandoIA, setProcessandoIA] = useState(false);
    const queryClient = useQueryClient();

    const { data: comprovantes = [], isLoading } = useQuery({
        queryKey: ["comprovantes-internos"],
        queryFn: () => base44.entities.ComprovanteInterno.list("-created_date")
    });

    const { data: empresasCadastradas = [] } = useQuery({
        queryKey: ["empresas-comprovante"],
        queryFn: () => base44.entities.EmpresaComprovante.list()
    });

    const atualizarDashboards = () => {
        queryClient.invalidateQueries({ queryKey: ["comprovantes-internos"] });
        toast.success("Dados atualizados!");
    };

    const createEmpresaMutation = useMutation({
        mutationFn: (data) => base44.entities.EmpresaComprovante.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["empresas-comprovante"] });
            setShowCadastroEmpresa(false);
            setEmpresaForm({ nome: "", logo_url: "" });
            setEditingEmpresa(null);
        }
    });

    const updateEmpresaCadMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.EmpresaComprovante.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["empresas-comprovante"] });
            setShowCadastroEmpresa(false);
            setEmpresaForm({ nome: "", logo_url: "" });
            setEditingEmpresa(null);
        }
    });

    const deleteEmpresaMutation = useMutation({
        mutationFn: (id) => base44.entities.EmpresaComprovante.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["empresas-comprovante"] })
    });

    const handleUploadLogo = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setEmpresaForm(prev => ({ ...prev, logo_url: file_url }));
        setUploadingLogo(false);
    };

    const handleSaveEmpresa = () => {
        if (editingEmpresa) {
            updateEmpresaCadMutation.mutate({ id: editingEmpresa.id, data: empresaForm });
        } else {
            createEmpresaMutation.mutate(empresaForm);
        }
    };

    const getEmpresaLogo = (nomeEmpresa) => {
        const empresa = empresasCadastradas.find(e => e.nome === nomeEmpresa);
        return empresa?.logo_url;
    };

    const [form, setForm] = useState({
        nota_fiscal: "",
        data: format(new Date(), "yyyy-MM-dd"),
        arquivos: [],
        observacoes: ""
    });

    const empresasUnicas = [...new Set(comprovantes.map(c => c.empresa).filter(Boolean))];

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ComprovanteInterno.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-internos"] });
            toast.success("Comprovante salvo!");
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
            data: format(new Date(), "yyyy-MM-dd"),
            arquivos: [],
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

    // Função para processar foto com IA
    const processarFotoComIA = async (file_url) => {
        setProcessandoIA(true);
        try {
            const resultado = await base44.integrations.Core.InvokeLLM({
                prompt: `Analise esta imagem de um comprovante de entrega ou nota fiscal. 
                Extraia as seguintes informações:
                1. Número da nota fiscal (procure por "NF", "NOTA FISCAL", "NFe", "Número", "Nº" ou sequências numéricas)
                2. Qualquer informação relevante como destinatário, data, valor, observações

                Retorne os dados encontrados de forma estruturada.`,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        numero_nota: { type: "string", description: "Número da nota fiscal encontrado" },
                        observacoes: { type: "string", description: "Outras informações relevantes encontradas na imagem" }
                    }
                }
            });

            if (resultado?.numero_nota) {
                setForm(prev => ({ 
                    ...prev, 
                    nota_fiscal: prev.nota_fiscal || resultado.numero_nota 
                }));
                toast.success(`NF identificada: ${resultado.numero_nota}`);
            }
            
            if (resultado?.observacoes) {
                setForm(prev => ({ 
                    ...prev, 
                    observacoes: prev.observacoes 
                        ? `${prev.observacoes}\n${resultado.observacoes}` 
                        : resultado.observacoes 
                }));
            }
        } catch (err) {
            console.error("Erro ao processar imagem com IA:", err);
            toast.info("Não foi possível ler a imagem automaticamente");
        }
        setProcessandoIA(false);
    };

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
                    <div className="flex gap-2 flex-wrap">
                        <Button 
                            onClick={atualizarDashboards}
                            variant="outline"
                            className="border-green-500 text-green-600 hover:bg-green-50"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Atualizar
                        </Button>
                        <Button 
                            onClick={() => { setEmpresaForm({ nome: "", logo_url: "" }); setEditingEmpresa(null); setShowCadastroEmpresa(true); }}
                            variant="outline"
                            className="border-purple-500 text-purple-600 hover:bg-purple-50"
                        >
                            <Building2 className="w-4 h-4 mr-2" />
                            Cadastro Empresas
                        </Button>
                    </div>
                </div>

                {/* Botão Grande Novo Comprovante */}
                <Button 
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="w-full h-20 text-xl bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 shadow-xl"
                >
                    <Plus className="w-8 h-8 mr-3" />
                    Novo Comprovante
                </Button>

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
                            <Card 
                                key={comprovante.id} 
                                className="bg-white/90 border-0 shadow-md hover:shadow-lg transition-shadow"
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-slate-800">NF: {comprovante.nota_fiscal}</h3>
                                            {comprovante.empresa && (
                                                <div className="flex items-center gap-1.5">
                                                    {getEmpresaLogo(comprovante.empresa) && (
                                                        <img 
                                                            src={getEmpresaLogo(comprovante.empresa)} 
                                                            alt="" 
                                                            className="w-5 h-5 object-contain rounded"
                                                        />
                                                    )}
                                                    <p className="text-sm text-sky-600 font-medium">{comprovante.empresa}</p>
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-500">{formatDate(comprovante.data)}</p>
                                        </div>
                                        <Badge variant="outline">
                                            {comprovante.arquivos?.length || 0} arquivo(s)
                                        </Badge>
                                    </div>

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

            {/* Quick Photo Camera */}
            {showCamera && (
                <div className="fixed inset-0 z-[100]">
                    <QuickPhotoCapture
                        onCapture={async (file) => {
                            try {
                                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                
                                // Fecha a câmera primeiro
                                setShowCamera(false);
                                
                                // Adiciona foto ao formulário
                                setForm(prev => ({
                                    ...prev,
                                    arquivos: [...(prev.arquivos || []), { nome: file.name, url: file_url, tipo: file.type }]
                                }));
                                
                                toast.success("Foto anexada!");
                                
                                // Processa com IA após adicionar
                                await processarFotoComIA(file_url);
                            } catch (error) {
                                console.error("Erro ao fazer upload:", error);
                                toast.error("Erro ao salvar foto");
                                setShowCamera(false);
                            }
                        }}
                        onClose={() => setShowCamera(false)}
                    />
                </div>
            )}

            {/* Form Dialog - Novo Comprovante */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-sky-600" />
                            {editing ? "Editar Comprovante" : "Novo Comprovante"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nota Fiscal */}
                        <div className="space-y-2">
                            <Label>Nota Fiscal *</Label>
                            <Input
                                value={form.nota_fiscal}
                                onChange={(e) => setForm({ ...form, nota_fiscal: e.target.value })}
                                required
                                placeholder="Número da NF"
                                className="h-12 text-lg"
                            />
                        </div>

                        {/* Data */}
                        <div className="space-y-2">
                            <Label>Data</Label>
                            <Input
                                type="date"
                                value={form.data}
                                onChange={(e) => setForm({ ...form, data: e.target.value })}
                                className="h-12"
                            />
                        </div>

                        {/* Arquivos - Upload e Foto */}
                        <div className="space-y-2">
                            <Label>Arquivos (Foto ou PDF)</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Upload Arquivo */}
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-sky-500 transition-colors">
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
                                                <div className="animate-spin w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full" />
                                            ) : (
                                                <>
                                                    <Upload className="w-10 h-10 text-slate-400" />
                                                    <span className="text-sm text-slate-600 font-medium">Anexar Arquivo</span>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                </div>

                                {/* Tirar Foto */}
                                <div 
                                    className="border-2 border-dashed border-sky-400 rounded-xl p-6 text-center hover:border-sky-500 hover:bg-sky-50 transition-colors cursor-pointer"
                                    onClick={() => setShowCamera(true)}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <Camera className="w-10 h-10 text-sky-500" />
                                        <span className="text-sm text-sky-600 font-medium">Tirar Foto</span>
                                    </div>
                                </div>
                            </div>

                            {/* Lista de arquivos adicionados */}
                            {form.arquivos.length > 0 && (
                                <div className="space-y-2 mt-4">
                                    <Label className="text-xs text-slate-500">Arquivos Anexados</Label>
                                    {form.arquivos.map((arq, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                                            <div className="flex items-center gap-3">
                                                {arq.tipo?.startsWith("image/") ? (
                                                    <img 
                                                        src={arq.url} 
                                                        alt="" 
                                                        className="w-14 h-14 object-cover rounded-lg cursor-pointer"
                                                        onClick={() => setViewFiles([arq])}
                                                    />
                                                ) : (
                                                    <File className="w-14 h-14 p-3 bg-slate-200 rounded-lg text-slate-600" />
                                                )}
                                                <div>
                                                    <span className="text-sm text-slate-700 font-medium truncate max-w-[180px] block">{arq.nome}</span>
                                                    <Button 
                                                        type="button" 
                                                        variant="link" 
                                                        size="sm" 
                                                        className="h-auto p-0 text-sky-600"
                                                        onClick={() => setViewFiles([arq])}
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" /> Visualizar
                                                    </Button>
                                                </div>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeArquivo(index)}>
                                                <X className="w-5 h-5 text-red-600" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Indicador de processamento IA */}
                            {processandoIA && (
                                <div className="flex items-center gap-2 p-3 bg-sky-50 rounded-xl text-sky-700">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-sm">Lendo informações da imagem com IA...</span>
                                </div>
                            )}
                        </div>

                        {/* Observações */}
                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={form.observacoes}
                                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                                rows={4}
                                placeholder="Informações adicionais..."
                                className="resize-none"
                            />
                        </div>

                        {/* Botão Salvar */}
                        <Button 
                            type="submit" 
                            className="w-full h-14 text-lg bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700"
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {(createMutation.isPending || updateMutation.isPending) ? (
                                <>
                                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-6 h-6 mr-2" />
                                    Salvar Comprovante
                                </>
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Cadastro de Empresas */}
            <Dialog open={showCadastroEmpresa} onOpenChange={setShowCadastroEmpresa}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-purple-600" />
                            Cadastro de Empresas
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {empresasCadastradas.length > 0 && !editingEmpresa && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                <Label className="text-xs text-slate-500">Empresas Cadastradas</Label>
                                {empresasCadastradas.map(emp => (
                                    <div key={emp.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            {emp.logo_url ? (
                                                <img src={emp.logo_url} alt="" className="w-8 h-8 object-contain rounded" />
                                            ) : (
                                                <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center">
                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                </div>
                                            )}
                                            <span className="font-medium">{emp.nome}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => { setEmpresaForm({ nome: emp.nome, logo_url: emp.logo_url || "" }); setEditingEmpresa(emp); }}
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => { if(confirm("Excluir?")) deleteEmpresaMutation.mutate(emp.id); }}
                                            >
                                                <Trash2 className="w-3 h-3 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="border-t pt-4 space-y-4">
                            <h4 className="font-medium text-sm">{editingEmpresa ? "Editar Empresa" : "Nova Empresa"}</h4>
                            <div className="space-y-2">
                                <Label>Nome da Empresa *</Label>
                                <Input
                                    value={empresaForm.nome}
                                    onChange={(e) => setEmpresaForm({ ...empresaForm, nome: e.target.value })}
                                    placeholder="Nome da empresa"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Logotipo</Label>
                                <div className="flex items-center gap-3">
                                    {empresaForm.logo_url ? (
                                        <div className="relative">
                                            <img src={empresaForm.logo_url} alt="" className="w-16 h-16 object-contain border rounded-lg" />
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 hover:bg-red-600 text-white rounded-full"
                                                onClick={() => setEmpresaForm({ ...empresaForm, logo_url: "" })}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                                            <Building2 className="w-6 h-6 text-slate-300" />
                                        </div>
                                    )}
                                    <div>
                                        <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" id="logo-upload" />
                                        <label htmlFor="logo-upload">
                                            <Button type="button" variant="outline" size="sm" asChild>
                                                <span className="cursor-pointer">
                                                    {uploadingLogo ? (
                                                        <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full" />
                                                    ) : (
                                                        <>
                                                            <Upload className="w-4 h-4 mr-1" />
                                                            {empresaForm.logo_url ? "Trocar" : "Adicionar"}
                                                        </>
                                                    )}
                                                </span>
                                            </Button>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                {editingEmpresa && (
                                    <Button variant="ghost" onClick={() => { setEditingEmpresa(null); setEmpresaForm({ nome: "", logo_url: "" }); }}>
                                        Cancelar
                                    </Button>
                                )}
                                <Button 
                                    onClick={handleSaveEmpresa}
                                    disabled={!empresaForm.nome}
                                    className="bg-purple-500 hover:bg-purple-600"
                                >
                                    <Save className="w-4 h-4 mr-1" />
                                    {editingEmpresa ? "Atualizar" : "Cadastrar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}