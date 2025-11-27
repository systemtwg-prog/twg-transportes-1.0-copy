import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
    Menu, Home, Package, FileText, Users, User, Car, 
    Navigation, Award, Settings, LayoutGrid, UserCheck, ArrowLeft, LogOut
} from "lucide-react";

const menuItems = [
    { name: "Home", href: "Home", icon: Home },
    { name: "Comprovantes de Entrega", href: "ComprovantesInternos", icon: FileText },
    { name: "Nota Depósito", href: "NotaDeposito", icon: FileText },
    { name: "Coletas Diárias", href: "ColetasDiarias", icon: FileText },
    { name: "Ordens de Coleta", href: "OrdensColeta", icon: Package },
    { name: "Adicionar Coletas", href: "AdicionarColetaDiaria", icon: Package },
    { name: "Romaneios/Entregas", href: "Romaneios", icon: Package },
    { name: "Rotas GPS", href: "RotasGPS", icon: Navigation },
    { name: "Notas Fiscais", href: "NotasFiscais", icon: FileText },
    { name: "Máscara Romaneio", href: "MascaraRomaneio", icon: FileText },
    { name: "Romaneios Gerados", href: "RomaneiosGerados", icon: Package },
    { name: "Clientes", href: "Clientes", icon: Users },
    { name: "Transportadoras", href: "Transportadoras", icon: Package },
    { name: "Colaboradores", href: "Motoristas", icon: User },
    { name: "Veículos", href: "Veiculos", icon: Car },
    { name: "Rastreamento", href: "Rastreamento", icon: Navigation },
    { name: "Comprovantes", href: "Comprovantes", icon: FileText },
    { name: "Avisos", href: "Avisos", icon: Home },
    { name: "Relatórios", href: "Relatorios", icon: FileText },
    { name: "Performance", href: "RelatorioMotoristas", icon: Award },
    { name: "Configurações", href: "Configuracoes", icon: Settings },
    { name: "Gerenciar Usuários", href: "AprovacaoUsuarios", icon: UserCheck },
    { name: "Backup", href: "Backup", icon: LayoutGrid },
    { name: "Personalizar Home", href: "PersonalizarHome", icon: LayoutGrid },
    { name: "Importar Documentos", href: "ImportacaoDocumentos", icon: FileText },
];

export default function FloatingMenu({ currentPage }) {
    const [open, setOpen] = React.useState(false);

    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = createPageUrl("Home");
        }
    };

    const handleLogout = () => {
        if (confirm("Deseja realmente sair do sistema?")) {
            base44.auth.logout();
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 flex gap-2">
            {currentPage !== "Home" && (
                <Button 
                    size="icon" 
                    onClick={handleBack}
                    className="w-12 h-12 rounded-full bg-slate-600 hover:bg-slate-700 shadow-lg"
                >
                    <ArrowLeft className="w-6 h-6 text-white" />
                </Button>
            )}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button 
                        size="icon" 
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                    >
                        <Menu className="w-6 h-6 text-white" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 border-0 p-0">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="font-bold text-xl text-white">Menu</h2>
                        <p className="text-sm text-slate-400">Navegação rápida</p>
                    </div>
                    <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-100px)]">
                        {menuItems.map((item) => (
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
                                        <span className="font-medium">{item.name}</span>
                                    </Link>
                                ))}
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
    );
}