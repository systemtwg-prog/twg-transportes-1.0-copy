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

    // Layout Mobile com menu flutuante e abas inferiores
    return (
        <div className="min-h-screen pb-20">
            <FloatingMenu currentPage={currentPageName} />
            <main className="p-4 pb-20">
                {children}
            </main>
            <BottomTabBar 
                currentPage={currentPageName} 
                onMenuClick={() => setMenuOpen(!menuOpen)}
            />
        </div>
    );
}