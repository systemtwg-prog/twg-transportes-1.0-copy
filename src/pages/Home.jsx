import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Package, Users, FileText, TrendingUp, 
    Clock, Truck, CheckCircle, ArrowRight,
    Calendar, Settings, User, Navigation, Car, Award, Bell, AlertTriangle,
    Receipt, Phone, MapPin
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import LocationPermission from "@/components/auth/LocationPermission";
import AccessCheck from "@/components/auth/AccessCheck";

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

    const menuItems = [
        {
            title: "Comprovantes Internos",
            description: "Gerenciar comprovantes",
            icon: FileText,
            href: "ComprovantesInternos",
            color: "from-sky-400 to-cyan-500"
        },
        {
            title: "Nota Depósito",
            description: "Registrar notas",
            icon: Receipt,
            href: "NotaDeposito",
            color: "from-violet-400 to-purple-500"
        },
        {
            title: "Coletas Diárias",
            description: "Visualizar coletas",
            icon: Calendar,
            href: "ColetasDiarias",
            color: "from-sky-400 to-blue-500"
        },
        {
            title: "Ordens de Coleta",
            description: "Criar e gerenciar ordens",
            icon: Package,
            href: "OrdensColeta",
            color: "from-blue-400 to-indigo-500"
        },
        {
            title: "Romaneios/Entregas",
            description: "Gerenciar entregas",
            icon: Truck,
            href: "Romaneios",
            color: "from-cyan-400 to-teal-500"
        },
        {
            title: "Rotas GPS",
            description: "Navegação de entregas",
            icon: Navigation,
            href: "RotasGPS",
            color: "from-emerald-400 to-green-500"
        },
        {
            title: "Clientes",
            description: "Remetentes e destinatários",
            icon: Users,
            href: "Clientes",
            color: "from-teal-400 to-cyan-500"
        },
        {
            title: "Colaboradores",
            description: "Cadastro de motoristas",
            icon: User,
            href: "Motoristas",
            color: "from-amber-400 to-orange-500"
        },
        {
            title: "Veículos",
            description: "Gestão da frota",
            icon: Car,
            href: "Veiculos",
            color: "from-cyan-400 to-sky-500"
        },
        {
            title: "Rastreamento",
            description: "Localização em tempo real",
            icon: Navigation,
            href: "Rastreamento",
            color: "from-green-400 to-emerald-500"
        },
        {
            title: "Relatórios",
            description: "Consultar e exportar",
            icon: FileText,
            href: "Relatorios",
            color: "from-indigo-400 to-violet-500"
        },
        {
            title: "Configurações",
            description: "Personalizar sistema",
            icon: Settings,
            href: "Configuracoes",
            color: "from-slate-400 to-slate-500"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
            {/* Location Permission */}
            {!locationGranted && (
                <LocationPermission onPermissionGranted={handleLocationGranted} />
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 text-white">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {config.logo_url ? (
                            <img src={config.logo_url} alt="Logo" className="h-24 md:h-28 object-contain bg-white/20 p-3 rounded-2xl" />
                        ) : (
                            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                                <Truck className="w-16 h-16" />
                            </div>
                        )}
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl font-bold">
                                {config.nome_empresa || "Controle TWG"}
                            </h1>
                            <p className="text-sky-100 mt-1 text-sm">Gestão de ordens de coleta e transportes</p>
                            {(config.endereco || config.telefone) && (
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 text-xs text-sky-100">
                                    {config.endereco && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {config.endereco}
                                        </span>
                                    )}
                                    {config.telefone && (
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {config.telefone}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
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

                {/* Quick Access Menu */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {menuItems.map((item, index) => (
                        <Link key={index} to={createPageUrl(item.href)}>
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden group h-full">
                                <div className={`h-1.5 bg-gradient-to-r ${item.color}`} />
                                <CardContent className="p-4">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} text-white shadow-lg flex items-center justify-center mb-3`}>
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                                    <p className="text-slate-500 text-sm mt-1">{item.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}