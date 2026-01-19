import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
    Home, Camera, Upload, FileText, Package, Users, 
    Truck, Navigation, Menu
} from "lucide-react";

const quickAccessTabs = [
    { name: "Início", href: "Home", icon: Home },
    { name: "Depósito", href: "NotaDeposito", icon: Camera },
    { name: "Comprov.", href: "ComprovantesInternos", icon: Upload },
    { name: "CTEs", href: "CTEs", icon: FileText },
    { name: "NFs", href: "NotasFiscais", icon: FileText },
    { name: "Máscara", href: "MascaraRomaneio", icon: Truck },
    { name: "Coletas", href: "ColetasDiarias", icon: Package },
];

export default function BottomTabBar({ currentPage, onMenuClick }) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-40 safe-area-bottom">
            <div className="flex items-center justify-around px-1 py-1.5">
                {quickAccessTabs.map((tab) => (
                    <Link
                        key={tab.href}
                        to={createPageUrl(tab.href)}
                        className={`flex flex-col items-center justify-center min-w-[45px] px-1.5 py-1 rounded-lg transition-all ${
                            currentPage === tab.href
                                ? "bg-blue-600 text-white"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                    >
                        <tab.icon className="w-4 h-4 mb-0.5" />
                        <span className="text-[8px] font-medium leading-tight">{tab.name}</span>
                    </Link>
                ))}
                <button
                    onClick={onMenuClick}
                    className="flex flex-col items-center justify-center min-w-[45px] px-1.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                    <Menu className="w-4 h-4 mb-0.5" />
                    <span className="text-[8px] font-medium leading-tight">Menu</span>
                </button>
            </div>
        </div>
    );
}