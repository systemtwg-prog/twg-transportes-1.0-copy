import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Package, Truck, User, Star, Search, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function OrdemForm({ ordem, onSubmit, onCancel, proximoNumero }) {
    const [searchRemetente, setSearchRemetente] = useState("");
    const [searchDestinatario, setSearchDestinatario] = useState("");
    const [loadingCep, setLoadingCep] = useState(false);
    
    const [form, setForm] = useState({
        numero: "",
        data_ordem: new Date().toISOString().split("T")[0],
        status: "pendente",
        remetente_id: "",
        remetente_nome: "",
        remetente_codigo: "",
        remetente_contato: "",
        remetente_cep: "",
        remetente_endereco: "",
        remetente_cnpj: "",
        remetente_bairro: "",
        remetente_cidade: "",
        remetente_telefone: "",
        remetente_obs: "",
        destinatario_id: "",
        destinatario_nome: "",
        destinatario_codigo: "",
        destinatario_contato: "",
        destinatario_telefone: "",
        destinatario_cnpj: "",
        destinatario_ref_obs: "",
        peso: "",
        volume: "",
        especie: "",
        data_coleta: "",
        nfe: "",
        solicitante: "",
        horario: "",
        almoco: "",
        motorista_id: "",
        motorista: "",
        veiculo_id: "",
        placa: "",
        cpf_motorista: ""
    });

    const { data: clientes = [] } = useQuery({
        queryKey: ["clientes"],
        queryFn: () => base44.entities.Cliente.list()
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas"],
        queryFn: () => base44.entities.Motorista.filter({ status: "ativo" })
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos"],
        queryFn: () => base44.entities.Veiculo.filter({ status: "disponivel" })
    });

    useEffect(() => {
        if (ordem) {
            setForm({
                numero: ordem.numero || "",
                data_ordem: ordem.data_ordem || new Date().toISOString().split("T")[0],
                status: ordem.status || "pendente",
                remetente_id: ordem.remetente_id || "",
                remetente_nome: ordem.remetente_nome || "",
                remetente_codigo: ordem.remetente_codigo || "",
                remetente_contato: ordem.remetente_contato || "",
                remetente_cep: ordem.remetente_cep || "",
                remetente_endereco: ordem.remetente_endereco || "",
                remetente_cnpj: ordem.remetente_cnpj || "",
                remetente_bairro: ordem.remetente_bairro || "",
                remetente_cidade: ordem.remetente_cidade || "",
                remetente_telefone: ordem.remetente_telefone || "",
                remetente_obs: ordem.remetente_obs || "",
                destinatario_id: ordem.destinatario_id || "",
                destinatario_nome: ordem.destinatario_nome || "",
                destinatario_codigo: ordem.destinatario_codigo || "",
                destinatario_contato: ordem.destinatario_contato || "",
                destinatario_telefone: ordem.destinatario_telefone || "",
                destinatario_cnpj: ordem.destinatario_cnpj || "",
                destinatario_ref_obs: ordem.destinatario_ref_obs || "",
                peso: ordem.peso || "",
                volume: ordem.volume || "",
                especie: ordem.especie || "",
                data_coleta: ordem.data_coleta || "",
                nfe: ordem.nfe || "",
                solicitante: ordem.solicitante || "",
                horario: ordem.horario || "",
                almoco: ordem.almoco || "",
                motorista_id: ordem.motorista_id || "",
                motorista: ordem.motorista || "",
                veiculo_id: ordem.veiculo_id || "",
                placa: ordem.placa || "",
                cpf_motorista: ordem.cpf_motorista || ""
            });
        } else if (proximoNumero) {
            setForm(prev => ({ ...prev, numero: proximoNumero }));
        }
    }, [ordem, proximoNumero]);

    // Separar favoritos
    const remetentes = clientes.filter(c => c.tipo === "remetente" || c.tipo === "ambos");
    const destinatarios = clientes.filter(c => c.tipo === "destinatario" || c.tipo === "ambos");
    
    const remetentesFavoritos = remetentes.filter(c => c.favorito);
    const destinatariosFavoritos = destinatarios.filter(c => c.favorito);

    // Filtrar por busca (razão social ou CNPJ)
    const filteredRemetentes = remetentes.filter(c => {
        if (!searchRemetente) return true;
        const search = searchRemetente.toLowerCase();
        return c.razao_social?.toLowerCase().includes(search) ||
               c.cnpj_cpf?.toLowerCase().includes(search) ||
               c.codigo?.toLowerCase().includes(search);
    });

    const filteredDestinatarios = destinatarios.filter(c => {
        if (!searchDestinatario) return true;
        const search = searchDestinatario.toLowerCase();
        return c.razao_social?.toLowerCase().includes(search) ||
               c.cnpj_cpf?.toLowerCase().includes(search) ||
               c.codigo?.toLowerCase().includes(search);
    });

    // Buscar CEP nos Correios
    const buscarCep = async (cep, tipo) => {
        const cepLimpo = cep.replace(/\D/g, "");
        if (cepLimpo.length !== 8) return;
        
        setLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();
            if (!data.erro) {
                if (tipo === "remetente") {
                    setForm(prev => ({
                        ...prev,
                        remetente_endereco: data.logradouro || prev.remetente_endereco,
                        remetente_bairro: data.bairro || prev.remetente_bairro,
                        remetente_cidade: `${data.localidade || ""}/${data.uf || ""}`
                    }));
                }
            }
        } catch (err) {
            console.log("Erro ao buscar CEP:", err);
        }
        setLoadingCep(false);
    };

    const selectRemetente = (clienteId) => {
        const cliente = clientes.find(c => c.id === clienteId);
        if (cliente) {
            const horarioFunc = cliente.horario_funcionamento_inicio && cliente.horario_funcionamento_fim
                ? `${cliente.horario_funcionamento_inicio}/${cliente.horario_funcionamento_fim}`
                : "";
            const horarioAlmoco = cliente.horario_almoco_inicio && cliente.horario_almoco_fim
                ? `${cliente.horario_almoco_inicio} às ${cliente.horario_almoco_fim}`
                : "SEM INTERVALO";
            
            setForm(prev => ({
                ...prev,
                remetente_id: cliente.id,
                remetente_nome: cliente.razao_social,
                remetente_codigo: cliente.codigo || "",
                remetente_contato: cliente.contato || "",
                remetente_cep: cliente.cep || "",
                remetente_endereco: cliente.endereco || "",
                remetente_cnpj: cliente.cnpj_cpf || "",
                remetente_bairro: cliente.bairro || "",
                remetente_cidade: `${cliente.cidade || ""}${cliente.uf ? "/" + cliente.uf : ""}`,
                remetente_telefone: cliente.telefone || "",
                horario: horarioFunc || prev.horario,
                almoco: horarioAlmoco
            }));
        }
    };

    const selectDestinatario = (clienteId) => {
        const cliente = clientes.find(c => c.id === clienteId);
        if (cliente) {
            setForm(prev => ({
                ...prev,
                destinatario_id: cliente.id,
                destinatario_nome: cliente.razao_social,
                destinatario_codigo: cliente.codigo || "",
                destinatario_contato: cliente.contato || "",
                destinatario_telefone: cliente.telefone || "",
                destinatario_cnpj: cliente.cnpj_cpf || ""
            }));
        }
    };

    const selectMotorista = (motoristaId) => {
        const mot = motoristas.find(m => m.id === motoristaId);
        if (mot) {
            setForm(prev => ({
                ...prev,
                motorista_id: mot.id,
                motorista: mot.nome,
                cpf_motorista: mot.cpf || ""
            }));
        }
    };

    const selectVeiculo = (veiculoId) => {
        const vei = veiculos.find(v => v.id === veiculoId);
        if (vei) {
            setForm(prev => ({
                ...prev,
                veiculo_id: vei.id,
                placa: vei.placa
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center justify-between text-slate-800">
                    <div className="flex items-center gap-3">
                        <Package className="w-6 h-6 text-blue-600" />
                        <span>{ordem ? "Editar Ordem de Coleta" : "Nova Ordem de Coleta"}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Cabeçalho */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Nº Ordem *</Label>
                            <Input
                                value={form.numero}
                                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                                required
                                className="font-bold text-lg bg-slate-100"
                                readOnly={!ordem}
                            />
                            {!ordem && <p className="text-xs text-slate-500">Gerado automaticamente</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Data da Ordem *</Label>
                            <Input
                                type="date"
                                value={form.data_ordem}
                                onChange={(e) => setForm({ ...form, data_ordem: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                    <SelectItem value="coletado">Coletado</SelectItem>
                                    <SelectItem value="entregue">Entregue</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Remetente */}
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <h3 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            DADOS REMETENTE
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="md:col-span-2 space-y-2">
                                <Label>Selecionar Cliente</Label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar por nome, CNPJ..."
                                        value={searchRemetente}
                                        onChange={(e) => setSearchRemetente(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={form.remetente_id} onValueChange={selectRemetente}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o remetente..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {!searchRemetente && remetentesFavoritos.length > 0 && (
                                            <>
                                                <div className="px-2 py-1 text-xs text-amber-600 font-semibold flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-amber-500" /> Favoritos
                                                </div>
                                                {remetentesFavoritos.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        ⭐ {c.razao_social} {c.cnpj_cpf ? `(${c.cnpj_cpf})` : ""}
                                                    </SelectItem>
                                                ))}
                                                <div className="border-t my-1" />
                                            </>
                                        )}
                                        {filteredRemetentes.filter(c => !c.favorito || searchRemetente).map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.razao_social} {c.cnpj_cpf ? `(${c.cnpj_cpf})` : ""}
                                            </SelectItem>
                                        ))}
                                        {filteredRemetentes.length === 0 && (
                                            <div className="p-2 text-sm text-slate-500 text-center">Nenhum resultado</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Código</Label>
                                <Input
                                    value={form.remetente_codigo}
                                    onChange={(e) => setForm({ ...form, remetente_codigo: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Contato</Label>
                                <Input
                                    value={form.remetente_contato}
                                    onChange={(e) => setForm({ ...form, remetente_contato: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                                <Label>Razão Social *</Label>
                                <Input
                                    value={form.remetente_nome}
                                    onChange={(e) => setForm({ ...form, remetente_nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CNPJ</Label>
                                <Input
                                    value={form.remetente_cnpj}
                                    onChange={(e) => setForm({ ...form, remetente_cnpj: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="space-y-2">
                                <Label>CEP</Label>
                                <div className="relative">
                                    <Input
                                        value={form.remetente_cep}
                                        onChange={(e) => {
                                            const cep = e.target.value;
                                            setForm({ ...form, remetente_cep: cep });
                                            if (cep.replace(/\D/g, "").length === 8) {
                                                buscarCep(cep, "remetente");
                                            }
                                        }}
                                        placeholder="00000-000"
                                    />
                                    {loadingCep && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-3 space-y-2">
                                <Label>Endereço</Label>
                                <Input
                                    value={form.remetente_endereco}
                                    onChange={(e) => setForm({ ...form, remetente_endereco: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Bairro</Label>
                                <Input
                                    value={form.remetente_bairro}
                                    onChange={(e) => setForm({ ...form, remetente_bairro: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cidade/UF</Label>
                                <Input
                                    value={form.remetente_cidade}
                                    onChange={(e) => setForm({ ...form, remetente_cidade: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefone</Label>
                                <Input
                                    value={form.remetente_telefone}
                                    onChange={(e) => setForm({ ...form, remetente_telefone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Label>Observações</Label>
                            <Input
                                value={form.remetente_obs}
                                onChange={(e) => setForm({ ...form, remetente_obs: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Destinatário */}
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <h3 className="font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            DADOS DESTINATÁRIO
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="md:col-span-2 space-y-2">
                                <Label>Selecionar Cliente</Label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar por nome, CNPJ..."
                                        value={searchDestinatario}
                                        onChange={(e) => setSearchDestinatario(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={form.destinatario_id} onValueChange={selectDestinatario}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o destinatário..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {!searchDestinatario && destinatariosFavoritos.length > 0 && (
                                            <>
                                                <div className="px-2 py-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-emerald-500" /> Favoritos
                                                </div>
                                                {destinatariosFavoritos.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        ⭐ {c.razao_social} {c.cnpj_cpf ? `(${c.cnpj_cpf})` : ""}
                                                    </SelectItem>
                                                ))}
                                                <div className="border-t my-1" />
                                            </>
                                        )}
                                        {filteredDestinatarios.filter(c => !c.favorito || searchDestinatario).map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.razao_social} {c.cnpj_cpf ? `(${c.cnpj_cpf})` : ""}
                                            </SelectItem>
                                        ))}
                                        {filteredDestinatarios.length === 0 && (
                                            <div className="p-2 text-sm text-slate-500 text-center">Nenhum resultado</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Código</Label>
                                <Input
                                    value={form.destinatario_codigo}
                                    onChange={(e) => setForm({ ...form, destinatario_codigo: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Contato</Label>
                                <Input
                                    value={form.destinatario_contato}
                                    onChange={(e) => setForm({ ...form, destinatario_contato: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Razão Social *</Label>
                                <Input
                                    value={form.destinatario_nome}
                                    onChange={(e) => setForm({ ...form, destinatario_nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefone</Label>
                                <Input
                                    value={form.destinatario_telefone}
                                    onChange={(e) => setForm({ ...form, destinatario_telefone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CNPJ</Label>
                                <Input
                                    value={form.destinatario_cnpj}
                                    onChange={(e) => setForm({ ...form, destinatario_cnpj: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Label>Ref. / Observações</Label>
                            <Input
                                value={form.destinatario_ref_obs}
                                onChange={(e) => setForm({ ...form, destinatario_ref_obs: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Dados Transporte */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                            <Truck className="w-5 h-5" />
                            DADOS TRANSPORTE
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="space-y-2">
                                <Label>Peso</Label>
                                <Input
                                    value={form.peso}
                                    onChange={(e) => setForm({ ...form, peso: e.target.value })}
                                    placeholder="Ex: 13,50 KG"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Volume</Label>
                                <Input
                                    value={form.volume}
                                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                                    placeholder="Ex: 02 VOL"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Espécie</Label>
                                <Input
                                    value={form.especie}
                                    onChange={(e) => setForm({ ...form, especie: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>NFe</Label>
                                <Input
                                    value={form.nfe}
                                    onChange={(e) => setForm({ ...form, nfe: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="space-y-2">
                                <Label>Data Coleta</Label>
                                <Input
                                    type="date"
                                    value={form.data_coleta}
                                    onChange={(e) => setForm({ ...form, data_coleta: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Horário</Label>
                                <Input
                                    value={form.horario}
                                    onChange={(e) => setForm({ ...form, horario: e.target.value })}
                                    placeholder="Ex: 08:00/17:30"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Almoço</Label>
                                <Input
                                    value={form.almoco}
                                    onChange={(e) => setForm({ ...form, almoco: e.target.value })}
                                    placeholder="Ex: SEM INTERVALO"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Solicitante</Label>
                                <Input
                                    value={form.solicitante}
                                    onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Motorista e Veículo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-blue-200">
                            <div className="space-y-2">
                                <Label>Motorista</Label>
                                <Select value={form.motorista_id} onValueChange={selectMotorista}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o motorista..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {motoristas.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.nome} - {m.cpf}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Veículo</Label>
                                <Select value={form.veiculo_id} onValueChange={selectVeiculo}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o veículo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {veiculos.map(v => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.placa} - {v.modelo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Nome Motorista</Label>
                                <Input
                                    value={form.motorista}
                                    onChange={(e) => setForm({ ...form, motorista: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Placa</Label>
                                <Input
                                    value={form.placa}
                                    onChange={(e) => setForm({ ...form, placa: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CPF Motorista</Label>
                                <Input
                                    value={form.cpf_motorista}
                                    onChange={(e) => setForm({ ...form, cpf_motorista: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Ordem
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}