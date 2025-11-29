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

    // Redirecionar para HomeDesktop se estiver no desktop e na Home
    useEffect(() => {
        if (isDesktop && currentPageName === "Home") {
            navigate(createPageUrl("HomeDesktop"));
        }
        if (!isDesktop && currentPageName === "HomeDesktop") {
            navigate(createPageUrl("Home"));
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