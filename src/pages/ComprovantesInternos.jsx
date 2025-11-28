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
    Camera, File, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download, Search, CameraIcon, Save, Share2, Building2, Calendar, RotateCw
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AudioRecorderWithTranscription from "@/components/shared/AudioRecorderWithTranscription";

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
                    {!isPdf && (
                        <Button variant="ghost" size="icon" onClick={rotateImage} className="text-white hover:bg-white/20" title="Girar imagem">
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
                        style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
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
    const [showEditEmpresa, setShowEditEmpresa] = useState(false);
    const [empresaEmMassa, setEmpresaEmMassa] = useState("");
    const [selecionados, setSelecionados] = useState([]);
    const [showCadastroEmpresa, setShowCadastroEmpresa] = useState(false);
    const [empresaForm, setEmpresaForm] = useState({ nome: "", logo_url: "" });
    const [editingEmpresa, setEditingEmpresa] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const queryClient = useQueryClient();

    const { data: comprovantes = [], isLoading } = useQuery({
        queryKey: ["comprovantes-internos"],
        queryFn: () => base44.entities.ComprovanteInterno.list("-created_date")
    });

    const { data: empresasCadastradas = [] } = useQuery({
        queryKey: ["empresas-comprovante"],
        queryFn: () => base44.entities.EmpresaComprovante.list()
    });

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
        texto_extraido: "",
        romaneio_id: "",
        observacoes: ""
    });

    // Lista de empresas únicas
    const empresasUnicas = [...new Set(comprovantes.map(c => c.empresa).filter(Boolean))];

    const updateEmpresaMutation = useMutation({
        mutationFn: async ({ ids, empresa }) => {
            for (const id of ids) {
                await base44.entities.ComprovanteInterno.update(id, { empresa });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-internos"] });
            setShowEditEmpresa(false);
            setSelecionados([]);
            setEmpresaEmMassa("");
        }
    });

    const toggleSelecionado = (id) => {
        setSelecionados(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selecionarTodos = () => {
        if (selecionados.length === filtered.length) {
            setSelecionados([]);
        } else {
            setSelecionados(filtered.map(c => c.id));
        }
    };



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

            // Tentar extrair número da nota fiscal usando LLM
            try {
                const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `Analise esta imagem de uma DANFE (Documento Auxiliar da Nota Fiscal Eletrônica).

LOCALIZAÇÃO EXATA DO NÚMERO DA NOTA FISCAL:
- Está no TOPO DIREITO do documento
- Fica DENTRO do quadrado/box onde aparece a palavra "DANFE"
- Logo abaixo de "DANFE" aparece "Documento Auxiliar da Nota Fiscal Eletrônica"
- O campo "NF-e" ou "Nº" está nesse mesmo quadrado
- O número tem geralmente 6 a 9 dígitos (exemplo: 000.123.456 ou 123456)

IGNORE COMPLETAMENTE:
- A chave de acesso (são 44 dígitos, muito longa)
- Códigos de barras
- CNPJ
- Número de série

Retorne SOMENTE o número da nota fiscal encontrado no quadrado DANFE no topo direito. Remove pontos e retorne apenas os dígitos.`,
                    file_urls: [file_url],
                    response_json_schema: {
                        type: "object",
                        properties: {
                            numero_nota_fiscal: { type: "string", description: "Apenas os dígitos do número da NF (ex: 123456)" },
                            empresa: { type: "string", description: "Nome da empresa/destinatário se visível" }
                        }
                    }
                });
                
                if (result?.numero_nota_fiscal && !form.nota_fiscal) {
                    setForm(prev => ({
                        ...prev,
                        nota_fiscal: result.numero_nota_fiscal
                    }));
                }
            } catch (err) {
                console.log("Erro ao extrair dados do arquivo:", err);
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
                    <div className="flex gap-2 flex-wrap">
                        <Button 
                            onClick={() => { setEmpresaForm({ nome: "", logo_url: "" }); setEditingEmpresa(null); setShowCadastroEmpresa(true); }}
                            variant="outline"
                            className="border-purple-500 text-purple-600 hover:bg-purple-50"
                        >
                            <Building2 className="w-4 h-4 mr-2" />
                            Cadastro Empresas
                        </Button>
                        {selecionados.length > 0 && (
                            <Button 
                                onClick={() => setShowEditEmpresa(true)}
                                variant="outline"
                                className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            >
                                <Building2 className="w-4 h-4 mr-2" />
                                Editar Empresa ({selecionados.length})
                            </Button>
                        )}
                        <Button 
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="bg-gradient-to-r from-sky-500 to-cyan-600 h-14 px-8 text-lg font-semibold"
                        >
                            <Plus className="w-6 h-6 mr-2" />
                            Novo Comprovante
                        </Button>
                    </div>
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

                {/* Seleção em massa */}
                {filtered.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={selecionarTodos}
                        >
                            {selecionados.length === filtered.length ? "Desmarcar Todos" : "Selecionar Todos"}
                        </Button>
                        {selecionados.length > 0 && (
                            <span className="text-sm text-slate-500">{selecionados.length} selecionado(s)</span>
                        )}
                    </div>
                )}

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
                                className={`bg-white/90 border-2 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${selecionados.includes(comprovante.id) ? "border-sky-500 bg-sky-50" : "border-transparent"}`}
                                onClick={() => toggleSelecionado(comprovante.id)}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={selecionados.includes(comprovante.id)}
                                                onChange={() => toggleSelecionado(comprovante.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-1 w-4 h-4"
                                            />
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
                                                <p className="text-sm text-slate-500">{formatDate(comprovante.data)}</p>
                                            </div>
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
                        {/* Lista de empresas cadastradas */}
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
                                                onClick={() => { if(confirm("Excluir esta empresa?")) deleteEmpresaMutation.mutate(emp.id); }}
                                            >
                                                <Trash2 className="w-3 h-3 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Formulário */}
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
                                    disabled={!empresaForm.nome || createEmpresaMutation.isPending || updateEmpresaCadMutation.isPending}
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

            {/* Dialog Editar Empresa em Massa */}
            <Dialog open={showEditEmpresa} onOpenChange={setShowEditEmpresa}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-orange-600" />
                            Editar Empresa em Massa
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Alterar a empresa de <strong>{selecionados.length}</strong> comprovante(s) selecionado(s).
                        </p>
                        <div className="space-y-2">
                            <Label>Selecione a Empresa</Label>
                            <Select value={empresaEmMassa} onValueChange={setEmpresaEmMassa}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione uma empresa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {empresasCadastradas.map(emp => (
                                        <SelectItem key={emp.id} value={emp.nome}>
                                            <div className="flex items-center gap-2">
                                                {emp.logo_url ? (
                                                    <img src={emp.logo_url} alt="" className="w-5 h-5 object-contain rounded" />
                                                ) : (
                                                    <Building2 className="w-5 h-5 text-slate-400" />
                                                )}
                                                <span>{emp.nome}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {empresaEmMassa && getEmpresaLogo(empresaEmMassa) && (
                                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                    <img src={getEmpresaLogo(empresaEmMassa)} alt="" className="w-10 h-10 object-contain rounded" />
                                    <span className="font-medium">{empresaEmMassa}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowEditEmpresa(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => updateEmpresaMutation.mutate({ ids: selecionados, empresa: empresaEmMassa })}
                                disabled={updateEmpresaMutation.isPending || !empresaEmMassa}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                {updateEmpresaMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

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
                                <Label>Data *</Label>
                                <Input
                                    type="date"
                                    value={form.data}
                                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                                    required
                                />
                            </div>
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