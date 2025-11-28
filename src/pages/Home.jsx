import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
    Truck, Package, FileText, MapPin, Users, Car, 
    ClipboardList, Settings, BarChart3, Calendar,
    Navigation, Building2, Bell, Upload
} from "lucide-react";

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

    const isAdmin = currentUser?.role === "admin";

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
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    {config.logo_url && (
                        <img src={config.logo_url} alt="Logo" className="h-16 mx-auto mb-4" />
                    )}
                    <h1 className="text-3xl font-bold text-slate-800">
                        {config.nome_empresa || "Sistema de Transportes"}
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Olá, {currentUser?.full_name || "Usuário"}!
                    </p>
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

                {/* Menu Principal */}
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