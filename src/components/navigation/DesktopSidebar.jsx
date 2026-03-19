import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Home, Package, FileText, Users, User, Car, 
    Navigation, Award, Settings, LayoutGrid, UserCheck, LogOut, Bell, 
    Search, Database, Printer, ChevronLeft, ChevronRight, Truck, Building2,
    Camera, ClipboardList, AlertTriangle, Upload, Mail, FileText as FileTextIcon, DollarSign
} from "lucide-react";

const menuItems = [
    { name: "Início", href: "HomeDesktop", icon: Home, category: "principal" },
    { name: "Comprovantes Entrega", href: "ComprovantesEntrega", icon: Upload, category: "operacional" },
    { name: "CTEs", href: "CTEs", icon: FileText, category: "operacional" },
    { name: "Coletas Diárias", href: "ColetasDiarias", icon: Package, category: "operacional" },
    { name: "Adicionar Coletas", href: "AdicionarColetaDiaria", icon: Package, category: "operacional" },
    { name: "Ordens de Coleta", href: "OrdensColeta", icon: ClipboardList, category: "operacional" },
    { name: "Notas Fiscais", href: "NotasFiscais", icon: FileText, category: "documentos" },
    { name: "Máscara Romaneio", href: "MascaraRomaneio", icon: Truck, category: "documentos" },
    { name: "Romaneios Gerados", href: "RomaneiosGerados", icon: Package, category: "documentos" },
    { name: "Serviços S/NF", href: "ServicosSNF", icon: FileText, category: "documentos" },
    { name: "Precificação", href: "Precificacao", icon: DollarSign, category: "documentos" },
    { name: "Clientes", href: "Clientes", icon: Users, category: "cadastros" },
    { name: "Destinatários", href: "Destinatarios", icon: Users, category: "cadastros" },
    { name: "Transportadoras", href: "Transportadoras", icon: Building2, category: "cadastros" },
    { name: "Colaboradores", href: "Motoristas", icon: User, category: "cadastros" },
    { name: "Veículos", href: "Veiculos", icon: Car, category: "cadastros" },
    { name: "Avisos", href: "Avisos", icon: Bell, category: "admin" },
    { name: "Configurações", href: "Configuracoes", icon: Settings, category: "admin" },
    { name: "Gerenciar Usuários", href: "AprovacaoUsuarios", icon: UserCheck, category: "admin" },
    { name: "Backup", href: "Backup", icon: Database, category: "admin" },
    { name: "Config. Módulos", href: "ConfiguracaoModulos", icon: LayoutGrid, category: "admin" },

];

const categories = [
    { id: "principal", name: "Principal" },
    { id: "operacional", name: "Operacional" },
    { id: "documentos", name: "Documentos" },
    { id: "cadastros", name: "Cadastros" },
    { id: "monitoramento", name: "Monitoramento" },
    { id: "ferramentas", name: "Ferramentas" },
    { id: "relatorios", name: "Relatórios" },
    { id: "admin", name: "Administração" },
];

export default function DesktopSidebar({ currentPage, collapsed, onToggle }) {
    const navigate = useNavigate();

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: async () => {
            try {
                return await base44.auth.me();
            } catch {
                return null;
            }
        }
    });

    const { data: config } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: async () => {
            try {
                return await base44.entities.Configuracoes.list();
            } catch {
                return [];
            }
        }
    });

    const isAdmin = currentUser?.role === "admin";
    const menuFiltrado = menuItems.filter(item => 
        (item.href !== "AprovacaoUsuarios" && item.href !== "ConfiguracaoModulos") || isAdmin
    );

    const handleLogout = () => {
        if (confirm("Deseja realmente sair do sistema?")) {
            sessionStorage.clear();
            localStorage.clear();
            base44.auth.logout(window.location.origin);
        }
    };

    const handleNavigate = (href) => {
        navigate(createPageUrl(href));
    };

    if (collapsed) {
        return (
            <div className="w-14 bg-slate-900 flex flex-col h-full border-r border-slate-700">
                <div className="p-2 border-b border-slate-700 flex justify-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
                <ScrollArea className="flex-1 py-1">
                    {menuFiltrado.map((item) => (
                        <button
                            key={item.href}
                            onClick={() => handleNavigate(item.href)}
                            className={`w-full p-2 flex justify-center transition-all ${
                                currentPage === item.href
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                            title={item.name}
                        >
                            <item.icon className="w-4 h-4" />
                        </button>
                    ))}
                </ScrollArea>
                <div className="p-2 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="w-full p-2 flex justify-center text-red-400 hover:bg-red-500/20 rounded-lg"
                        title="Sair"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-56 bg-slate-900 flex flex-col h-full border-r border-slate-700">
            <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    {config?.[0]?.logo_url && (
                        <img src={config[0].logo_url} alt="Logo" className="h-7 object-contain flex-shrink-0" />
                    )}
                    <span className="text-white font-semibold text-xs truncate">
                        {config?.[0]?.nome_empresa || "Sistema"}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 h-7 w-7 flex-shrink-0"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
            </div>
            
            <ScrollArea className="flex-1">
                <div className="py-2">
                    {categories.map((cat) => {
                        const items = menuFiltrado.filter(m => m.category === cat.id);
                        if (items.length === 0) return null;
                        
                        return (
                            <div key={cat.id} className="mb-1">
                                <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                    {cat.name}
                                </p>
                                {items.map((item) => (
                                    <button
                                        key={item.href}
                                        onClick={() => handleNavigate(item.href)}
                                        className={`w-full px-3 py-1.5 flex items-center gap-2 transition-all text-xs ${
                                            currentPage === item.href
                                                ? "bg-blue-600 text-white"
                                                : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                        }`}
                                    >
                                        <item.icon className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate">{item.name}</span>
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
            
            <div className="p-2 border-t border-slate-700">
                <button
                    onClick={handleLogout}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs">Sair</span>
                </button>
            </div>
        </div>
    );
}