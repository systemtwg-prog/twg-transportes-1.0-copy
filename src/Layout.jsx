import React, { useEffect, useState } from "react";
import FloatingMenu from "@/components/navigation/FloatingMenu";
import BottomTabBar from "@/components/navigation/BottomTabBar";
import DesktopSidebar from "@/components/navigation/DesktopSidebar";
import DesktopTabs from "@/components/navigation/DesktopTabs";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Layout({ children, currentPageName }) {
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    // Redirecionar para HomeDesktop no desktop se necessário
    useEffect(() => {
        if (isDesktop && !currentPageName) {
            navigate(createPageUrl("HomeDesktop"));
        }
    }, [isDesktop, currentPageName, navigate]);

    useEffect(() => {
        const collapsed = localStorage.getItem("sidebarCollapsed");
        if (collapsed === "true") {
            setSidebarCollapsed(true);
        }
    }, []);

    useEffect(() => {
        const checkDevice = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        
        window.addEventListener("resize", checkDevice);
        return () => window.removeEventListener("resize", checkDevice);
    }, []);

    const handleTabChange = (pageId) => {
        navigate(createPageUrl(pageId));
    };

    const handleToggleSidebar = () => {
        const newValue = !sidebarCollapsed;
        setSidebarCollapsed(newValue);
        localStorage.setItem("sidebarCollapsed", String(newValue));
    };

    const handleNewTab = () => {
        // Abre o menu lateral se estiver colapsado
        if (sidebarCollapsed) {
            setSidebarCollapsed(false);
            localStorage.setItem("sidebarCollapsed", "false");
        }
    };

    // Layout Desktop com Sidebar e Tabs - Força exibição correta
    if (isDesktop) {
        return (
            <div className="h-screen flex overflow-hidden" style={{ width: '100vw', height: '100vh' }}>
                <DesktopSidebar 
                    currentPage={currentPageName} 
                    collapsed={sidebarCollapsed}
                    onToggle={handleToggleSidebar}
                />
                <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
                    <DesktopTabs 
                        currentPage={currentPageName}
                        onTabChange={handleTabChange}
                        onNewTab={handleNewTab}
                    />
                    <main className="flex-1 overflow-auto bg-slate-100">
                        {children}
                    </main>
                    {/* Rodapé Global */}
                    <footer className="bg-slate-900 text-slate-400 text-center py-2 px-4 text-[10px] leading-relaxed border-t border-slate-700 flex-shrink-0">
                        <p>© 2026 Loggxy Sistema de Gestão – Todos os direitos reservados. | Este software é de propriedade exclusiva da LOGGXY SISTEMA DE GESTÃO, CNPJ 63.700.987/0001-77. | Licenciado para uso, não vendido.</p>
                    </footer>
                </div>
            </div>
        );
    }

    // Layout Mobile com menu flutuante e abas inferiores
    return (
        <div className="min-h-screen pb-20 flex flex-col">
            <FloatingMenu currentPage={currentPageName} />
            <main className="p-4 pb-20 flex-1">
                {children}
            </main>
            <BottomTabBar 
                currentPage={currentPageName} 
                onMenuClick={() => setMenuOpen(!menuOpen)}
            />
            {/* Rodapé Global */}
            <footer className="bg-slate-900 text-slate-400 text-center py-3 px-4 text-[10px] leading-relaxed border-t border-slate-700">
                <p>© 2026 Loggxy Sistema de Gestão – Todos os direitos reservados.</p>
                <p>Este software é de propriedade exclusiva da LOGGXY SISTEMA DE GESTÃO, CNPJ 63.700.987/0001-77.</p>
                <p className="text-slate-500 mt-1">Licenciado para uso, não vendido.</p>
            </footer>
        </div>
    );
}