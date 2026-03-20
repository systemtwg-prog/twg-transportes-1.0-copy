import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
    Menu, Home, Package, FileText, Users, User, Car, 
    Navigation, Award, Settings, LayoutGrid, UserCheck, LogOut, Bell, HomeIcon, Search, Database, Printer, Mail,
    Camera, ClipboardList, AlertTriangle, Upload, Truck, Building2, DollarSign
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const menuItems = [
    { name: "Home", href: "Home", icon: Home, category: "principal" },
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

export default function FloatingMenu({ currentPage }) {
    const [open, setOpen] = React.useState(false);

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
        sessionStorage.removeItem("appUnlocked");
        if (confirm("Deseja realmente sair do sistema?")) {
            base44.auth.logout();
        }
    };

    return (
        <>
        <div className="fixed top-4 left-4 z-50 flex gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button 
                        size="icon" 
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                    >
                        <Menu className="w-6 h-6 text-white" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 bg-gradient-to-b from-slate-900 to-slate-800 border-0 p-0">
                    <div className="p-4 border-b border-white/10 flex items-center gap-3">
                        <img 
                            src="https://media.base44.com/images/public/695fa57f97d202e8a22b02c0/1858ed22e_WhatsAppImage2026-03-20at125657.jpg" 
                            alt="Loggxy" 
                            className="h-10 object-contain flex-shrink-0" 
                        />
                        <div>
                            <h2 className="font-bold text-lg text-white leading-tight">Loggxy</h2>
                            <p className="text-xs text-slate-400">Gestão de Transportes</p>
                        </div>
                    </div>
                    <nav className="p-4 overflow-y-auto max-h-[calc(100vh-140px)]">
                        {categories.map((cat) => {
                            const items = menuFiltrado.filter(m => m.category === cat.id);
                            if (items.length === 0) return null;
                            
                            return (
                                <div key={cat.id} className="mb-4">
                                    <p className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        {cat.name}
                                    </p>
                                    <div className="space-y-1 mt-1">
                                        {items.map((item) => (
                                            <Link
                                                key={item.href}
                                                to={createPageUrl(item.href)}
                                                onClick={() => setOpen(false)}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                                    currentPage === item.href
                                                        ? "bg-blue-600 text-white shadow-lg"
                                                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                                                }`}
                                            >
                                                <item.icon className="w-5 h-5" />
                                                <span className="font-medium text-sm">{item.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-400 hover:bg-red-500/20 hover:text-red-300 w-full mt-4 border-t border-white/10 pt-4"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Sair do Sistema</span>
                        </button>
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
        </>
    );
}