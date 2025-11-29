import React, { useEffect, useState } from "react";
import FloatingMenu from "@/components/navigation/FloatingMenu";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Layout({ children, currentPageName }) {
    const [isDesktop, setIsDesktop] = useState(false);
    const navigate = useNavigate();

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
        // Se estiver no desktop e na Home mobile, redirecionar para HomeDesktop
        if (isDesktop && currentPageName === "Home") {
            navigate(createPageUrl("HomeDesktop"));
        }
        // Se estiver no mobile e na HomeDesktop, redirecionar para Home
        if (!isDesktop && currentPageName === "HomeDesktop") {
            navigate(createPageUrl("Home"));
        }
        // Se não estiver em nenhuma Home, redirecionar para a Home correta
        if (currentPageName !== "Home" && currentPageName !== "HomeDesktop" && !sessionStorage.getItem("homeVisited")) {
            sessionStorage.setItem("homeVisited", "true");
            navigate(createPageUrl(isDesktop ? "HomeDesktop" : "Home"));
        }
    }, [isDesktop, currentPageName, navigate]);

    // Todas as páginas usam apenas o menu flutuante
    return (
        <div className="min-h-screen">
            <FloatingMenu currentPage={currentPageName} />
            {children}
        </div>
    );

}