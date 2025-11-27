import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Package, FileText, TrendingUp, 
    Clock, Truck, CheckCircle, ArrowRight,
    Calendar, Settings, User, Navigation, Car, Award, Bell, AlertTriangle,
    Receipt, Users, Phone, MapPin
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import LocationPermission from "@/components/auth/LocationPermission";
import AccessCheck from "@/components/auth/AccessCheck";
import WeatherClock from "@/components/shared/WeatherClock";

export default function Home() {
    const [locationGranted, setLocationGranted] = useState(false);

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    const { data: currentUser, isLoading: loadingUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const { data: comprovantesInternos = [] } = useQuery({
        queryKey: ["comprovantes-internos-home"],
        queryFn: () => base44.entities.ComprovanteInterno.list("-created_date", 5)
    });

    const { data: notasDeposito = [] } = useQuery({
        queryKey: ["notas-deposito-home"],
        queryFn: () => base44.entities.NotaDeposito.list("-created_date", 5)
    });

    const { data: coletasDiarias = [] } = useQuery({
        queryKey: ["coletas-diarias-home"],
        queryFn: async () => {
            const hoje = new Date().toISOString().split("T")[0];
            return base44.entities.ColetaDiaria.filter({ data_coleta: hoje });
        }
    });

    const { data: ordensColeta = [] } = useQuery({
        queryKey: ["ordens-coleta-home"],
        queryFn: () => base44.entities.OrdemColeta.list("-created_date", 5)
    });

    const { data: avisosAtivos = [] } = useQuery({
        queryKey: ["avisos-ativos"],
        queryFn: async () => {
            const avisos = await base44.entities.Aviso.filter({ ativo: true });
            const hoje = new Date().toISOString().split("T")[0];
            return avisos.filter(a => {
                if (a.data_inicio && a.data_inicio > hoje) return false;
                if (a.data_fim && a.data_fim < hoje) return false;
                return true;
            });
        }
    });

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
        pendente: "bg-amber-100 text-amber-700",
        em_andamento: "bg-sky-100 text-sky-700",
        coletado: "bg-violet-100 text-violet-700",
        entregue: "bg-emerald-100 text-emerald-700",
        cancelado: "bg-red-100 text-red-700",
        realizado: "bg-emerald-100 text-emerald-700",
        finalizado: "bg-emerald-100 text-emerald-700"
    };

    const menuItems = [
        {
            title: "Comprovantes de Entrega",
            description: "Gerenciar comprovantes",
            icon: FileText,
            href: "ComprovantesInternos",
            color: "from-sky-400 to-cyan-500"
        },
        {
            title: "Nota Depósito",
            description: "Registrar depósitos",
            icon: Receipt,
            href: "NotaDeposito",
            color: "from-violet-400 to-purple-500"
        },
        {
            title: "Coletas Diárias",
            description: "Coletas do dia",
            icon: Calendar,
            href: "ColetasDiarias",
            color: "from-emerald-400 to-teal-500"
        },
        {
            title: "Ordens de Coleta",
            description: "Gerenciar ordens",
            icon: Package,
            href: "OrdensColeta",
            color: "from-sky-400 to-blue-500"
        }
    ];

    const quickLinks = [
        { title: "Clientes", icon: Users, href: "Clientes" },
        { title: "Colaboradores", icon: User, href: "Motoristas" },
        { title: "Veículos", icon: Car, href: "Veiculos" },
        { title: "Romaneios", icon: Truck, href: "Romaneios" },
        { title: "Rotas GPS", icon: Navigation, href: "RotasGPS" },
        { title: "Rastreamento", icon: MapPin, href: "Rastreamento" },
        { title: "Relatórios", icon: TrendingUp, href: "Relatorios" },
        { title: "Configurações", icon: Settings, href: "Configuracoes" }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
            {/* Location Permission */}
            {!locationGranted && (
                <LocationPermission onPermissionGranted={handleLocationGranted} />
            )}

            {/* Header com Logo Grande */}
            <div className="bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 text-white">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {config.logo_url ? (
                            <img 
                                src={config.logo_url} 
                                alt="Logo" 
                                className="h-32 md:h-40 object-contain bg-white/20 p-4 rounded-2xl backdrop-blur-sm" 
                            />
                        ) : (
                            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                                <Truck className="w-20 h-20" />
                            </div>
                        )}
                        <div className="text-center md:text-left flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold">
                                {config.nome_empresa || "Controle TWG"}
                            </h1>
                            <div className="text-sky-100 text-sm mt-2 space-y-0.5">
                                {config.endereco && (
                                    <p className="flex items-center gap-1 justify-center md:justify-start">
                                        <MapPin className="w-3 h-3" />
                                        {config.endereco}
                                    </p>
                                )}
                                {config.telefone && (
                                    <p className="flex items-center gap-1 justify-center md:justify-start">
                                        <Phone className="w-3 h-3" />
                                        {config.telefone}
                                    </p>
                                )}
                            </div>
                        </div>
                        <WeatherClock />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-6 pb-12">
                {/* Avisos Ativos */}
                {avisosAtivos.length > 0 && (
                    <div className="space-y-3 mb-6">
                        {avisosAtivos.map(aviso => (
                            <Card key={aviso.id} className={`border-l-4 shadow-lg ${
                                aviso.tipo === "urgente" ? "bg-red-50 border-l-red-500" :
                                aviso.tipo === "alerta" ? "bg-amber-50 border-l-amber-500" :
                                "bg-sky-50 border-l-sky-500"
                            }`}>
                                <CardContent className="p-4 flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${
                                        aviso.tipo === "urgente" ? "bg-red-100" :
                                        aviso.tipo === "alerta" ? "bg-amber-100" :
                                        "bg-sky-100"
                                    }`}>
                                        {aviso.tipo === "urgente" || aviso.tipo === "alerta" ? (
                                            <AlertTriangle className={`w-5 h-5 ${
                                                aviso.tipo === "urgente" ? "text-red-600" : "text-amber-600"
                                            }`} />
                                        ) : (
                                            <Bell className="w-5 h-5 text-sky-600" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${
                                            aviso.tipo === "urgente" ? "text-red-800" :
                                            aviso.tipo === "alerta" ? "text-amber-800" :
                                            "text-sky-800"
                                        }`}>{aviso.titulo}</h3>
                                        <p className="text-slate-600 text-sm">{aviso.mensagem}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Menu Principal - Nova Ordem */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {menuItems.map((item, index) => (
                        <Link key={index} to={createPageUrl(item.href)}>
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden group h-full">
                                <div className={`h-1.5 bg-gradient-to-r ${item.color}`} />
                                <CardContent className="p-4">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} text-white flex items-center justify-center shadow-lg mb-3`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-slate-800">{item.title}</h3>
                                    <p className="text-slate-500 text-sm">{item.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Quick Links */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mb-8">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-2">
                            {quickLinks.map((link, index) => (
                                <Link key={index} to={createPageUrl(link.href)}>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-full text-sm font-medium transition-colors">
                                        <link.icon className="w-4 h-4" />
                                        {link.title}
                                    </button>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Comprovantes de Entrega */}
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-cyan-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="w-5 h-5 text-sky-600" />
                                    Comprovantes de Entrega
                                </CardTitle>
                                <Link to={createPageUrl("ComprovantesInternos")} className="text-sky-600 hover:text-sky-700 text-sm flex items-center gap-1">
                                    Ver todos <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {comprovantesInternos.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    Nenhum comprovante recente
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {comprovantesInternos.map(comp => (
                                        <div key={comp.id} className="p-3 hover:bg-slate-50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-slate-800">NF: {comp.nota_fiscal}</p>
                                                    <p className="text-xs text-slate-500">{formatDate(comp.data)}</p>
                                                </div>
                                                <Badge className="bg-sky-100 text-sky-700">
                                                    {comp.arquivos?.length || 0} arquivos
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Notas Depósito */}
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-purple-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Receipt className="w-5 h-5 text-violet-600" />
                                    Notas Depósito
                                </CardTitle>
                                <Link to={createPageUrl("NotaDeposito")} className="text-violet-600 hover:text-violet-700 text-sm flex items-center gap-1">
                                    Ver todas <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {notasDeposito.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    Nenhuma nota recente
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {notasDeposito.map(nota => (
                                        <div key={nota.id} className="p-3 hover:bg-slate-50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-slate-800">{nota.titulo || "Sem título"}</p>
                                                    <p className="text-xs text-slate-500">{formatDate(nota.data)}</p>
                                                </div>
                                                <Badge className={statusColors[nota.status]}>
                                                    {nota.status === "pendente" ? "Pendente" : "Finalizado"}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Coletas Diárias */}
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Calendar className="w-5 h-5 text-emerald-600" />
                                    Coletas de Hoje ({coletasDiarias.filter(c => c.status === "pendente").length})
                                </CardTitle>
                                <Link to={createPageUrl("ColetasDiarias")} className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1">
                                    Ver todas <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {coletasDiarias.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    Nenhuma coleta para hoje
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {coletasDiarias.filter(c => c.status === "pendente").slice(0, 5).map((coleta, idx) => (
                                        <div key={coleta.id} className="p-3 hover:bg-slate-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-slate-800">{coleta.remetente_nome}</p>
                                                        <p className="text-xs text-slate-500">{coleta.destinatario_nome}</p>
                                                    </div>
                                                </div>
                                                <Badge className={statusColors[coleta.status]}>
                                                    {coleta.status === "pendente" ? "Pendente" : coleta.status === "realizado" ? "Realizado" : "Cancelado"}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Ordens de Coleta */}
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                        <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-blue-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Package className="w-5 h-5 text-sky-600" />
                                    Últimas Ordens
                                </CardTitle>
                                <Link to={createPageUrl("OrdensColeta")} className="text-sky-600 hover:text-sky-700 text-sm flex items-center gap-1">
                                    Ver todas <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {ordensColeta.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    Nenhuma ordem cadastrada
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {ordensColeta.map(ordem => (
                                        <Link key={ordem.id} to={createPageUrl(`OrdensColeta?ordem=${ordem.id}`)}>
                                            <div className="p-3 hover:bg-slate-50 cursor-pointer">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-sky-600">#{ordem.numero}</p>
                                                        <p className="text-sm text-slate-600">{ordem.remetente_nome}</p>
                                                    </div>
                                                    <Badge className={statusColors[ordem.status]}>
                                                        {ordem.status === "pendente" ? "Pendente" : 
                                                         ordem.status === "entregue" ? "Entregue" : 
                                                         ordem.status === "coletado" ? "Coletado" : ordem.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}