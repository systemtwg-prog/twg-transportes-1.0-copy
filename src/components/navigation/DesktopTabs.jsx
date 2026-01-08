import React, { useState, useEffect } from "react";
import { X, Plus, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DesktopTabs({ currentPage, onTabChange, onCloseTab, onNewTab }) {
    const [tabs, setTabs] = useState([]);

    // Carregar abas do sessionStorage e garantir que inicie na HomeDesktop
    useEffect(() => {
        const savedTabs = sessionStorage.getItem("desktopTabs");
        if (savedTabs) {
            const parsed = JSON.parse(savedTabs);
            setTabs(parsed);
        } else {
            // Iniciar com HomeDesktop
            setTabs([{ id: "HomeDesktop", name: "Início" }]);
            // Redirecionar para HomeDesktop se não estiver lá
            if (currentPage !== "HomeDesktop") {
                onTabChange?.("HomeDesktop");
            }
        }
    }, []);

    // Adicionar aba atual se não existir
    useEffect(() => {
        if (currentPage && !tabs.find(t => t.id === currentPage)) {
            const newTab = { id: currentPage, name: getPageName(currentPage) };
            const newTabs = [...tabs, newTab];
            setTabs(newTabs);
            sessionStorage.setItem("desktopTabs", JSON.stringify(newTabs));
        }
    }, [currentPage]);

    const getPageName = (pageId) => {
        const names = {
            "HomeDesktop": "Início",
            "Home": "Início",
            "NotaDeposito": "Nota Depósito",
            "ComprovantesInternos": "Comprovantes Entrega",
            "ComprovantesCtes": "Comprovantes CTEs",
            "ColetasDiarias": "Coletas Diárias",
            "AdicionarColetaDiaria": "Adicionar Coleta",
            "Clientes": "Clientes",
            "ClientesSNF": "Clientes S/NF",
            "Transportadoras": "Transportadoras",
            "Motoristas": "Colaboradores",
            "Veiculos": "Veículos",
            "NotasFiscais": "Notas Fiscais",
            "ServicosSNF": "Serviços S/NF",
            "MascaraRomaneio": "Máscara Romaneio",
            "RomaneiosGerados": "Romaneios Gerados",
            "OrdensColeta": "Ordens de Coleta",
            "RotasGPS": "Rotas GPS",
            "Rastreamento": "Rastreamento",
            "Relatorios": "Relatórios",
            "ImpressaoRelatorio": "Impressão Relatório",
            "BuscaMultas": "Busca Multas",
            "Avisos": "Avisos",
            "Configuracoes": "Configurações",
            "AprovacaoUsuarios": "Usuários",
            "Backup": "Backup",
            "PersonalizarHome": "Personalizar Home",
            "ConfiguracaoModulos": "Config. Módulos",
            "ExtratorGoogle": "Extrator Google",
            "ImportacaoDocumentos": "Importar Docs",
            "RelatorioMotoristas": "Performance",
            "CrachaIdentificacao": "Crachá"
        };
        return names[pageId] || pageId;
    };

    const handleCloseTab = (e, tabId) => {
        e.stopPropagation();
        if (tabs.length === 1) return; // Não fechar última aba
        
        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);
        sessionStorage.setItem("desktopTabs", JSON.stringify(newTabs));
        
        // Se fechou a aba atual, ir para a última aba
        if (tabId === currentPage && onTabChange) {
            onTabChange(newTabs[newTabs.length - 1].id);
        }
    };

    const handleTabClick = (tabId) => {
        if (onTabChange) {
            onTabChange(tabId);
        }
    };

    return (
        <div className="bg-slate-800 flex items-center h-10 px-2 gap-1 overflow-x-auto">
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-all min-w-[120px] max-w-[200px] group ${
                        currentPage === tab.id
                            ? "bg-white text-slate-800"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                >
                    {tab.id === "HomeDesktop" || tab.id === "Home" ? (
                        <Home className="w-4 h-4 flex-shrink-0" />
                    ) : null}
                    <span className="text-sm truncate flex-1">{tab.name}</span>
                    {tabs.length > 1 && (
                        <button
                            onClick={(e) => handleCloseTab(e, tab.id)}
                            className={`p-0.5 rounded hover:bg-slate-200 ${
                                currentPage === tab.id ? "text-slate-500" : "text-slate-400 opacity-0 group-hover:opacity-100"
                            }`}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            ))}
            <Button
                variant="ghost"
                size="icon"
                onClick={onNewTab}
                className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700"
            >
                <Plus className="w-4 h-4" />
            </Button>
        </div>
    );
}