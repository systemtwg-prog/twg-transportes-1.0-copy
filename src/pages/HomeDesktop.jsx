import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
    Truck, Package, FileText, Users, Car, 
    ClipboardList, Settings, BarChart3,
    Navigation, Building2, Upload,
    Camera, ChevronRight, Bell, Grip, Check, X,
    AlertTriangle, Clock, TrendingUp, Calendar, Printer, Search
} from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import PrintConfigDialog from "@/components/shared/PrintConfigDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const allModules = [
    { id: "nota_deposito", name: "Nota Depósito", href: "NotaDeposito", icon: Camera, color: "from-blue-600 to-indigo-700" },
    { id: "comprovantes", name: "Comprovantes", href: "ComprovantesInternos", icon: Upload, color: "from-cyan-500 to-blue-600" },
    { id: "coletas", name: "Coletas Diárias", href: "ColetasDiarias", icon: Package, color: "from-indigo-600 to-violet-600" },
    { id: "ordens", name: "Ordem de Coleta", href: "OrdensColeta", icon: ClipboardList, color: "from-violet-600 to-indigo-600" },
    { id: "cracha", name: "Crachá", href: "CrachaIdentificacao", icon: Users, color: "from-emerald-500 to-cyan-500" },
    { id: "rotas", name: "Rotas GPS", href: "RotasGPS", icon: Navigation, color: "from-green-500 to-emerald-600" },
    { id: "veiculos", name: "Veículos", href: "Veiculos", icon: Car, color: "from-slate-500 to-gray-600" },
    { id: "multas", name: "Multas", href: "BuscaMultas", icon: AlertTriangle, color: "from-red-500 to-orange-600" },
    { id: "notas_fiscais", name: "Notas Fiscais", href: "NotasFiscais", icon: FileText, color: "from-amber-500 to-orange-600", large: true },
    { id: "consulta_sefaz", name: "Consulta SEFAZ", href: "ConsultaSEFAZ", icon: Search, color: "from-indigo-500 to-blue-600" },
    { id: "romaneio", name: "Máscara Romaneio", href: "MascaraRomaneio", icon: Truck, color: "from-violet-500 to-purple-600" },
    { id: "romaneios_gerados", name: "Romaneios Gerados", href: "RomaneiosGerados", icon: BarChart3, color: "from-pink-500 to-rose-600" },
    { id: "relatorio", name: "Relatório", href: "ImpressaoRelatorio", icon: FileText, color: "from-indigo-500 to-purple-600" },
    { id: "ctes", name: "Comprovantes CTEs", href: "ComprovantesCtes", icon: FileText, color: "from-amber-500 to-yellow-600" },
    { id: "clientes", name: "Clientes", href: "Clientes", icon: Users, color: "from-purple-500 to-indigo-600" },
    { id: "transportadoras", name: "Transportadoras", href: "Transportadoras", icon: Building2, color: "from-slate-500 to-gray-600" },
    { id: "motoristas", name: "Motoristas", href: "Motoristas", icon: Users, color: "from-teal-500 to-cyan-600" },
    { id: "comprovantes_cte", name: "Comprovantes CTEs", href: "ComprovantesCtes", icon: FileText, color: "from-amber-500 to-yellow-600" },
];

export default function HomeDesktop() {
    const [showCustomize, setShowCustomize] = useState(false);
    const [placaSelecionada, setPlacaSelecionada] = useState(null);
    const [showNotasDialog, setShowNotasDialog] = useState(false);
    const [showPrintConfig, setShowPrintConfig] = useState(false);
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });
    const config = configs[0] || {};

    const { data: avisos = [] } = useQuery({
        queryKey: ["avisos-ativos"],
        queryFn: async () => {
            const todos = await base44.entities.Aviso.list("-created_date");
            const hoje = new Date().toISOString().split("T")[0];
            return todos.filter(a => 
                a.ativo && 
                (!a.data_inicio || a.data_inicio <= hoje) &&
                (!a.data_fim || a.data_fim >= hoje)
            );
        }
    });

    const { data: romaneiosGerados = [] } = useQuery({
        queryKey: ["romaneios-gerados-home"],
        queryFn: () => base44.entities.RomaneioGerado.list("-created_date")
    });

    const { data: notasFiscais = [] } = useQuery({
        queryKey: ["notas-fiscais-home"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: coletasDiarias = [] } = useQuery({
        queryKey: ["coletas-diarias-home"],
        queryFn: () => base44.entities.ColetaDiaria.filter({ status: "pendente" })
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-home"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const { data: ordensColeta = [] } = useQuery({
        queryKey: ["ordens-coleta-home"],
        queryFn: () => base44.entities.OrdemColeta.list("-created_date", 10)
    });

    const isAdmin = currentUser?.role === "admin";

    // Módulos ativos do usuário
    const modulosAtivos = currentUser?.modulos_desktop || ["nota_deposito", "comprovantes", "coletas", "ordens", "rotas", "veiculos"];

    const updateUserMutation = useMutation({
        mutationFn: (data) => base44.auth.updateMe(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["current-user"] });
            setShowCustomize(false);
        }
    });

    const [tempModulos, setTempModulos] = useState(modulosAtivos);

    const toggleModulo = (id) => {
        setTempModulos(prev => 
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const salvarPersonalizacao = () => {
        updateUserMutation.mutate({ modulos_desktop: tempModulos });
    };

    // Dashboard por veículo
    const dashboardPorVeiculo = useMemo(() => {
        const porVeiculo = {};

        romaneiosGerados.forEach(r => {
            if (r.status === "gerado" || r.status === "em_transito") {
                const placa = r.placa || "SEM_PLACA";
                if (!porVeiculo[placa]) {
                    porVeiculo[placa] = { entregas: 0, totalNotas: 0, coletas: 0, notas: [], notasIds: [], transportadoras: new Set() };
                }
                
                // Buscar as notas reais deste romaneio
                const notasDoRomaneio = (r.notas_ids || [])
                    .map(id => notasFiscais.find(n => n.id === id))
                    .filter(Boolean);
                
                // Contar notas
                porVeiculo[placa].totalNotas += notasDoRomaneio.length;
                
                // Contar transportadoras únicas (entregas)
                notasDoRomaneio.forEach(nota => {
                    if (nota.transportadora) {
                        porVeiculo[placa].transportadoras.add(nota.transportadora.trim().toUpperCase());
                    }
                });
                
                if (r.notas_ids) {
                    porVeiculo[placa].notasIds = [...porVeiculo[placa].notasIds, ...r.notas_ids];
                }
            }
        });

        // Calcular entregas baseado nas transportadoras únicas
        Object.keys(porVeiculo).forEach(placa => {
            const notasDoVeiculo = notasFiscais.filter(n => 
                porVeiculo[placa].notasIds.includes(n.id)
            );
            porVeiculo[placa].notas = notasDoVeiculo;
            porVeiculo[placa].entregas = porVeiculo[placa].transportadoras.size;
        });

        const coletasPendentes = coletasDiarias.filter(c => c.status === "pendente").length;
        if (coletasPendentes > 0) {
            if (!porVeiculo["COLETAS"]) {
                porVeiculo["COLETAS"] = { entregas: 0, totalNotas: 0, coletas: coletasPendentes, notas: [] };
            } else {
                porVeiculo["COLETAS"].coletas = coletasPendentes;
            }
        }

        return porVeiculo;
    }, [romaneiosGerados, notasFiscais, coletasDiarias]);

    // Agrupar notas por transportadora
    const notasAgrupadas = useMemo(() => {
        if (!placaSelecionada || !dashboardPorVeiculo[placaSelecionada]) return {};
        
        const notas = dashboardPorVeiculo[placaSelecionada].notas || [];
        const agrupadas = {};
        
        notas.forEach(nota => {
            const transp = nota.transportadora || "SEM TRANSPORTADORA";
            if (!agrupadas[transp]) {
                agrupadas[transp] = [];
            }
            agrupadas[transp].push(nota);
        });
        
        return agrupadas;
    }, [placaSelecionada, dashboardPorVeiculo]);

    const handlePlacaClick = (placa) => {
        if (placa !== "COLETAS") {
            setPlacaSelecionada(placa);
            setShowNotasDialog(true);
        }
    };

    const handlePrintTodosDashboard = (printConfig = {}) => {
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        const cfg = {
            marginTop: printConfig.marginTop ?? 5,
            marginBottom: printConfig.marginBottom ?? 5,
            marginLeft: printConfig.marginLeft ?? 5,
            marginRight: printConfig.marginRight ?? 5,
            showHeader: printConfig.showHeader ?? true,
            showFooter: printConfig.showFooter ?? true,
            showLogo: printConfig.showLogo ?? true,
            showDate: printConfig.showDate ?? true,
            showCompanyInfo: printConfig.showCompanyInfo ?? true,
            fontSize: printConfig.fontSize ?? 9,
            columns: printConfig.columns ?? 2,
            headerHeight: printConfig.headerHeight ?? 50,
            footerHeight: printConfig.footerHeight ?? 20,
            cardPadding: printConfig.cardPadding ?? 4,
            cardGap: printConfig.cardGap ?? 4
        };

        let todosVeiculosHtml = '';
        let totalNotas = 0;
        let totalEntregas = 0;
        let totalTransportadoras = new Set();

        Object.entries(dashboardPorVeiculo).forEach(([placa, dados]) => {
            if (placa === "COLETAS") return;
            
            const veiculo = veiculos.find(v => v.placa === placa);
            const notas = dados.notas || [];
            totalNotas += dados.totalNotas || notas.length;
            totalEntregas += dados.entregas || 0;

            const agrupadas = {};
            notas.forEach(nota => {
                let transp = nota.transportadora || "SEM TRANSPORTADORA";
                if (transp.toUpperCase().includes("WASHINGTON GONZALES")) {
                    transp = nota.destinatario || "SEM TRANSPORTADORA";
                }
                totalTransportadoras.add(transp);
                if (!agrupadas[transp]) agrupadas[transp] = [];
                agrupadas[transp].push(nota);
            });

            if (Object.keys(agrupadas).length === 0) return;

            const qtdTranspVeiculo = Object.keys(agrupadas).length;
            const qtdNotas = dados.totalNotas || notas.length;
            const qtdEntregas = dados.entregas || 0;
            
            // Calcular peso total do veículo
            const pesoVeiculo = notas.reduce((acc, nota) => {
                const pesoStr = nota.peso || "";
                const pesoNum = parseFloat(pesoStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
                return acc + pesoNum;
            }, 0);
            
            todosVeiculosHtml += `
                <div class="veiculo-card">
                    <div class="veiculo-header">
                        🚗 ${placa} ${veiculo?.modelo ? '- ' + veiculo.modelo : ''} | ${qtdNotas} NFs | ${qtdEntregas} Ent. | ${pesoVeiculo.toFixed(1)}kg
                    </div>
                    ${Object.entries(agrupadas).map(([transp, notasT]) => `
                        <div>
                            <div class="transp-header">${transp} (${notasT.length})</div>
                            <div class="notas-list">
                                ${notasT.map(n => `<span class="nota-item">${n.numero_nf || '-'} → ${(n.destinatario || '-').substring(0, 20)}</span>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        });

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Dashboard Pendências</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; padding: ${cfg.marginTop}mm ${cfg.marginRight}mm ${cfg.marginBottom}mm ${cfg.marginLeft}mm; color: #1e293b; font-size: ${cfg.fontSize}px; }
                    .header { display: ${cfg.showHeader ? 'flex' : 'none'}; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-bottom: 6px; min-height: ${cfg.headerHeight}px; }
                    .logo { display: ${cfg.showLogo ? 'block' : 'none'}; width: 50px; margin-right: 8px; }
                    .logo img { max-width: 100%; max-height: 35px; object-fit: contain; }
                    .company-name { font-size: ${cfg.fontSize + 2}px; font-weight: bold; color: #1e293b; display: ${cfg.showCompanyInfo ? 'block' : 'none'}; }
                    .company-details { font-size: ${cfg.fontSize - 1}px; color: #64748b; display: ${cfg.showCompanyInfo ? 'block' : 'none'}; }
                    .title { text-align: center; font-size: ${cfg.fontSize + 1}px; font-weight: bold; color: #1e40af; margin: 4px 0; padding: 3px; background: #eff6ff; border-radius: 3px; }
                    .title-date { display: ${cfg.showDate ? 'inline' : 'none'}; }
                    .summary { display: flex; justify-content: center; gap: 15px; background: #f8fafc; padding: 4px; border-radius: 3px; margin-bottom: 6px; }
                    .summary-item { text-align: center; }
                    .summary-label { color: #64748b; text-transform: uppercase; font-size: ${cfg.fontSize - 2}px; }
                    .summary-value { font-size: ${cfg.fontSize + 2}px; font-weight: bold; color: #1e40af; }
                    .grid-container { display: grid; grid-template-columns: repeat(${cfg.columns}, 1fr); gap: ${cfg.cardGap}px; }
                    .veiculo-card { border: 1px solid #2563eb; border-radius: 4px; overflow: hidden; page-break-inside: avoid; }
                    .veiculo-header { background: #2563eb; color: white; padding: ${cfg.cardPadding}px 6px; font-weight: bold; font-size: ${cfg.fontSize}px; }
                    .transp-header { background: #eff6ff; padding: 2px 6px; font-size: ${cfg.fontSize - 1}px; font-weight: 600; color: #1e40af; border-bottom: 1px solid #e2e8f0; }
                    .notas-list { padding: 2px 6px ${cfg.cardPadding}px; font-size: ${cfg.fontSize - 2}px; }
                    .nota-item { display: inline-block; background: #f1f5f9; padding: 1px 4px; border-radius: 2px; margin: 1px; }
                    .footer { display: ${cfg.showFooter ? 'block' : 'none'}; margin-top: 6px; padding-top: 3px; border-top: 1px solid #e2e8f0; text-align: center; font-size: ${cfg.fontSize - 2}px; color: #94a3b8; min-height: ${cfg.footerHeight}px; }
                    .filial-section { background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px; padding: 6px; margin-bottom: 6px; }
                    .filial-title { font-size: ${cfg.fontSize}px; font-weight: bold; color: #166534; margin-bottom: 4px; }
                    .filial-grid { display: flex; flex-wrap: wrap; gap: 8px; }
                    .filial-item { background: white; padding: 3px 8px; border-radius: 4px; border: 1px solid #bbf7d0; display: flex; gap: 6px; align-items: center; }
                    .filial-nome { font-size: ${cfg.fontSize - 1}px; color: #166534; }
                    .filial-qtd { font-size: ${cfg.fontSize}px; font-weight: bold; color: #15803d; background: #dcfce7; padding: 1px 6px; border-radius: 3px; }
                    @media print { body { padding: ${cfg.marginTop}mm ${cfg.marginRight}mm ${cfg.marginBottom}mm ${cfg.marginLeft}mm; } @page { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        ${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : ''}
                    </div>
                    <div>
                        <p class="company-name">${config.nome_empresa || 'TWG TRANSPORTES'}</p>
                        <p class="company-details">${config.cnpj ? config.cnpj : ''} ${config.telefone ? ' | ' + config.telefone : ''}</p>
                    </div>
                </div>

                <div class="title">PENDÊNCIAS POR VEÍCULO<span class="title-date"> - ${format(new Date(), "dd/MM/yyyy")}</span></div>

                <div class="summary">
                    <div class="summary-item">
                        <div class="summary-label">Veículos</div>
                        <div class="summary-value">${Object.keys(dashboardPorVeiculo).filter(p => p !== "COLETAS").length}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Total Notas</div>
                        <div class="summary-value">${totalNotas}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Total Entregas</div>
                        <div class="summary-value">${totalEntregas}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Transportadoras</div>
                        <div class="summary-value">${totalTransportadoras.size}</div>
                    </div>
                </div>

                ${(() => {
                    // Agrupar notas por filial
                    const porFilial = {};
                    Object.entries(dashboardPorVeiculo).forEach(([placa, dados]) => {
                        if (placa === "COLETAS") return;
                        (dados.notas || []).forEach(nota => {
                            const filial = nota.filial || "SEM FILIAL";
                            if (!porFilial[filial]) porFilial[filial] = 0;
                            porFilial[filial]++;
                        });
                    });
                    
                    if (Object.keys(porFilial).length === 0) return '';
                    
                    return '<div class="filial-section"><div class="filial-title">📍 Notas por Filial</div><div class="filial-grid">' + 
                        Object.entries(porFilial).map(([filial, qtd]) => 
                            '<div class="filial-item"><span class="filial-nome">' + filial + '</span><span class="filial-qtd">' + qtd + '</span></div>'
                        ).join('') + '</div></div>';
                })()}

                <div class="grid-container">
                    ${todosVeiculosHtml}
                </div>

                <div class="footer">
                    ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </div>
            </body>
            </html>
        `);

        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    // Estatísticas gerais
    const stats = {
        totalEntregas: Object.values(dashboardPorVeiculo).reduce((acc, v) => acc + v.entregas, 0),
        totalColetas: coletasDiarias.filter(c => c.status === "pendente").length,
        ordensHoje: ordensColeta.filter(o => o.data_ordem === format(new Date(), "yyyy-MM-dd")).length,
        veiculosAtivos: veiculos.filter(v => v.status === "disponivel" || v.status === "em_uso").length
    };

    const modulosVisiveis = allModules.filter(m => modulosAtivos.includes(m.id));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {config.logo_url && (
                            <img src={config.logo_url} alt="Logo" className="h-12 object-contain" />
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">{config.nome_empresa || "Sistema de Transportes"}</h1>
                            <p className="text-sm text-slate-500">
                                {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => { setTempModulos(modulosAtivos); setShowCustomize(true); }}
                            className="border-slate-300"
                        >
                            <Grip className="w-4 h-4 mr-2" />
                            Personalizar
                        </Button>
                        <NotificationBell />
                        {isAdmin && (
                            <Link to={createPageUrl("Configuracoes")}>
                                <Button variant="ghost" size="icon">
                                    <Settings className="w-5 h-5" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* Avisos */}
                {avisos.length > 0 && (
                    <div className="space-y-2">
                        {avisos.map(aviso => (
                            <div 
                                key={aviso.id}
                                className={`p-4 rounded-xl flex items-start gap-3 ${
                                    aviso.tipo === "urgente" 
                                        ? "bg-red-50 border border-red-200"
                                        : aviso.tipo === "alerta"
                                        ? "bg-amber-50 border border-amber-200"
                                        : "bg-blue-50 border border-blue-200"
                                }`}
                            >
                                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                                    aviso.tipo === "urgente" ? "text-red-500" : 
                                    aviso.tipo === "alerta" ? "text-amber-500" : "text-blue-500"
                                }`} />
                                <div>
                                    <p className="font-semibold text-slate-800">{aviso.titulo}</p>
                                    <p className="text-sm text-slate-600">{aviso.mensagem}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Cards de Estatísticas e Ações Rápidas */}
                <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-0">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Entregas Pendentes</p>
                                    <p className="text-3xl font-bold">{stats.totalEntregas}</p>
                                </div>
                                <Package className="w-10 h-10 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                    <Link to={createPageUrl("AdicionarColetaDiaria")}>
                        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 cursor-pointer hover:scale-105 transition-transform">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm opacity-90">Coletas Pendentes</p>
                                        <p className="text-3xl font-bold">{stats.totalColetas}</p>
                                        <p className="text-xs mt-1 opacity-75">Clique para adicionar</p>
                                    </div>
                                    <Truck className="w-10 h-10 opacity-80" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Ordens Hoje</p>
                                    <p className="text-3xl font-bold">{stats.ordensHoje}</p>
                                </div>
                                <ClipboardList className="w-10 h-10 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Veículos Ativos</p>
                                    <p className="text-3xl font-bold">{stats.veiculosAtivos}</p>
                                </div>
                                <Car className="w-10 h-10 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* Coluna Principal - Módulos */}
                    <div className="col-span-2 space-y-6">
                        {/* Módulos Ativos */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="border-b">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    Acesso Rápido
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-4 gap-4">
                                    {modulosVisiveis.map((item) => (
                                        <Link key={item.id} to={createPageUrl(item.href)} className={item.large ? "col-span-2" : ""}>
                                            <div className={`${item.large ? "p-6" : "p-4"} rounded-xl bg-gradient-to-br ${item.color} text-white hover:scale-105 hover:shadow-xl transition-all duration-300 cursor-pointer`}>
                                                <item.icon className={`${item.large ? "w-12 h-12" : "w-8 h-8"} mb-2`} />
                                                <p className={`${item.large ? "text-lg" : "text-sm"} font-semibold`}>{item.name}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pendências por Veículo */}
                        {Object.keys(dashboardPorVeiculo).length > 0 && (
                            <Card className="border-0 shadow-lg">
                                <CardHeader className="border-b">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                                            Pendências por Veículo
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Button 
                                                onClick={() => setShowPrintConfig(true)}
                                                size="sm"
                                                variant="outline"
                                                className="border-blue-500 text-blue-600"
                                            >
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                                onClick={() => handlePrintTodosDashboard()}
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Printer className="w-4 h-4 mr-1" />
                                                Imprimir Todos
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-3 gap-4">
                                        {Object.entries(dashboardPorVeiculo).map(([placa, dados]) => {
                                            const veiculo = veiculos.find(v => v.placa === placa);
                                            const isColetas = placa === "COLETAS";

                                            return (
                                                <div 
                                                    key={placa}
                                                    onClick={() => handlePlacaClick(placa)}
                                                    className={`p-4 rounded-xl border-l-4 cursor-pointer transition-all hover:shadow-lg bg-white shadow ${isColetas ? 'border-emerald-500' : 'border-blue-500'}`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            {isColetas ? (
                                                                <Truck className="w-5 h-5 text-emerald-600" />
                                                            ) : (
                                                                <Car className="w-5 h-5 text-blue-600" />
                                                            )}
                                                            <span className="font-bold text-slate-800">
                                                                {isColetas ? "Coletas" : placa}
                                                            </span>
                                                        </div>
                                                        {!isColetas && <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                    </div>
                                                    {veiculo && (
                                                        <p className="text-xs text-slate-500 mb-2">{veiculo.modelo}</p>
                                                    )}
                                                    <div className="flex gap-4">
                                                        {dados.totalNotas > 0 && (
                                                            <div className="flex items-center gap-1" title="Quantidade de Notas">
                                                                <FileText className="w-4 h-4 text-blue-500" />
                                                                <span className="font-bold text-blue-600">{dados.totalNotas}</span>
                                                                <span className="text-xs text-slate-400">NFs</span>
                                                            </div>
                                                        )}
                                                        {dados.entregas > 0 && (
                                                            <div className="flex items-center gap-1" title="Quantidade de Entregas">
                                                                <Package className="w-4 h-4 text-orange-500" />
                                                                <span className="font-bold text-orange-600">{dados.entregas}</span>
                                                                <span className="text-xs text-slate-400">Ent.</span>
                                                            </div>
                                                        )}
                                                        {dados.coletas > 0 && (
                                                            <div className="flex items-center gap-1" title="Coletas Pendentes">
                                                                <Truck className="w-4 h-4 text-emerald-500" />
                                                                <span className="font-bold text-emerald-600">{dados.coletas}</span>
                                                                <span className="text-xs text-slate-400">Col.</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Coluna Lateral */}
                    <div className="space-y-6">
                        {/* Últimas Ordens */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader className="border-b">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-violet-600" />
                                    Últimas Ordens
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    {ordensColeta.slice(0, 5).map((ordem) => (
                                        <Link key={ordem.id} to={createPageUrl("OrdensColeta")}>
                                            <div className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold text-sm text-slate-800">#{ordem.numero}</span>
                                                    <Badge className={`text-xs ${
                                                        ordem.status === "pendente" ? "bg-yellow-100 text-yellow-700" :
                                                        ordem.status === "coletado" ? "bg-blue-100 text-blue-700" :
                                                        ordem.status === "entregue" ? "bg-green-100 text-green-700" :
                                                        "bg-slate-100 text-slate-700"
                                                    }`}>
                                                        {ordem.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-600 truncate">{ordem.remetente_nome}</p>
                                                <p className="text-xs text-slate-500">→ {ordem.destinatario_nome}</p>
                                            </div>
                                        </Link>
                                    ))}
                                    {ordensColeta.length === 0 && (
                                        <p className="text-center text-slate-500 py-4">Nenhuma ordem recente</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Acesso Admin */}
                        {isAdmin && (
                            <Card className="border-0 shadow-lg">
                                <CardHeader className="border-b">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-slate-600" />
                                        Administração
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="space-y-2">
                                        <Link to={createPageUrl("Motoristas")}>
                                            <Button variant="ghost" className="w-full justify-start">
                                                <Users className="w-4 h-4 mr-2" /> Motoristas
                                            </Button>
                                        </Link>
                                        <Link to={createPageUrl("Avisos")}>
                                            <Button variant="ghost" className="w-full justify-start">
                                                <Bell className="w-4 h-4 mr-2" /> Avisos
                                            </Button>
                                        </Link>
                                        <Link to={createPageUrl("Configuracoes")}>
                                            <Button variant="ghost" className="w-full justify-start">
                                                <Settings className="w-4 h-4 mr-2" /> Configurações
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </main>

            {/* Dialog Personalização */}
            <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Grip className="w-5 h-5 text-blue-600" />
                            Personalizar Tela Inicial
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Selecione os módulos que deseja exibir na tela inicial:
                        </p>
                        <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                            {allModules.map((modulo) => {
                                const ativo = tempModulos.includes(modulo.id);
                                return (
                                    <div
                                        key={modulo.id}
                                        onClick={() => toggleModulo(modulo.id)}
                                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                            ativo 
                                                ? "border-blue-500 bg-blue-50" 
                                                : "border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-gradient-to-br ${modulo.color}`}>
                                                <modulo.icon className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{modulo.name}</span>
                                            {ativo && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" onClick={() => setShowCustomize(false)} className="flex-1">
                                Cancelar
                            </Button>
                            <Button 
                                onClick={salvarPersonalizacao} 
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                disabled={updateUserMutation.isPending}
                            >
                                {updateUserMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Configuração de Impressão */}
            <PrintConfigDialog
                open={showPrintConfig}
                onOpenChange={setShowPrintConfig}
                onPrint={handlePrintTodosDashboard}
                configKey="homeDesktopDashboardPrint"
            />

            {/* Dialog Notas por Transportadora */}
            <Dialog open={showNotasDialog} onOpenChange={setShowNotasDialog}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <Car className="w-5 h-5 text-blue-600" />
                                Notas do Veículo {placaSelecionada}
                            </DialogTitle>
                            {Object.keys(notasAgrupadas).length > 0 && (
                                <Button 
                                    onClick={() => {
                                        const veiculo = veiculos.find(v => v.placa === placaSelecionada);
                                        const todasNotas = dashboardPorVeiculo[placaSelecionada]?.notas || [];
                                        
                                        const winPrint = window.open('', '_blank', 'width=800,height=600');
                                        if (!winPrint) return;

                                        const notasHtml = Object.entries(notasAgrupadas).map(([transportadora, notas]) => `
                                            <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                                <div style="background: #eff6ff; padding: 10px 15px; border-bottom: 1px solid #dbeafe;">
                                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                                        <span style="font-weight: bold; color: #1e40af; font-size: 14px;">${transportadora}</span>
                                                        <span style="background: #dbeafe; color: #1e40af; padding: 2px 10px; border-radius: 10px; font-size: 12px;">${notas.length} nota${notas.length > 1 ? 's' : ''}</span>
                                                    </div>
                                                </div>
                                                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                                    <thead>
                                                        <tr style="background: #f8fafc;">
                                                            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">NF</th>
                                                            <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">Destinatário</th>
                                                            <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">Volume</th>
                                                            <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">Peso</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${notas.map(nota => `
                                                            <tr>
                                                                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #2563eb;">${nota.numero_nf || '-'}</td>
                                                                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${nota.destinatario || '-'}</td>
                                                                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">${nota.volume || '-'}</td>
                                                                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">${nota.peso || '-'}</td>
                                                            </tr>
                                                        `).join('')}
                                                    </tbody>
                                                </table>
                                            </div>
                                        `).join('');

                                        winPrint.document.write(`
                                            <html>
                                            <head>
                                                <meta charset="UTF-8">
                                                <title>Notas do Veículo ${placaSelecionada}</title>
                                                <style>
                                                    * { box-sizing: border-box; margin: 0; padding: 0; }
                                                    body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
                                                    .header { display: flex; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
                                                    .logo img { max-width: 80px; max-height: 50px; object-fit: contain; margin-right: 15px; }
                                                    .title { font-size: 18px; font-weight: bold; color: #1e40af; }
                                                    .subtitle { font-size: 14px; color: #64748b; }
                                                    @media print { body { padding: 10mm; } @page { margin: 0; } }
                                                </style>
                                            </head>
                                            <body>
                                                <div class="header">
                                                    <div class="logo">
                                                        ${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : ''}
                                                    </div>
                                                    <div>
                                                        <p class="title">Notas do Veículo ${placaSelecionada} ${veiculo?.modelo ? '- ' + veiculo.modelo : ''}</p>
                                                        <p class="subtitle">${todasNotas.length} notas | ${Object.keys(notasAgrupadas).length} transportadoras | ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                                                    </div>
                                                </div>
                                                ${notasHtml}
                                            </body>
                                            </html>
                                        `);
                                        winPrint.document.close();
                                        setTimeout(() => winPrint.print(), 500);
                                    }}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Printer className="w-4 h-4 mr-1" />
                                    Imprimir
                                </Button>
                            )}
                        </div>
                    </DialogHeader>
                    <div className="space-y-4">
                        {Object.keys(notasAgrupadas).length === 0 ? (
                            <p className="text-center text-slate-500 py-4">Nenhuma nota encontrada</p>
                        ) : (
                            Object.entries(notasAgrupadas).map(([transportadora, notas]) => (
                                <div key={transportadora} className="border rounded-xl overflow-hidden">
                                    <div className="bg-blue-50 p-3 border-b">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                                                <Building2 className="w-4 h-4" />
                                                {transportadora}
                                            </h4>
                                            <Badge className="bg-blue-100 text-blue-700">
                                                {notas.length} nota{notas.length > 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="divide-y">
                                        {notas.map((nota) => (
                                            <div key={nota.id} className="p-3 hover:bg-slate-50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-slate-800">{nota.destinatario}</p>
                                                        <p className="text-sm text-blue-600 font-semibold">NF: {nota.numero_nf}</p>
                                                    </div>
                                                    <div className="text-right text-sm">
                                                        <p className="text-slate-500">{nota.volume || "-"} vol</p>
                                                        <p className="text-slate-500">{nota.peso || "-"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}