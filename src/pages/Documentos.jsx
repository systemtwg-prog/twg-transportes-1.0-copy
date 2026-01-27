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
    FileText, Camera, Upload, Trash2, Pencil, Eye, 
    X, Download, Search, Save, Share2, Calendar, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import FastPhotoCapture from "@/components/shared/FastPhotoCapture";

function FlipbookViewer({ files, onClose }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [zoom, setZoom] = useState(1);

    if (!files || files.length === 0) return null;

    const currentFile = files[currentPage];

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-black/80">
                <Button onClick={onClose} className="bg-white/20 hover:bg-white/30 text-white">
                    Voltar
                </Button>
                {files.length > 1 && (
                    <span className="text-white">{currentPage + 1} de {files.length}</span>
                )}
                <div className="w-20" />
            </div>
            <div className="flex-1 flex items-center justify-center overflow-auto p-4">
                <img 
                    src={currentFile?.url} 
                    alt={currentFile?.nome}
                    className="max-w-full max-h-full object-contain"
                    style={{ transform: `scale(${zoom})` }}
                />
            </div>
            <div className="flex justify-center gap-4 p-4 bg-black/80">
                <Button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>-</Button>
                <span className="text-white">{Math.round(zoom * 100)}%</span>
                <Button onClick={() => setZoom(z => Math.min(3, z + 0.25))}>+</Button>
                {files.length > 1 && (
                    <>
                        <Button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
                            Anterior
                        </Button>
                        <Button onClick={() => setCurrentPage(p => Math.min(files.length - 1, p + 1))} disabled={currentPage === files.length - 1}>
                            Próximo
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function Documentos() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [filterTipo, setFilterTipo] = useState("");
    const [filterTexto, setFilterTexto] = useState("");
    const [filterData, setFilterData] = useState("");
    const [viewFiles, setViewFiles] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        tipo: "CNH",
        descricao: "",
        observacoes: "",
        data_documento: format(new Date(), "yyyy-MM-dd"),
        pessoa_relacionada: "",
        validade: "",
        arquivos: []
    });

    const { data: documentos = [], isLoading } = useQuery({
        queryKey: ["documentos"],
        queryFn: () => base44.entities.Documento.list("-created_date")
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Documento.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documentos"] });
            toast.success("Documento salvo!");
            setShowForm(false);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Documento.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documentos"] });
            setShowForm(false);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Documento.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documentos"] })
    });

    const resetForm = () => {
        setForm({
            tipo: "CNH",
            descricao: "",
            observacoes: "",
            data_documento: format(new Date(), "yyyy-MM-dd"),
            pessoa_relacionada: "",
            validade: "",
            arquivos: []
        });
        setEditing(null);
    };

    const handleEdit = (doc) => {
        setForm(doc);
        setEditing(doc);
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

    const handleDownloadImage = async (doc) => {
        if (!doc.arquivos || doc.arquivos.length === 0) {
            toast.error("Nenhuma imagem para baixar");
            return;
        }

        try {
            const imageUrl = doc.arquivos[0].url;
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `documento_${doc.tipo}_${doc.descricao}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("Download concluído!");
        } catch (error) {
            toast.error("Erro ao baixar imagem");
        }
    };

    const isVencido = (validade) => {
        if (!validade) return false;
        return new Date(validade) < new Date();
    };

    const filtered = documentos.filter(doc => {
        const matchTipo = !filterTipo || doc.tipo === filterTipo;
        const matchData = !filterData || doc.data_documento >= filterData;
        const matchTexto = !filterTexto || [
            doc.descricao,
            doc.observacoes,
            doc.pessoa_relacionada,
            doc.tipo
        ].some(campo => campo?.toLowerCase().includes(filterTexto.toLowerCase()));
        
        return matchTipo && matchData && matchTexto;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Documentos</h1>
                            <p className="text-sm text-slate-500">Gerencie CNH, RG, RENAVAN e mais</p>
                        </div>
                    </div>
                </div>

                {/* Botões Adicionar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                        onClick={() => setShowCamera(true)}
                        className="h-20 text-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-xl"
                    >
                        <Camera className="w-8 h-8 mr-3" />
                        Fotografar Documento
                    </Button>
                    <div>
                        <input
                            type="file"
                            id="import-files"
                            multiple
                            accept=".xlsx,.xls,.pdf,.csv,image/*"
                            onChange={async (e) => {
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
                                    arquivos: novosArquivos
                                }));
                                setUploading(false);
                                setShowForm(true);
                                toast.success(`${files.length} arquivo(s) importado(s)!`);
                                e.target.value = '';
                            }}
                            className="hidden"
                        />
                        <Button 
                            onClick={() => document.getElementById('import-files').click()}
                            className="w-full h-20 text-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-xl"
                            disabled={uploading}
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mr-3" />
                                    Importando...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 mr-3" />
                                    Importar do PC
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Filtros */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Tipo */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500 font-semibold">Tipo de Documento</Label>
                                <div className="flex gap-1">
                                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                                        <SelectTrigger className="bg-white h-12">
                                            <SelectValue placeholder="Todos os tipos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={null}>Todos</SelectItem>
                                            <SelectItem value="CNH">CNH</SelectItem>
                                            <SelectItem value="RG">RG</SelectItem>
                                            <SelectItem value="CPF">CPF</SelectItem>
                                            <SelectItem value="RENAVAN">RENAVAN</SelectItem>
                                            <SelectItem value="CRLV">CRLV</SelectItem>
                                            <SelectItem value="Contrato">Contrato</SelectItem>
                                            <SelectItem value="Comprovante">Comprovante</SelectItem>
                                            <SelectItem value="Outro">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {filterTipo && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterTipo("")} className="h-12 w-12">
                                            <X className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Data */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500 font-semibold">Data a partir de</Label>
                                <div className="flex gap-1">
                                    <Input
                                        type="date"
                                        value={filterData}
                                        onChange={(e) => setFilterData(e.target.value)}
                                        className="bg-white h-12"
                                    />
                                    {filterData && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterData("")} className="h-12 w-12">
                                            <X className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Busca */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500 font-semibold">Buscar</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                                    <Input
                                        placeholder="Descrição, pessoa..."
                                        value={filterTexto}
                                        onChange={(e) => setFilterTexto(e.target.value)}
                                        className="pl-11 bg-white h-12 border-2 border-indigo-200 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Indicador de Filtros */}
                        {(filterTipo || filterData || filterTexto) && (
                            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-indigo-700">Filtros ativos:</span>
                                    {filterTipo && <Badge className="bg-indigo-500">{filterTipo}</Badge>}
                                    {filterData && <Badge className="bg-purple-500">A partir de {formatDate(filterData)}</Badge>}
                                    {filterTexto && <Badge className="bg-pink-500">Busca: {filterTexto}</Badge>}
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                        setFilterTipo("");
                                        setFilterData("");
                                        setFilterTexto("");
                                    }}
                                    className="text-indigo-600"
                                >
                                    <X className="w-4 h-4 mr-1" /> Limpar
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Lista */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full text-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            Nenhum documento encontrado
                        </div>
                    ) : (
                        filtered.map((doc) => (
                            <Card 
                                key={doc.id} 
                                className={`bg-white/90 border-2 shadow-md hover:shadow-lg transition-all ${
                                    isVencido(doc.validade) ? 'border-red-500 bg-red-50/50' : 'border-transparent'
                                }`}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-indigo-500 text-white">{doc.tipo}</Badge>
                                                    {isVencido(doc.validade) && (
                                                        <Badge className="bg-red-500 text-white flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Vencido
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h3 className="font-semibold text-base text-slate-800 mt-2">{doc.descricao}</h3>
                                                {doc.pessoa_relacionada && (
                                                    <p className="text-sm text-indigo-600 font-medium">{doc.pessoa_relacionada}</p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-xs text-slate-500">{formatDate(doc.data_documento)}</p>
                                                    {doc.validade && (
                                                        <p className={`text-xs font-medium ${isVencido(doc.validade) ? 'text-red-600' : 'text-green-600'}`}>
                                                            Val: {formatDate(doc.validade)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {doc.arquivos?.length || 0}
                                        </Badge>
                                    </div>

                                    {/* Preview da imagem */}
                                    <div 
                                        className="w-full h-44 bg-slate-100 rounded-xl overflow-hidden cursor-pointer mb-3"
                                        onClick={() => {
                                            if (doc.arquivos?.length > 0) setViewFiles(doc.arquivos);
                                        }}
                                    >
                                        {doc.arquivos?.[0]?.url ? (
                                            <img src={doc.arquivos[0].url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FileText className="w-10 h-10 text-slate-300" />
                                            </div>
                                        )}
                                    </div>

                                    {doc.observacoes && (
                                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{doc.observacoes}</p>
                                    )}

                                    <div className="flex justify-between">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-green-600 hover:bg-green-50"
                                            onClick={() => {
                                                const texto = `*${doc.tipo}*\n${doc.descricao}\n${doc.observacoes || ""}\n${doc.arquivos?.[0]?.url || ""}`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
                                            }}
                                        >
                                            <Share2 className="w-4 h-4 mr-1" /> Compartilhar
                                        </Button>
                                        <div className="flex gap-1">
                                            {doc.arquivos?.length > 0 && (
                                                <>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleDownloadImage(doc)} 
                                                        className="h-8 w-8 p-0 text-blue-600"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setViewFiles(doc.arquivos)} className="h-8 w-8 p-0">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(doc)} className="h-8 w-8 p-0">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => {
                                                if (confirm("Excluir este documento?")) deleteMutation.mutate(doc.id);
                                            }} className="h-8 w-8 p-0">
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

            {/* Camera */}
            {showCamera && (
                <div className="fixed inset-0 z-[100]">
                    <FastPhotoCapture
                        onCapture={async (file) => {
                            try {
                                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                setShowCamera(false);
                                setForm(prev => ({
                                    ...prev,
                                    arquivos: [{ nome: file.name, url: file_url, tipo: file.type }]
                                }));
                                setShowForm(true);
                                toast.success("Foto capturada!");
                            } catch (error) {
                                toast.error("Erro ao salvar foto");
                                setShowCamera(false);
                            }
                        }}
                        onClose={() => setShowCamera(false)}
                    />
                </div>
            )}

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            {editing ? "Editar Documento" : "Novo Documento"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Tipo e Descrição */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo *</Label>
                                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CNH">CNH</SelectItem>
                                        <SelectItem value="RG">RG</SelectItem>
                                        <SelectItem value="CPF">CPF</SelectItem>
                                        <SelectItem value="RENAVAN">RENAVAN</SelectItem>
                                        <SelectItem value="CRLV">CRLV</SelectItem>
                                        <SelectItem value="Contrato">Contrato</SelectItem>
                                        <SelectItem value="Comprovante">Comprovante</SelectItem>
                                        <SelectItem value="Outro">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    value={form.data_documento}
                                    onChange={(e) => setForm({ ...form, data_documento: e.target.value })}
                                    className="h-12"
                                />
                            </div>
                        </div>

                        {/* Descrição */}
                        <div className="space-y-2">
                            <Label>Descrição *</Label>
                            <Input
                                value={form.descricao}
                                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                                required
                                placeholder="Ex: CNH João Silva, RG Maria Santos..."
                                className="h-12 text-lg"
                            />
                        </div>

                        {/* Pessoa Relacionada e Validade */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Pessoa/Empresa</Label>
                                <Input
                                    value={form.pessoa_relacionada}
                                    onChange={(e) => setForm({ ...form, pessoa_relacionada: e.target.value })}
                                    placeholder="Nome"
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Validade</Label>
                                <Input
                                    type="date"
                                    value={form.validade}
                                    onChange={(e) => setForm({ ...form, validade: e.target.value })}
                                    className="h-12"
                                />
                            </div>
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

                        {/* Arquivos */}
                        <div className="space-y-2">
                            <Label>Foto/Arquivo</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf,.xlsx,.xls,.csv"
                                        onChange={handleUploadFiles}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        {uploading ? (
                                            <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
                                        ) : (
                                            <>
                                                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                                                <span className="text-sm text-slate-600">Anexar</span>
                                            </>
                                        )}
                                    </label>
                                </div>

                                <div 
                                    className="border-2 border-dashed border-indigo-400 rounded-xl p-6 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer"
                                    onClick={() => setShowCamera(true)}
                                >
                                    <Camera className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                                    <span className="text-sm text-indigo-600">Fotografar</span>
                                </div>
                            </div>

                            {form.arquivos.length > 0 && (
                                <div className="space-y-2 mt-4">
                                    {form.arquivos.map((arq, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                                            <div className="flex items-center gap-3">
                                                <img src={arq.url} alt="" className="w-14 h-14 object-cover rounded-lg" />
                                                <span className="text-sm">{arq.nome}</span>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeArquivo(index)}>
                                                <X className="w-5 h-5 text-red-600" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Botão Salvar */}
                        <Button 
                            type="submit" 
                            className="w-full h-14 text-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            <Save className="w-6 h-6 mr-2" />
                            Salvar Documento
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}