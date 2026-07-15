import React, { useState } from "react";
import { rawBase44, base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { setActiveEmpresa, setTenantContext } from "@/lib/tenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Building2, ShieldCheck, Clock, ShieldAlert, Ban, CheckCircle,
    Loader2, Users, Database, Crown, KeyRound, LogOut, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

const STATUS_CONFIG = {
    trial: { label: "Trial", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Clock },
    ativa: { label: "Ativa", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: ShieldCheck },
    suspensa: { label: "Suspensa", color: "bg-amber-100 text-amber-700 border-amber-300", icon: ShieldAlert },
    bloqueada: { label: "Bloqueada", color: "bg-red-100 text-red-700 border-red-300", icon: Ban },
    cancelada: { label: "Cancelada", color: "bg-slate-100 text-slate-600 border-slate-300", icon: Ban },
};

const TENTANT_BLACKLIST = new Set(["User", "Empresa"]);

export default function PainelProprietario() {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();
    const [migrando, setMigrando] = useState(false);
    const [novoVencimento, setNovoVencimento] = useState({});

    const { data: empresas = [], isLoading } = useQuery({
        queryKey: ["empresas-saas"],
        queryFn: () => rawBase44.entities.Empresa.list("-created_date"),
    });

    const { data: usuarios = [] } = useQuery({
        queryKey: ["usuarios-saas"],
        queryFn: () => rawBase44.entities.User.list(),
    });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ["empresas-saas"] });
        queryClient.invalidateQueries({ queryKey: ["usuarios-saas"] });
    };

    const updateEmpresaMutation = useMutation({
        mutationFn: ({ id, data }) => rawBase44.entities.Empresa.update(id, data),
        onSuccess: () => { refresh(); toast.success("Empresa atualizada."); },
        onError: (e) => { console.error(e); toast.error("Erro ao atualizar empresa."); },
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ id, data }) => rawBase44.entities.User.update(id, data),
        onSuccess: () => { refresh(); toast.success("Usuário atualizado."); },
        onError: (e) => { console.error(e); toast.error("Erro ao atualizar usuário."); },
    });

    const handleStatus = (empresa, status) => {
        const patch = { status };
        if (status === "bloqueada") patch.bloqueada_em = format(new Date(), "yyyy-MM-dd");
        updateEmpresaMutation.mutate({ id: empresa.id, data: patch });
    };

    const handleTrial = (empresa) => {
        const hoje = format(new Date(), "yyyy-MM-dd");
        updateEmpresaMutation.mutate({
            id: empresa.id,
            data: {
                status: "trial",
                plano: "trial",
                data_inicio_trial: hoje,
                data_vencimento: format(addDays(new Date(), 15), "yyyy-MM-dd"),
                ativo: true,
            },
        });
    };

    const handleVencimento = (empresa) => {
        const v = novoVencimento[empresa.id];
        if (!v) { toast.error("Informe a data de vencimento."); return; }
        updateEmpresaMutation.mutate({
            id: empresa.id,
            data: { data_vencimento: v, status: "ativa" },
        });
    };

    const handleSelecionarEmpresa = async (empresa) => {
        try {
            await base44.auth.updateMe({ active_empresa_id: empresa.id });
            setActiveEmpresa(empresa.id);
            setTenantContext({ empresaId: empresa.id, isProprietario: true });
            window.location.href = "/";
        } catch (e) {
            console.error(e);
            toast.error("Erro ao selecionar empresa.");
        }
    };

    const handleSetProprietario = (u) => {
        updateUserMutation.mutate({ id: u.id, data: { is_proprietario: !u.is_proprietario } });
    };

    const handleAtribuirEmpresa = (u, empresaId) => {
        updateUserMutation.mutate({ id: u.id, data: { empresa_id: empresaId || null } });
    };

    // Setup inicial: cria/reusa empresa TWG e migra todos os dados existentes para ela.
    const handleSetupTWG = async () => {
        if (!confirm("Isto vai criar a empresa TWG (CNPJ 69.133.510/0001-33) e atribuir TODOS os dados existentes a ela, marcar descarbel.sp@gmail.com como proprietário da plataforma e os e-mails TWG como administradores da empresa. Continuar?")) return;
        setMigrando(true);
        try {
            // 1. Procura ou cria empresa TWG
            let twg = empresas.find((e) =>
                e.cnpj === "69.133.510/0001-33" ||
                (e.razao_social || "").toUpperCase().includes("TWG") ||
                ["twg.transportes1@gmail.com", "system.twg@gmail.com"].includes((e.email || "").toLowerCase())
            );
            if (!twg) {
                twg = await rawBase44.entities.Empresa.create({
                    razao_social: "TWG TRANSPORTES",
                    nome_fantasia: "TWG",
                    cnpj: "69.133.510/0001-33",
                    email: "twg.transportes1@gmail.com",
                    status: "ativa",
                    plano: "anual",
                    ativo: true,
                    data_inicio_trial: format(new Date(), "yyyy-MM-dd"),
                    data_vencimento: format(addDays(new Date(), 365), "yyyy-MM-dd"),
                });
            }
            const twgId = twg.id;

            // 2. Migra todos os registros de cada entidade de domínio para a empresa TWG
            const entityNames = Object.keys(rawBase44.entities).filter((n) => !TENTANT_BLACKLIST.has(n));
            for (const name of entityNames) {
                try {
                    await rawBase44.entities[name].updateMany({}, { $set: { empresa_id: twgId } });
                } catch (e) {
                    // Entidades sem registros ou não aplicáveis — ignora.
                }
            }

            // 3. Marca descarbel como proprietário da plataforma; atribui usuários TWG à empresa TWG
            const twgEmails = ["twg.transportes1@gmail.com", "system.twg@gmail.com"];
            for (const u of usuarios) {
                const emailLower = (u.email || "").toLowerCase();
                if (emailLower === "descarbel.sp@gmail.com") {
                    await rawBase44.entities.User.update(u.id, { is_proprietario: true, role: "admin" });
                } else if (twgEmails.includes(emailLower)) {
                    await rawBase44.entities.User.update(u.id, {
                        empresa_id: twgId,
                        role: "admin",
                        is_proprietario: false,
                    });
                }
            }

            toast.success("Setup concluído! Empresa TWG criada, dados migrados e proprietário definido.");
            refresh();
        } catch (e) {
            console.error(e);
            toast.error("Erro no setup: " + (e?.message || "desconhecido"));
        } finally {
            setMigrando(false);
        }
    };

    const handleLogout = () => {
        if (confirm("Sair do painel do proprietário?")) {
            logout();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl shadow-lg">
                            <Crown className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Painel do Proprietário</h1>
                            <p className="text-slate-500 text-sm">Controle de empresas, trial e acesso — plataforma Loggxy SaaS</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" /> Sair
                    </Button>
                </div>

                {/* Setup inicial */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-50 to-purple-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-violet-600" /> Configuração Inicial
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 mb-3">
                            Cria a empresa <strong>TWG</strong>, migra todos os dados já existentes para ela e define{" "}
                            <strong>descarbel.sp@gmail.com</strong> como proprietário da plataforma (acesso a todas as empresas).
                        </p>
                        <Button
                            onClick={handleSetupTWG}
                            disabled={migrando}
                            className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800"
                        >
                            {migrando ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Migrando...</>
                            ) : (
                                <><Database className="w-4 h-4 mr-2" /> Configurar TWG e Migrar Dados</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Empresas */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-600" /> Empresas Cadastradas ({empresas.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
                        ) : empresas.length === 0 ? (
                            <p className="text-center text-slate-500 py-6">Nenhuma empresa cadastrada ainda.</p>
                        ) : (
                            empresas.map((empresa) => {
                                const cfg = STATUS_CONFIG[empresa.status] || STATUS_CONFIG.trial;
                                const Icon = cfg.icon;
                                return (
                                    <div key={empresa.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-slate-800 truncate">{empresa.razao_social}</h3>
                                                    {empresa.nome_fantasia && (
                                                        <span className="text-slate-400 text-sm">({empresa.nome_fantasia})</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 mt-0.5">
                                                    {empresa.cnpj && <>CNPJ: {empresa.cnpj} • </>}
                                                    {empresa.email}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <Badge className={`${cfg.color} border flex items-center gap-1`}>
                                                        <Icon className="w-3 h-3" /> {cfg.label}
                                                    </Badge>
                                                    {empresa.data_vencimento && (
                                                        <span className="text-xs text-slate-500">
                                                            Vencimento: {format(new Date(empresa.data_vencimento), "dd/MM/yyyy")}
                                                        </span>
                                                    )}
                                                    <Button
                                                        size="sm" variant="outline"
                                                        onClick={() => handleSelecionarEmpresa(empresa)}
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" /> Visualizar dados
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                                            <Button size="sm" onClick={() => handleStatus(empresa, "ativa")} className="bg-emerald-600 hover:bg-emerald-700">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Liberar
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleStatus(empresa, "suspensa")}>
                                                <ShieldAlert className="w-3 h-3 mr-1" /> Suspender
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleStatus(empresa, "bloqueada")} className="border-red-300 text-red-600 hover:bg-red-50">
                                                <Ban className="w-3 h-3 mr-1" /> Bloquear
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleTrial(empresa)} className="border-blue-300 text-blue-600 hover:bg-blue-50">
                                                <Clock className="w-3 h-3 mr-1" /> Trial +15 dias
                                            </Button>
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="date"
                                                    value={novoVencimento[empresa.id] || ""}
                                                    onChange={(e) => setNovoVencimento({ ...novoVencimento, [empresa.id]: e.target.value })}
                                                    className="h-8 w-40"
                                                />
                                                <Button size="sm" variant="secondary" onClick={() => handleVencimento(empresa)}>
                                                    Definir vencimento
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Usuários */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" /> Usuários ({usuarios.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {usuarios.length === 0 ? (
                            <p className="text-center text-slate-500 py-6">Nenhum usuário.</p>
                        ) : (
                            usuarios.map((u) => {
                                const empresa = empresas.find((e) => e.id === u.empresa_id);
                                return (
                                    <div key={u.id} className="p-3 rounded-lg border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-slate-800 truncate">{u.full_name || u.email}</span>
                                                {u.email && <span className="text-xs text-slate-400 truncate">{u.email}</span>}
                                                {u.is_proprietario && (
                                                    <Badge className="bg-violet-100 text-violet-700 border border-violet-300 flex items-center gap-1">
                                                        <Crown className="w-3 h-3" /> Proprietário
                                                    </Badge>
                                                )}
                                                {u.role === "proprietario" && <Badge className="bg-blue-100 text-blue-700">Dono da empresa</Badge>}
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                Empresa: {empresa ? empresa.razao_social : "— (sem empresa)"}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Select
                                                value={u.empresa_id || ""}
                                                onValueChange={(v) => handleAtribuirEmpresa(u, v === "__none__" ? null : v)}
                                            >
                                                <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Atribuir empresa..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__none__">— Sem empresa —</SelectItem>
                                                    {empresas.map((e) => (
                                                        <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                size="sm" variant={u.is_proprietario ? "default" : "outline"}
                                                onClick={() => handleSetProprietario(u)}
                                                className={u.is_proprietario ? "bg-violet-600 hover:bg-violet-700" : "border-violet-300 text-violet-600"}
                                            >
                                                <Crown className="w-3 h-3 mr-1" />
                                                {u.is_proprietario ? "É proprietário" : "Tornar proprietário"}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}