import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
    Truck, Package, FileText, Users, Car, 
    ClipboardList, Settings, BarChart3,
    Navigation, Building2, Upload,
    Camera, ChevronRight, Bell, Grip, Check, X,
    AlertTriangle, Clock, TrendingUp, Calendar
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const allModules = [
    { id: "nota_deposito", name: "Nota Depósito", href: "NotaDeposito", icon: Camera, color: "from-blue-600 to-indigo-700" },
    { id: "comprovantes", name: "Comprovantes", href: "ComprovantesInternos", icon: Upload, color: "from-cyan-500 to-blue-600" },
    { id: "coletas", name: "Coletas Diárias", href: "ColetasDiarias", icon: Package, color: "from-indigo-600 to-violet-600" },
    { id: "ordens", name: "Ordem de Coleta", href: "OrdensColeta", icon: ClipboardList, color: "from-violet-600 to-indigo-600" },
    { id: "cracha", name: "Crachá", href: "CrachaIdentificacao", icon: Users, color: "from-emerald-500 to-cyan-500" },
    { id: "rotas", name: "Rotas GPS", href: "RotasGPS", icon: Navigation, color: "from-green-500 to-emerald-600" },
    { id: "veiculos", name: "Veículos", href: "Veiculos", icon: Car, color: "from-slate-500 to-gray-600" },
    { id: "notas_fiscais", name: "Notas Fiscais", href: "NotasFiscais", icon: FileText, color: "from-amber-500 to-orange-600" },
    { id: "romaneio", name: "Máscara Romaneio", href: "MascaraRomaneio", icon: Truck, color: "from-violet-500 to-purple-600" },
    { id: "romaneios_gerados", name: "Romaneios Gerados", href: "RomaneiosGerados", icon: BarChart3, color: "from-pink-500 to-rose-600" },
    { id: "ctes", name: "Comprovantes CTEs", href: "ComprovantesCtes", icon: FileText, color: "from-amber-500 to-yellow-600" },
    { id: "clientes", name: "Clientes", href: "Clientes", icon: Users, color: "from-purple-500 to-indigo-600" },
    { id: "transportadoras", name: "Transportadoras", href: "Transportadoras", icon: Building2, color: "from-slate-500 to-gray-600" },
    { id: "motoristas", name: "Motoristas", href: "Motoristas", icon: Users, color: "from-teal-500 to-cyan-600" },
];

export default function HomeDesktop() {
    const [showCustomize, setShowCustomize] = useState(false);
    const [placaSelecionada, setPlacaSelecionada] = useState(null);
    const [showNotasDialog, setShowNotasDialog] = useState(false);
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });
    const config = configs[0] || {};

    const { data: avisos = [] } = useQuery({
        queryKey: ["avisos-ativos"],
        queryFn: async () => {
            const todos = await base44.entities.Aviso.list("-created_date");
            const hoje = new Date().toISOString().split("T")[0];
            return todos.filter(a => 
                a.ativo && 
                (!a.data_inicio || a.data_inicio <= hoje) &&
                (!a.data_fim || a.data_fim >= hoje)
            );
        }
    });

    const { data: romaneiosGerados = [] } = useQuery({
        queryKey: ["romaneios-gerados-home"],
        queryFn: () => base44.entities.RomaneioGerado.list("-created_date")
    });

    const { data: notasFiscais = [] } = useQuery({
        queryKey: ["notas-fiscais-home"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: coletasDiarias = [] } = useQuery({
        queryKey: ["coletas-diarias-home"],
        queryFn: () => base44.entities.ColetaDiaria.filter({ status: "pendente" })
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-home"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const { data: ordensColeta = [] } = useQuery({
        queryKey: ["ordens-coleta-home"],
        queryFn: () => base44.entities.OrdemColeta.list("-created_date", 10)
    });

    const isAdmin = currentUser?.role === "admin";

    // Módulos ativos do usuário
    const modulosAtivos = currentUser?.modulos_desktop || ["nota_deposito", "comprovantes", "coletas", "ordens", "rotas", "veiculos"];

    const updateUserMutation = useMutation({
        mutationFn: (data) => base44.auth.updateMe(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["current-user"] });
            setShowCustomize(false);
        }
    });

    const [tempModulos, setTempModulos] = useState(modulosAtivos);

    const toggleModulo = (id) => {
        setTempModulos(prev => 
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const salvarPersonalizacao = () => {
        updateUserMutation.mutate({ modulos_desktop: tempModulos });
    };

    // Dashboard por veículo
    const dashboardPorVeiculo = useMemo(() => {
        const porVeiculo = {};

        romaneiosGerados.forEach(r => {
            if (r.status === "gerado" || r.status === "em_transito") {
                const placa = r.placa || "SEM_PLACA";
                if (!porVeiculo[placa]) {
                    porVeiculo[placa] = { entregas: 0, coletas: 0, notas: [], notasIds: [] };
                }
                porVeiculo[placa].entregas += r.total_entregas || r.total_notas || 0;
                if (r.notas_ids) {
                    porVeiculo[placa].notasIds = [...porVeiculo[placa].notasIds, ...r.notas_ids];
                }
            }
        });

        Object.keys(porVeiculo).forEach(placa => {
            const notasDoVeiculo = notasFiscais.filter(n => 
                porVeiculo[placa].notasIds.includes(n.id) || n.placa === placa
            );
            porVeiculo[placa].notas = notasDoVeiculo;
        });

        const coletasPendentes = coletasDiarias.filter(c => c.status === "pendente").length;
        if (coletasPendentes > 0) {
            if (!porVeiculo["COLETAS"]) {
                porVeiculo["COLETAS"] = { entregas: 0, coletas: coletasPendentes, notas: [] };
            } else {
                porVeiculo["COLETAS"].coletas = coletasPendentes;
            }
        }

        return porVeiculo;
    }, [romaneiosGerados, notasFiscais, coletasDiarias]);

    // Agrupar notas por transportadora
    const notasAgrupadas = useMemo(() => {
        if (!placaSelecionada || !dashboardPorVeiculo[placaSelecionada]) return {};
        
        const notas = dashboardPorVeiculo[placaSelecionada].notas || [];
        const agrupadas = {};
        
        notas.forEach(nota => {
            const transp = nota.transportadora || "SEM TRANSPORTADORA";
            if (!agrupadas[transp]) {
                agrupadas[transp] = [];
            }
            agrupadas[transp].push(nota);
        });
        
        return agrupadas;
    }, [placaSelecionada, dashboardPorVeiculo]);

    const handlePlacaClick = (placa) => {
        if (placa !== "COLETAS") {
            setPlacaSelecionada(placa);
            setShowNotasDialog(true);
        }
    };

    // Estatísticas gerais
    const stats = {
        totalEntregas: Object.values(dashboardPorVeiculo).reduce((acc, v) => acc + v.entregas, 0),
        totalColetas: coletasDiarias.filter(c => c.status === "pendente").length,
        ordensHoje: ordensColeta.filter(o => o.data_ordem === format(new Date(), "yyyy-MM-dd")).length,
        veiculosAtivos: veiculos.filter(v => v.status === "disponivel" || v.status === "em_uso").length
    };

    const modulosVisiveis = allModules.filter(m => modulosAtivos.includes(m.id));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {config.logo_url && (
                            <img src={config.logo_url} alt="Logo" className="h-12 object-contain" />
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">{config.nome_empresa || "Sistema de Transportes"}</h1>
                            <p className="text-sm text-slate-500">
                                {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => { setTempModulos(modulosAtivos); setShowCustomize(true); }}
                            className="border-slate-300"
                        >
                            <Grip className="w-4 h-4 mr-2" />
                            Personalizar
                        </Button>
                        <NotificationBell />
                        {isAdmin && (
                            <Link to={createPageUrl("Configuracoes")}>
                                <Button variant="ghost" size="icon">
                                    <Settings className="w-5 h-5" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* Avisos */}
                {avisos.length > 0 && (
                    <div className="space-y-2">
                        {avisos.map(aviso => (
                            <div 
                                key={aviso.id}
                                className={`p-4 rounded-xl flex items-start gap-3 ${
                                    aviso.tipo === "urgente" 
                                        ? "bg-red-50 border border-red-200"
                                        : aviso.tipo === "alerta"
                                        ? "bg-amber-50 border border-amber-200"
                                        : "bg-blue-50 border border-blue-200"
                                }`}
                            >
                                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                                    aviso.tipo === "urgente" ? "text-red-500" : 
                                    aviso.tipo === "alerta" ? "text-amber-500" : "text-blue-500"
                                }`} />
                                <div>
                                    <p className="font-semibold text-slate-800">{aviso.titulo}</p>
                                    <p className="text-sm text-slate-600">{aviso.mensagem}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Cards de Estatísticas */}
                <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Entregas Pendentes</p>
                                    <p className="text-3xl font-bold">{stats.totalEntregas}</p>
                                </div>
                                <Package className="w-10 h-10 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Coletas Pendentes</p>
                                    <p className="text-3xl font-bold">{stats.totalColetas}</p>
                                </div>
                                <Truck className="w-10 h-10 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Ordens Hoje</p>
                                    <p className="text-3xl font-bold">{stats.ordensHoje}</p>
                                </div>
                                <ClipboardList className="w-10 h-10 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Veículos Ativos</p>
                                    <p className="text-3xl font-bold">{stats.veiculosAtivos}</p>
                                </div>
                                <Car className="w-10 h-10 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* Coluna Principal - Módulos */}
                    <div className="col-span-2 space-y-6">
                        {/* Módulos Ativos */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="border-b">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    Acesso Rápido
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-4 gap-4">
                                    {modulosVisiveis.map((item) => (
                                        <Link key={item.id} to={createPageUrl(item.href)}>
                                            <div className={`p-4 rounded-xl bg-gradient-to-br ${item.color} text-white hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer`}>
                                                <item.icon className="w-8 h-8 mb-2" />
                                                <p className="text-sm font-semibold">{item.name}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pendências por Veículo */}
                        {Object.keys(dashboardPorVeiculo).length > 0 && (
                            <Card className="border-0 shadow-lg">
                                <CardHeader className="border-b">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                                        Pendências por Veículo
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-3 gap-4">
                                        {Object.entries(dashboardPorVeiculo).map(([placa, dados]) => {
                                            const veiculo = veiculos.find(v => v.placa === placa);
                                            const isColetas = placa === "COLETAS";

                                            return (
                                                <div 
                                                    key={placa}
                                                    onClick={() => handlePlacaClick(placa)}
                                                    className={`p-4 rounded-xl border-l-4 cursor-pointer transition-all hover:shadow-lg bg-white shadow ${isColetas ? 'border-emerald-500' : 'border-blue-500'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            {isColetas ? (
                                                                <Truck className="w-5 h-5 text-emerald-600" />
                                                            ) : (
                                                                <Car className="w-5 h-5 text-blue-600" />
                                                            )}
                                                            <span className="font-bold text-slate-800">
                                                                {isColetas ? "Coletas" : placa}
                                                            </span>
                                                        </div>
                                                        {!isColetas && <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                    </div>
                                                    {veiculo && (
                                                        <p className="text-xs text-slate-500 mb-2">{veiculo.modelo}</p>
                                                    )}
                                                    <div className="flex gap-4">
                                                        {dados.entregas > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <Package className="w-4 h-4 text-orange-500" />
                                                                <span className="font-bold text-orange-600">{dados.entregas}</span>
                                                            </div>
                                                        )}
                                                        {dados.coletas > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <Truck className="w-4 h-4 text-emerald-500" />
                                                                <span className="font-bold text-emerald-600">{dados.coletas}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Coluna Lateral */}
                    <div className="space-y-6">
                        {/* Últimas Ordens */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="border-b">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-violet-600" />
                                    Últimas Ordens
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    {ordensColeta.slice(0, 5).map((ordem) => (
                                        <Link key={ordem.id} to={createPageUrl("OrdensColeta")}>
                                            <div className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold text-sm text-slate-800">#{ordem.numero}</span>
                                                    <Badge className={`text-xs ${
                                                        ordem.status === "pendente" ? "bg-yellow-100 text-yellow-700" :
                                                        ordem.status === "coletado" ? "bg-blue-100 text-blue-700" :
                                                        ordem.status === "entregue" ? "bg-green-100 text-green-700" :
                                                        "bg-slate-100 text-slate-700"
                                                    }`}>
                                                        {ordem.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-600 truncate">{ordem.remetente_nome}</p>
                                                <p className="text-xs text-slate-500">→ {ordem.destinatario_nome}</p>
                                            </div>
                                        </Link>
                                    ))}
                                    {ordensColeta.length === 0 && (
                                        <p className="text-center text-slate-500 py-4">Nenhuma ordem recente</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Acesso Admin */}
                        {isAdmin && (
                            <Card className="border-0 shadow-lg">
                                <CardHeader className="border-b">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-slate-600" />
                                        Administração
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="space-y-2">
                                        <Link to={createPageUrl("Motoristas")}>
                                            <Button variant="ghost" className="w-full justify-start">
                                                <Users className="w-4 h-4 mr-2" /> Motoristas
                                            </Button>
                                        </Link>
                                        <Link to={createPageUrl("Avisos")}>
                                            <Button variant="ghost" className="w-full justify-start">
                                                <Bell className="w-4 h-4 mr-2" /> Avisos
                                            </Button>
                                        </Link>
                                        <Link to={createPageUrl("Configuracoes")}>
                                            <Button variant="ghost" className="w-full justify-start">
                                                <Settings className="w-4 h-4 mr-2" /> Configurações
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </main>

            {/* Dialog Personalização */}
            <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Grip className="w-5 h-5 text-blue-600" />
                            Personalizar Tela Inicial
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Selecione os módulos que deseja exibir na tela inicial:
                        </p>
                        <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                            {allModules.map((modulo) => {
                                const ativo = tempModulos.includes(modulo.id);
                                return (
                                    <div
                                        key={modulo.id}
                                        onClick={() => toggleModulo(modulo.id)}
                                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                            ativo 
                                                ? "border-blue-500 bg-blue-50" 
                                                : "border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-gradient-to-br ${modulo.color}`}>
                                                <modulo.icon className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{modulo.name}</span>
                                            {ativo && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" onClick={() => setShowCustomize(false)} className="flex-1">
                                Cancelar
                            </Button>
                            <Button 
                                onClick={salvarPersonalizacao} 
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                disabled={updateUserMutation.isPending}
                            >
                                {updateUserMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Notas por Transportadora */}
            <Dialog open={showNotasDialog} onOpenChange={setShowNotasDialog}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-blue-600" />
                            Notas do Veículo {placaSelecionada}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {Object.keys(notasAgrupadas).length === 0 ? (
                            <p className="text-center text-slate-500 py-4">Nenhuma nota encontrada</p>
                        ) : (
                            Object.entries(notasAgrupadas).map(([transportadora, notas]) => (
                                <div key={transportadora} className="border rounded-xl overflow-hidden">
                                    <div className="bg-blue-50 p-3 border-b">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                                                <Building2 className="w-4 h-4" />
                                                {transportadora}
                                            </h4>
                                            <Badge className="bg-blue-100 text-blue-700">
                                                {notas.length} nota{notas.length > 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="divide-y">
                                        {notas.map((nota) => (
                                            <div key={nota.id} className="p-3 hover:bg-slate-50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-slate-800">{nota.destinatario}</p>
                                                        <p className="text-sm text-blue-600 font-semibold">NF: {nota.numero_nf}</p>
                                                    </div>
                                                    <div className="text-right text-sm">
                                                        <p className="text-slate-500">{nota.volume || "-"} vol</p>
                                                        <p className="text-slate-500">{nota.peso || "-"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}