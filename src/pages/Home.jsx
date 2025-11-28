import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
    Truck, Package, FileText, Users, Car, 
    ClipboardList, Settings, BarChart3, Calendar,
    Navigation, Building2, Bell, Upload, Scale,
    TrendingUp, Clock, CheckCircle, AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Home() {
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

    const { data: coletasDiarias = [] } = useQuery({
        queryKey: ["coletas-home"],
        queryFn: () => base44.entities.ColetaDiaria.list("-created_date")
    });

    const { data: romaneiosGerados = [] } = useQuery({
        queryKey: ["romaneios-home"],
        queryFn: () => base44.entities.RomaneioGerado.list("-created_date")
    });

    const { data: ordensColeta = [] } = useQuery({
        queryKey: ["ordens-home"],
        queryFn: () => base44.entities.OrdemColeta.list("-created_date")
    });

    const { data: notasFiscais = [] } = useQuery({
        queryKey: ["notas-home"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const isAdmin = currentUser?.role === "admin";

    // Dashboard calculations
    const dashboard = useMemo(() => {
        const hoje = format(new Date(), "yyyy-MM-dd");
        
        const coletasHoje = coletasDiarias.filter(c => c.data_coleta === hoje);
        const coletasPendentes = coletasHoje.filter(c => c.status === "pendente").length;
        const coletasRealizadas = coletasHoje.filter(c => c.status === "realizado").length;
        
        const ordensPendentes = ordensColeta.filter(o => o.status === "pendente").length;
        const ordensEmAndamento = ordensColeta.filter(o => o.status === "em_andamento").length;
        
        const romaneiosHoje = romaneiosGerados.filter(r => r.data === hoje);
        const totalEntregasHoje = romaneiosHoje.reduce((acc, r) => acc + (r.total_entregas || 0), 0);
        const pesoTotalHoje = romaneiosHoje.reduce((acc, r) => acc + (r.peso_total || 0), 0);
        
        const notasHoje = notasFiscais.filter(n => n.data === hoje).length;
        
        return {
            coletasPendentes,
            coletasRealizadas,
            ordensPendentes,
            ordensEmAndamento,
            totalEntregasHoje,
            pesoTotalHoje,
            notasHoje,
            romaneiosHoje: romaneiosHoje.length
        };
    }, [coletasDiarias, ordensColeta, romaneiosGerados, notasFiscais]);

    const menuItems = [
        { name: "Coletas Diárias", href: "ColetasDiarias", icon: Package, color: "from-blue-500 to-cyan-600", description: "Gerenciar coletas do dia" },
        { name: "Ordens de Coleta", href: "OrdensColeta", icon: ClipboardList, color: "from-indigo-500 to-purple-600", description: "Criar e gerenciar ordens" },
        { name: "Adicionar Coleta", href: "AdicionarColetaDiaria", icon: Calendar, color: "from-emerald-500 to-teal-600", description: "Nova coleta diária" },
        { name: "Notas Fiscais", href: "NotasFiscais", icon: FileText, color: "from-amber-500 to-orange-600", description: "Gerenciar notas fiscais" },
        { name: "Máscara Romaneio", href: "MascaraRomaneio", icon: Truck, color: "from-violet-500 to-purple-600", description: "Gerar romaneios" },
        { name: "Romaneios Gerados", href: "RomaneiosGerados", icon: BarChart3, color: "from-pink-500 to-rose-600", description: "Histórico de romaneios" },
        { name: "Rotas GPS", href: "RotasGPS", icon: Navigation, color: "from-green-500 to-emerald-600", description: "Navegação e rotas" },
        { name: "Comprovantes Internos", href: "ComprovantesInternos", icon: Upload, color: "from-sky-500 to-blue-600", description: "Comprovantes de entrega" },
        { name: "Comprovantes CTEs", href: "ComprovantesCtes", icon: FileText, color: "from-amber-500 to-yellow-600", description: "Gerenciar CTEs" },
        { name: "Nota Depósito", href: "NotaDeposito", icon: Package, color: "from-teal-500 to-cyan-600", description: "Fotos de notas" },
        { name: "Clientes", href: "Clientes", icon: Users, color: "from-purple-500 to-indigo-600", description: "Cadastro de clientes" },
        { name: "Transportadoras", href: "Transportadoras", icon: Building2, color: "from-slate-500 to-gray-600", description: "Cadastro de transportadoras" },
    ];

    const adminItems = [
        { name: "Motoristas", href: "Motoristas", icon: Users, color: "from-blue-600 to-indigo-700" },
        { name: "Veículos", href: "Veiculos", icon: Car, color: "from-green-600 to-teal-700" },
        { name: "Avisos", href: "Avisos", icon: Bell, color: "from-orange-600 to-red-700" },
        { name: "Configurações", href: "Configuracoes", icon: Settings, color: "from-slate-600 to-gray-700" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {config.logo_url && (
                            <img src={config.logo_url} alt="Logo" className="h-14 object-contain" />
                        )}
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                                {config.nome_empresa || "Sistema de Transportes"}
                            </h1>
                            <p className="text-slate-500">
                                Olá, {currentUser?.full_name || "Usuário"}! • {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
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
                                className={`p-4 rounded-xl border-l-4 ${
                                    aviso.tipo === "urgente" 
                                        ? "bg-red-50 border-red-500 text-red-800"
                                        : aviso.tipo === "alerta"
                                        ? "bg-amber-50 border-amber-500 text-amber-800"
                                        : "bg-blue-50 border-blue-500 text-blue-800"
                                }`}
                            >
                                <p className="font-semibold">{aviso.titulo}</p>
                                <p className="text-sm">{aviso.mensagem}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Dashboard */}
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 border-0 shadow-xl text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Dashboard do Dia
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-5 h-5" />
                                    <span className="text-sm opacity-90">Coletas Pendentes</span>
                                </div>
                                <p className="text-3xl font-bold">{dashboard.coletasPendentes}</p>
                            </div>
                            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="text-sm opacity-90">Coletas Realizadas</span>
                                </div>
                                <p className="text-3xl font-bold">{dashboard.coletasRealizadas}</p>
                            </div>
                            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Truck className="w-5 h-5" />
                                    <span className="text-sm opacity-90">Entregas Hoje</span>
                                </div>
                                <p className="text-3xl font-bold">{dashboard.totalEntregasHoje}</p>
                            </div>
                            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Scale className="w-5 h-5" />
                                    <span className="text-sm opacity-90">Peso Total (kg)</span>
                                </div>
                                <p className="text-3xl font-bold">{dashboard.pesoTotalHoje.toFixed(0)}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div className="bg-white/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold">{dashboard.ordensPendentes}</p>
                                <p className="text-xs opacity-80">Ordens Pendentes</p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold">{dashboard.ordensEmAndamento}</p>
                                <p className="text-xs opacity-80">Em Andamento</p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold">{dashboard.romaneiosHoje}</p>
                                <p className="text-xs opacity-80">Romaneios Hoje</p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold">{dashboard.notasHoje}</p>
                                <p className="text-xs opacity-80">Notas Fiscais</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Ações Rápidas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Link to={createPageUrl("AdicionarColetaDiaria")}>
                        <Button className="w-full h-16 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg">
                            <Calendar className="w-5 h-5 mr-2" />
                            Nova Coleta
                        </Button>
                    </Link>
                    <Link to={createPageUrl("NotasFiscais")}>
                        <Button className="w-full h-16 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg">
                            <FileText className="w-5 h-5 mr-2" />
                            Notas Fiscais
                        </Button>
                    </Link>
                    <Link to={createPageUrl("MascaraRomaneio")}>
                        <Button className="w-full h-16 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg">
                            <Truck className="w-5 h-5 mr-2" />
                            Gerar Romaneio
                        </Button>
                    </Link>
                    <Link to={createPageUrl("RotasGPS")}>
                        <Button className="w-full h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg">
                            <Navigation className="w-5 h-5 mr-2" />
                            Rotas GPS
                        </Button>
                    </Link>
                </div>

                {/* Menu Principal */}
                <div>
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Menu Principal</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {menuItems.map((item) => (
                            <Link key={item.name} to={createPageUrl(item.href)}>
                                <Card className="h-full bg-white/80 border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer">
                                    <CardContent className="p-4 flex flex-col items-center text-center">
                                        <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} mb-3`}>
                                            <item.icon className="w-6 h-6 text-white" />
                                        </div>
                                        <h3 className="font-semibold text-slate-800 text-sm">{item.name}</h3>
                                        <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Menu Admin */}
                {isAdmin && (
                    <div className="mt-8">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Administração</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {adminItems.map((item) => (
                                <Link key={item.name} to={createPageUrl(item.href)}>
                                    <Card className="bg-white/60 border-0 shadow-md hover:shadow-lg transition-all cursor-pointer">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color}`}>
                                                <item.icon className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="font-medium text-slate-700 text-sm">{item.name}</span>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}