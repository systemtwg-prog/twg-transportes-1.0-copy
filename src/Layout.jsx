import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { 
    Package, Users, FileText, Home, Menu, Truck, 
    Settings, User, Navigation, Award, Car, LayoutGrid, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import FloatingMenu from "@/components/navigation/FloatingMenu";

export default function Layout({ children, currentPageName }) {
    const [open, setOpen] = React.useState(false);

    const navItems = [
        { name: "Home", href: "Home", icon: Home },
        { name: "Ordens de Coleta", href: "OrdensColeta", icon: Package },
        { name: "Adicionar Coletas", href: "AdicionarColetaDiaria", icon: Package },
        { name: "Coletas Diárias", href: "ColetasDiarias", icon: FileText },
        { name: "Romaneios/Entregas", href: "Romaneios", icon: Truck },
        { name: "Rotas GPS", href: "RotasGPS", icon: Navigation },
        { name: "Nota Depósito", href: "NotaDeposito", icon: FileText },
        { name: "Clientes", href: "Clientes", icon: Users },
        { name: "Colaboradores", href: "Motoristas", icon: User },
        { name: "Veículos", href: "Veiculos", icon: Car },
        { name: "Rastreamento", href: "Rastreamento", icon: Navigation },
        { name: "Comprovantes", href: "Comprovantes", icon: FileText },
        { name: "Comprovantes Internos", href: "ComprovantesInternos", icon: FileText },
        { name: "Avisos", href: "Avisos", icon: Package },
        { name: "Relatórios", href: "Relatorios", icon: FileText },
        { name: "Performance", href: "RelatorioMotoristas", icon: Award },
        { name: "Configurações", href: "Configuracoes", icon: Settings },
        { name: "Usuários", href: "AprovacaoUsuarios", icon: UserCheck },
        { name: "Personalizar Home", href: "PersonalizarHome", icon: LayoutGrid }
    ];

    const NavLinks = ({ onClick }) => (
        <>
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    to={createPageUrl(item.href)}
                    onClick={onClick}
                    className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        currentPageName === item.href
                            ? "bg-blue-600 text-white shadow-lg"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                </Link>
            ))}
        </>
    );

    // Páginas sem layout (mas com menu flutuante)
    if (currentPageName === "Home" || currentPageName === "AtualizarLocalizacao") {
        return (
            <>
                <FloatingMenu currentPage={currentPageName} />
                {children}
            </>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-xl z-40">
                <div className="p-6 border-b border-white/10">
                    <Link to={createPageUrl("Home")} className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl">
                            <Truck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-white text-lg">Controle TWG</h1>
                            <p className="text-xs text-slate-400">Gestão de transportes</p>
                        </div>
                    </Link>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <NavLinks />
                </nav>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg z-40 flex items-center justify-between px-4">
                <Link to={createPageUrl("Home")} className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-600 rounded-lg">
                        <Truck className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-white">Controle TWG</span>
                </Link>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                            <Menu className="w-6 h-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 border-0 p-0">
                        <div className="p-6 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-xl">
                                    <Truck className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-white">Controle TWG</h1>
                                    <p className="text-xs text-slate-400">Gestão de transportes</p>
                                </div>
                            </div>
                        </div>
                        <nav className="p-4 space-y-1">
                            <NavLinks onClick={() => setOpen(false)} />
                        </nav>
                    </SheetContent>
                </Sheet>
            </header>

            {/* Floating Menu for all pages */}
            <FloatingMenu currentPage={currentPageName} />

            {/* Main Content */}
            <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
                {children}
            </main>
        </div>
    );
}