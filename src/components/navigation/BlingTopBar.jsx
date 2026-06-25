import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
    Home, FileText, Users, Package, Car, ClipboardList, 
    Settings, LayoutGrid, UserCheck, Bell, LogOut, 
    Search, ChevronDown, Menu, PanelLeft, ExternalLink, Info, Key,
    Sun, Moon
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const menuItems = [
    { name: "Início", href: "HomeDesktop", icon: Home },
    { name: "CTEs", href: "CTEs", icon: FileText },
    { name: "Coletas", href: "ColetasDiarias", icon: Package },
    { name: "Ordens", href: "OrdensColeta", icon: ClipboardList },
    { name: "Notas Fiscais", href: "NotasFiscais", icon: FileText },
    { name: "Romaneios", href: "RomaneiosGerados", icon: Package },
    { name: "Precificação", href: "Precificacao", icon: FileText },
    { name: "Clientes", href: "Clientes", icon: Users },
    { name: "Veículos", href: "Veiculos", icon: Car },
];

const adminItems = [
    { name: "Configurações", href: "Configuracoes", icon: Settings },
    { name: "Usuários", href: "AprovacaoUsuarios", icon: UserCheck },
    { name: "Backup", href: "Backup", icon: Settings },
    { name: "Config. Módulos", href: "ConfiguracaoModulos", icon: LayoutGrid },
    { name: "Config. Proprietário", href: "ConfiguracoesProprietario", icon: Key },
    { name: "Sobre", href: "Sobre", icon: Info },
];

export default function BlingTopBar({ currentPage, onSwitchToSidebar, isDark, onToggleTheme }) {
    const navigate = useNavigate();
    const [searchOpen, setSearchOpen] = useState(false);

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: async () => {
            try { return await base44.auth.me(); } catch { return null; }
        }
    });

    const { data: config } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: async () => {
            try { return await base44.entities.Configuracoes.list(); } catch { return []; }
        }
    });

    const isAdmin = currentUser?.role === "admin";
    const isProprietario = currentUser?.role === "proprietario" || currentUser?.tipo_usuario === "proprietario";

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

    const cfg = config?.[0] || {};

    return (
        <div className="flex flex-col flex-shrink-0">
            {/* Barra Superior Principal */}
            <div className="bg-slate-900 border-b border-slate-700 h-14 flex items-center px-4 gap-3">
                {/* Botão Sidebar */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSwitchToSidebar}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
                    title="Alternar para menu lateral"
                >
                    <PanelLeft className="w-4 h-4" />
                </Button>

                {/* Logo + Nome */}
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                    <img 
                        src="https://media.base44.com/images/public/695fa57f97d202e8a22b02c0/c61d7fba4_file_000000008b4c71f58992067827d28857.png" 
                        alt="Loggxy" 
                        className="h-8 w-8 object-contain rounded-lg" 
                    />
                    <div className="hidden md:block min-w-0">
                        <span className="text-white font-bold text-xs truncate">Loggxy</span>
                        <span className="text-slate-400 text-[9px] block truncate">Gestão de Transportes</span>
                    </div>
                </div>

                {/* Navegação Principal - Links horizontais */}
                <nav className="hidden lg:flex items-center gap-0.5 ml-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.href}
                            onClick={() => handleNavigate(item.href)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                                currentPage === item.href
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                            }`}
                        >
                            <item.icon className="w-3.5 h-3.5 inline mr-1" />
                            {item.name}
                        </button>
                    ))}
                </nav>

                {/* Dropdown "Mais" para mobile e itens extras */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="lg:hidden text-slate-300 hover:text-white hover:bg-slate-700">
                            <Menu className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 bg-slate-800 border-slate-700">
                        {menuItems.map((item) => (
                            <DropdownMenuItem 
                                key={item.href}
                                onClick={() => handleNavigate(item.href)}
                                className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                            >
                                <item.icon className="w-4 h-4 mr-2" />
                                {item.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Espaçador */}
                <div className="flex-1" />

                {/* Área Direita: Busca, Notificações, Admin, Usuário */}
                <div className="flex items-center gap-1">
                    {/* Tema Claro/Escuro */}
                    {onToggleTheme && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggleTheme}
                            className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8"
                            title={isDark ? "Modo claro" : "Modo escuro"}
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </Button>
                    )}

                    {/* Busca */}
                    {searchOpen ? (
                        <div className="flex items-center">
                            <input
                                autoFocus
                                placeholder="Buscar..."
                                className="bg-slate-700 text-white text-xs px-3 py-1.5 rounded-l-md border-0 outline-none w-40"
                                onBlur={() => setSearchOpen(false)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") setSearchOpen(false);
                                }}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSearchOpen(false)}
                                className="h-8 w-8 rounded-l-none bg-slate-700 text-slate-400"
                            >
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSearchOpen(true)}
                            className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8"
                        >
                            <Search className="w-4 h-4" />
                        </Button>
                    )}

                    {/* Notificações */}
                    <NotificationBell />

                    {/* Admin Dropdown */}
                    {(isAdmin || isProprietario) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-700">
                                    <Settings className="w-4 h-4" />
                                    <span className="hidden md:inline ml-1 text-xs">Admin</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
                                {adminItems
                                    .filter(item => {
                                        if (item.href === "ConfiguracaoModulos" && !isProprietario) return false;
                                        if (item.href === "ConfiguracoesProprietario" && !isProprietario) return false;
                                        return true;
                                    })
                                    .map((item) => (
                                        <DropdownMenuItem 
                                            key={item.href}
                                            onClick={() => handleNavigate(item.href)}
                                            className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                                        >
                                            <item.icon className="w-4 h-4 mr-2" />
                                            {item.name}
                                        </DropdownMenuItem>
                                    ))
                                }
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Usuário / Sair */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-700">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                    {(currentUser?.full_name || "U")[0].toUpperCase()}
                                </div>
                                <span className="hidden md:inline ml-1 text-xs">{currentUser?.full_name || "Usuário"}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
                            <div className="px-3 py-2 border-b border-slate-700">
                                <p className="text-white text-sm font-medium">{currentUser?.full_name}</p>
                                <p className="text-slate-400 text-xs">{currentUser?.email}</p>
                            </div>
                            {/* Apps Externos */}
                            <DropdownMenuItem 
                                onClick={() => window.open("https://gestor-cte-copy-29b2bb80.base44.app/", "_blank")}
                                className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Gestor CTE
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => window.open("https://gestortwg.base44.app/", "_blank")}
                                className="text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                TX Separação
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={handleLogout}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Barra de Abas */}
            <div className="bg-slate-800 flex items-center h-9 px-2 gap-1 overflow-x-auto border-b border-slate-700">
                <button
                    onClick={() => handleNavigate("HomeDesktop")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-t-md text-xs transition-all whitespace-nowrap ${
                        currentPage === "HomeDesktop" || currentPage === "Home"
                            ? "bg-slate-100 text-slate-800"
                            : "text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                >
                    <Home className="w-3.5 h-3.5" />
                    Início
                </button>
            </div>
        </div>
    );
}