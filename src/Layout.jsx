import React, { useEffect, useState } from "react";
import FloatingMenu from "@/components/navigation/FloatingMenu";
import DesktopSidebar from "@/components/navigation/DesktopSidebar";
import DesktopTabs from "@/components/navigation/DesktopTabs";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BiometricLock from "@/components/auth/BiometricLock";

export default function Layout({ children, currentPageName }) {
    const [isDesktop, setIsDesktop] = useState(null);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [checkingBiometric, setCheckingBiometric] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const navigate = useNavigate();

    // Verificar se já desbloqueou nesta sessão
    useEffect(() => {
        const unlocked = sessionStorage.getItem("appUnlocked");
        if (unlocked === "true") {
            setIsUnlocked(true);
        }
        const collapsed = localStorage.getItem("sidebarCollapsed");
        if (collapsed === "true") {
            setSidebarCollapsed(true);
        }
        setCheckingBiometric(false);
    }, []);

    useEffect(() => {
        const checkDevice = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        
        checkDevice();
        window.addEventListener("resize", checkDevice);
        return () => window.removeEventListener("resize", checkDevice);
    }, []);

    // Redirecionar para Home/HomeDesktop baseado no dispositivo
    useEffect(() => {
        if (isDesktop === null) return;
        
        if (isDesktop && currentPageName === "Home") {
            navigate(createPageUrl("HomeDesktop"));
        }
        if (!isDesktop && currentPageName === "HomeDesktop") {
            navigate(createPageUrl("Home"));
        }
    }, [isDesktop, currentPageName, navigate]);

    const handleUnlock = () => {
        setIsUnlocked(true);
        sessionStorage.setItem("appUnlocked", "true");
    };

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

    // Aguardar verificação de biometria
    if (checkingBiometric) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-blue-50 to-slate-100">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    // Mostrar tela de bloqueio se não desbloqueado
    if (!isUnlocked) {
        return <BiometricLock onUnlock={handleUnlock} />;
    }

    // Layout Desktop com Sidebar e Tabs
    if (isDesktop) {
        return (
            <div className="h-screen flex overflow-hidden">
                <DesktopSidebar 
                    currentPage={currentPageName} 
                    collapsed={sidebarCollapsed}
                    onToggle={handleToggleSidebar}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <DesktopTabs 
                        currentPage={currentPageName}
                        onTabChange={handleTabChange}
                        onNewTab={handleNewTab}
                    />
                    <main className="flex-1 overflow-auto bg-slate-100">
                        {children}
                    </main>
                </div>
            </div>
        );
    }

    // Layout Mobile com menu flutuante
    return (
        <div className="min-h-screen">
            <FloatingMenu currentPage={currentPageName} />
            {children}
        </div>
    );
}