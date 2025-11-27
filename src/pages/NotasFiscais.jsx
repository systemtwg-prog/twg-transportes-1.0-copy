import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Plus, FileText, Upload, Trash2, Pencil, Search, Save, X, ClipboardPaste, Sparkles, Building2, Car
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NotasFiscais() {
    const [showForm, setShowForm] = useState(false);
    const [showPasteForm, setShowPasteForm] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [processingPaste, setProcessingPaste] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [importing, setImporting] = useState(false);
    const [selecionados, setSelecionados] = useState([]);
    const [showRemetenteDialog, setShowRemetenteDialog] = useState(false);
    const [remetenteEmMassa, setRemetenteEmMassa] = useState("");
    const [placaEmMassa, setPlacaEmMassa] = useState("");
    const [showCadastroRemetente, setShowCadastroRemetente] = useState(false);
    const [remetenteForm, setRemetenteForm] = useState({ nome: "", cnpj: "", endereco: "", telefone: "" });
    const [editingRemetente, setEditingRemetente] = useState(null);
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        numero_nf: "",
        destinatario: "",
        peso: "",
        volume: "",
        transportadora: "",
        placa: "",
        data: format(new Date(), "yyyy-MM-dd"),
        observacoes: ""
    });

    const { data: notas = [], isLoading } = useQuery({
        queryKey: ["notas-fiscais"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: empresasRemetentes = [] } = useQuery({
        queryKey: ["empresas-remetentes"],
        queryFn: () => base44.entities.EmpresaRemetente.list()
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-notas"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    // Mutations para empresas remetentes
    const createRemetenteMutation = useMutation({
        mutationFn: (data) => base44.entities.EmpresaRemetente.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["empresas-remetentes"] });
            setShowCadastroRemetente(false);
            setRemetenteForm({ nome: "", cnpj: "", endereco: "", telefone: "" });
            setEditingRemetente(null);
            toast.success("Empresa remetente cadastrada!");
        }
    });

    const updateRemetenteMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.EmpresaRemetente.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["empresas-remetentes"] });
            setShowCadastroRemetente(false);
            setRemetenteForm({ nome: "", cnpj: "", endereco: "", telefone: "" });
            setEditingRemetente(null);
            toast.success("Empresa remetente atualizada!");
        }
    });

    const deleteRemetenteMutation = useMutation({
        mutationFn: (id) => base44.entities.EmpresaRemetente.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["empresas-remetentes"] })
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.NotaFiscal.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setShowForm(false);
            resetForm();
            toast.success("Nota fiscal cadastrada com sucesso!");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.NotaFiscal.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setShowForm(false);
            resetForm();
            toast.success("Nota fiscal atualizada!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.NotaFiscal.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            toast.success("Nota fiscal excluída!");
        }
    });

    // Mutation para atualizar em massa
    const updateEmMassaMutation = useMutation({
        mutationFn: async ({ ids, data }) => {
            for (const id of ids) {
                await base44.entities.NotaFiscal.update(id, data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setShowRemetenteDialog(false);
            setSelecionados([]);
            setRemetenteEmMassa("");
            setPlacaEmMassa("");
            toast.success("Notas fiscais atualizadas!");
        }
    });

    // Mutation para excluir em massa
    const deleteEmMassaMutation = useMutation({
        mutationFn: async (ids) => {
            for (const id of ids) {
                await base44.entities.NotaFiscal.delete(id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setSelecionados([]);
            toast.success("Notas fiscais excluídas!");
        }
    });

    const resetForm = () => {
        setForm({
            numero_nf: "",
            destinatario: "",
            peso: "",
            volume: "",
            transportadora: "",
            placa: "",
            data: format(new Date(), "yyyy-MM-dd"),
            observacoes: ""
        });
        setEditing(null);
    };

    const handleEdit = (nota) => {
        setForm(nota);
        setEditing(nota);
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const toggleSelecionado = (id) => {
        setSelecionados(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selecionarTodos = () => {
        if (selecionados.length === filtered.length) {
            setSelecionados([]);
        } else {
            setSelecionados(filtered.map(n => n.id));
        }
    };

    const handleProcessPaste = async () => {
        if (!pasteText.trim()) return;
        
        setProcessingPaste(true);
        
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Analise o texto abaixo e extraia as informações de notas fiscais. 
                
Texto colado:
${pasteText}

IMPORTANTE: NÃO preencha o campo remetente. Deixe-o em branco.
Extraia APENAS as seguintes informações de cada nota fiscal encontrada:
- numero_nf: número da nota fiscal
- destinatario: nome do destinatário (a empresa que vai receber)
- peso: peso da carga
- volume: quantidade de volumes
- transportadora: nome da transportadora`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        notas: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    numero_nf: { type: "string" },
                                    destinatario: { type: "string" },
                                    peso: { type: "string" },
                                    volume: { type: "string" },
                                    transportadora: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            if (result?.notas && result.notas.length > 0) {
                let importados = 0;
                for (const nota of result.notas) {
                    if (nota.numero_nf || nota.destinatario) {
                        await base44.entities.NotaFiscal.create({
                            numero_nf: nota.numero_nf || "",
                            destinatario: nota.destinatario || "",
                            peso: nota.peso || "",
                            volume: nota.volume || "",
                            transportadora: nota.transportadora || "",
                            remetente: "", // Sempre em branco
                            data: format(new Date(), "yyyy-MM-dd")
                        });
                        importados++;
                    }
                }
                queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
                toast.success(`✅ ${importados} nota(s) fiscal(is) criada(s) com sucesso!`);
                setShowPasteForm(false);
                setPasteText("");
            } else {
                toast.error("Não foi possível identificar notas fiscais no texto.");
            }
        } catch (error) {
            console.error("Erro ao processar texto:", error);
            toast.error("Erro ao processar texto. Tente novamente.");
        }
        
        setProcessingPaste(false);
    };

    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        notas: {
                            type: "array",
                            description: "Lista de notas fiscais extraídas do documento. NÃO extraia o campo remetente.",
                            items: {
                                type: "object",
                                properties: {
                                    numero_nf: { type: "string", description: "Número da nota fiscal (NFE)" },
                                    destinatario: { type: "string", description: "Nome do destinatário" },
                                    peso: { type: "string", description: "Peso da carga" },
                                    volume: { type: "string", description: "Quantidade de volumes" },
                                    transportadora: { type: "string", description: "Nome da transportadora" }
                                }
                            }
                        }
                    }
                }
            });

            if (result.status === "success" && result.output) {
                const notasImport = result.output.notas || (Array.isArray(result.output) ? result.output : [result.output]);
                let importados = 0;
                
                for (const nota of notasImport) {
                    if (nota.numero_nf || nota.destinatario) {
                        await base44.entities.NotaFiscal.create({
                            numero_nf: nota.numero_nf || "",
                            destinatario: nota.destinatario || "",
                            peso: nota.peso || "",
                            volume: nota.volume || "",
                            transportadora: nota.transportadora || "",
                            remetente: "", // Sempre em branco
                            data: format(new Date(), "yyyy-MM-dd")
                        });
                        importados++;
                    }
                }
                
                queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
                toast.success(`✅ Importado com sucesso! ${importados} nota(s) fiscal(is) adicionada(s).`);
            } else {
                toast.error("Erro ao processar arquivo. Verifique o formato.");
            }
        } catch (error) {
            console.error("Erro na importação:", error);
            toast.error("Erro ao importar arquivo. Tente novamente.");
        }
        
        setImporting(false);
        e.target.value = "";
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
        n.numero_nf?.toLowerCase().includes(search.toLowerCase()) ||
        n.destinatario?.toLowerCase().includes(search.toLowerCase()) ||
        n.transportadora?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Notas Fiscais</h1>
                            <p className="text-slate-500">Gerencie notas fiscais para romaneios</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button 
                            onClick={() => { setRemetenteForm({ nome: "", cnpj: "", endereco: "", telefone: "" }); setEditingRemetente(null); setShowCadastroRemetente(true); }}
                            variant="outline"
                            className="border-orange-500 text-orange-700 hover:bg-orange-50"
                        >
                            <Building2 className="w-4 h-4 mr-2" />
                            Empresas Remetentes
                        </Button>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf"
                                onChange={handleImportFile}
                                className="hidden"
                                disabled={importing}
                            />
                            <Button variant="outline" className="border-blue-500 text-blue-700 hover:bg-blue-50" asChild disabled={importing}>
                                <span>
                                    {importing ? (
                                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-blue-500 border-t-transparent rounded-full" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-2" />
                                    )}
                                    {importing ? "Importando..." : "Importar PDF/Excel"}
                                </span>
                            </Button>
                        </label>
                        <Button 
                            onClick={() => setShowPasteForm(true)}
                            variant="outline"
                            className="border-purple-500 text-purple-700 hover:bg-purple-50"
                        >
                            <ClipboardPaste className="w-4 h-4 mr-2" />
                            Colar Texto
                        </Button>
                        <Button 
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-14 px-8 text-lg"
                        >
                            <Plus className="w-6 h-6 mr-2" />
                            Nova Nota
                        </Button>
                    </div>
                </div>

                {/* Search e Ações em Massa */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Buscar por NF, destinatário ou transportadora..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Button variant="outline" onClick={selecionarTodos}>
                                    {selecionados.length === filtered.length && filtered.length > 0 ? "Desmarcar Todos" : "Selecionar Todos"}
                                </Button>
                                {selecionados.length > 0 && (
                                    <>
                                        <Button 
                                            variant="outline"
                                            className="border-green-500 text-green-700 hover:bg-green-50"
                                            onClick={() => setShowRemetenteDialog(true)}
                                        >
                                            <Building2 className="w-4 h-4 mr-1" />
                                            Editar ({selecionados.length})
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            className="border-red-500 text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                if (confirm(`Excluir ${selecionados.length} nota(s) fiscal(is)?`)) {
                                                    deleteEmMassaMutation.mutate(selecionados);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Excluir ({selecionados.length})
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabela */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-10">
                                            <Checkbox 
                                                checked={selecionados.length === filtered.length && filtered.length > 0}
                                                onCheckedChange={selecionarTodos}
                                            />
                                        </TableHead>
                                        <TableHead>NF</TableHead>
                                        <TableHead>Destinatário</TableHead>
                                        <TableHead>Peso</TableHead>
                                        <TableHead>Volume</TableHead>
                                        <TableHead>Transportadora</TableHead>
                                        <TableHead>Placa</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-12">
                                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                                                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                Nenhuma nota fiscal encontrada
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((nota) => (
                                            <TableRow key={nota.id} className={`hover:bg-slate-50 ${selecionados.includes(nota.id) ? "bg-blue-50" : ""}`}>
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={selecionados.includes(nota.id)}
                                                        onCheckedChange={() => toggleSelecionado(nota.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-bold text-blue-600">{nota.numero_nf}</TableCell>
                                                <TableCell className="font-medium">{nota.destinatario}</TableCell>
                                                <TableCell>{nota.peso || "-"}</TableCell>
                                                <TableCell>{nota.volume || "-"}</TableCell>
                                                <TableCell>{nota.transportadora || "-"}</TableCell>
                                                <TableCell className="font-medium text-emerald-600">{nota.placa || "-"}</TableCell>
                                                <TableCell>{formatDate(nota.data)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(nota)}>
                                                            <Pencil className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => {
                                                            if (confirm("Excluir esta nota fiscal?")) deleteMutation.mutate(nota.id);
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
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Editar em Massa (Remetente e Placa) */}
            <Dialog open={showRemetenteDialog} onOpenChange={setShowRemetenteDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-green-600" />
                            Editar Notas Selecionadas
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Alterar dados de <strong>{selecionados.length}</strong> nota(s) fiscal(is) selecionada(s).
                        </p>
                        <div className="space-y-2">
                            <Label>Empresa Remetente</Label>
                            <Select value={remetenteEmMassa} onValueChange={setRemetenteEmMassa}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione o remetente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {empresasRemetentes.map(emp => (
                                        <SelectItem key={emp.id} value={emp.nome}>
                                            {emp.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Car className="w-4 h-4" /> Placa do Veículo
                            </Label>
                            <Select value={placaEmMassa} onValueChange={setPlacaEmMassa}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione a placa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {veiculos.map(v => (
                                        <SelectItem key={v.id} value={v.placa}>
                                            {v.placa} - {v.modelo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowRemetenteDialog(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => {
                                    const data = {};
                                    if (remetenteEmMassa) data.remetente = remetenteEmMassa;
                                    if (placaEmMassa) data.placa = placaEmMassa;
                                    if (Object.keys(data).length > 0) {
                                        updateEmMassaMutation.mutate({ ids: selecionados, data });
                                    }
                                }}
                                disabled={updateEmMassaMutation.isPending || (!remetenteEmMassa && !placaEmMassa)}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {updateEmMassaMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Cadastro de Empresas Remetentes */}
            <Dialog open={showCadastroRemetente} onOpenChange={setShowCadastroRemetente}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-orange-600" />
                            Empresas Remetentes
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Lista de empresas */}
                        {empresasRemetentes.length > 0 && !editingRemetente && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                <Label className="text-xs text-slate-500">Empresas Cadastradas</Label>
                                {empresasRemetentes.map(emp => (
                                    <div key={emp.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                        <div>
                                            <span className="font-medium">{emp.nome}</span>
                                            {emp.cnpj && <span className="text-xs text-slate-500 ml-2">({emp.cnpj})</span>}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => { setRemetenteForm(emp); setEditingRemetente(emp); }}
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => { if(confirm("Excluir esta empresa?")) deleteRemetenteMutation.mutate(emp.id); }}
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
                            <h4 className="font-medium text-sm">{editingRemetente ? "Editar Empresa" : "Nova Empresa"}</h4>
                            <div className="space-y-2">
                                <Label>Nome *</Label>
                                <Input
                                    value={remetenteForm.nome}
                                    onChange={(e) => setRemetenteForm({ ...remetenteForm, nome: e.target.value })}
                                    placeholder="Nome da empresa"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>CNPJ</Label>
                                    <Input
                                        value={remetenteForm.cnpj}
                                        onChange={(e) => setRemetenteForm({ ...remetenteForm, cnpj: e.target.value })}
                                        placeholder="00.000.000/0001-00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input
                                        value={remetenteForm.telefone}
                                        onChange={(e) => setRemetenteForm({ ...remetenteForm, telefone: e.target.value })}
                                        placeholder="(00) 0000-0000"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Endereço</Label>
                                <Input
                                    value={remetenteForm.endereco}
                                    onChange={(e) => setRemetenteForm({ ...remetenteForm, endereco: e.target.value })}
                                    placeholder="Endereço completo"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                {editingRemetente && (
                                    <Button variant="ghost" onClick={() => { setEditingRemetente(null); setRemetenteForm({ nome: "", cnpj: "", endereco: "", telefone: "" }); }}>
                                        Cancelar
                                    </Button>
                                )}
                                <Button 
                                    onClick={() => {
                                        if (editingRemetente) {
                                            updateRemetenteMutation.mutate({ id: editingRemetente.id, data: remetenteForm });
                                        } else {
                                            createRemetenteMutation.mutate(remetenteForm);
                                        }
                                    }}
                                    disabled={!remetenteForm.nome}
                                    className="bg-orange-500 hover:bg-orange-600"
                                >
                                    <Save className="w-4 h-4 mr-1" />
                                    {editingRemetente ? "Atualizar" : "Cadastrar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Paste Dialog */}
            <Dialog open={showPasteForm} onOpenChange={setShowPasteForm}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardPaste className="w-5 h-5 text-purple-600" />
                            Colar Informações
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Cole abaixo as informações de notas fiscais. O sistema irá identificar e organizar automaticamente os dados.
                            <strong className="block mt-1 text-orange-600">Obs: O campo remetente será deixado em branco para você preencher depois.</strong>
                        </p>
                        <Textarea
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            placeholder="Cole aqui as informações das notas fiscais...

Exemplo:
NF 123456 - Destinatário ABC LTDA - 5 volumes - Transportadora XYZ
NF 789012 - Cliente DEF - Peso 100kg - 3 vol"
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
                </DialogContent>
            </Dialog>

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            {editing ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Número NF *</Label>
                                <Input
                                    value={form.numero_nf}
                                    onChange={(e) => setForm({ ...form, numero_nf: e.target.value })}
                                    required
                                    placeholder="Ex: 123456"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    value={form.data}
                                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Destinatário *</Label>
                            <Input
                                value={form.destinatario}
                                onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                                required
                                placeholder="Nome do destinatário"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Peso</Label>
                                <Input
                                    value={form.peso}
                                    onChange={(e) => setForm({ ...form, peso: e.target.value })}
                                    placeholder="Ex: 100kg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Volume</Label>
                                <Input
                                    value={form.volume}
                                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                                    placeholder="Ex: 5"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Transportadora</Label>
                            <Input
                                value={form.transportadora}
                                onChange={(e) => setForm({ ...form, transportadora: e.target.value })}
                                placeholder="Nome da transportadora"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Car className="w-4 h-4" /> Placa do Veículo
                            </Label>
                            <Select value={form.placa} onValueChange={(v) => setForm({ ...form, placa: v })}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione a placa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {veiculos.map(v => (
                                        <SelectItem key={v.id} value={v.placa}>
                                            {v.placa} - {v.modelo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                <Save className="w-4 h-4 mr-1" /> Salvar
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}