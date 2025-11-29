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
          Camera, ChevronRight, Bell, Printer
      } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import WeatherWidget from "@/components/shared/WeatherWidget";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Home() {
    const [placaSelecionada, setPlacaSelecionada] = useState(null);
    const [showNotasDialog, setShowNotasDialog] = useState(false);

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

    const isAdmin = currentUser?.role === "admin";

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

        // Adicionar notas fiscais reais aos veículos
        Object.keys(porVeiculo).forEach(placa => {
            const notasDoVeiculo = notasFiscais.filter(n => 
                porVeiculo[placa].notasIds.includes(n.id) || n.placa === placa
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

    const handlePrintNotas = () => {
        const veiculo = veiculos.find(v => v.placa === placaSelecionada);
        const todasNotas = dashboardPorVeiculo[placaSelecionada]?.notas || [];
        
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

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

        gerarImpressaoNotas(winPrint, placaSelecionada, veiculo, todasNotas.length, Object.keys(notasAgrupadas).length, notasHtml);
    };

    const handlePrintTodosDashboard = () => {
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        // Gerar HTML para todos os veículos
        let todosVeiculosHtml = '';
        let totalNotas = 0;
        let totalTransportadoras = new Set();

        Object.entries(dashboardPorVeiculo).forEach(([placa, dados]) => {
            if (placa === "COLETAS") return;
            
            const veiculo = veiculos.find(v => v.placa === placa);
            const notas = dados.notas || [];
            totalNotas += notas.length;

            // Agrupar por transportadora
            const agrupadas = {};
            notas.forEach(nota => {
                const transp = nota.transportadora || "SEM TRANSPORTADORA";
                totalTransportadoras.add(transp);
                if (!agrupadas[transp]) agrupadas[transp] = [];
                agrupadas[transp].push(nota);
            });

            if (Object.keys(agrupadas).length === 0) return;

            todosVeiculosHtml += `
                <div style="margin-bottom: 15px; border: 2px solid #2563eb; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                    <div style="background: #2563eb; color: white; padding: 8px 12px; font-weight: bold; font-size: 13px;">
                        🚗 ${placa} ${veiculo?.modelo ? '- ' + veiculo.modelo : ''} (${notas.length} notas)
                    </div>
                    ${Object.entries(agrupadas).map(([transp, notasT]) => `
                        <div style="border-bottom: 1px solid #e2e8f0;">
                            <div style="background: #eff6ff; padding: 6px 12px; font-size: 11px; font-weight: 600; color: #1e40af;">
                                ${transp} (${notasT.length})
                            </div>
                            <div style="padding: 6px 12px; font-size: 10px;">
                                ${notasT.map(n => `<span style="display: inline-block; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; margin: 2px;">${n.numero_nf || '-'} → ${(n.destinatario || '-').substring(0, 25)}</span>`).join(' ')}
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
                    body { font-family: Arial, sans-serif; padding: 15px; color: #1e293b; }
                    .header { display: flex; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 15px; }
                    .logo { width: 80px; margin-right: 15px; }
                    .logo img { max-width: 100%; max-height: 60px; object-fit: contain; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 16px; font-weight: bold; color: #1e293b; }
                    .company-details { font-size: 10px; color: #64748b; }
                    .title { text-align: center; font-size: 14px; font-weight: bold; color: #1e40af; margin: 10px 0; padding: 8px; background: #eff6ff; border-radius: 6px; }
                    .summary { display: flex; justify-content: center; gap: 30px; background: #f8fafc; padding: 8px; border-radius: 6px; margin-bottom: 15px; font-size: 11px; }
                    .summary-item { text-align: center; }
                    .summary-label { color: #64748b; text-transform: uppercase; font-size: 9px; }
                    .summary-value { font-size: 16px; font-weight: bold; color: #1e40af; }
                    .footer { margin-top: 15px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
                    @media print { body { padding: 10px; } @page { margin: 10mm; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        ${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : ''}
                    </div>
                    <div class="company-info">
                        <p class="company-name">${config.nome_empresa || 'TWG TRANSPORTES'}</p>
                        <p class="company-details">${config.cnpj ? 'CNPJ: ' + config.cnpj : ''} ${config.telefone ? ' | ' + config.telefone : ''}</p>
                    </div>
                </div>

                <div class="title">PENDÊNCIAS POR VEÍCULO</div>

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
                        <div class="summary-label">Transportadoras</div>
                        <div class="summary-value">${totalTransportadoras.size}</div>
                    </div>
                </div>

                ${todosVeiculosHtml}

                <div class="footer">
                    Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
            </body>
            </html>
        `);

        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    const mainButtons = [
        { name: "Nota Depósito", href: "NotaDeposito", icon: Camera, color: "from-blue-600 via-blue-700 to-indigo-700" },
        { name: "Comprovantes", href: "ComprovantesInternos", icon: Upload, color: "from-cyan-500 via-sky-600 to-blue-600" },
        { name: "Coletas Diárias", href: "ColetasDiarias", icon: Package, color: "from-indigo-600 via-purple-600 to-violet-600" },
        { name: "Ordem de Coleta", href: "OrdensColeta", icon: ClipboardList, color: "from-violet-600 via-purple-600 to-indigo-600" },
    ];

    const bigButton = { name: "Crachá de Identificação", href: "CrachaIdentificacao", icon: Users, color: "from-emerald-500 via-teal-500 to-cyan-500" };

    const quickButtons = [
        { name: "Rotas GPS", href: "RotasGPS", icon: Navigation },
        { name: "Veículos", href: "Veiculos", icon: Car },
    ];

    const menuItems = [
        { name: "Notas Fiscais", href: "NotasFiscais", icon: FileText, color: "from-amber-500 to-orange-600" },
        { name: "Máscara Romaneio", href: "MascaraRomaneio", icon: Truck, color: "from-violet-500 to-purple-600" },
        { name: "Romaneios Gerados", href: "RomaneiosGerados", icon: BarChart3, color: "from-pink-500 to-rose-600" },
        { name: "Relatório", href: "ImpressaoRelatorio", icon: Printer, color: "from-indigo-500 to-purple-600" },
        { name: "Clientes", href: "Clientes", icon: Users, color: "from-purple-500 to-indigo-600" },
        { name: "Transportadoras", href: "Transportadoras", icon: Building2, color: "from-slate-500 to-gray-600" },
    ];

    const adminItems = [
        { name: "Motoristas", href: "Motoristas", icon: Users },
        { name: "Avisos", href: "Avisos", icon: Bell },
        { name: "Configurações", href: "Configuracoes", icon: Settings },
    ];

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

                {/* Botão Grande - Crachá de Identificação */}
                <Link to={createPageUrl(bigButton.href)}>
                    <Button className={`w-full h-20 bg-gradient-to-br ${bigButton.color} hover:scale-105 hover:shadow-2xl transition-all duration-300 shadow-xl border-2 border-white/30 flex items-center justify-center gap-3 rounded-2xl`}>
                        <bigButton.icon className="w-8 h-8 text-white drop-shadow-md" />
                        <span className="text-lg font-bold text-white drop-shadow-md">{bigButton.name}</span>
                    </Button>
                </Link>

                {/* Botões Rápidos */}
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
                                <Button 
                                    onClick={handlePrintTodosDashboard}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Printer className="w-4 h-4 mr-1" />
                                    Imprimir Todos
                                </Button>
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

                {/* Menu Admin */}
                {isAdmin && (
                    <div className="flex gap-2 flex-wrap">
                        {adminItems.map((item) => (
                            <Link key={item.name} to={createPageUrl(item.href)}>
                                <Button variant="ghost" size="sm" className={`${temaEscuro ? 'text-blue-200 hover:text-white hover:bg-white/10' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'} rounded-lg`}>
                                    <item.icon className="w-4 h-4 mr-1" />
                                    {item.name}
                                </Button>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

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