import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Menu, Home, Package, FileText, Users, User, Car, 
    Navigation, Award, Settings, LayoutGrid, UserCheck, LogOut, Bell, 
    Search, Database, Printer, ChevronLeft, ChevronRight, Truck, Building2,
    Camera, ClipboardList, AlertTriangle, Upload, MessageCircle
} from "lucide-react";

const menuItems = [
    { name: "Início", href: "HomeDesktop", icon: Home, category: "principal" },
    { name: "Nota Depósito", href: "NotaDeposito", icon: Camera, category: "operacional" },
    { name: "Comprovantes Entrega", href: "ComprovantesInternos", icon: Upload, category: "operacional" },
    { name: "Comprovantes CTEs", href: "ComprovantesCtes", icon: FileText, category: "operacional" },
    { name: "Coletas Diárias", href: "ColetasDiarias", icon: Package, category: "operacional" },
    { name: "Adicionar Coletas", href: "AdicionarColetaDiaria", icon: Package, category: "operacional" },
    { name: "Ordens de Coleta", href: "OrdensColeta", icon: ClipboardList, category: "operacional" },
    { name: "Notas Fiscais", href: "NotasFiscais", icon: FileText, category: "documentos" },
    { name: "Máscara Romaneio", href: "MascaraRomaneio", icon: Truck, category: "documentos" },
    { name: "Romaneios Gerados", href: "RomaneiosGerados", icon: Package, category: "documentos" },
    { name: "Impressão Relatório", href: "ImpressaoRelatorio", icon: Printer, category: "documentos" },
    { name: "Serviços S/NF", href: "ServicosSNF", icon: FileText, category: "documentos" },
    { name: "Clientes", href: "Clientes", icon: Users, category: "cadastros" },
    { name: "Clientes S/NF", href: "ClientesSNF", icon: Users, category: "cadastros" },
    { name: "Transportadoras", href: "Transportadoras", icon: Building2, category: "cadastros" },
    { name: "Colaboradores", href: "Motoristas", icon: User, category: "cadastros" },
    { name: "Veículos", href: "Veiculos", icon: Car, category: "cadastros" },
    { name: "Rotas GPS", href: "RotasGPS", icon: Navigation, category: "monitoramento" },
    { name: "Rastreamento", href: "Rastreamento", icon: Navigation, category: "monitoramento" },
    { name: "Busca Multas", href: "BuscaMultas", icon: AlertTriangle, category: "monitoramento" },
    { name: "Extrator Google", href: "ExtratorGoogle", icon: Search, category: "ferramentas" },
    { name: "Importar Documentos", href: "ImportacaoDocumentos", icon: Upload, category: "ferramentas" },
    { name: "Relatórios", href: "Relatorios", icon: FileText, category: "relatorios" },
    { name: "Performance", href: "RelatorioMotoristas", icon: Award, category: "relatorios" },
    { name: "Avisos", href: "Avisos", icon: Bell, category: "admin" },
    { name: "Configurações", href: "Configuracoes", icon: Settings, category: "admin" },
    { name: "Gerenciar Usuários", href: "AprovacaoUsuarios", icon: UserCheck, category: "admin" },
    { name: "Backup", href: "Backup", icon: Database, category: "admin" },
    { name: "Personalizar Home", href: "PersonalizarHome", icon: LayoutGrid, category: "admin" },
    { name: "Config. Módulos", href: "ConfiguracaoModulos", icon: LayoutGrid, category: "admin" },
    { name: "WhatsApp Web", href: "WhatsAppWeb", icon: MessageCircle, category: "comunicacao" },
];

const categories = [
    { id: "principal", name: "Principal" },
    { id: "operacional", name: "Operacional" },
    { id: "documentos", name: "Documentos" },
    { id: "cadastros", name: "Cadastros" },
    { id: "monitoramento", name: "Monitoramento" },
    { id: "comunicacao", name: "Comunicação" },
    { id: "ferramentas", name: "Ferramentas" },
    { id: "relatorios", name: "Relatórios" },
    { id: "admin", name: "Administração" },
];

export default function DesktopSidebar({ currentPage, collapsed, onToggle }) {
    const navigate = useNavigate();

    const { data: config } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    // Se não houver módulos configurados, mostrar todos
    const modulosAtivos = config?.[0]?.modulos_ativos;
    const menuFiltrado = modulosAtivos && modulosAtivos.length > 0 
        ? menuItems.filter(item => modulosAtivos.includes(item.href) || item.href === "HomeDesktop")
        : menuItems;

    const handleLogout = () => {
        sessionStorage.removeItem("appUnlocked");
        sessionStorage.removeItem("desktopTabs");
        if (confirm("Deseja realmente sair do sistema?")) {
            base44.auth.logout();
        }
    };

    const handleNavigate = (href) => {
        navigate(createPageUrl(href));
    };

    if (collapsed) {
        return (
            <div className="w-16 bg-slate-900 flex flex-col h-full border-r border-slate-700">
                <div className="p-3 border-b border-slate-700 flex justify-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
                <ScrollArea className="flex-1 py-2">
                    {menuFiltrado.slice(0, 15).map((item) => (
                        <button
                            key={item.href}
                            onClick={() => handleNavigate(item.href)}
                            className={`w-full p-3 flex justify-center transition-all ${
                                currentPage === item.href
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                            title={item.name}
                        >
                            <item.icon className="w-5 h-5" />
                        </button>
                    ))}
                </ScrollArea>
                <div className="p-3 border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="w-full p-2 flex justify-center text-red-400 hover:bg-red-500/20 rounded-lg"
                        title="Sair"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-60 bg-slate-900 flex flex-col h-full border-r border-slate-700">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {config?.[0]?.logo_url && (
                        <img src={config[0].logo_url} alt="Logo" className="h-8 object-contain" />
                    )}
                    <span className="text-white font-semibold text-sm truncate">
                        {config?.[0]?.nome_empresa || "Sistema"}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
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
                            <div key={cat.id} className="mb-2">
                                <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {cat.name}
                                </p>
                                {items.map((item) => (
                                    <button
                                        key={item.href}
                                        onClick={() => handleNavigate(item.href)}
                                        className={`w-full px-4 py-2 flex items-center gap-3 transition-all text-sm ${
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
            
            <div className="p-3 border-t border-slate-700">
                <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 flex items-center gap-3 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm">Sair do Sistema</span>
                </button>
            </div>
        </div>
    );
}