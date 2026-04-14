import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
        Camera, ChevronRight, Bell, Printer, Settings2, Eye, EyeOff
    } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import WeatherWidget from "@/components/shared/WeatherWidget";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PrintConfigDialog from "@/components/shared/PrintConfigDialog";
import PersonalizarBotoes from "@/components/home/PersonalizarBotoes";

export default function Home() {
    const [placaSelecionada, setPlacaSelecionada] = useState(null);
    const [showNotasDialog, setShowNotasDialog] = useState(false);
    const [showPrintConfig, setShowPrintConfig] = useState(false);
    const [showPersonalizar, setShowPersonalizar] = useState(false);

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const { data: configs = [], refetch: refetchConfigs } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });
    const config = configs[0] || {};

    // Botões visíveis (padrão: todos ativos)
    const botoesMobileVisiveis = config.botoes_home_mobile || [];
    const botoesPCVisiveis = config.botoes_home_pc || [];
    const isMobile = window.innerWidth < 768;

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

    const isAdmin = currentUser?.role === "admin";

    // Módulos permitidos pela ConfiguracaoModulos (usa href como chave de página)
    const modulosPermitidos = isAdmin
        ? (config.modulos_admin || null)
        : (config.modulos_usuario_comum || null);

    // Cores do tema - tons claros azulados
    const corPrimaria = config.cor_primaria || "sky";
    const corBotoes = config.cor_botoes || "blue";
    const temaEscuro = config.tema_escuro || false;

    const bgGradient = temaEscuro 
        ? `from-slate-800 via-blue-900 to-slate-900`
        : `from-sky-100 via-blue-50 to-slate-100`;

    // Dashboard por veículo
    const dashboardPorVeiculo = useMemo(() => {
        const porVeiculo = {};

        romaneiosGerados.forEach(r => {
            if (r.status === "gerado" || r.status === "em_transito") {
                const placa = r.placa || "SEM_PLACA";
                if (!porVeiculo[placa]) {
                    porVeiculo[placa] = { entregas: 0, coletas: 0, notas: [], notasIds: [] };
                }
                porVeiculo[placa].entregas += r.total_entregas || r.total_notas || 0;
                if (r.notas_ids) {
                    porVeiculo[placa].notasIds = [...porVeiculo[placa].notasIds, ...r.notas_ids];
                }
            }
        });

        // Adicionar notas fiscais reais aos veículos - APENAS as que estão nos romaneios
        Object.keys(porVeiculo).forEach(placa => {
            const notasDoVeiculo = notasFiscais.filter(n => 
                porVeiculo[placa].notasIds.includes(n.id)
            );
            porVeiculo[placa].notas = notasDoVeiculo;
        });

        // Coletas pendentes
        const coletasPendentes = coletasDiarias.filter(c => c.status === "pendente").length;
        if (coletasPendentes > 0) {
            if (!porVeiculo["COLETAS"]) {
                porVeiculo["COLETAS"] = { entregas: 0, coletas: coletasPendentes, notas: [] };
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

    const buildVeiculoPrintHtml = (placa, agrupadas, veiculo, todasNotas) => {
        const totalEntregas = todasNotas.length;
        const totalVolumes = todasNotas.reduce((acc, n) => acc + (parseInt(String(n.volume || '0').replace(/\D/g, '')) || 0), 0);
        const totalPeso = todasNotas.reduce((acc, n) => acc + (parseFloat(String(n.peso || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0), 0);

        const transpHtml = Object.entries(agrupadas).map(([transportadora, notas]) => {
            const subVol = notas.reduce((acc, n) => acc + (parseInt(String(n.volume || '0').replace(/\D/g, '')) || 0), 0);
            const subPeso = notas.reduce((acc, n) => acc + (parseFloat(String(n.peso || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0), 0);
            return `
                <div style="margin-bottom:8px; border:1px solid #bfdbfe; border-radius:5px; overflow:hidden; page-break-inside:avoid;">
                    <div style="background:#1e40af; color:white; padding:5px 10px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold; font-size:12px;">${transportadora}</span>
                        <span style="font-size:9px; background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:8px;">${notas.length} nota${notas.length > 1 ? 's' : ''}</span>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:9px;">
                        <thead>
                            <tr style="background:#eff6ff;">
                                <th style="padding:3px 6px; text-align:left; border-bottom:1px solid #dbeafe; width:18%;">NF</th>
                                <th style="padding:3px 6px; text-align:left; border-bottom:1px solid #dbeafe;">Cliente</th>
                                <th style="padding:3px 6px; text-align:center; border-bottom:1px solid #dbeafe; width:12%;">Vol</th>
                                <th style="padding:3px 6px; text-align:center; border-bottom:1px solid #dbeafe; width:14%;">Peso (kg)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${notas.map((nota, i) => `
                                <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">
                                    <td style="padding:3px 6px; border-bottom:1px solid #f1f5f9; font-weight:800; color:#1d4ed8; font-size:12px;">${nota.numero_nf || '-'}</td>
                                    <td style="padding:3px 6px; border-bottom:1px solid #f1f5f9; font-size:9px;">${nota.destinatario || '-'}</td>
                                    <td style="padding:3px 6px; border-bottom:1px solid #f1f5f9; text-align:center;">${nota.volume || '-'}</td>
                                    <td style="padding:3px 6px; border-bottom:1px solid #f1f5f9; text-align:center;">${nota.peso || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background:#dbeafe; font-weight:bold;">
                                <td colspan="2" style="padding:3px 6px; font-size:8px; color:#1e40af;">Subtotal ${transportadora.substring(0,20)}</td>
                                <td style="padding:3px 6px; text-align:center; color:#1e40af;">${subVol || '-'}</td>
                                <td style="padding:3px 6px; text-align:center; color:#1e40af;">${subPeso > 0 ? subPeso.toFixed(2) : '-'}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        }).join('');

        return `
            <div style="margin-bottom:12px; border:2px solid #2563eb; border-radius:6px; overflow:hidden; page-break-inside:avoid;">
                <div style="background:#1e3a8a; color:white; padding:5px 10px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; font-size:11px;">🚗 ${placa}${veiculo?.modelo ? ' - ' + veiculo.modelo : ''}</span>
                    <span style="font-size:9px;">${todasNotas.length} NFs | ${Object.keys(agrupadas).length} Transp.</span>
                </div>
                <div style="padding:6px;">
                    ${transpHtml}
                    <div style="background:#1e3a8a; color:white; padding:5px 10px; border-radius:4px; display:flex; justify-content:space-between; font-size:9px; font-weight:bold; margin-top:4px;">
                        <span>TOTAL GERAL: ${totalEntregas} entrega${totalEntregas !== 1 ? 's' : ''}</span>
                        <span>Volumes: ${totalVolumes || '-'}</span>
                        <span>Peso: ${totalPeso > 0 ? totalPeso.toFixed(2) + ' kg' : '-'}</span>
                        <span>Notas: ${totalEntregas}</span>
                    </div>
                </div>
            </div>
        `;
    };

    const handlePrintNotas = () => {
        const veiculo = veiculos.find(v => v.placa === placaSelecionada);
        const todasNotas = dashboardPorVeiculo[placaSelecionada]?.notas || [];
        
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        const conteudo = buildVeiculoPrintHtml(placaSelecionada, notasAgrupadas, veiculo, todasNotas);

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Notas do Veículo ${placaSelecionada}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; padding: 8mm; color: #1e293b; font-size: 9px; }
                    .header { display: flex; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 6px; margin-bottom: 8px; }
                    .logo img { max-width: 60px; max-height: 40px; object-fit: contain; margin-right: 10px; }
                    @media print { body { padding: 5mm; } @page { margin: 0; size: A4; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : ''}</div>
                    <div>
                        <p style="font-size:13px; font-weight:bold; color:#1e40af;">Notas - ${placaSelecionada}${veiculo?.modelo ? ' (' + veiculo.modelo + ')' : ''}</p>
                        <p style="font-size:9px; color:#64748b;">${todasNotas.length} notas | ${Object.keys(notasAgrupadas).length} transportadoras | ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                    </div>
                </div>
                ${conteudo}
            </body>
            </html>
        `);
        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    const handlePrintTodosDashboard = (printConfig = {}) => {
        const winPrint = window.open('', '_blank', 'width=900,height=700');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        let todosVeiculosHtml = '';
        let totalNotasGeral = 0;
        let totalVolumesGeral = 0;
        let totalPesoGeral = 0;
        let totalTransportadoras = new Set();

        Object.entries(dashboardPorVeiculo).forEach(([placa, dados]) => {
            if (placa === "COLETAS") return;
            
            const veiculo = veiculos.find(v => v.placa === placa);
            const notas = dados.notas || [];
            if (notas.length === 0) return;

            // Agrupar por transportadora
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

            totalNotasGeral += notas.length;
            const volVeiculo = notas.reduce((acc, n) => acc + (parseInt(String(n.volume || '0').replace(/\D/g, '')) || 0), 0);
            const pesoVeiculo = notas.reduce((acc, n) => acc + (parseFloat(String(n.peso || '0').replace(',', '.').replace(/[^\d.]/g, '')) || 0), 0);
            totalVolumesGeral += volVeiculo;
            totalPesoGeral += pesoVeiculo;

            todosVeiculosHtml += buildVeiculoPrintHtml(placa, agrupadas, veiculo, notas);
        });

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Dashboard Pendências</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; padding: 5mm; color: #1e293b; font-size: 9px; }
                    .header { display: flex; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 5px; margin-bottom: 6px; }
                    .logo img { max-width: 55px; max-height: 38px; object-fit: contain; margin-right: 10px; }
                    .summary { display: flex; gap: 10px; background: #eff6ff; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 9px; }
                    .summary-item { text-align: center; }
                    .summary-label { color: #64748b; font-size: 7px; text-transform: uppercase; }
                    .summary-value { font-weight: bold; color: #1e40af; font-size: 11px; }
                    .total-geral { background: #0f172a; color: white; padding: 6px 10px; border-radius: 5px; margin-top: 10px; display: flex; justify-content: space-around; font-size: 10px; font-weight: bold; }
                    @media print { body { padding: 4mm; } @page { margin: 0; size: A4; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : ''}</div>
                    <div>
                        <p style="font-size:13px; font-weight:bold; color:#1e40af;">${config.nome_empresa || ''} — PENDÊNCIAS POR VEÍCULO</p>
                        <p style="font-size:9px; color:#64748b;">${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                </div>

                <div class="summary">
                    <div class="summary-item"><div class="summary-label">Veículos</div><div class="summary-value">${Object.keys(dashboardPorVeiculo).filter(p => p !== "COLETAS").length}</div></div>
                    <div class="summary-item"><div class="summary-label">Notas</div><div class="summary-value">${totalNotasGeral}</div></div>
                    <div class="summary-item"><div class="summary-label">Transportadoras</div><div class="summary-value">${totalTransportadoras.size}</div></div>
                    <div class="summary-item"><div class="summary-label">Volumes</div><div class="summary-value">${totalVolumesGeral || '-'}</div></div>
                    <div class="summary-item"><div class="summary-label">Peso Total</div><div class="summary-value">${totalPesoGeral > 0 ? totalPesoGeral.toFixed(2) + ' kg' : '-'}</div></div>
                </div>

                ${todosVeiculosHtml}

                <div class="total-geral">
                    <span>Total Entregas: ${totalNotasGeral}</span>
                    <span>Volumes: ${totalVolumesGeral || '-'}</span>
                    <span>Peso: ${totalPesoGeral > 0 ? totalPesoGeral.toFixed(2) + ' kg' : '-'}</span>
                    <span>Notas: ${totalNotasGeral}</span>
                </div>
            </body>
            </html>
        `);

        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    // Todos os botões disponíveis com IDs únicos
    const todosOsBotoes = [
        { id: "nota_deposito", name: "Nota Depósito", href: "NotaDeposito", icon: Camera, color: "from-blue-600 via-blue-700 to-indigo-700", secao: "principais" },
        { id: "comprovantes", name: "Comprovantes", href: "ComprovantesInternos", icon: Upload, color: "from-cyan-500 via-sky-600 to-blue-600", secao: "principais" },
        { id: "ctes", name: "CTEs", href: "CTEs", icon: FileText, color: "from-purple-600 via-indigo-600 to-blue-600", secao: "principais" },
        { id: "coletas_diarias", name: "Coletas Diárias", href: "ColetasDiarias", icon: Package, color: "from-indigo-600 via-purple-600 to-violet-600", secao: "principais" },
        { id: "ordem_coleta", name: "Ordem de Coleta", href: "OrdensColeta", icon: ClipboardList, color: "from-violet-600 via-purple-600 to-indigo-600", secao: "principais" },
        { id: "cracha", name: "Crachá de Identificação", href: "CrachaIdentificacao", icon: Users, color: "from-emerald-500 via-teal-500 to-cyan-500", secao: "grande" },
        { id: "notas_fiscais", name: "Notas Fiscais", href: "NotasFiscais", icon: FileText, color: "from-amber-500 to-orange-600", secao: "grande" },
        { id: "rotas_gps", name: "Rotas GPS", href: "RotasGPS", icon: Navigation, secao: "rapidos" },
        { id: "veiculos", name: "Veículos", href: "Veiculos", icon: Car, secao: "rapidos" },
        { id: "mascara_romaneio", name: "Máscara Romaneio", href: "MascaraRomaneio", icon: Truck, color: "from-violet-500 to-purple-600", secao: "secundario" },
        { id: "romaneios_gerados", name: "Romaneios Gerados", href: "RomaneiosGerados", icon: BarChart3, color: "from-pink-500 to-rose-600", secao: "secundario" },
        { id: "relatorio", name: "Relatório", href: "ImpressaoRelatorio", icon: Printer, color: "from-indigo-500 to-purple-600", secao: "secundario" },
        { id: "clientes", name: "Clientes", href: "Clientes", icon: Users, color: "from-purple-500 to-indigo-600", secao: "secundario" },
        { id: "transportadoras", name: "Transportadoras", href: "Transportadoras", icon: Building2, color: "from-slate-500 to-gray-600", secao: "secundario" },
    ];

    // Filtrar botões conforme visibilidade
    const listaBotoesAtivos = isMobile ? botoesMobileVisiveis : botoesPCVisiveis;
    const ehVisivel = (id) => {
        const botao = todosOsBotoes.find(b => b.id === id);
        // Verificar configuração global de módulos
        if (modulosPermitidos && botao && !modulosPermitidos.includes(botao.href)) return false;
        return listaBotoesAtivos.length === 0 || listaBotoesAtivos.includes(id);
    };

    const mainButtons = todosOsBotoes.filter(b => b.secao === "principais" && ehVisivel(b.id));
    const bigButton = todosOsBotoes.find(b => b.id === "cracha" && ehVisivel(b.id));
    const mainButtons2 = todosOsBotoes.filter(b => b.id === "notas_fiscais" && ehVisivel(b.id));
    const quickButtons = todosOsBotoes.filter(b => b.secao === "rapidos" && ehVisivel(b.id));
    const menuItems = todosOsBotoes.filter(b => b.secao === "secundario" && ehVisivel(b.id));

    const adminItems = [
        { name: "Motoristas", href: "Motoristas", icon: Users },
        { name: "Avisos", href: "Avisos", icon: Bell },
        { name: "Configurações", href: "Configuracoes", icon: Settings },
        { name: "Personalizar", href: "#", icon: Settings2, onClick: () => setShowPersonalizar(true) },
    ];

    const handleSalvarPersonalizacao = async (mobileIds, pcIds) => {
        if (configs[0]?.id) {
            await base44.entities.Configuracoes.update(configs[0].id, {
                botoes_home_mobile: mobileIds,
                botoes_home_pc: pcIds
            });
            await refetchConfigs();
            setShowPersonalizar(false);
        }
    };

    return (
        <div className={`min-h-screen bg-gradient-to-br ${bgGradient} p-4 md:p-6 relative`}>
            <div className="max-w-6xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex flex-col items-center justify-center py-6">
                    {/* Notificações - canto direito */}
                    <div className="absolute top-4 right-4">
                        <NotificationBell />
                    </div>

                    {/* Logo Grande */}
                    {config.logo_url && (
                        <img 
                            src={config.logo_url} 
                            alt="Logo" 
                            className="h-28 md:h-36 object-contain mb-5 drop-shadow-xl" 
                        />
                    )}

                    {/* Widget Data/Hora/Tempo - sem fundo */}
                    <WeatherWidget />
                </div>

                {/* Avisos */}
                  {avisos.length > 0 && (
                      <div className="space-y-2">
                          {avisos.map(aviso => (
                              <div 
                                  key={aviso.id}
                                  className={`p-3 rounded-xl border-l-4 ${
                                      aviso.tipo === "urgente" 
                                          ? "bg-gray-500 border-red-500 text-white"
                                          : aviso.tipo === "alerta"
                                          ? "bg-gray-500 border-amber-500 text-white"
                                          : "bg-gray-500 border-blue-500 text-white"
                                  }`}
                              >
                                  <p className="font-semibold text-sm">{aviso.titulo}</p>
                                  <p className="text-xs opacity-90">{aviso.mensagem}</p>
                              </div>
                          ))}
                      </div>
                  )}

                {/* Botões Principais */}
                {mainButtons.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {mainButtons.map((item) => (
                        <Link key={item.name} to={createPageUrl(item.href)}>
                            <Button className={`w-full h-24 bg-gradient-to-br ${item.color} hover:scale-105 hover:shadow-2xl transition-all duration-300 shadow-xl border-2 border-white/30 flex flex-col items-center justify-center gap-2 rounded-2xl`}>
                                <item.icon className="w-8 h-8 text-white drop-shadow-md" />
                                <span className="text-sm font-bold text-white drop-shadow-md">{item.name}</span>
                            </Button>
                        </Link>
                    ))}
                </div>
                )}

                {/* Botão Grande - Crachá de Identificação */}
                {bigButton && (
                <Link to={createPageUrl(bigButton.href)}>
                    <Button className={`w-full h-20 bg-gradient-to-br ${bigButton.color} hover:scale-105 hover:shadow-2xl transition-all duration-300 shadow-xl border-2 border-white/30 flex items-center justify-center gap-3 rounded-2xl`}>
                        <bigButton.icon className="w-8 h-8 text-white drop-shadow-md" />
                        <span className="text-lg font-bold text-white drop-shadow-md">{bigButton.name}</span>
                    </Button>
                </Link>
                )}

                {/* Botão Notas Fiscais */}
                {mainButtons2.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                    {mainButtons2.map((item) => (
                        <Link key={item.name} to={createPageUrl(item.href)}>
                            <Button className={`w-full h-20 bg-gradient-to-br ${item.color} hover:scale-105 hover:shadow-2xl transition-all duration-300 shadow-xl border-2 border-white/30 flex items-center justify-center gap-3 rounded-2xl`}>
                                <item.icon className="w-8 h-8 text-white drop-shadow-md" />
                                <span className="text-lg font-bold text-white drop-shadow-md">{item.name}</span>
                            </Button>
                        </Link>
                    ))}
                </div>
                )}

                {/* Botões Rápidos */}
                {quickButtons.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {quickButtons.map((item) => (
                        <Link key={item.name} to={createPageUrl(item.href)}>
                            <Button variant="outline" className={`w-full h-12 ${temaEscuro ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white/80 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-400'} backdrop-blur-sm shadow-md rounded-xl transition-all duration-200`}>
                                <item.icon className="w-5 h-5 mr-2" />
                                {item.name}
                            </Button>
                        </Link>
                    ))}
                </div>
                )}

                {/* Dashboard por Veículo */}
                {Object.keys(dashboardPorVeiculo).length > 0 && (
                    <Card className="bg-white border-0 shadow-xl rounded-2xl overflow-hidden">
                        <CardHeader className="pb-2 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                        <BarChart3 className="w-4 h-4 text-white" />
                                    </div>
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
                        <CardContent className="p-4 pt-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(dashboardPorVeiculo).map(([placa, dados]) => {
                                    const veiculo = veiculos.find(v => v.placa === placa);
                                    const isColetas = placa === "COLETAS";

                                    return (
                                        <div 
                                            key={placa}
                                            onClick={() => handlePlacaClick(placa)}
                                            className={`p-3 rounded-xl border-l-4 cursor-pointer transition-all duration-200 hover:scale-102 hover:shadow-lg bg-white shadow-md ${isColetas ? 'border-emerald-500' : 'border-blue-500'} hover:shadow-xl`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {isColetas ? (
                                                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                                                            <Truck className="w-3.5 h-3.5 text-emerald-600" />
                                                        </div>
                                                    ) : (
                                                        <div className="p-1.5 bg-blue-100 rounded-lg">
                                                            <Car className="w-3.5 h-3.5 text-blue-600" />
                                                        </div>
                                                    )}
                                                    <span className="font-bold text-sm text-black">
                                                        {isColetas ? "Coletas" : placa}
                                                    </span>
                                                </div>
                                                {!isColetas && (
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                )}
                                            </div>
                                            {veiculo && (
                                                <p className="text-xs mb-1 text-slate-500">{veiculo.modelo}</p>
                                            )}
                                            <div className="flex gap-3 text-sm">
                                                {dados.entregas > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <Package className="w-3 h-3 text-orange-500" />
                                                        <span className="font-semibold text-orange-600">{dados.entregas}</span>
                                                        <span className="text-xs text-slate-400">entregas</span>
                                                    </div>
                                                )}
                                                {dados.coletas > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <Truck className="w-3 h-3 text-emerald-500" />
                                                        <span className="font-semibold text-emerald-600">{dados.coletas}</span>
                                                        <span className="text-xs text-slate-400">coletas</span>
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

                {/* Menu Secundário */}
                {menuItems.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {menuItems.map((item) => (
                        <Link key={item.name} to={createPageUrl(item.href)}>
                            <Card className={`border-0 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg ${temaEscuro ? 'bg-white/10 hover:bg-white/20 backdrop-blur-sm' : 'bg-white/80 hover:bg-white shadow-md'} rounded-xl`}>
                                <CardContent className="p-3 flex flex-col items-center text-center">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color} mb-2 shadow-md`}>
                                        <item.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <span className={`text-xs font-medium ${temaEscuro ? 'text-white' : 'text-slate-700'}`}>{item.name}</span>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
                )}

                {/* Menu Admin */}
                {isAdmin && (
                    <div className="flex gap-2 flex-wrap">
                        {adminItems.map((item) => (
                            item.onClick ? (
                                <Button 
                                    key={item.name}
                                    onClick={item.onClick}
                                    variant="ghost" 
                                    size="sm" 
                                    className={`${temaEscuro ? 'text-blue-200 hover:text-white hover:bg-white/10' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'} rounded-lg`}
                                >
                                    <item.icon className="w-4 h-4 mr-1" />
                                    {item.name}
                                </Button>
                            ) : (
                                <Link key={item.name} to={createPageUrl(item.href)}>
                                    <Button variant="ghost" size="sm" className={`${temaEscuro ? 'text-blue-200 hover:text-white hover:bg-white/10' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'} rounded-lg`}>
                                        <item.icon className="w-4 h-4 mr-1" />
                                        {item.name}
                                    </Button>
                                </Link>
                            )
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog Configuração de Impressão */}
            <PrintConfigDialog
                open={showPrintConfig}
                onOpenChange={setShowPrintConfig}
                onPrint={handlePrintTodosDashboard}
                configKey="homeDashboardPrint"
            />

            {/* Dialog Personalizar Botões */}
            <Dialog open={showPersonalizar} onOpenChange={setShowPersonalizar}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Personalizar Botões da Home</DialogTitle>
                    </DialogHeader>
                    <PersonalizarBotoes 
                        todosBotoes={todosOsBotoes}
                        mobileAtivos={botoesMobileVisiveis}
                        pcAtivos={botoesPCVisiveis}
                        onSalvar={handleSalvarPersonalizacao}
                    />
                </DialogContent>
            </Dialog>

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
                                    onClick={handlePrintNotas}
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
                                                {nota.filial && (
                                                    <Badge variant="outline" className="mt-1 text-xs">
                                                        Filial: {nota.filial}
                                                    </Badge>
                                                )}
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