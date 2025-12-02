import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Plus, Search, Pencil, Trash2, FileText, Truck, 
    Upload, X, DollarSign, Calendar, Loader2, Users, Save, Printer, History, CheckSquare
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ImportadorServicos from "@/components/servicos/ImportadorServicos";

export default function ServicosSNF() {
    const [showForm, setShowForm] = useState(false);
    const [editingServico, setEditingServico] = useState(null);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [showImportador, setShowImportador] = useState(false);
    const [selecionados, setSelecionados] = useState([]);
    const [showEditMassa, setShowEditMassa] = useState(false);
    const [editMassaData, setEditMassaData] = useState({ status: "" });
    const queryClient = useQueryClient();

    const initialForm = {
        numero: "",
        data: format(new Date(), "yyyy-MM-dd"),
        remetente_id: "",
        remetente_cnpj: "",
        remetente_nome: "",
        destinatario_id: "",
        destinatario_cnpj: "",
        destinatario_nome: "",
        tomador: "", // remetente, destinatario
        pagador_frete_id: "",
        pagador_frete_cnpj: "",
        pagador_frete_nome: "",
        nfe: "",
        peso: "",
        volume: "",
        valor_nfe: "",
        tabela_peso: "",
        seguro: "",
        pedagio: "",
        coleta: "",
        total: "",
        porcentagem: "",
        status: "pendente",
        observacoes: ""
    };

    const [form, setForm] = useState(initialForm);

    const { data: servicos = [], isLoading } = useQuery({
        queryKey: ["servicos-snf"],
        queryFn: () => base44.entities.ServicoSNF.list("-created_date")
    });

    const { data: clientesSNF = [] } = useQuery({
        queryKey: ["clientes-snf"],
        queryFn: () => base44.entities.ClienteSNF.list()
    });

    // Gerar próximo número automaticamente
    const proximoNumero = useMemo(() => {
        if (servicos.length === 0) return "1";
        const numeros = servicos
            .map(s => parseInt(s.numero) || 0)
            .filter(n => !isNaN(n));
        const maiorNumero = Math.max(...numeros, 0);
        return String(maiorNumero + 1);
    }, [servicos]);

    // Histórico de serviços do pagador para o remetente atual
    const historicoServicos = useMemo(() => {
        if (!form.pagador_frete_cnpj || !form.remetente_cnpj) return [];
        return servicos.filter(s => 
            s.pagador_frete_cnpj === form.pagador_frete_cnpj &&
            s.remetente_cnpj === form.remetente_cnpj
        ).slice(0, 10);
    }, [servicos, form.pagador_frete_cnpj, form.remetente_cnpj]);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ServicoSNF.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["servicos-snf"] });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ServicoSNF.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["servicos-snf"] });
            setShowForm(false);
            setEditingServico(null);
            resetForm();
            toast.success("Serviço atualizado!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ServicoSNF.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["servicos-snf"] });
            toast.success("Serviço excluído!");
        }
    });

    // Mutations em massa
    const deleteEmMassaMutation = useMutation({
        mutationFn: async (ids) => {
            for (const id of ids) {
                await base44.entities.ServicoSNF.delete(id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["servicos-snf"] });
            setSelecionados([]);
            toast.success("Serviços excluídos!");
        }
    });

    const updateEmMassaMutation = useMutation({
        mutationFn: async ({ ids, data }) => {
            for (const id of ids) {
                await base44.entities.ServicoSNF.update(id, data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["servicos-snf"] });
            setSelecionados([]);
            setShowEditMassa(false);
            setEditMassaData({ status: "" });
            toast.success("Serviços atualizados!");
        }
    });

    const toggleSelecionado = (id) => {
        setSelecionados(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selecionarTodos = () => {
        if (selecionados.length === filteredServicos.length) {
            setSelecionados([]);
        } else {
            setSelecionados(filteredServicos.map(s => s.id));
        }
    };

    const resetForm = () => {
        setForm(initialForm);
    };

    // Buscar cliente por CNPJ
    const buscarClientePorCnpj = (cnpj, tipo) => {
        const cnpjLimpo = cnpj.replace(/\D/g, "");
        const cliente = clientesSNF.find(c => c.cnpj?.replace(/\D/g, "") === cnpjLimpo);
        
        if (cliente) {
            if (tipo === "remetente") {
                setForm(prev => ({
                    ...prev,
                    remetente_id: cliente.id,
                    remetente_cnpj: cliente.cnpj,
                    remetente_nome: cliente.razao_social
                }));
            } else if (tipo === "destinatario") {
                setForm(prev => ({
                    ...prev,
                    destinatario_id: cliente.id,
                    destinatario_cnpj: cliente.cnpj,
                    destinatario_nome: cliente.razao_social
                }));
            }
            toast.success(`${tipo === "remetente" ? "Remetente" : "Destinatário"} encontrado!`);
        } else {
            toast.error("Cliente não encontrado com este CNPJ");
        }
    };

    // Quando seleciona o tomador, atualiza pagador do frete
    const handleTomadorChange = (tomador) => {
        setForm(prev => {
            let pagadorData = {};
            if (tomador === "remetente" && prev.remetente_id) {
                pagadorData = {
                    pagador_frete_id: prev.remetente_id,
                    pagador_frete_cnpj: prev.remetente_cnpj,
                    pagador_frete_nome: prev.remetente_nome
                };
            } else if (tomador === "destinatario" && prev.destinatario_id) {
                pagadorData = {
                    pagador_frete_id: prev.destinatario_id,
                    pagador_frete_cnpj: prev.destinatario_cnpj,
                    pagador_frete_nome: prev.destinatario_nome
                };
            }
            return { ...prev, tomador, ...pagadorData };
        });
    };

    // Calcular seguro automaticamente (valor_nfe * 0.5%)
    useEffect(() => {
        const valorNfe = parseNumber(form.valor_nfe);
        if (valorNfe > 0) {
            const seguro = valorNfe * 0.005;
            setForm(prev => ({ ...prev, seguro: seguro.toFixed(2) }));
        }
    }, [form.valor_nfe]);

    // Calcular pedágio automaticamente (peso / 100 * 1.40)
    useEffect(() => {
        const peso = parseNumber(form.peso);
        if (peso > 0) {
            const pedagio = (peso / 100) * 1.40;
            setForm(prev => ({ ...prev, pedagio: pedagio.toFixed(2) }));
        }
    }, [form.peso]);

    // Calcular total automaticamente
    useEffect(() => {
        const tabelaPeso = parseNumber(form.tabela_peso);
        const seguro = parseNumber(form.seguro);
        const pedagio = parseNumber(form.pedagio);
        const coleta = parseNumber(form.coleta);
        const total = tabelaPeso + seguro + pedagio + coleta;
        if (total > 0) {
            setForm(prev => ({ ...prev, total: total.toFixed(2) }));
        }
    }, [form.tabela_peso, form.seguro, form.pedagio, form.coleta]);

    // Calcular porcentagem automaticamente
    useEffect(() => {
        const valorNfe = parseNumber(form.valor_nfe);
        const total = parseNumber(form.total);
        if (valorNfe > 0 && total > 0) {
            const porcentagem = (total / valorNfe) * 100;
            setForm(prev => ({ ...prev, porcentagem: porcentagem.toFixed(2) }));
        }
    }, [form.valor_nfe, form.total]);

    const parseNumber = (val) => {
        if (!val) return 0;
        const cleaned = val.toString().replace(/[^\d.,-]/g, "").replace(",", ".");
        return parseFloat(cleaned) || 0;
    };

    const handleSubmit = async (e, salvarEImprimir = false) => {
        e?.preventDefault();
        const data = {
            ...form,
            numero: editingServico ? form.numero : proximoNumero,
            peso: parseNumber(form.peso),
            volume: parseNumber(form.volume),
            valor_nfe: parseNumber(form.valor_nfe),
            tabela_peso: parseNumber(form.tabela_peso),
            seguro: parseNumber(form.seguro),
            pedagio: parseNumber(form.pedagio),
            coleta: parseNumber(form.coleta),
            total: parseNumber(form.total),
            porcentagem: parseNumber(form.porcentagem)
        };
        
        if (editingServico) {
            updateMutation.mutate({ id: editingServico.id, data });
        } else {
            await createMutation.mutateAsync(data);
            toast.success("Serviço cadastrado!");
            
            if (salvarEImprimir) {
                toast.info("Funcionalidade de impressão será implementada em breve!");
                // TODO: Implementar impressão da máscara
            }
            
            setShowForm(false);
            resetForm();
        }
    };

    const handleNovoServico = () => {
        setEditingServico(null);
        setForm({
            ...initialForm,
            numero: proximoNumero
        });
        setShowForm(true);
    };

    const handleEdit = (servico) => {
        setEditingServico(servico);
        setForm({
            numero: servico.numero || "",
            data: servico.data || format(new Date(), "yyyy-MM-dd"),
            remetente_id: servico.remetente_id || "",
            remetente_cnpj: servico.remetente_cnpj || "",
            remetente_nome: servico.remetente_nome || "",
            destinatario_id: servico.destinatario_id || "",
            destinatario_cnpj: servico.destinatario_cnpj || "",
            destinatario_nome: servico.destinatario_nome || "",
            tomador: servico.pagador_frete_cnpj === servico.remetente_cnpj ? "remetente" : 
                     servico.pagador_frete_cnpj === servico.destinatario_cnpj ? "destinatario" : "",
            pagador_frete_id: servico.pagador_frete_id || "",
            pagador_frete_cnpj: servico.pagador_frete_cnpj || "",
            pagador_frete_nome: servico.pagador_frete_nome || "",
            nfe: servico.nfe || "",
            peso: servico.peso?.toString() || "",
            volume: servico.volume?.toString() || "",
            valor_nfe: servico.valor_nfe?.toString() || "",
            tabela_peso: servico.tabela_peso?.toString() || "",
            seguro: servico.seguro?.toString() || "",
            pedagio: servico.pedagio?.toString() || "",
            coleta: servico.coleta?.toString() || "",
            total: servico.total?.toString() || "",
            porcentagem: servico.porcentagem?.toString() || "",
            status: servico.status || "pendente",
            observacoes: servico.observacoes || ""
        });
        setShowForm(true);
    };

    let filteredServicos = servicos.filter(s => 
        s.remetente_nome?.toLowerCase().includes(search.toLowerCase()) ||
        s.destinatario_nome?.toLowerCase().includes(search.toLowerCase()) ||
        s.numero?.toLowerCase().includes(search.toLowerCase()) ||
        s.nfe?.includes(search)
    );

    if (filterStatus && filterStatus !== "todos") {
        filteredServicos = filteredServicos.filter(s => s.status === filterStatus);
    }

    const statusColors = {
        pendente: "bg-amber-100 text-amber-800",
        em_andamento: "bg-blue-100 text-blue-800",
        finalizado: "bg-emerald-100 text-emerald-800",
        cancelado: "bg-red-100 text-red-800"
    };

    const statusLabels = {
        pendente: "Pendente",
        em_andamento: "Em Andamento",
        finalizado: "Finalizado",
        cancelado: "Cancelado"
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const formatCurrency = (value) => {
        if (!value && value !== 0) return "-";
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    };

    const totalValor = filteredServicos.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalPendentes = servicos.filter(s => s.status === "pendente").length;
    const totalFinalizados = servicos.filter(s => s.status === "finalizado").length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-[98%] mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Serviços S/NF</h1>
                            <p className="text-slate-500">Serviços sem nota fiscal</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link to={createPageUrl("ClientesSNF")}>
                            <Button variant="outline" className="border-indigo-500 text-indigo-700">
                                <Users className="w-4 h-4 mr-2" />
                                Clientes SNF
                            </Button>
                        </Link>
                        <Button 
                            onClick={() => setShowImportador(true)}
                            variant="outline"
                            className="border-purple-500 text-purple-700"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar
                        </Button>
                        <Button 
                            onClick={handleNovoServico}
                            className="bg-gradient-to-r from-purple-500 to-purple-600"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Novo Serviço
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <FileText className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total</p>
                                <p className="text-2xl font-bold text-slate-800">{servicos.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-xl">
                                <Truck className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Pendentes</p>
                                <p className="text-2xl font-bold text-slate-800">{totalPendentes}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 rounded-xl">
                                <Calendar className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Finalizados</p>
                                <p className="text-2xl font-bold text-slate-800">{totalFinalizados}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Valor Total</p>
                                <p className="text-lg font-bold text-slate-800">{formatCurrency(totalValor)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filters */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Buscar..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-40 bg-white">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                    <SelectItem value="finalizado">Finalizado</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={selecionarTodos}>
                                <CheckSquare className="w-4 h-4 mr-2" />
                                {selecionados.length === filteredServicos.length && filteredServicos.length > 0 ? "Desmarcar" : "Selecionar"} Todos
                            </Button>
                            {selecionados.length > 0 && (
                                <>
                                    <Button 
                                        variant="outline" 
                                        className="border-blue-500 text-blue-700"
                                        onClick={() => setShowEditMassa(true)}
                                    >
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Editar ({selecionados.length})
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="border-red-500 text-red-700"
                                        onClick={() => {
                                            if (confirm(`Excluir ${selecionados.length} serviço(s)?`)) {
                                                deleteEmMassaMutation.mutate(selecionados);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Excluir ({selecionados.length})
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="bg-white/80 border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gradient-to-r from-purple-600 to-indigo-600">
                                        <TableHead className="text-white w-10">
                                            <Checkbox 
                                                checked={selecionados.length === filteredServicos.length && filteredServicos.length > 0}
                                                onCheckedChange={selecionarTodos}
                                            />
                                        </TableHead>
                                        <TableHead className="text-white font-bold">Nº</TableHead>
                                        <TableHead className="text-white font-bold">Data</TableHead>
                                        <TableHead className="text-white font-bold">CNPJ Rem.</TableHead>
                                        <TableHead className="text-white font-bold">Remetente</TableHead>
                                        <TableHead className="text-white font-bold">CNPJ Dest.</TableHead>
                                        <TableHead className="text-white font-bold">Destinatário</TableHead>
                                        <TableHead className="text-white font-bold">CNPJ Pag.</TableHead>
                                        <TableHead className="text-white font-bold">Pagador Frete</TableHead>
                                        <TableHead className="text-white font-bold">NFE</TableHead>
                                        <TableHead className="text-white font-bold text-right">Peso</TableHead>
                                        <TableHead className="text-white font-bold text-right">Vol</TableHead>
                                        <TableHead className="text-white font-bold text-right">Valor NFE</TableHead>
                                        <TableHead className="text-white font-bold text-right">Tab. Peso</TableHead>
                                        <TableHead className="text-white font-bold text-right">Seg</TableHead>
                                        <TableHead className="text-white font-bold text-right">Ped</TableHead>
                                        <TableHead className="text-white font-bold text-right">Coleta</TableHead>
                                        <TableHead className="text-white font-bold text-right">Total</TableHead>
                                        <TableHead className="text-white font-bold text-right">%</TableHead>
                                        <TableHead className="text-white font-bold">Status</TableHead>
                                        <TableHead className="text-white font-bold text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={21} className="text-center py-12">
                                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredServicos.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={21} className="text-center py-12 text-slate-500">
                                                    Nenhum serviço encontrado
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredServicos.map((s) => (
                                                <motion.tr
                                                    key={s.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className={`hover:bg-slate-50 text-sm ${selecionados.includes(s.id) ? "bg-purple-50" : ""}`}
                                                >
                                                    <TableCell>
                                                        <Checkbox 
                                                            checked={selecionados.includes(s.id)}
                                                            onCheckedChange={() => toggleSelecionado(s.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-bold text-purple-600">{s.numero || "-"}</TableCell>
                                                    <TableCell>{formatDate(s.data)}</TableCell>
                                                    <TableCell className="font-mono text-xs">{s.remetente_cnpj || "-"}</TableCell>
                                                    <TableCell className="max-w-[150px] truncate" title={s.remetente_nome}>{s.remetente_nome || "-"}</TableCell>
                                                    <TableCell className="font-mono text-xs">{s.destinatario_cnpj || "-"}</TableCell>
                                                    <TableCell className="max-w-[150px] truncate" title={s.destinatario_nome}>{s.destinatario_nome || "-"}</TableCell>
                                                    <TableCell className="font-mono text-xs">{s.pagador_frete_cnpj || "-"}</TableCell>
                                                    <TableCell className="max-w-[150px] truncate" title={s.pagador_frete_nome}>{s.pagador_frete_nome || "-"}</TableCell>
                                                    <TableCell>{s.nfe || "-"}</TableCell>
                                                    <TableCell className="text-right">{s.peso || "-"}</TableCell>
                                                    <TableCell className="text-right">{s.volume || "-"}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(s.valor_nfe)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(s.tabela_peso)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(s.seguro)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(s.pedagio)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(s.coleta)}</TableCell>
                                                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(s.total)}</TableCell>
                                                    <TableCell className="text-right">{s.porcentagem ? `${s.porcentagem}%` : "-"}</TableCell>
                                                    <TableCell>
                                                        <Badge className={statusColors[s.status]}>
                                                            {statusLabels[s.status]}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                                                                <Pencil className="w-3 h-3 text-blue-600" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                                                if (confirm("Excluir?")) deleteMutation.mutate(s.id);
                                                            }}>
                                                                <Trash2 className="w-3 h-3 text-red-600" />
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

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-600" />
                            {editingServico ? "Editar Serviço" : `Novo Serviço S/NF - Nº ${proximoNumero}`}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Histórico de serviços do pagador */}
                    {historicoServicos.length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                                <History className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-blue-800 text-sm">
                                    Últimos serviços deste fornecedor para este cliente
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-blue-100">
                                            <TableHead className="text-xs py-1">Nº</TableHead>
                                            <TableHead className="text-xs py-1">Remetente</TableHead>
                                            <TableHead className="text-xs py-1 text-right">Peso</TableHead>
                                            <TableHead className="text-xs py-1 text-right">Vol</TableHead>
                                            <TableHead className="text-xs py-1 text-right">Valor NFE</TableHead>
                                            <TableHead className="text-xs py-1 text-right">Tab. Peso</TableHead>
                                            <TableHead className="text-xs py-1 text-right">Seg</TableHead>
                                            <TableHead className="text-xs py-1 text-right">Ped</TableHead>
                                            <TableHead className="text-xs py-1 text-right">Coleta</TableHead>
                                            <TableHead className="text-xs py-1 text-right">Total</TableHead>
                                            <TableHead className="text-xs py-1 text-right">%</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {historicoServicos.map(s => (
                                            <TableRow key={s.id} className="text-xs">
                                                <TableCell className="py-1 font-bold">{s.numero}</TableCell>
                                                <TableCell className="py-1 truncate max-w-[100px]">{s.remetente_nome}</TableCell>
                                                <TableCell className="py-1 text-right">{s.peso}</TableCell>
                                                <TableCell className="py-1 text-right">{s.volume}</TableCell>
                                                <TableCell className="py-1 text-right">{formatCurrency(s.valor_nfe)}</TableCell>
                                                <TableCell className="py-1 text-right">{formatCurrency(s.tabela_peso)}</TableCell>
                                                <TableCell className="py-1 text-right">{formatCurrency(s.seguro)}</TableCell>
                                                <TableCell className="py-1 text-right">{formatCurrency(s.pedagio)}</TableCell>
                                                <TableCell className="py-1 text-right">{formatCurrency(s.coleta)}</TableCell>
                                                <TableCell className="py-1 text-right font-bold text-green-600">{formatCurrency(s.total)}</TableCell>
                                                <TableCell className="py-1 text-right">{s.porcentagem}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Nº (Automático)</Label>
                                <Input value={editingServico ? form.numero : proximoNumero} disabled className="bg-slate-100 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label>Data *</Label>
                                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>NFE</Label>
                                <Input value={form.nfe} onChange={(e) => setForm({ ...form, nfe: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                        <SelectItem value="finalizado">Finalizado</SelectItem>
                                        <SelectItem value="cancelado">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Remetente */}
                        <div className="p-4 bg-amber-50 rounded-lg space-y-3">
                            <Label className="text-amber-800 font-bold">Remetente</Label>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">CNPJ (Digite e pressione Enter para buscar)</Label>
                                    <Input 
                                        value={form.remetente_cnpj} 
                                        onChange={(e) => setForm({ ...form, remetente_cnpj: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                buscarClientePorCnpj(form.remetente_cnpj, "remetente");
                                            }
                                        }}
                                        placeholder="00.000.000/0001-00"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Nome</Label>
                                    <Input value={form.remetente_nome} onChange={(e) => setForm({ ...form, remetente_nome: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* Destinatário */}
                        <div className="p-4 bg-emerald-50 rounded-lg space-y-3">
                            <Label className="text-emerald-800 font-bold">Destinatário</Label>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">CNPJ (Digite e pressione Enter para buscar)</Label>
                                    <Input 
                                        value={form.destinatario_cnpj} 
                                        onChange={(e) => setForm({ ...form, destinatario_cnpj: e.target.value })}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                buscarClientePorCnpj(form.destinatario_cnpj, "destinatario");
                                            }
                                        }}
                                        placeholder="00.000.000/0001-00"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Nome</Label>
                                    <Input value={form.destinatario_nome} onChange={(e) => setForm({ ...form, destinatario_nome: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        {/* Tomador / Pagador do Frete */}
                        <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                            <Label className="text-blue-800 font-bold">Tomador do Frete</Label>
                            <div className="flex gap-4">
                                <Button
                                    type="button"
                                    variant={form.tomador === "remetente" ? "default" : "outline"}
                                    onClick={() => handleTomadorChange("remetente")}
                                    className={form.tomador === "remetente" ? "bg-amber-500 hover:bg-amber-600" : ""}
                                >
                                    Remetente
                                </Button>
                                <Button
                                    type="button"
                                    variant={form.tomador === "destinatario" ? "default" : "outline"}
                                    onClick={() => handleTomadorChange("destinatario")}
                                    className={form.tomador === "destinatario" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                                >
                                    Destinatário
                                </Button>
                            </div>
                        </div>

                        {/* Valores */}
                        <div className="grid grid-cols-5 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Peso (kg)</Label>
                                <Input value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Volume</Label>
                                <Input value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Valor NFE</Label>
                                <Input value={form.valor_nfe} onChange={(e) => setForm({ ...form, valor_nfe: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Tabela Peso</Label>
                                <Input value={form.tabela_peso} onChange={(e) => setForm({ ...form, tabela_peso: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Seguro (0,5% NFE)</Label>
                                <Input value={form.seguro} onChange={(e) => setForm({ ...form, seguro: e.target.value })} className="bg-green-50" />
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Pedágio (Peso/100*1,40)</Label>
                                <Input value={form.pedagio} onChange={(e) => setForm({ ...form, pedagio: e.target.value })} className="bg-green-50" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Coleta</Label>
                                <Input value={form.coleta} onChange={(e) => setForm({ ...form, coleta: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Total</Label>
                                <Input value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="font-bold bg-yellow-50" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">%</Label>
                                <Input value={form.porcentagem} onChange={(e) => setForm({ ...form, porcentagem: e.target.value })} className="bg-blue-50" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingServico(null); resetForm(); }}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                                <Save className="w-4 h-4 mr-1" /> {editingServico ? "Atualizar" : "Salvar"}
                            </Button>
                            {!editingServico && (
                                <Button 
                                    type="button" 
                                    onClick={(e) => handleSubmit(e, true)}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <Printer className="w-4 h-4 mr-1" /> Salvar e Imprimir
                                </Button>
                            )}
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Importador */}
            <ImportadorServicos 
                open={showImportador} 
                onClose={() => setShowImportador(false)} 
                onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["servicos-snf"] })}
            />

            {/* Dialog Edição em Massa */}
            <Dialog open={showEditMassa} onOpenChange={setShowEditMassa}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar {selecionados.length} Serviço(s)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={editMassaData.status} onValueChange={(v) => setEditMassaData({ ...editMassaData, status: v })}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                    <SelectItem value="finalizado">Finalizado</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowEditMassa(false)}>Cancelar</Button>
                            <Button 
                                onClick={() => {
                                    if (editMassaData.status) {
                                        updateEmMassaMutation.mutate({ ids: selecionados, data: editMassaData });
                                    } else {
                                        toast.error("Selecione um status");
                                    }
                                }}
                                disabled={updateEmMassaMutation.isPending}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {updateEmMassaMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}