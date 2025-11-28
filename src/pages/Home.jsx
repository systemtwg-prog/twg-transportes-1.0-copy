import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
    Truck, Package, FileText, Users, Car, 
    ClipboardList, Settings, BarChart3, Calendar,
    Navigation, Building2, Bell, Upload, Scale,
    Camera, ChevronRight, X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Home() {
    const [placaSelecionada, setPlacaSelecionada] = useState(null);
    const [showNotasDialog, setShowNotasDialog] = useState(false);

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

    const isAdmin = currentUser?.role === "admin";

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

        // Adicionar notas fiscais reais aos veículos
        Object.keys(porVeiculo).forEach(placa => {
            const notasDoVeiculo = notasFiscais.filter(n => 
                porVeiculo[placa].notasIds.includes(n.id) || n.placa === placa
            );
            porVeiculo[placa].notas = notasDoVeiculo;
        });

        // Coletas pendentes
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

    const mainButtons = [
        { name: "Nota Depósito", href: "NotaDeposito", icon: Camera, color: "from-blue-600 to-blue-700" },
        { name: "Comprovantes", href: "ComprovantesInternos", icon: Upload, color: "from-blue-500 to-cyan-600" },
        { name: "Coletas Diárias", href: "ColetasDiarias", icon: Package, color: "from-sky-500 to-blue-600" },
        { name: "Ordem de Coleta", href: "OrdensColeta", icon: ClipboardList, color: "from-indigo-500 to-blue-600" },
    ];

    const quickButtons = [
        { name: "Rotas GPS", href: "RotasGPS", icon: Navigation },
        { name: "Veículos", href: "Veiculos", icon: Car },
    ];

    const menuItems = [
        { name: "Notas Fiscais", href: "NotasFiscais", icon: FileText, color: "from-amber-500 to-orange-600" },
        { name: "Máscara Romaneio", href: "MascaraRomaneio", icon: Truck, color: "from-violet-500 to-purple-600" },
        { name: "Romaneios Gerados", href: "RomaneiosGerados", icon: BarChart3, color: "from-pink-500 to-rose-600" },
        { name: "Comprovantes CTEs", href: "ComprovantesCtes", icon: FileText, color: "from-amber-500 to-yellow-600" },
        { name: "Clientes", href: "Clientes", icon: Users, color: "from-purple-500 to-indigo-600" },
        { name: "Transportadoras", href: "Transportadoras", icon: Building2, color: "from-slate-500 to-gray-600" },
    ];

    const adminItems = [
        { name: "Motoristas", href: "Motoristas", icon: Users },
        { name: "Avisos", href: "Avisos", icon: Bell },
        { name: "Configurações", href: "Configuracoes", icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-4 md:p-6">
            <div className="max-w-6xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {config.logo_url && (
                            <img src={config.logo_url} alt="Logo" className="h-12 object-contain bg-white/10 rounded-lg p-1" />
                        )}
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-white">
                                {config.nome_empresa || "Sistema de Transportes"}
                            </h1>
                            <p className="text-blue-200 text-sm">
                                Olá, {currentUser?.full_name || "Usuário"}! • {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Avisos */}
                {avisos.length > 0 && (
                    <div className="space-y-2">
                        {avisos.map(aviso => (
                            <div 
                                key={aviso.id}
                                className={`p-3 rounded-xl border-l-4 backdrop-blur-sm ${
                                    aviso.tipo === "urgente" 
                                        ? "bg-red-500/20 border-red-400 text-red-100"
                                        : aviso.tipo === "alerta"
                                        ? "bg-amber-500/20 border-amber-400 text-amber-100"
                                        : "bg-blue-500/20 border-blue-400 text-blue-100"
                                }`}
                            >
                                <p className="font-semibold text-sm">{aviso.titulo}</p>
                                <p className="text-xs opacity-90">{aviso.mensagem}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Botões Principais */}
                <div className="grid grid-cols-2 gap-3">
                    {mainButtons.map((item) => (
                        <Link key={item.name} to={createPageUrl(item.href)}>
                            <Button className={`w-full h-20 bg-gradient-to-r ${item.color} hover:opacity-90 shadow-lg border-0 flex flex-col items-center justify-center gap-1`}>
                                <item.icon className="w-7 h-7 text-white" />
                                <span className="text-sm font-semibold text-white">{item.name}</span>
                            </Button>
                        </Link>
                    ))}
                </div>

                {/* Botões Rápidos */}
                <div className="grid grid-cols-2 gap-3">
                    {quickButtons.map((item) => (
                        <Link key={item.name} to={createPageUrl(item.href)}>
                            <Button variant="outline" className="w-full h-12 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm">
                                <item.icon className="w-5 h-5 mr-2" />
                                {item.name}
                            </Button>
                        </Link>
                    ))}
                </div>

                {/* Dashboard por Veículo */}
                {Object.keys(dashboardPorVeiculo).length > 0 && (
                    <Card className="bg-white/10 backdrop-blur-md border-0 shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-white text-lg flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-300" />
                                Pendências por Veículo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(dashboardPorVeiculo).map(([placa, dados]) => {
                                    const veiculo = veiculos.find(v => v.placa === placa);
                                    const isColetas = placa === "COLETAS";
                                    
                                    return (
                                        <div 
                                            key={placa}
                                            onClick={() => handlePlacaClick(placa)}
                                            className={`p-3 bg-white/10 rounded-xl border-l-4 ${isColetas ? 'border-green-400' : 'border-blue-400'} backdrop-blur-sm cursor-pointer hover:bg-white/20 transition-all`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {isColetas ? (
                                                        <Truck className="w-4 h-4 text-green-400" />
                                                    ) : (
                                                        <Car className="w-4 h-4 text-blue-400" />
                                                    )}
                                                    <span className="font-bold text-sm text-white">
                                                        {isColetas ? "Coletas" : placa}
                                                    </span>
                                                </div>
                                                {!isColetas && (
                                                    <ChevronRight className="w-4 h-4 text-white/50" />
                                                )}
                                            </div>
                                            {veiculo && (
                                                <p className="text-xs text-blue-200 mb-1">{veiculo.modelo}</p>
                                            )}
                                            <div className="flex gap-3 text-sm">
                                                {dados.entregas > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <Package className="w-3 h-3 text-orange-400" />
                                                        <span className="font-semibold text-orange-300">{dados.entregas}</span>
                                                        <span className="text-xs text-white/60">entregas</span>
                                                    </div>
                                                )}
                                                {dados.coletas > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <Truck className="w-3 h-3 text-green-400" />
                                                        <span className="font-semibold text-green-300">{dados.coletas}</span>
                                                        <span className="text-xs text-white/60">coletas</span>
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

                {/* Menu Secundário */}
                <div className="grid grid-cols-3 gap-2">
                    {menuItems.map((item) => (
                        <Link key={item.name} to={createPageUrl(item.href)}>
                            <Card className="bg-white/10 border-0 hover:bg-white/20 transition-all cursor-pointer backdrop-blur-sm">
                                <CardContent className="p-3 flex flex-col items-center text-center">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color} mb-2`}>
                                        <item.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xs font-medium text-white">{item.name}</span>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Menu Admin */}
                {isAdmin && (
                    <div className="flex gap-2 flex-wrap">
                        {adminItems.map((item) => (
                            <Link key={item.name} to={createPageUrl(item.href)}>
                                <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-white/10">
                                    <item.icon className="w-4 h-4 mr-1" />
                                    {item.name}
                                </Button>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

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
                                                {nota.filial && (
                                                    <Badge variant="outline" className="mt-1 text-xs">
                                                        Filial: {nota.filial}
                                                    </Badge>
                                                )}
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