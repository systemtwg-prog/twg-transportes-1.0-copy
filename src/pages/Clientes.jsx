import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Plus, Search, Pencil, Trash2, Users, Building2, 
    Phone, MapPin, FileText, Star, Upload, ClipboardPaste, Sparkles, X, ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import ClienteForm from "@/components/clientes/ClienteForm";

export default function Clientes() {
    const [showForm, setShowForm] = useState(false);
    const [editingCliente, setEditingCliente] = useState(null);
    const [search, setSearch] = useState("");
    const [filterFavoritos, setFilterFavoritos] = useState(false);
    const [ordenacao, setOrdenacao] = useState("favoritos"); // favoritos, nome, cidade
    const queryClient = useQueryClient();

    const { data: clientes = [], isLoading } = useQuery({
        queryKey: ["clientes"],
        queryFn: () => base44.entities.Cliente.list("-created_date")
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Cliente.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientes"] });
            setShowForm(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientes"] });
            setShowForm(false);
            setEditingCliente(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Cliente.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clientes"] })
    });

    const toggleFavorito = useMutation({
        mutationFn: ({ id, favorito }) => base44.entities.Cliente.update(id, { favorito }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clientes"] })
    });

    const [importing, setImporting] = useState(false);
    const [showPasteForm, setShowPasteForm] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [processingPaste, setProcessingPaste] = useState(false);

    // Função para verificar CNPJ/CPF duplicado
    const cnpjCpfJaCadastrado = (cnpjCpf) => {
        if (!cnpjCpf) return false;
        const cnpjLimpo = cnpjCpf.replace(/\D/g, "");
        return clientes.some(c => c.cnpj_cpf?.replace(/\D/g, "") === cnpjLimpo);
    };

    const handleProcessPaste = async () => {
        if (!pasteText.trim()) return;
        
        setProcessingPaste(true);
        
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um extrator de dados. Analise o texto abaixo e extraia TODAS as informações de clientes/empresas que encontrar.

TEXTO PARA ANALISAR:
"""
${pasteText}
"""

IMPORTANTE: 
- Extraia QUALQUER informação que pareça ser de uma empresa ou pessoa
- Se não encontrar um campo específico, deixe como string vazia ""
- O campo razao_social é obrigatório - use o nome da empresa/pessoa
- Se houver múltiplos clientes, retorne todos
- Retorne os dados no formato JSON especificado`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        clientes: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    razao_social: { type: "string", description: "Nome da empresa ou pessoa" },
                                    nome_fantasia: { type: "string", description: "Nome fantasia" },
                                    cnpj_cpf: { type: "string", description: "CNPJ ou CPF" },
                                    tipo: { type: "string", description: "remetente, destinatario ou ambos" },
                                    contato: { type: "string", description: "Nome do contato" },
                                    telefone: { type: "string", description: "Telefone" },
                                    email: { type: "string", description: "Email" },
                                    cep: { type: "string", description: "CEP" },
                                    endereco: { type: "string", description: "Endereço" },
                                    bairro: { type: "string", description: "Bairro" },
                                    cidade: { type: "string", description: "Cidade" },
                                    uf: { type: "string", description: "Estado UF" },
                                    horario_funcionamento_inicio: { type: "string", description: "Horário início" },
                                    horario_funcionamento_fim: { type: "string", description: "Horário fim" },
                                    horario_almoco_inicio: { type: "string", description: "Almoço início" },
                                    horario_almoco_fim: { type: "string", description: "Almoço fim" },
                                    observacoes: { type: "string", description: "Observações" }
                                },
                                required: ["razao_social"]
                            }
                        }
                    },
                    required: ["clientes"]
                }
            });

            console.log("Resultado LLM:", result);

            const clientesEncontrados = result?.clientes || [];
            
            if (clientesEncontrados.length > 0) {
                let importados = 0;
                let duplicados = 0;
                
                for (const cliente of clientesEncontrados) {
                    if (cliente.razao_social) {
                        // Verificar CNPJ/CPF duplicado
                        if (cliente.cnpj_cpf && cnpjCpfJaCadastrado(cliente.cnpj_cpf)) {
                            duplicados++;
                            continue;
                        }
                        
                        await base44.entities.Cliente.create({
                            ...cliente,
                            tipo: cliente.tipo?.toLowerCase() || "remetente"
                        });
                        importados++;
                    }
                }
                
                queryClient.invalidateQueries({ queryKey: ["clientes"] });
                
                if (importados === 0 && duplicados > 0) {
                    toast.warning(`Nenhum cliente criado. ${duplicados} ignorado(s) por CNPJ/CPF duplicado.`);
                } else if (duplicados > 0) {
                    toast.warning(`${importados} cliente(s) criado(s). ${duplicados} ignorado(s) por CNPJ/CPF duplicado.`);
                } else if (importados > 0) {
                    toast.success(`✅ ${importados} cliente(s) criado(s) com sucesso!`);
                } else {
                    toast.error("Não foi possível criar clientes. Verifique os dados.");
                }
                
                setShowPasteForm(false);
                setPasteText("");
            } else {
                toast.error("Não foi possível identificar clientes no texto. Tente reformatar os dados.");
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
                        clientes: {
                            type: "array",
                            description: "Lista de clientes extraídos do documento. Extraia TODOS os clientes encontrados no arquivo.",
                            items: {
                                type: "object",
                                properties: {
                                    codigo: { type: "string", description: "Código do cliente se houver" },
                                    razao_social: { type: "string", description: "Razão social ou nome do cliente - OBRIGATÓRIO" },
                                    nome_fantasia: { type: "string", description: "Nome fantasia da empresa" },
                                    cnpj_cpf: { type: "string", description: "CNPJ ou CPF do cliente" },
                                    tipo: { type: "string", description: "Tipo: remetente, destinatario ou ambos. Use 'ambos' se não souber" },
                                    contato: { type: "string", description: "Nome da pessoa de contato" },
                                    telefone: { type: "string", description: "Telefone principal" },
                                    email: { type: "string", description: "Email de contato" },
                                    cep: { type: "string", description: "CEP do endereço" },
                                    endereco: { type: "string", description: "Rua, número e complemento" },
                                    bairro: { type: "string", description: "Bairro" },
                                    cidade: { type: "string", description: "Nome da cidade" },
                                    uf: { type: "string", description: "Sigla do estado (SP, RJ, MG, etc)" },
                                    horario_funcionamento_inicio: { type: "string", description: "Horário de abertura (ex: 08:00)" },
                                    horario_funcionamento_fim: { type: "string", description: "Horário de fechamento (ex: 18:00)" },
                                    horario_almoco_inicio: { type: "string", description: "Início do horário de almoço" },
                                    horario_almoco_fim: { type: "string", description: "Fim do horário de almoço" },
                                    observacoes: { type: "string", description: "Observações ou informações adicionais" }
                                },
                                required: ["razao_social"]
                            }
                        }
                    },
                    required: ["clientes"]
                }
            });

            if (result.status === "success" && result.output) {
                const clientesImport = result.output.clientes || (Array.isArray(result.output) ? result.output : [result.output]);
                
                if (!clientesImport || clientesImport.length === 0) {
                    toast.error("Nenhum cliente encontrado no arquivo.");
                    setImporting(false);
                    e.target.value = "";
                    return;
                }

                let importados = 0;
                let duplicados = 0;
                
                for (const cliente of clientesImport) {
                    if (cliente.razao_social) {
                        // Verificar CNPJ/CPF duplicado
                        if (cliente.cnpj_cpf && cnpjCpfJaCadastrado(cliente.cnpj_cpf)) {
                            duplicados++;
                            continue;
                        }
                        
                        await base44.entities.Cliente.create({
                            ...cliente,
                            tipo: cliente.tipo?.toLowerCase() || "ambos"
                        });
                        importados++;
                    }
                }
                
                queryClient.invalidateQueries({ queryKey: ["clientes"] });
                
                if (importados === 0 && duplicados > 0) {
                    toast.warning(`Nenhum cliente criado. ${duplicados} ignorado(s) por CNPJ/CPF duplicado.`);
                } else if (duplicados > 0) {
                    toast.warning(`✅ ${importados} cliente(s) importado(s). ${duplicados} ignorado(s) por CNPJ/CPF duplicado.`);
                } else {
                    toast.success(`✅ Importado com sucesso! ${importados} cliente(s) adicionado(s).`);
                }
            } else {
                toast.error("Erro ao processar arquivo: " + (result?.details || "Formato não suportado"));
            }
        } catch (error) {
            console.error("Erro na importação:", error);
            toast.error("Erro ao importar arquivo. Verifique o formato e tente novamente.");
        }
        
        setImporting(false);
        e.target.value = "";
    };

    const handleSubmit = (data) => {
        if (editingCliente) {
            updateMutation.mutate({ id: editingCliente.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (cliente) => {
        setEditingCliente(cliente);
        setShowForm(true);
    };

    const handleDelete = (cliente) => {
        if (confirm(`Deseja excluir o cliente "${cliente.razao_social}"?`)) {
            deleteMutation.mutate(cliente.id);
        }
    };

    let filteredClientes = clientes.filter(c => 
        c.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
        c.codigo?.toLowerCase().includes(search.toLowerCase()) ||
        c.cnpj_cpf?.includes(search)
    );

    if (filterFavoritos) {
        filteredClientes = filteredClientes.filter(c => c.favorito);
    }

    // Ordenar conforme seleção
    filteredClientes.sort((a, b) => {
        if (ordenacao === "favoritos") {
            if (a.favorito && !b.favorito) return -1;
            if (!a.favorito && b.favorito) return 1;
            return 0;
        } else if (ordenacao === "nome") {
            return (a.razao_social || "").localeCompare(b.razao_social || "");
        } else if (ordenacao === "cidade") {
            const cidadeA = `${a.cidade || ""}/${a.uf || ""}`;
            const cidadeB = `${b.cidade || ""}/${b.uf || ""}`;
            return cidadeA.localeCompare(cidadeB);
        }
        return 0;
    });

    const tipoColors = {
        remetente: "bg-amber-100 text-amber-800 border-amber-200",
        destinatario: "bg-emerald-100 text-emerald-800 border-emerald-200",
        ambos: "bg-blue-100 text-blue-800 border-blue-200"
    };

    const tipoLabels = {
        remetente: "Remetente",
        destinatario: "Destinatário",
        ambos: "Ambos"
    };

    const formatHorario = (inicio, fim) => {
        if (!inicio || !fim) return null;
        return `${inicio} - ${fim}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Clientes</h1>
                            <p className="text-slate-500">Gerencie remetentes e destinatários</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf,image/*"
                                onChange={handleImportFile}
                                className="hidden"
                                disabled={importing}
                            />
                            <Button variant="outline" className="border-emerald-500 text-emerald-700 hover:bg-emerald-50" asChild disabled={importing}>
                                <span>
                                    {importing ? (
                                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-emerald-500 border-t-transparent rounded-full" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-2" />
                                    )}
                                    {importing ? "Importando..." : "Importar (Excel/CSV/PDF/Foto)"}
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
                            onClick={() => { setEditingCliente(null); setShowForm(true); }}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Novo Cliente
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-xl">
                                <Building2 className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Remetentes</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {clientes.filter(c => c.tipo === "remetente" || c.tipo === "ambos").length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <MapPin className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Destinatários</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {clientes.filter(c => c.tipo === "destinatario" || c.tipo === "ambos").length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setFilterFavoritos(!filterFavoritos)}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${filterFavoritos ? "bg-yellow-200" : "bg-yellow-100"}`}>
                                <Star className={`w-6 h-6 ${filterFavoritos ? "text-yellow-600 fill-yellow-600" : "text-yellow-600"}`} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Favoritos</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {clientes.filter(c => c.favorito).length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Cadastros</p>
                                <p className="text-2xl font-bold text-slate-800">{clientes.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Sort */}
                <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Buscar por nome, código ou CNPJ..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-white border-slate-200"
                                />
                            </div>
                            <Select value={ordenacao} onValueChange={setOrdenacao}>
                                <SelectTrigger className="w-full md:w-56 bg-white">
                                    <ArrowUpDown className="w-4 h-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="favoritos">Ordenar por Favoritos</SelectItem>
                                    <SelectItem value="nome">Ordenar por Nome</SelectItem>
                                    <SelectItem value="cidade">Ordenar por Cidade</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Razão Social</TableHead>
                                        <TableHead>CNPJ/CPF</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Cidade/UF</TableHead>
                                        <TableHead>Horário</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-12">
                                                    <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredClientes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                                                    Nenhum cliente encontrado
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredClientes.map((cliente) => (
                                                <motion.tr
                                                    key={cliente.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="hover:bg-slate-50 transition-colors"
                                                >
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => toggleFavorito.mutate({ 
                                                                id: cliente.id, 
                                                                favorito: !cliente.favorito 
                                                            })}
                                                            className="hover:bg-yellow-100"
                                                        >
                                                            <Star className={`w-4 h-4 ${cliente.favorito ? "text-yellow-500 fill-yellow-500" : "text-slate-300"}`} />
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-slate-600">
                                                        {cliente.codigo || "-"}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-800">
                                                        <div>
                                                            <p>{cliente.razao_social}</p>
                                                            {cliente.nome_fantasia && (
                                                                <p className="text-xs text-slate-500">{cliente.nome_fantasia}</p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-mono text-sm">
                                                        {cliente.cnpj_cpf || "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${tipoColors[cliente.tipo]} border`}>
                                                            {tipoLabels[cliente.tipo]}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600">
                                                        {cliente.cidade}{cliente.uf ? `/${cliente.uf}` : ""}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 text-xs">
                                                        {formatHorario(cliente.horario_funcionamento_inicio, cliente.horario_funcionamento_fim) || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600">
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {cliente.telefone || "-"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEdit(cliente)}
                                                                className="hover:bg-blue-100"
                                                            >
                                                                <Pencil className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(cliente)}
                                                                className="hover:bg-red-100"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-600" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Paste Dialog */}
            <Dialog open={showPasteForm} onOpenChange={setShowPasteForm}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardPaste className="w-5 h-5 text-purple-600" />
                            Colar Informações de Clientes
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Cole abaixo as informações de clientes. O sistema irá identificar e organizar automaticamente os dados como nome, CNPJ, endereço, telefone, horário de funcionamento, etc.
                            <strong className="block mt-1 text-orange-600">Obs: CNPJs/CPFs já cadastrados serão ignorados para evitar duplicidade.</strong>
                        </p>
                        <Textarea
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            placeholder="Cole aqui as informações dos clientes...

Exemplo:
Empresa ABC Ltda
CNPJ: 12.345.678/0001-00
Endereço: Rua das Flores, 123 - Centro
Cidade: São Paulo - SP
Telefone: (11) 99999-9999
Horário: 08:00 às 18:00
Almoço: 12:00 às 13:00"
                            rows={12}
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
                                        <Sparkles className="w-4 h-4 mr-1" /> Processar e Cadastrar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0">
                    <ClienteForm
                        cliente={editingCliente}
                        onSubmit={handleSubmit}
                        onCancel={() => { setShowForm(false); setEditingCliente(null); }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}