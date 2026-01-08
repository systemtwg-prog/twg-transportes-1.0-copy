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
    Plus, Search, Pencil, Trash2, User, Phone, 
    CreditCard, Calendar, X, Save, Upload, Camera, Users, FileText, Eye, Share2, MessageCircle, IdCard, ClipboardPaste, Sparkles
} from "lucide-react";
import CrachaMotorista from "@/components/motorista/CrachaMotorista";
import FlipbookViewer from "@/components/shared/FlipbookViewer";
import CepAutoComplete from "@/components/cep/CepAutoComplete";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import { Dialog as DialogComponent, DialogContent as DialogContentComponent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function MotoristaForm({ motorista, onSubmit, onCancel, usuarios }) {
    const [form, setForm] = useState({
        nome: motorista?.nome || "",
        cpf: motorista?.cpf || "",
        rg: motorista?.rg || "",
        data_nascimento: motorista?.data_nascimento || "",
        cnh: motorista?.cnh || "",
        categoria_cnh: motorista?.categoria_cnh || "B",
        validade_cnh: motorista?.validade_cnh || "",
        documentos_cnh: motorista?.documentos_cnh || [],
        telefone: motorista?.telefone || "",
        email: motorista?.email || "",
        endereco: motorista?.endereco || "",
        funcao: motorista?.funcao || "Motorista",
        data_admissao: motorista?.data_admissao || "",
        status: motorista?.status || "ativo",
        foto_url: motorista?.foto_url || "",
        tipo_vinculo: motorista?.tipo_vinculo || "funcionario",
        usuario_vinculado: motorista?.usuario_vinculado || "",
        observacoes: motorista?.observacoes || ""
    });
    const [uploading, setUploading] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [viewDocs, setViewDocs] = useState(null);

    const handleDocUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploadingDoc(true);
        const novosArquivos = [];
        for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            novosArquivos.push({ nome: file.name, url: file_url, tipo: file.type });
        }
        setForm({ ...form, documentos_cnh: [...form.documentos_cnh, ...novosArquivos] });
        setUploadingDoc(false);
        toast.success("Documento enviado!");
    };

    const removeDoc = (index) => {
        setForm({ ...form, documentos_cnh: form.documentos_cnh.filter((_, i) => i !== index) });
    };

    const handleShareWhatsApp = () => {
        const texto = `*COLABORADOR: ${form.nome}*\nCPF: ${form.cpf}\nCNH: ${form.cnh} - ${form.categoria_cnh}\nTelefone: ${form.telefone}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
    };

    const handlePrintColaborador = () => {
        const winPrint = window.open('', '', 'width=800,height=600');
        if (!winPrint) {
            alert("Por favor, permita pop-ups para imprimir.");
            return;
        }
        winPrint.document.write(`
            <html>
            <head>
                <title>Ficha do Colaborador - ${form.nome}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 30px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; }
                    .photo { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #0ea5e9; }
                    .title { font-size: 24px; font-weight: bold; color: #0369a1; margin: 15px 0 5px; }
                    .section { margin: 20px 0; }
                    .section-title { font-size: 16px; font-weight: bold; color: #0ea5e9; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; }
                    .row { display: flex; margin: 8px 0; }
                    .label { font-weight: bold; width: 150px; color: #64748b; }
                    .value { flex: 1; color: #1e293b; }
                    .docs { margin-top: 20px; }
                    .doc-list { display: flex; flex-wrap: wrap; gap: 10px; }
                    .doc-item { padding: 8px 15px; background: #f0f9ff; border-radius: 5px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    ${form.foto_url ? `<img src="${form.foto_url}" class="photo" />` : '<div class="photo" style="background:#e2e8f0;display:flex;align-items:center;justify-content:center;margin:0 auto;">Sem foto</div>'}
                    <div class="title">${form.nome}</div>
                    <div style="color:#64748b">${form.tipo_vinculo === "funcionario" ? "Funcionário" : "Agregado"}</div>
                </div>
                <div class="section">
                    <div class="section-title">Dados Pessoais</div>
                    <div class="row"><span class="label">CPF:</span><span class="value">${form.cpf}</span></div>
                    <div class="row"><span class="label">Telefone:</span><span class="value">${form.telefone || "-"}</span></div>
                    <div class="row"><span class="label">Email:</span><span class="value">${form.email || "-"}</span></div>
                    <div class="row"><span class="label">Endereço:</span><span class="value">${form.endereco || "-"}</span></div>
                </div>
                <div class="section">
                    <div class="section-title">Dados da CNH</div>
                    <div class="row"><span class="label">Número CNH:</span><span class="value">${form.cnh}</span></div>
                    <div class="row"><span class="label">Categoria:</span><span class="value">${form.categoria_cnh}</span></div>
                    <div class="row"><span class="label">Validade:</span><span class="value">${form.validade_cnh || "-"}</span></div>
                </div>
                <div class="section">
                    <div class="section-title">Dados Profissionais</div>
                    <div class="row"><span class="label">Data Admissão:</span><span class="value">${form.data_admissao || "-"}</span></div>
                    <div class="row"><span class="label">Status:</span><span class="value">${form.status}</span></div>
                </div>
                ${form.documentos_cnh?.length > 0 ? `
                <div class="section docs">
                    <div class="section-title">Documentos Anexados (${form.documentos_cnh.length})</div>
                    <div class="doc-list">
                        ${form.documentos_cnh.map(d => `<span class="doc-item">${d.nome}</span>`).join("")}
                    </div>
                </div>
                ` : ''}
            </body>
            </html>
        `);
        winPrint.document.close();
        winPrint.focus();
        setTimeout(() => { winPrint.print(); winPrint.close(); }, 250);
    };

    const handleFotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setForm({ ...form, foto_url: file_url });
        setUploading(false);
        toast.success("Foto enviada!");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-cyan-50">
                <CardTitle className="flex items-center justify-between">
                    <span>{motorista ? "Editar Colaborador" : "Novo Colaborador"}</span>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Foto do Colaborador */}
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                                {form.foto_url ? (
                                    <img src={form.foto_url} alt="Foto" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-8 h-8 text-slate-400" />
                                )}
                            </div>
                            <label className="absolute -bottom-1 -right-1 p-2 bg-orange-500 rounded-full cursor-pointer hover:bg-orange-600 transition-colors">
                                <Upload className="w-4 h-4 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFotoUpload}
                                    className="hidden"
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-700">Foto do Colaborador</h3>
                            <p className="text-sm text-slate-500">Clique no ícone para enviar uma foto</p>
                            {uploading && <p className="text-sm text-orange-600">Enviando...</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome Completo *</Label>
                            <Input
                                value={form.nome}
                                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Função/Cargo</Label>
                            <Input
                                value={form.funcao}
                                onChange={(e) => setForm({ ...form, funcao: e.target.value })}
                                placeholder="Motorista"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>RG</Label>
                            <Input
                                value={form.rg}
                                onChange={(e) => setForm({ ...form, rg: e.target.value })}
                                placeholder="00.000.000-0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>CPF *</Label>
                            <Input
                                value={form.cpf}
                                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                                placeholder="000.000.000-00"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data de Nascimento</Label>
                            <Input
                                type="date"
                                value={form.data_nascimento}
                                onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>CNH *</Label>
                            <Input
                                value={form.cnh}
                                onChange={(e) => setForm({ ...form, cnh: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Categoria CNH</Label>
                            <Select value={form.categoria_cnh} onValueChange={(v) => setForm({ ...form, categoria_cnh: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"].map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Validade CNH</Label>
                            <Input
                                type="date"
                                value={form.validade_cnh}
                                onChange={(e) => setForm({ ...form, validade_cnh: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Documentos CNH */}
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <Label className="font-semibold text-amber-800 mb-3 block">Documentos da CNH (Foto ou PDF)</Label>
                        <div className="flex gap-2 mb-3">
                            <input type="file" accept="image/*,.pdf" multiple onChange={handleDocUpload} className="hidden" id="doc-cnh" />
                            <label htmlFor="doc-cnh" className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-amber-300 rounded-lg hover:border-amber-500 cursor-pointer">
                                <Upload className="w-4 h-4 text-amber-600" />
                                <span className="text-sm text-amber-700">Adicionar arquivo</span>
                            </label>
                            <input type="file" accept="image/*" capture="environment" onChange={handleDocUpload} className="hidden" id="camera-cnh" />
                            <label htmlFor="camera-cnh" className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-amber-300 rounded-lg hover:border-amber-500 cursor-pointer">
                                <Camera className="w-4 h-4 text-amber-600" />
                                <span className="text-sm text-amber-700">Tirar Foto</span>
                            </label>
                            {uploadingDoc && <div className="animate-spin w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" />}
                        </div>
                        {form.documentos_cnh.length > 0 && (
                            <div className="space-y-2">
                                {form.documentos_cnh.map((doc, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-amber-600" />
                                            <span className="text-sm truncate max-w-[200px]">{doc.nome}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewDocs(form.documentos_cnh)}>
                                                <Eye className="w-4 h-4 text-blue-600" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDoc(i)}>
                                                <X className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input
                                value={form.telefone}
                                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <CepAutoComplete
                            value={form.cep || ""}
                            onChange={(cep) => setForm({ ...form, cep })}
                            onAddressFound={(addr) => setForm({ 
                                ...form, 
                                endereco: `${addr.endereco}, ${addr.bairro} - ${addr.cidade}/${addr.uf}`
                            })}
                        />
                        <div className="md:col-span-2 space-y-2">
                            <Label>Endereço</Label>
                            <Input
                                value={form.endereco}
                                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                                placeholder="Rua, número, bairro - Cidade/UF"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data de Admissão</Label>
                            <Input
                                type="date"
                                value={form.data_admissao}
                                onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ativo">Ativo</SelectItem>
                                    <SelectItem value="inativo">Inativo</SelectItem>
                                    <SelectItem value="ferias">Férias</SelectItem>
                                    <SelectItem value="afastado">Afastado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo de Vínculo</Label>
                            <Select value={form.tipo_vinculo} onValueChange={(v) => setForm({ ...form, tipo_vinculo: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="funcionario">Funcionário</SelectItem>
                                    <SelectItem value="agregado">Agregado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Usuário de Acesso Vinculado</Label>
                            <Select value={form.usuario_vinculado} onValueChange={(v) => setForm({ ...form, usuario_vinculado: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um usuário..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>Nenhum</SelectItem>
                                    {usuarios?.map(u => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.full_name || u.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => handlePrintColaborador()}>
                            <FileText className="w-4 h-4 mr-2" />
                            Imprimir
                        </Button>
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
                            title={`Documentos CNH - ${form.nome}`}
                        />
                    )}
                </form>
            </CardContent>
        </Card>
    );
}

export default function Motoristas() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [showCracha, setShowCracha] = useState(null);
    const [showPasteForm, setShowPasteForm] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [processingPaste, setProcessingPaste] = useState(false);
    const queryClient = useQueryClient();

    const { data: motoristas = [], isLoading } = useQuery({
        queryKey: ["motoristas"],
        queryFn: () => base44.entities.Motorista.list("-created_date")
    });

    const { data: usuarios = [] } = useQuery({
        queryKey: ["usuarios"],
        queryFn: () => base44.entities.User.list()
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Motorista.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["motoristas"] });
            setShowForm(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Motorista.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["motoristas"] });
            setShowForm(false);
            setEditing(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Motorista.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["motoristas"] })
    });

    const handleSubmit = (data) => {
        if (editing) {
            updateMutation.mutate({ id: editing.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleProcessPaste = async () => {
        if (!pasteText.trim()) return;
        
        setProcessingPaste(true);
        
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um extrator de dados. Analise o texto abaixo e extraia as informações de colaboradores/motoristas.

TEXTO PARA ANALISAR:
"""
${pasteText}
"""

IMPORTANTE: 
- Extraia TODOS os colaboradores encontrados
- Para cada colaborador, identifique: nome, CPF, CNH, telefone, categoria CNH, etc.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        colaboradores: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    nome: { type: "string", description: "Nome completo" },
                                    cpf: { type: "string", description: "CPF" },
                                    cnh: { type: "string", description: "Número da CNH" },
                                    categoria_cnh: { type: "string", description: "Categoria da CNH" },
                                    telefone: { type: "string", description: "Telefone" },
                                    email: { type: "string", description: "Email" }
                                }
                            }
                        }
                    },
                    required: ["colaboradores"]
                }
            });

            const colaboradoresEncontrados = result?.colaboradores || [];
            
            if (colaboradoresEncontrados.length > 0) {
                let importados = 0;
                
                for (const colab of colaboradoresEncontrados) {
                    if (colab.nome && colab.cpf && colab.cnh) {
                        await base44.entities.Motorista.create({
                            nome: colab.nome || "",
                            cpf: colab.cpf || "",
                            cnh: colab.cnh || "",
                            categoria_cnh: colab.categoria_cnh || "B",
                            telefone: colab.telefone || "",
                            email: colab.email || "",
                            status: "ativo",
                            funcao: "Motorista",
                            tipo_vinculo: "funcionario"
                        });
                        importados++;
                    }
                }
                
                queryClient.invalidateQueries({ queryKey: ["motoristas"] });
                toast.success(`✅ ${importados} colaborador(es) importado(s)!`);
                setShowPasteForm(false);
                setPasteText("");
            } else {
                toast.error("Não foi possível identificar colaboradores no texto.");
            }
        } catch (error) {
            console.error("Erro ao processar texto:", error);
            toast.error("Erro ao processar texto. Tente novamente.");
        }
        
        setProcessingPaste(false);
    };

    const filtered = motoristas.filter(m => 
        m.nome?.toLowerCase().includes(search.toLowerCase()) ||
        m.cpf?.includes(search) ||
        m.cnh?.includes(search)
    );

    const statusColors = {
        ativo: "bg-green-100 text-green-800",
        inativo: "bg-gray-100 text-gray-800",
        ferias: "bg-blue-100 text-blue-800",
        afastado: "bg-yellow-100 text-yellow-800"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl shadow-lg">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Colaboradores</h1>
                            <p className="text-slate-500">Gerencie motoristas e colaboradores</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => setShowPasteForm(true)}
                            variant="outline"
                            className="border-purple-500 text-purple-700 hover:bg-purple-50"
                        >
                            <ClipboardPaste className="w-4 h-4 mr-2" />
                            Colar
                        </Button>
                        <Button 
                            onClick={() => { setEditing(null); setShowForm(true); }}
                            className="bg-gradient-to-r from-sky-400 to-cyan-500"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Novo Colaborador
                        </Button>
                    </div>
                </div>

                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por nome, CPF ou CNH..."
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
                                    <TableHead>Colaborador</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-12">
                                            <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                                            Nenhum colaborador encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((mot) => (
                                        <TableRow key={mot.id} className="hover:bg-slate-50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    {mot.foto_url ? (
                                                        <img src={mot.foto_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                                            <User className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold">{mot.nome}</p>
                                                        {mot.telefone && (
                                                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                                                <Phone className="w-3 h-3" />
                                                                {mot.telefone}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-5 px-1 ml-1 bg-green-50 hover:bg-green-100 text-green-700"
                                                                    onClick={() => window.open(`https://wa.me/55${mot.telefone.replace(/\D/g, '')}`, "_blank")}
                                                                >
                                                                    <MessageCircle className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[mot.status]}>
                                                    {mot.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setShowCracha(mot)}
                                                        title="Gerar Crachá"
                                                    >
                                                        <IdCard className="w-4 h-4 text-emerald-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setEditing(mot); setShowForm(true); }}
                                                    >
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            if (confirm(`Excluir colaborador ${mot.nome}?`)) {
                                                                deleteMutation.mutate(mot.id);
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
                    <MotoristaForm
                        motorista={editing}
                        onSubmit={handleSubmit}
                        onCancel={() => { setShowForm(false); setEditing(null); }}
                        usuarios={usuarios}
                    />
                </DialogContent>
            </Dialog>

            {showCracha && (
                <CrachaMotorista 
                    motorista={showCracha} 
                    config={config}
                    onClose={() => setShowCracha(null)} 
                />
            )}

            <DialogComponent open={showPasteForm} onOpenChange={setShowPasteForm}>
                <DialogContentComponent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardPaste className="w-5 h-5 text-purple-600" />
                            Colar Informações de Colaboradores
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Cole abaixo as informações dos colaboradores. O sistema irá identificar e organizar automaticamente os dados.
                        </p>
                        <Textarea
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            placeholder="Cole aqui as informações dos colaboradores...

Exemplo:
Nome: João Silva - CPF: 123.456.789-00 - CNH: 12345678900 - Categoria: D - Telefone: (11) 98765-4321
Maria Santos, CPF 987.654.321-00, CNH 98765432100, Cat. C, Tel: 11987654322"
                            rows={10}
                            className="font-mono text-sm"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setShowPasteForm(false); setPasteText(""); }}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button 
                                onClick={handleProcessPaste}
                                disabled={processingPaste || !pasteText.trim()}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {processingPaste ? (
                                    <>
                                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-1" /> Processar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContentComponent>
            </DialogComponent>
        </div>
    );
}