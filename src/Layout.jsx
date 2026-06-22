import React, { useEffect, useState } from "react";
import FloatingMenu from "@/components/navigation/FloatingMenu";
import BottomTabBar from "@/components/navigation/BottomTabBar";
import DesktopSidebar from "@/components/navigation/DesktopSidebar";
import DesktopTabs from "@/components/navigation/DesktopTabs";
import BlingTopBar from "@/components/navigation/BlingTopBar";
import LicenseStatusBadge from "@/components/shared/LicenseStatusBadge";
import NotificationBell from "@/components/notifications/NotificationBell";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Layout({ children, currentPageName }) {
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [useBlingMode, setUseBlingMode] = useState(false);
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "dark") return true;
        if (saved === "light") return false;
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });
    const navigate = useNavigate();

    // Aplicar tema ao elemento html
    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDark);
        localStorage.setItem("theme", isDark ? "dark" : "light");
    }, [isDark]);

    const toggleTheme = () => setIsDark(prev => !prev);

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
        const blingMode = localStorage.getItem("useBlingMode");
        if (blingMode === "true") {
            setUseBlingMode(true);
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
        if (sidebarCollapsed) {
            setSidebarCollapsed(false);
            localStorage.setItem("sidebarCollapsed", "false");
        }
    };

    const handleSwitchToBling = () => {
        setUseBlingMode(true);
        localStorage.setItem("useBlingMode", "true");
    };

    const handleSwitchToSidebar = () => {
        setUseBlingMode(false);
        localStorage.setItem("useBlingMode", "false");
    };

    // Rodapé compartilhado (apenas na Home)
    const FooterBar = () => (
        <footer className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-2 px-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-[10px] leading-relaxed">© 2026 Loggxy Sistema de Gestão – Todos os direitos reservados. | Este software é de propriedade exclusiva da LOGGXY SISTEMA DE GESTÃO, CNPJ 63.700.987/0001-77.</p>
                <div className="flex items-center gap-2">
                    <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                    <NotificationBell />
                    <LicenseStatusBadge />
                </div>
            </div>
        </footer>
    );

    const showFooter = currentPageName === "Home";

    // Layout Desktop
    if (isDesktop) {
        // Modo Bling (barra superior)
        if (useBlingMode) {
            return (
                <div className="h-screen flex flex-col overflow-hidden" style={{ width: '100vw', height: '100vh' }}>
                    <BlingTopBar 
                        currentPage={currentPageName}
                        onSwitchToSidebar={handleSwitchToSidebar}
                        isDark={isDark}
                        onToggleTheme={toggleTheme}
                    />
                    <main className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-100">
                        {children}
                    </main>
                    {showFooter && <FooterBar />}
                </div>
            );
        }

        // Modo Sidebar (padrão)
        return (
            <div className="h-screen flex overflow-hidden" style={{ width: '100vw', height: '100vh' }}>
                <DesktopSidebar 
                    currentPage={currentPageName} 
                    collapsed={sidebarCollapsed}
                    onToggle={handleToggleSidebar}
                    onSwitchToBling={handleSwitchToBling}
                />
                <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
                    <DesktopTabs 
                        currentPage={currentPageName}
                        onTabChange={handleTabChange}
                        onNewTab={handleNewTab}
                    />
                    <main className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-100">
                        {children}
                    </main>
                    {showFooter && <FooterBar />}
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
            {/* Rodapé Global Mobile (apenas na Home) */}
            {showFooter && (
                <footer className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-3 px-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-[10px] leading-relaxed text-center">© 2026 Loggxy Sistema de Gestão – Todos os direitos reservados. | Este software é de propriedade exclusiva da LOGGXY SISTEMA DE GESTÃO, CNPJ 63.700.987/0001-77.</p>
                        <div className="flex items-center gap-2">
                            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                            <NotificationBell />
                            <LicenseStatusBadge />
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}