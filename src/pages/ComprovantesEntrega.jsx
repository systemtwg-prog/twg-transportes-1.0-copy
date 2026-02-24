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
    Camera, File, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download, Search, Save, Share2, Building2, Calendar, RotateCw, RefreshCw, Loader2, Check, AlertTriangle, User, FolderDown
} from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import FastPhotoCapture from "@/components/shared/FastPhotoCapture";
import BulkPhotoCapture from "@/components/shared/BulkPhotoCapture";

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
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header com botão Voltar */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
                <Button 
                    onClick={onClose} 
                    className="bg-white/20 hover:bg-white/30 text-white h-12 px-5 rounded-full"
                >
                    <ChevronLeft className="w-6 h-6 mr-1" />
                    Voltar
                </Button>
                <div className="text-white text-center">
                    {files.length > 1 && (
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                            {currentPage + 1} de {files.length}
                        </span>
                    )}
                </div>
                <div className="w-24" /> {/* Spacer */}
            </div>

            {/* Área da imagem */}
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
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
                        style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                    />
                )}
            </div>

            {/* Controles - posicionados mais acima */}
            <div className="absolute bottom-24 left-0 right-0 flex flex-col items-center gap-3 px-4">
                {/* Barra de controles compacta */}
                <div className="flex items-center justify-center gap-2 bg-black/60 rounded-full px-4 py-2">
                    {/* Zoom Out */}
                    <Button 
                        onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} 
                        className="bg-white/20 hover:bg-white/30 text-white h-10 w-10 rounded-full p-0"
                    >
                        <ZoomOut className="w-5 h-5" />
                    </Button>
                    
                    {/* Indicador de Zoom */}
                    <div className="bg-white/20 px-3 py-1 rounded-full text-white font-bold text-sm min-w-[60px] text-center">
                        {Math.round(zoom * 100)}%
                    </div>
                    
                    {/* Zoom In */}
                    <Button 
                        onClick={() => setZoom(z => Math.min(3, z + 0.25))} 
                        className="bg-white/20 hover:bg-white/30 text-white h-10 w-10 rounded-full p-0"
                    >
                        <ZoomIn className="w-5 h-5" />
                    </Button>
                    
                    {/* Separador */}
                    <div className="w-px h-6 bg-white/30 mx-1" />
                    
                    {/* Rotacionar */}
                    {!isPdf && (
                        <Button 
                            onClick={rotateImage} 
                            className="bg-amber-500 hover:bg-amber-600 text-white h-10 w-10 rounded-full p-0"
                        >
                            <RotateCw className="w-5 h-5" />
                        </Button>
                    )}
                    
                    {/* Download */}
                    <a href={currentFile?.url} download target="_blank" rel="noopener noreferrer">
                        <Button className="bg-green-500 hover:bg-green-600 text-white h-10 w-10 rounded-full p-0">
                            <Download className="w-5 h-5" />
                        </Button>
                    </a>
                </div>

                {/* Navegação entre páginas */}
                {files.length > 1 && (
                    <div className="flex items-center justify-center gap-3 bg-black/60 rounded-full px-4 py-2">
                        <Button 
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                            className="bg-white/20 hover:bg-white/30 text-white h-9 px-4 rounded-full disabled:opacity-30 text-sm"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Anterior
                        </Button>
                        <div className="flex gap-1.5">
                            {files.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i)}
                                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentPage ? "bg-white" : "bg-white/40 hover:bg-white/60"}`}
                                />
                            ))}
                        </div>
                        <Button 
                            onClick={() => setCurrentPage(p => Math.min(files.length - 1, p + 1))}
                            disabled={currentPage === files.length - 1}
                            className="bg-white/20 hover:bg-white/30 text-white h-9 px-4 rounded-full disabled:opacity-30 text-sm"
                        >
                            Próximo
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ComprovantesEntrega() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [filterData, setFilterData] = useState("");
    const [filterDataFim, setFilterDataFim] = useState("");
    const [filterNF, setFilterNF] = useState("");
    const [filterEmpresa, setFilterEmpresa] = useState("");
    const [filterTexto, setFilterTexto] = useState("");
    const [filterTipoDoc, setFilterTipoDoc] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterValorMin, setFilterValorMin] = useState("");
    const [filterValorMax, setFilterValorMax] = useState("");
    const [viewFiles, setViewFiles] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showCadastroEmpresa, setShowCadastroEmpresa] = useState(false);
    const [empresaForm, setEmpresaForm] = useState({ nome: "", logo_url: "" });
    const [editingEmpresa, setEditingEmpresa] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showCameraMassa, setShowCameraMassa] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [bulkEditData, setBulkEditData] = useState({ data: "", empresa: "" });
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
        tipo_documento: "Comprovante",
        valor: "",
        status: "pendente",
        empresa: "",
        remetente: "",
        destinatario: "",
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

    const bulkUpdateMutation = useMutation({
        mutationFn: async ({ ids, data }) => {
            for (const id of ids) {
                await base44.entities.ComprovanteInterno.update(id, data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-internos"] });
            setSelectedIds([]);
            setShowBulkEdit(false);
            setBulkEditData({ data: "", empresa: "" });
            toast.success("Comprovantes atualizados!");
        }
    });

    const toggleSelect = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(c => c.id));
        }
    };

    const handleBulkEdit = () => {
        const updateData = {};
        if (bulkEditData.data) updateData.data = bulkEditData.data;
        if (bulkEditData.empresa) updateData.empresa = bulkEditData.empresa;

        if (Object.keys(updateData).length === 0) {
            toast.error("Selecione pelo menos um campo para alterar");
            return;
        }

        bulkUpdateMutation.mutate({ ids: selectedIds, data: updateData });
    };

    const resetForm = () => {
        setForm({
            nota_fiscal: "",
            tipo_documento: "Comprovante",
            valor: "",
            status: "pendente",
            empresa: "",
            remetente: "",
            destinatario: "",
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

    const [downloadingZip, setDownloadingZip] = useState(false);

    // Função de download de imagem
    const handleDownloadImage = async (comprovante) => {
        if (!comprovante.arquivos || comprovante.arquivos.length === 0) {
            toast.error("Nenhuma imagem para baixar");
            return;
        }

        try {
            const imageUrl = comprovante.arquivos[0].url;
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `NF_${comprovante.nota_fiscal || 'sem_nf'}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success("Download concluído!");
        } catch (error) {
            toast.error("Erro ao baixar imagem");
        }
    };

    // Download em ZIP dos selecionados
    const handleDownloadZip = async () => {
        const selecionados = comprovantes.filter(c => selectedIds.includes(c.id));
        const comArquivos = selecionados.filter(c => c.arquivos && c.arquivos.length > 0);
        
        if (comArquivos.length === 0) {
            toast.error("Nenhum comprovante selecionado com arquivos");
            return;
        }

        setDownloadingZip(true);
        try {
            const zip = new JSZip();
            let adicionados = 0;

            for (const comprovante of comArquivos) {
                for (let i = 0; i < comprovante.arquivos.length; i++) {
                    const arq = comprovante.arquivos[i];
                    try {
                        const response = await fetch(arq.url);
                        const blob = await response.blob();
                        const ext = arq.tipo?.includes("pdf") ? "pdf" : "jpg";
                        const nf = comprovante.nota_fiscal || "sem_nf";
                        const suffix = comprovante.arquivos.length > 1 ? `_${i + 1}` : "";
                        const filename = `NF_${nf}${suffix}.${ext}`;
                        zip.file(filename, blob);
                        adicionados++;
                    } catch {}
                }
            }

            if (adicionados === 0) {
                toast.error("Não foi possível baixar nenhum arquivo");
                return;
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `comprovantes_${new Date().toISOString().split("T")[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(`ZIP com ${adicionados} arquivo(s) baixado!`);
        } catch (error) {
            toast.error("Erro ao gerar ZIP");
        }
        setDownloadingZip(false);
    };

    // Variável para controlar filtro de "sem empresa"
    const [filterSemEmpresa, setFilterSemEmpresa] = useState(false);

    const filtered = comprovantes.filter(c => {
        // Filtro especial: apenas sem empresa
        if (filterSemEmpresa && c.empresa) return false;
        
        // Filtro por data de início
        const matchDataInicio = !filterData || c.data >= filterData;
        
        // Filtro por data fim
        const matchDataFim = !filterDataFim || c.data <= filterDataFim;
        
        // Filtro por nota fiscal
        const matchNF = !filterNF || c.nota_fiscal?.toLowerCase().includes(filterNF.toLowerCase());
        
        // Filtro por empresa
        const matchEmpresa = !filterEmpresa || c.empresa === filterEmpresa;
        
        // Filtro por tipo de documento
        const matchTipoDoc = !filterTipoDoc || c.tipo_documento === filterTipoDoc;
        
        // Filtro por status
        const matchStatus = !filterStatus || c.status === filterStatus;
        
        // Filtro por valor mínimo
        const matchValorMin = !filterValorMin || (c.valor && c.valor >= parseFloat(filterValorMin));
        
        // Filtro por valor máximo
        const matchValorMax = !filterValorMax || (c.valor && c.valor <= parseFloat(filterValorMax));
        
        // Busca por texto livre (pesquisa em múltiplos campos)
        const matchTexto = !filterTexto || [
            c.nota_fiscal,
            c.empresa,
            c.observacoes,
            c.usuario_foto,
            c.remetente,
            c.destinatario,
            c.tipo_documento
        ].some(campo => campo?.toLowerCase().includes(filterTexto.toLowerCase()));
        
        return matchDataInicio && matchDataFim && matchNF && matchEmpresa && matchTipoDoc && matchStatus && matchValorMin && matchValorMax && matchTexto;
    });



    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 md:p-3 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl md:rounded-2xl shadow-lg">
                            <FileText className="w-6 h-6 md:w-8 md:h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-3xl font-bold text-slate-800">Comprovantes de Entrega</h1>
                            <p className="text-xs md:text-sm text-slate-500">Gerencie documentos e comprovantes</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button 
                            onClick={atualizarDashboards}
                            variant="outline"
                            size="sm"
                            className="border-green-500 text-green-600 hover:bg-green-50 text-xs md:text-sm h-8 md:h-10"
                        >
                            <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            Atualizar
                        </Button>
                        <Button 
                            onClick={() => {
                                const semEmpresa = comprovantes.filter(c => !c.empresa);
                                if (semEmpresa.length === 0) {
                                    toast.success("Todos os comprovantes têm empresa associada!");
                                    return;
                                }
                                // Limpar todos os filtros
                                setFilterEmpresa("");
                                setFilterTexto("");
                                setFilterData("");
                                setFilterDataFim("");
                                setFilterNF("");
                                setFilterTipoDoc("");
                                setFilterStatus("");
                                setFilterValorMin("");
                                setFilterValorMax("");
                                // Ativar filtro especial
                                setFilterSemEmpresa(true);
                                toast.info(`Exibindo ${semEmpresa.length} comprovante(s) sem empresa`);
                            }}
                            variant="outline"
                            size="sm"
                            className="border-amber-500 text-amber-600 hover:bg-amber-50 text-xs md:text-sm h-8 md:h-10"
                        >
                            <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            <span className="hidden sm:inline">Verificar Sem Empresa</span>
                            <span className="sm:hidden">Sem Empresa</span> ({comprovantes.filter(c => !c.empresa).length})
                        </Button>
                        <Button 
                            onClick={() => { setEmpresaForm({ nome: "", logo_url: "" }); setEditingEmpresa(null); setShowCadastroEmpresa(true); }}
                            variant="outline"
                            size="sm"
                            className="border-purple-500 text-purple-600 hover:bg-purple-50 text-xs md:text-sm h-8 md:h-10"
                        >
                            <Building2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            <span className="hidden sm:inline">Cadastro Empresas</span>
                            <span className="sm:hidden">Empresas</span>
                        </Button>
                    </div>
                </div>

                {/* Botão Grande - Adicionar Comprovante */}
                <div className="grid grid-cols-1 gap-3">
                    <Button 
                        onClick={() => setShowCameraMassa(true)}
                        className="w-full h-14 md:h-20 text-base md:text-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-xl"
                    >
                        <Camera className="w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-3" />
                        Adicionar Comprovante
                    </Button>
                </div>

                {/* Barra de Seleção */}
                {selectedIds.length > 0 && (
                    <Card className="bg-gradient-to-r from-sky-500 to-cyan-600 border-0 shadow-lg">
                        <CardContent className="p-3 md:p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3">
                                <Badge className="bg-white text-sky-700 text-sm md:text-lg px-2 md:px-3 py-1">
                                    {selectedIds.length} selecionado(s)
                                </Badge>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setSelectedIds([])}
                                    className="text-white hover:bg-white/20 text-xs md:text-sm h-7 md:h-8"
                                >
                                    <X className="w-3 h-3 md:w-4 md:h-4 mr-1" /> Limpar
                                </Button>
                            </div>
                            <Button 
                                onClick={() => setShowBulkEdit(true)}
                                size="sm"
                                className="bg-white text-sky-700 hover:bg-sky-50 text-xs md:text-sm h-8 md:h-10"
                            >
                                <Pencil className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                                <span className="hidden sm:inline">Editar em Massa</span>
                                <span className="sm:hidden">Editar</span>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Filtros Avançados */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-3 md:p-4 space-y-3 md:space-y-4">
                        {/* Busca Texto Livre */}
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                <Search className="w-3 h-3" /> Busca Rápida
                            </Label>
                            <div className="flex gap-1">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-sky-500" />
                                    <Input
                                        placeholder="Digite qualquer informação..."
                                        value={filterTexto}
                                        onChange={(e) => setFilterTexto(e.target.value)}
                                        className="pl-8 md:pl-11 bg-white h-9 md:h-12 text-sm md:text-base border-2 border-sky-200 focus:border-sky-500"
                                    />
                                </div>
                                {filterTexto && (
                                    <Button variant="ghost" size="icon" onClick={() => setFilterTexto("")} className="h-9 w-9 md:h-12 md:w-12">
                                        <X className="w-4 h-4 md:w-5 md:h-5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Filtros Específicos - Linha 1 */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
                            {/* Selecionar Todos */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Seleção</Label>
                                <Button 
                                    variant="outline" 
                                    onClick={toggleSelectAll}
                                    className="w-full h-8 md:h-10 text-xs md:text-sm"
                                >
                                    {selectedIds.length === filtered.length && filtered.length > 0 ? (
                                        <>
                                            <X className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> <span className="hidden sm:inline">Desmarcar</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> <span className="hidden sm:inline">Selecionar</span> ({filtered.length})
                                        </>
                                    )}
                                </Button>
                            </div>
                            
                            {/* Data Início */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Data Início
                                </Label>
                                <div className="flex gap-1">
                                    <Input
                                        type="date"
                                        value={filterData}
                                        onChange={(e) => setFilterData(e.target.value)}
                                        className="bg-white h-8 md:h-10 text-xs md:text-sm"
                                    />
                                    {filterData && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterData("")} className="h-8 w-8 md:h-10 md:w-10">
                                            <X className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Data Fim */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Data Fim
                                </Label>
                                <div className="flex gap-1">
                                    <Input
                                        type="date"
                                        value={filterDataFim}
                                        onChange={(e) => setFilterDataFim(e.target.value)}
                                        className="bg-white h-8 md:h-10 text-xs md:text-sm"
                                    />
                                    {filterDataFim && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterDataFim("")} className="h-8 w-8 md:h-10 md:w-10">
                                            <X className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Nota Fiscal */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Nota Fiscal
                                </Label>
                                <div className="flex gap-1">
                                    <Input
                                        placeholder="Nº NF..."
                                        value={filterNF}
                                        onChange={(e) => setFilterNF(e.target.value)}
                                        className="bg-white h-8 md:h-10 text-xs md:text-sm"
                                    />
                                    {filterNF && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterNF("")} className="h-8 w-8 md:h-10 md:w-10">
                                            <X className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Empresa */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> Empresa
                                </Label>
                                <div className="flex gap-1">
                                    <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                                        <SelectTrigger className="bg-white h-8 md:h-10 text-xs md:text-sm">
                                            <SelectValue placeholder="Todas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={null}>Todas</SelectItem>
                                            {empresasUnicas.map(emp => (
                                                <SelectItem key={emp} value={emp}>{emp}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {filterEmpresa && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterEmpresa("")} className="h-8 w-8 md:h-10 md:w-10">
                                            <X className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Filtros Específicos - Linha 2 */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
                            {/* Tipo de Documento */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <FileText className="w-3 h-3" /> Tipo Documento
                                </Label>
                                <div className="flex gap-1">
                                    <Select value={filterTipoDoc} onValueChange={setFilterTipoDoc}>
                                        <SelectTrigger className="bg-white h-8 md:h-10 text-xs md:text-sm">
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={null}>Todos</SelectItem>
                                            <SelectItem value="NF">NF</SelectItem>
                                            <SelectItem value="CTE">CTE</SelectItem>
                                            <SelectItem value="NFe">NFe</SelectItem>
                                            <SelectItem value="CTe">CTe</SelectItem>
                                            <SelectItem value="Comprovante">Comprovante</SelectItem>
                                            <SelectItem value="Recibo">Recibo</SelectItem>
                                            <SelectItem value="Outro">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {filterTipoDoc && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterTipoDoc("")} className="h-8 w-8 md:h-10 md:w-10">
                                            <X className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Status
                                </Label>
                                <div className="flex gap-1">
                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger className="bg-white h-8 md:h-10 text-xs md:text-sm">
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={null}>Todos</SelectItem>
                                            <SelectItem value="pendente">Pendente</SelectItem>
                                            <SelectItem value="aprovado">Aprovado</SelectItem>
                                            <SelectItem value="rejeitado">Rejeitado</SelectItem>
                                            <SelectItem value="em_analise">Em Análise</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {filterStatus && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterStatus("")} className="h-8 w-8 md:h-10 md:w-10">
                                            <X className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Valor Mínimo */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Valor Mínimo</Label>
                                <div className="flex gap-1">
                                    <Input
                                        type="number"
                                        placeholder="R$ 0,00"
                                        value={filterValorMin}
                                        onChange={(e) => setFilterValorMin(e.target.value)}
                                        className="bg-white h-8 md:h-10 text-xs md:text-sm"
                                        step="0.01"
                                    />
                                    {filterValorMin && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterValorMin("")} className="h-8 w-8 md:h-10 md:w-10">
                                            <X className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Valor Máximo */}
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Valor Máximo</Label>
                                <div className="flex gap-1">
                                    <Input
                                        type="number"
                                        placeholder="R$ 9999,99"
                                        value={filterValorMax}
                                        onChange={(e) => setFilterValorMax(e.target.value)}
                                        className="bg-white h-8 md:h-10 text-xs md:text-sm"
                                        step="0.01"
                                    />
                                    {filterValorMax && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterValorMax("")} className="h-8 w-8 md:h-10 md:w-10">
                                            <X className="w-3 h-3 md:w-4 md:h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Espaço vazio para alinhar */}
                            <div></div>
                        </div>

                        {/* Indicador de Filtros Ativos */}
                        {(filterTexto || filterData || filterDataFim || filterNF || filterEmpresa || filterTipoDoc || filterStatus || filterValorMin || filterValorMax || filterSemEmpresa) && (
                            <div className="flex items-center justify-between p-3 bg-sky-50 rounded-lg border border-sky-200">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-sky-700">Filtros ativos:</span>
                                    {filterSemEmpresa && <Badge className="bg-amber-500 text-white">⚠️ Sem Empresa</Badge>}
                                    {filterTexto && <Badge className="bg-sky-500 text-white">Busca: {filterTexto}</Badge>}
                                    {filterData && <Badge className="bg-blue-500 text-white">De: {format(new Date(filterData), "dd/MM/yyyy")}</Badge>}
                                    {filterDataFim && <Badge className="bg-blue-500 text-white">Até: {format(new Date(filterDataFim), "dd/MM/yyyy")}</Badge>}
                                    {filterNF && <Badge className="bg-purple-500 text-white">NF: {filterNF}</Badge>}
                                    {filterEmpresa && <Badge className="bg-green-500 text-white">{filterEmpresa}</Badge>}
                                    {filterTipoDoc && <Badge className="bg-indigo-500 text-white">Tipo: {filterTipoDoc}</Badge>}
                                    {filterStatus && <Badge className="bg-amber-500 text-white">Status: {filterStatus}</Badge>}
                                    {filterValorMin && <Badge className="bg-emerald-500 text-white">Min: R$ {parseFloat(filterValorMin).toFixed(2)}</Badge>}
                                    {filterValorMax && <Badge className="bg-emerald-500 text-white">Max: R$ {parseFloat(filterValorMax).toFixed(2)}</Badge>}
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                        setFilterTexto("");
                                        setFilterData("");
                                        setFilterDataFim("");
                                        setFilterNF("");
                                        setFilterEmpresa("");
                                        setFilterTipoDoc("");
                                        setFilterStatus("");
                                        setFilterValorMin("");
                                        setFilterValorMax("");
                                        setFilterSemEmpresa(false);
                                    }}
                                    className="text-sky-600 hover:text-sky-700"
                                >
                                    <X className="w-4 h-4 mr-1" /> Limpar Filtros
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Lista */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
                                className={`bg-white/90 border-2 shadow-md hover:shadow-lg transition-all cursor-pointer ${
                                    selectedIds.includes(comprovante.id) ? 'border-sky-500 ring-2 ring-sky-200' : 
                                    !comprovante.empresa ? 'border-amber-400 bg-amber-50/50' : 
                                    'border-transparent'
                                }`}
                                onClick={() => toggleSelect(comprovante.id)}
                            >
                                <CardContent className="p-3 md:p-5">
                                    <div className="flex items-start justify-between mb-2 md:mb-3">
                                        <div className="flex items-start gap-2 md:gap-3">
                                            {/* Checkbox de seleção */}
                                            <div 
                                                className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${selectedIds.includes(comprovante.id) ? 'bg-sky-500 border-sky-500' : 'border-slate-300'}`}
                                            >
                                                {selectedIds.includes(comprovante.id) && <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <h3 className="font-semibold text-sm md:text-base text-slate-800">NF: {comprovante.nota_fiscal}</h3>
                                                    {comprovante.tipo_documento && (
                                                        <Badge className="bg-indigo-100 text-indigo-700 text-xs">{comprovante.tipo_documento}</Badge>
                                                    )}
                                                </div>
                                                {comprovante.empresa && (
                                                    <div className="flex items-center gap-1 md:gap-1.5">
                                                        {getEmpresaLogo(comprovante.empresa) && (
                                                            <img 
                                                                src={getEmpresaLogo(comprovante.empresa)} 
                                                                alt="" 
                                                                className="w-4 h-4 md:w-5 md:h-5 object-contain rounded"
                                                            />
                                                        )}
                                                        <p className="text-xs md:text-sm text-sky-600 font-medium">{comprovante.empresa}</p>
                                                    </div>
                                                )}
                                                {comprovante.valor && (
                                                    <p className="text-xs md:text-sm font-bold text-green-600">R$ {comprovante.valor.toFixed(2)}</p>
                                                )}
                                                <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                                                    <p className="text-xs text-slate-500">{formatDate(comprovante.data)}</p>
                                                    {comprovante.status && (
                                                        <Badge className={`text-xs ${
                                                            comprovante.status === "aprovado" ? "bg-green-100 text-green-700" :
                                                            comprovante.status === "rejeitado" ? "bg-red-100 text-red-700" :
                                                            comprovante.status === "em_analise" ? "bg-amber-100 text-amber-700" :
                                                            "bg-yellow-100 text-yellow-700"
                                                        }`}>
                                                            {comprovante.status === "pendente" ? "Pendente" :
                                                             comprovante.status === "aprovado" ? "Aprovado" :
                                                             comprovante.status === "rejeitado" ? "Rejeitado" :
                                                             comprovante.status === "em_analise" ? "Em Análise" : comprovante.status}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {comprovante.usuario_foto && (
                                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                                        <User className="w-2 h-2 md:w-3 md:h-3" />
                                                        <span className="hidden sm:inline">{comprovante.usuario_foto}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {comprovante.arquivos?.length || 0}
                                        </Badge>
                                    </div>

                                    {/* Preview da imagem - largura total do cartão */}
                                    <div 
                                        className="w-full h-32 md:h-44 bg-slate-100 rounded-lg md:rounded-xl overflow-hidden cursor-pointer mb-2 md:mb-3"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (comprovante.arquivos?.length > 0) setViewFiles(comprovante.arquivos);
                                        }}
                                    >
                                        {comprovante.arquivos?.[0]?.url ? (
                                            <img src={comprovante.arquivos[0].url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <File className="w-10 h-10 text-slate-300" />
                                                <span className="text-slate-400 text-sm ml-2">Sem imagem</span>
                                            </div>
                                        )}
                                    </div>

                                    {comprovante.observacoes && (
                                        <p className="text-xs md:text-sm text-slate-600 line-clamp-2 mb-2 md:mb-3">{comprovante.observacoes}</p>
                                    )}

                                    <div className="flex justify-between" onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-green-600 hover:bg-green-50 text-xs md:text-sm h-7 md:h-8 px-2 md:px-3"
                                            onClick={() => {
                                                const texto = `*COMPROVANTE DE ENTREGA*\nNF: ${comprovante.nota_fiscal}\nData: ${formatDate(comprovante.data)}\n${comprovante.observacoes ? `Obs: ${comprovante.observacoes}` : ""}\n${comprovante.arquivos?.[0]?.url || ""}`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
                                            }}
                                        >
                                            <Share2 className="w-3 h-3 md:w-4 md:h-4 mr-1" /> <span className="hidden sm:inline">Compartilhar</span>
                                        </Button>
                                        <div className="flex gap-1">
                                            {comprovante.arquivos?.length > 0 && (
                                                <>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleDownloadImage(comprovante)} 
                                                        className="h-7 w-7 md:h-8 md:w-8 p-0 text-blue-600"
                                                    >
                                                        <Download className="w-3 h-3 md:w-4 md:h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setViewFiles(comprovante.arquivos)} className="h-7 w-7 md:h-8 md:w-8 p-0">
                                                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(comprovante)} className="h-7 w-7 md:h-8 md:w-8 p-0">
                                                <Pencil className="w-3 h-3 md:w-4 md:h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => {
                                                if (confirm("Excluir este comprovante?")) deleteMutation.mutate(comprovante.id);
                                            }} className="h-7 w-7 md:h-8 md:w-8 p-0">
                                                <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
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

            {/* Fast Photo Camera */}
            {showCamera && (
                <div className="fixed inset-0 z-[100]">
                    <FastPhotoCapture
                        onCapture={async (file) => {
                            try {
                                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                
                                setShowCamera(false);
                                
                                setForm(prev => ({
                                    ...prev,
                                    arquivos: [...(prev.arquivos || []), { nome: file.name, url: file_url, tipo: file.type }]
                                }));
                                
                                toast.success("Foto anexada!");
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

            {/* Bulk Photo Camera */}
            {showCameraMassa && (
                <div className="fixed inset-0 z-[100]">
                    <BulkPhotoCapture
                        onComplete={async (resultados) => {
                            setShowCameraMassa(false);
                            
                            let criados = 0;
                            for (const resultado of resultados) {
                                if (resultado.url) {
                                    try {
                                        await base44.entities.ComprovanteInterno.create({
                                            nota_fiscal: resultado.numero_nota || "Pendente",
                                            empresa: resultado.empresa || "",
                                            usuario_foto: resultado.usuario_foto || "",
                                            data: format(new Date(), "yyyy-MM-dd"),
                                            arquivos: [{ nome: "foto.jpg", url: resultado.url, tipo: "image/jpeg" }],
                                            observacoes: resultado.observacoes || ""
                                        });
                                        criados++;
                                    } catch (error) {
                                        console.error("Erro ao criar comprovante:", error);
                                    }
                                }
                            }
                            
                            queryClient.invalidateQueries({ queryKey: ["comprovantes-internos"] });
                            toast.success(`${criados} comprovante(s) criado(s)!`);
                        }}
                        onClose={() => setShowCameraMassa(false)}
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
                        {/* Nota Fiscal e Tipo */}
                        <div className="grid grid-cols-2 gap-4">
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
                            <div className="space-y-2">
                                <Label>Tipo Documento</Label>
                                <Select value={form.tipo_documento} onValueChange={(v) => setForm({ ...form, tipo_documento: v })}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NF">NF</SelectItem>
                                        <SelectItem value="CTE">CTE</SelectItem>
                                        <SelectItem value="NFe">NFe</SelectItem>
                                        <SelectItem value="CTe">CTe</SelectItem>
                                        <SelectItem value="Comprovante">Comprovante</SelectItem>
                                        <SelectItem value="Recibo">Recibo</SelectItem>
                                        <SelectItem value="Outro">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Data, Valor e Status */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    value={form.data}
                                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.valor}
                                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                                    placeholder="0,00"
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                        <SelectItem value="aprovado">Aprovado</SelectItem>
                                        <SelectItem value="rejeitado">Rejeitado</SelectItem>
                                        <SelectItem value="em_analise">Em Análise</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Empresa */}
                        <div className="space-y-2">
                            <Label>Empresa</Label>
                            <Select value={form.empresa} onValueChange={(v) => setForm({ ...form, empresa: v })}>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Selecione a empresa" />
                                </SelectTrigger>
                                <SelectContent>
                                    {empresasCadastradas.map(emp => (
                                        <SelectItem key={emp.id} value={emp.nome}>
                                            <div className="flex items-center gap-2">
                                                {emp.logo_url && <img src={emp.logo_url} alt="" className="w-5 h-5 object-contain" />}
                                                {emp.nome}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Remetente e Destinatário */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Remetente</Label>
                                <Input
                                    value={form.remetente}
                                    onChange={(e) => setForm({ ...form, remetente: e.target.value })}
                                    placeholder="Nome do remetente"
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Destinatário</Label>
                                <Input
                                    value={form.destinatario}
                                    onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                                    placeholder="Nome do destinatário"
                                    className="h-12"
                                />
                            </div>
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

                                {/* Foto Rápida */}
                                <div 
                                    className="border-2 border-dashed border-sky-400 rounded-xl p-6 text-center hover:border-sky-500 hover:bg-sky-50 transition-colors cursor-pointer"
                                    onClick={() => setShowCamera(true)}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <Camera className="w-10 h-10 text-sky-500" />
                                        <span className="text-sm text-sky-600 font-medium">Foto Rápida</span>
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

            {/* Dialog Edição em Massa */}
            <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-sky-600" />
                            Editar {selectedIds.length} Comprovante(s)
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">
                            Preencha apenas os campos que deseja alterar. Campos vazios não serão modificados.
                        </p>

                        <div className="space-y-2">
                            <Label>Nova Data</Label>
                            <Input
                                type="date"
                                value={bulkEditData.data}
                                onChange={(e) => setBulkEditData({ ...bulkEditData, data: e.target.value })}
                                className="h-12"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Nova Empresa</Label>
                            <Select 
                                value={bulkEditData.empresa} 
                                onValueChange={(v) => setBulkEditData({ ...bulkEditData, empresa: v })}
                            >
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Selecione a empresa" />
                                </SelectTrigger>
                                <SelectContent>
                                    {empresasCadastradas.map(emp => (
                                        <SelectItem key={emp.id} value={emp.nome}>
                                            <div className="flex items-center gap-2">
                                                {emp.logo_url && <img src={emp.logo_url} alt="" className="w-5 h-5 object-contain" />}
                                                {emp.nome}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button 
                            onClick={handleBulkEdit}
                            disabled={bulkUpdateMutation.isPending}
                            className="w-full h-14 text-lg bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700"
                        >
                            {bulkUpdateMutation.isPending ? (
                                <>
                                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                    Atualizando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-6 h-6 mr-2" />
                                    Aplicar Alterações
                                </>
                            )}
                        </Button>
                    </div>
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