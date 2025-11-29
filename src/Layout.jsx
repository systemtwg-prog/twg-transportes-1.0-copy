import React, { useEffect, useState } from "react";
import FloatingMenu from "@/components/navigation/FloatingMenu";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BiometricLock from "@/components/auth/BiometricLock";

export default function Layout({ children, currentPageName }) {
    const [isDesktop, setIsDesktop] = useState(null);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [checkingBiometric, setCheckingBiometric] = useState(true);
    const navigate = useNavigate();

    // Verificar se já desbloqueou nesta sessão
    useEffect(() => {
        const unlocked = sessionStorage.getItem("appUnlocked");
        if (unlocked === "true") {
            setIsUnlocked(true);
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
        // Aguardar detecção do dispositivo
        if (isDesktop === null) return;
        
        // Se estiver no desktop e na Home mobile, redirecionar para HomeDesktop
        if (isDesktop && currentPageName === "Home") {
            navigate(createPageUrl("HomeDesktop"));
        }
        // Se estiver no mobile e na HomeDesktop, redirecionar para Home
        if (!isDesktop && currentPageName === "HomeDesktop") {
            navigate(createPageUrl("Home"));
        }
    }, [isDesktop, currentPageName, navigate]);

    const handleUnlock = () => {
        setIsUnlocked(true);
        sessionStorage.setItem("appUnlocked", "true");
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

    // Todas as páginas usam apenas o menu flutuante
    return (
        <div className="min-h-screen">
            <FloatingMenu currentPage={currentPageName} />
            {children}
        </div>
    );
}