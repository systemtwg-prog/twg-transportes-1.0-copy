import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Package, Users, FileText, TrendingUp, 
    Clock, Truck, CheckCircle, ArrowRight,
    Calendar, Settings, User, Navigation, Car, Award
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import LocationPermission from "@/components/auth/LocationPermission";
import AccessCheck from "@/components/auth/AccessCheck";

export default function Home() {
    const [locationGranted, setLocationGranted] = useState(false);
    const { data: ordens = [] } = useQuery({
        queryKey: ["ordens"],
        queryFn: () => base44.entities.OrdemColeta.list("-created_date", 10)
    });

    const { data: clientes = [] } = useQuery({
        queryKey: ["clientes"],
        queryFn: () => base44.entities.Cliente.list()
    });

    const { data: allOrdens = [] } = useQuery({
        queryKey: ["all-ordens"],
        queryFn: () => base44.entities.OrdemColeta.list()
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const { data: currentUser, isLoading: loadingUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const config = configs[0] || {};

    const { data: clientesFavoritos = [] } = useQuery({
        queryKey: ["clientes-favoritos"],
        queryFn: () => base44.entities.Cliente.filter({ favorito: true })
    });

    const { data: colaboradoresAtivos = [] } = useQuery({
        queryKey: ["colaboradores-ativos"],
        queryFn: () => base44.entities.Motorista.filter({ status: "ativo" })
    });

    const { data: coletasHoje = [] } = useQuery({
        queryKey: ["coletas-hoje"],
        queryFn: async () => {
            const hoje = new Date().toISOString().split("T")[0];
            return base44.entities.OrdemColeta.filter({ data_coleta: hoje });
        }
    });

    const userWidgets = currentUser?.widgets_home?.length > 0 
        ? currentUser.widgets_home 
        : ["stats", "menu", "ultimas_ordens"];

    const handleLocationGranted = async (location) => {
        setLocationGranted(true);
        if (currentUser) {
            await base44.auth.updateMe({ ultima_localizacao: location });
        }
    };

    // Verificar aprovação do usuário
    const accessDenied = currentUser && (
        currentUser.status === "pendente" || 
        currentUser.status === "rejeitado" || 
        !currentUser.status
    );

    if (accessDenied) {
        return <AccessCheck user={currentUser} isLoading={loadingUser} pageName="Home" />;
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const statusColors = {
        pendente: "bg-yellow-100 text-yellow-800",
        em_andamento: "bg-blue-100 text-blue-800",
        coletado: "bg-purple-100 text-purple-800",
        entregue: "bg-green-100 text-green-800",
        cancelado: "bg-red-100 text-red-800"
    };

    const statusLabels = {
        pendente: "Pendente",
        em_andamento: "Em Andamento",
        coletado: "Coletado",
        entregue: "Entregue",
        cancelado: "Cancelado"
    };

    const stats = {
        totalOrdens: allOrdens.length,
        pendentes: allOrdens.filter(o => o.status === "pendente").length,
        emAndamento: allOrdens.filter(o => o.status === "em_andamento").length,
        entregues: allOrdens.filter(o => o.status === "entregue").length,
        totalClientes: clientes.length
    };

    const menuItems = [
        {
            title: "Ordens de Coleta",
            description: "Criar e gerenciar ordens",
            icon: Package,
            href: "OrdensColeta",
            color: "from-blue-500 to-indigo-600",
            count: stats.totalOrdens
        },
        {
            title: "Clientes",
            description: "Remetentes e destinatários",
            icon: Users,
            href: "Clientes",
            color: "from-emerald-500 to-teal-600",
            count: stats.totalClientes
        },
        {
            title: "Motoristas",
            description: "Cadastro de motoristas",
            icon: User,
            href: "Motoristas",
            color: "from-orange-500 to-amber-600"
        },
        {
            title: "Veículos",
            description: "Gestão da frota",
            icon: Car,
            href: "Veiculos",
            color: "from-teal-500 to-cyan-600"
        },
        {
            title: "Rastreamento",
            description: "Localização em tempo real",
            icon: Navigation,
            href: "Rastreamento",
            color: "from-green-500 to-emerald-600"
        },
        {
            title: "Relatórios",
            description: "Consultar e exportar",
            icon: FileText,
            href: "Relatorios",
            color: "from-purple-500 to-indigo-600"
        },
        {
            title: "Performance",
            description: "Relatório de motoristas",
            icon: Award,
            href: "RelatorioMotoristas",
            color: "from-red-500 to-orange-600"
        },
        {
            title: "Configurações",
            description: "Personalizar sistema",
            icon: Settings,
            href: "Configuracoes",
            color: "from-slate-500 to-slate-700"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Location Permission */}
            {!locationGranted && (
                <LocationPermission onPermissionGranted={handleLocationGranted} />
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
                    <div className="flex items-center gap-4 mb-2">
                        {config.logo_url ? (
                            <img src={config.logo_url} alt="Logo" className="h-16 object-contain bg-white/20 p-2 rounded-xl" />
                        ) : (
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                                <Truck className="w-10 h-10" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold">
                                {config.nome_empresa || "Controle TWG"}
                            </h1>
                            <p className="text-blue-100 mt-1">Gestão de ordens de coleta e transportes</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-6 pb-12">
                {/* Stats */}
                {userWidgets.includes("stats") && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="p-3 bg-yellow-100 rounded-xl">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Pendentes</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.pendentes}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Truck className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Em Andamento</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.emAndamento}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Entregues</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.entregues}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Ordens</p>
                                <p className="text-2xl font-bold text-slate-800">{stats.totalOrdens}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                )}

                {/* Quick Access */}
                {userWidgets.includes("menu") && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {menuItems.map((item, index) => (
                        <Link key={index} to={createPageUrl(item.href)}>
                            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden group h-full">
                                <div className={`h-1.5 bg-gradient-to-r ${item.color}`} />
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-3 rounded-xl bg-gradient-to-r ${item.color} text-white shadow-lg`}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        {item.count !== undefined && (
                                            <Badge className="bg-slate-100 text-slate-700 text-sm px-2">
                                                {item.count}
                                            </Badge>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                                    <p className="text-slate-500 text-sm mt-1">{item.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
                )}

                {/* Clientes Favoritos */}
                {userWidgets.includes("clientes") && clientesFavoritos.length > 0 && (
                <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl mb-8">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-600" />
                            Clientes Favoritos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {clientesFavoritos.slice(0, 8).map((cliente) => (
                                <div key={cliente.id} className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <p className="font-medium text-slate-800 text-sm truncate">{cliente.razao_social}</p>
                                    <p className="text-xs text-slate-500">{cliente.cidade}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                )}

                {/* Colaboradores Ativos */}
                {userWidgets.includes("colaboradores") && colaboradoresAtivos.length > 0 && (
                <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl mb-8">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-orange-600" />
                            Colaboradores Ativos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {colaboradoresAtivos.slice(0, 8).map((colab) => (
                                <div key={colab.id} className="p-3 bg-orange-50 rounded-lg border border-orange-100 flex items-center gap-3">
                                    {colab.foto_url ? (
                                        <img src={colab.foto_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center">
                                            <User className="w-5 h-5 text-orange-600" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-slate-800 text-sm">{colab.nome}</p>
                                        <p className="text-xs text-slate-500">{colab.telefone}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                )}

                {/* Coletas do Dia */}
                {userWidgets.includes("calendario") && (
                <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl mb-8">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            Coletas de Hoje ({coletasHoje.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {coletasHoje.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Nenhuma coleta programada para hoje
                            </div>
                        ) : (
                            <div className="divide-y">
                                {coletasHoje.slice(0, 5).map((coleta) => (
                                    <div key={coleta.id} className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Package className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">#{coleta.numero}</p>
                                                <p className="text-sm text-slate-500">{coleta.remetente_nome}</p>
                                            </div>
                                        </div>
                                        <Badge className={`${statusColors[coleta.status]} border-0`}>
                                            {statusLabels[coleta.status]}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
                )}

                {/* Recent Orders */}
                {userWidgets.includes("ultimas_ordens") && (
                <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                Últimas Ordens
                            </CardTitle>
                            <Link 
                                to={createPageUrl("OrdensColeta")}
                                className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1"
                            >
                                Ver todas
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {ordens.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    Nenhuma ordem cadastrada ainda
                                </div>
                            ) : (
                                ordens.map((ordem) => (
                                    <div key={ordem.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-blue-100 rounded-lg">
                                                    <Package className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-blue-600">#{ordem.numero}</span>
                                                        <Badge className={`${statusColors[ordem.status]} border-0`}>
                                                            {statusLabels[ordem.status]}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        {ordem.remetente_nome} → {ordem.destinatario_nome}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-slate-700">
                                                    {formatDate(ordem.data_ordem)}
                                                </p>
                                                {ordem.motorista && (
                                                    <p className="text-xs text-slate-500">
                                                        {ordem.motorista}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
                )}
            </div>
        </div>
    );
}