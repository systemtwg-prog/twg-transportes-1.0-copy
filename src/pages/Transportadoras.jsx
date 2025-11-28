import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
    Plus, Search, Pencil, Trash2, Truck, X, Save, Building2, Phone, Mail, MapPin, ClipboardPaste, Sparkles
} from "lucide-react";
import { toast } from "sonner";

function TransportadoraForm({ transportadora, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        razao_social: transportadora?.razao_social || "",
        nome_fantasia: transportadora?.nome_fantasia || "",
        cnpj: transportadora?.cnpj || "",
        inscricao_estadual: transportadora?.inscricao_estadual || "",
        telefone: transportadora?.telefone || "",
        email: transportadora?.email || "",
        cep: transportadora?.cep || "",
        endereco: transportadora?.endereco || "",
        bairro: transportadora?.bairro || "",
        cidade: transportadora?.cidade || "",
        uf: transportadora?.uf || "",
        contato: transportadora?.contato || "",
        observacoes: transportadora?.observacoes || "",
        status: transportadora?.status || "ativo"
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    const buscarCep = async () => {
        if (form.cep?.length !== 8) return;
        try {
            const res = await fetch(`https://viacep.com.br/ws/${form.cep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setForm({
                    ...form,
                    endereco: data.logradouro || "",
                    bairro: data.bairro || "",
                    cidade: data.localidade || "",
                    uf: data.uf || ""
                });
            }
        } catch (err) {
            console.error("Erro ao buscar CEP:", err);
        }
    };

    return (
        <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-purple-50">
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-violet-600" />
                        {transportadora ? "Editar Transportadora" : "Nova Transportadora"}
                    </span>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Razão Social *</Label>
                            <Input
                                value={form.razao_social}
                                onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nome Fantasia</Label>
                            <Input
                                value={form.nome_fantasia}
                                onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>CNPJ *</Label>
                            <Input
                                value={form.cnpj}
                                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                                placeholder="00.000.000/0000-00"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Inscrição Estadual</Label>
                            <Input
                                value={form.inscricao_estadual}
                                onChange={(e) => setForm({ ...form, inscricao_estadual: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <div className="space-y-2">
                            <Label>Contato</Label>
                            <Input
                                value={form.contato}
                                onChange={(e) => setForm({ ...form, contato: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>CEP</Label>
                            <Input
                                value={form.cep}
                                onChange={(e) => setForm({ ...form, cep: e.target.value.replace(/\D/g, "") })}
                                onBlur={buscarCep}
                                maxLength={8}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Endereço</Label>
                            <Input
                                value={form.endereco}
                                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bairro</Label>
                            <Input
                                value={form.bairro}
                                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Cidade</Label>
                            <Input
                                value={form.cidade}
                                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>UF</Label>
                            <Input
                                value={form.uf}
                                onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                                maxLength={2}
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
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea
                            value={form.observacoes}
                            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                        <Button type="submit" className="bg-violet-500 hover:bg-violet-600">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function Transportadoras() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [showPasteForm, setShowPasteForm] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [processingPaste, setProcessingPaste] = useState(false);
    const queryClient = useQueryClient();

    const { data: transportadoras = [], isLoading } = useQuery({
        queryKey: ["transportadoras"],
        queryFn: () => base44.entities.Transportadora.list("-created_date")
    });

    // Função para verificar CNPJ duplicado
    const cnpjJaCadastrado = (cnpj) => {
        if (!cnpj) return false;
        const cnpjLimpo = cnpj.replace(/\D/g, "");
        return transportadoras.some(t => t.cnpj?.replace(/\D/g, "") === cnpjLimpo);
    };

    const handleProcessPaste = async () => {
        if (!pasteText.trim()) return;
        
        setProcessingPaste(true);
        
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Analise o texto abaixo e extraia as informações de transportadoras/empresas de transporte. 
                
Texto colado:
${pasteText}

Extraia as seguintes informações de cada transportadora encontrada:
- razao_social: razão social da empresa
- nome_fantasia: nome fantasia
- cnpj: CNPJ
- inscricao_estadual: inscrição estadual
- telefone: telefone
- email: email
- cep: CEP
- endereco: endereço (rua, número)
- bairro: bairro
- cidade: cidade
- uf: estado (sigla)
- contato: nome do contato
- observacoes: outras informações relevantes`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        transportadoras: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    razao_social: { type: "string" },
                                    nome_fantasia: { type: "string" },
                                    cnpj: { type: "string" },
                                    inscricao_estadual: { type: "string" },
                                    telefone: { type: "string" },
                                    email: { type: "string" },
                                    cep: { type: "string" },
                                    endereco: { type: "string" },
                                    bairro: { type: "string" },
                                    cidade: { type: "string" },
                                    uf: { type: "string" },
                                    contato: { type: "string" },
                                    observacoes: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            if (result?.transportadoras && result.transportadoras.length > 0) {
                let importados = 0;
                let duplicados = 0;
                
                for (const transp of result.transportadoras) {
                    if (transp.razao_social) {
                        // Verificar CNPJ duplicado
                        if (transp.cnpj && cnpjJaCadastrado(transp.cnpj)) {
                            duplicados++;
                            continue;
                        }
                        
                        await base44.entities.Transportadora.create({
                            ...transp,
                            status: "ativo"
                        });
                        importados++;
                    }
                }
                
                queryClient.invalidateQueries({ queryKey: ["transportadoras"] });
                
                if (duplicados > 0) {
                    toast.warning(`${importados} transportadora(s) criada(s). ${duplicados} ignorada(s) por CNPJ duplicado.`);
                } else {
                    toast.success(`✅ ${importados} transportadora(s) criada(s) com sucesso!`);
                }
                
                setShowPasteForm(false);
                setPasteText("");
            } else {
                toast.error("Não foi possível identificar transportadoras no texto.");
            }
        } catch (error) {
            console.error("Erro ao processar texto:", error);
            toast.error("Erro ao processar texto. Tente novamente.");
        }
        
        setProcessingPaste(false);
    };

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Transportadora.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transportadoras"] });
            setShowForm(false);
            toast.success("Transportadora cadastrada!");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Transportadora.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transportadoras"] });
            setShowForm(false);
            setEditing(null);
            toast.success("Transportadora atualizada!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Transportadora.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transportadoras"] });
            toast.success("Transportadora excluída!");
        }
    });

    const handleSubmit = (data) => {
        if (editing) {
            updateMutation.mutate({ id: editing.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const filtered = transportadoras.filter(t => 
        t.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
        t.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
        t.cnpj?.includes(search)
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Transportadoras</h1>
                            <p className="text-slate-500">Gerencie transportadoras parceiras</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => setShowPasteForm(true)}
                            variant="outline"
                            className="border-purple-500 text-purple-700 hover:bg-purple-50"
                        >
                            <ClipboardPaste className="w-4 h-4 mr-2" />
                            Colar Texto
                        </Button>
                        <Button 
                            onClick={() => { setEditing(null); setShowForm(true); }}
                            className="bg-gradient-to-r from-violet-500 to-purple-600"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Nova Transportadora
                        </Button>
                    </div>
                </div>

                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por nome ou CNPJ..."
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
                                    <TableHead>Transportadora</TableHead>
                                    <TableHead>CNPJ</TableHead>
                                    <TableHead>Contato</TableHead>
                                    <TableHead>Cidade/UF</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                            <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                            Nenhuma transportadora encontrada
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((trans) => (
                                        <TableRow key={trans.id} className="hover:bg-slate-50">
                                            <TableCell>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{trans.nome_fantasia || trans.razao_social}</p>
                                                    {trans.nome_fantasia && (
                                                        <p className="text-xs text-slate-500">{trans.razao_social}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{trans.cnpj}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {trans.telefone && (
                                                        <div className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {trans.telefone}
                                                        </div>
                                                    )}
                                                    {trans.email && (
                                                        <div className="flex items-center gap-1 text-slate-500">
                                                            <Mail className="w-3 h-3" />
                                                            {trans.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {trans.cidade && trans.uf ? `${trans.cidade}/${trans.uf}` : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={trans.status === "ativo" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                                    {trans.status === "ativo" ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setEditing(trans); setShowForm(true); }}
                                                    >
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            if (confirm(`Excluir transportadora ${trans.razao_social}?`)) {
                                                                deleteMutation.mutate(trans.id);
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

            {/* Paste Dialog */}
            <Dialog open={showPasteForm} onOpenChange={setShowPasteForm}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardPaste className="w-5 h-5 text-purple-600" />
                            Colar Informações de Transportadoras
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Cole abaixo as informações de transportadoras. O sistema irá identificar e organizar automaticamente os dados.
                            <strong className="block mt-1 text-orange-600">Obs: CNPJs já cadastrados serão ignorados para evitar duplicidade.</strong>
                        </p>
                        <Textarea
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            placeholder="Cole aqui as informações das transportadoras...

Exemplo:
Transportadora ABC Ltda
CNPJ: 12.345.678/0001-00
Endereço: Rua das Flores, 123 - Centro
Cidade: São Paulo - SP
Telefone: (11) 99999-9999"
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

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-0">
                    <TransportadoraForm
                        transportadora={editing}
                        onSubmit={handleSubmit}
                        onCancel={() => { setShowForm(false); setEditing(null); }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}