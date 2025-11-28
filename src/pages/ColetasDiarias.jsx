import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Calendar, Printer, Package, CheckCircle, XCircle, Clock, Search, X, MapPin, ArrowDown, ArrowUp, Share2, FileText, Copy, AlertTriangle, Bell, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ColetasDiarias() {
    const [dataFiltro, setDataFiltro] = useState("");
    const [searchFiltro, setSearchFiltro] = useState("");
    const [motoristaFiltro, setMotoristaFiltro] = useState("");
    const [activeTab, setActiveTab] = useState("pendentes");
    const [criandoOrdem, setCriandoOrdem] = useState(null);
    const printRef = useRef();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: coletas = [], isLoading } = useQuery({
        queryKey: ["coletas-diarias"],
        queryFn: () => base44.entities.ColetaDiaria.list("-created_date")
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas"],
        queryFn: () => base44.entities.Motorista.filter({ status: "ativo" })
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    const { data: avisosAtivos = [] } = useQuery({
        queryKey: ["avisos-ativos-coletas"],
        queryFn: async () => {
            const avisos = await base44.entities.Aviso.filter({ ativo: true });
            const hoje = new Date().toISOString().split("T")[0];
            return avisos.filter(a => {
                if (a.data_inicio && a.data_inicio > hoje) return false;
                if (a.data_fim && a.data_fim < hoje) return false;
                return true;
            });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => base44.entities.ColetaDiaria.update(id, { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coletas-diarias"] })
    });

    const updateOrdemMutation = useMutation({
        mutationFn: ({ id, ordem }) => base44.entities.ColetaDiaria.update(id, { ordem }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coletas-diarias"] })
    });

    const clonarColetaMutation = useMutation({
        mutationFn: async (coleta) => {
            const { id, created_date, updated_date, created_by, ...dadosColeta } = coleta;
            return base44.entities.ColetaDiaria.create({
                ...dadosColeta,
                status: "pendente",
                data_coleta: new Date().toISOString().split("T")[0]
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["coletas-diarias"] });
            toast.success("Coleta clonada com sucesso!");
        }
    });

    const moverParaFinal = (coleta) => {
        const maxOrdem = Math.max(...coletasPendentes.map(c => c.ordem || 0), 0);
        updateOrdemMutation.mutate({ id: coleta.id, ordem: maxOrdem + 1000 });
    };

    const moverParaInicio = (coleta) => {
        updateOrdemMutation.mutate({ id: coleta.id, ordem: 0 });
    };

    const criarOrdemColeta = async (coleta) => {
        setCriandoOrdem(coleta.id);
        
        // Buscar configurações para obter o próximo número
        const configList = await base44.entities.Configuracoes.list();
        const configAtual = configList[0] || {};
        const proximoNumero = (configAtual.ultimo_numero_ordem || 0) + 1;
        
        // Criar a ordem de coleta
        const ordemData = {
            numero: String(proximoNumero).padStart(5, "0"),
            data_ordem: coleta.data_coleta || new Date().toISOString().split("T")[0],
            status: "pendente",
            remetente_id: coleta.remetente_id || "",
            remetente_nome: coleta.remetente_nome || "",
            remetente_endereco: coleta.remetente_endereco || "",
            remetente_bairro: coleta.remetente_bairro || "",
            remetente_cidade: coleta.remetente_cidade || "",
            remetente_cep: coleta.remetente_cep || "",
            remetente_telefone: coleta.remetente_telefone || "",
            destinatario_id: coleta.destinatario_id || "",
            destinatario_nome: coleta.destinatario_nome || "",
            peso: coleta.peso || "",
            volume: coleta.volume || "",
            nfe: coleta.nfe || "",
            data_coleta: coleta.data_coleta || new Date().toISOString().split("T")[0],
            horario: coleta.remetente_horario || "",
            almoco: coleta.remetente_intervalo || "",
            motorista_id: coleta.motorista_id || ""
        };
        
        await base44.entities.OrdemColeta.create(ordemData);
        
        // Atualizar o número da ordem nas configurações
        if (configAtual.id) {
            await base44.entities.Configuracoes.update(configAtual.id, { ultimo_numero_ordem: proximoNumero });
        } else {
            await base44.entities.Configuracoes.create({ ultimo_numero_ordem: proximoNumero });
        }
        
        setCriandoOrdem(null);
        alert(`Ordem de Coleta #${String(proximoNumero).padStart(5, "0")} criada com sucesso!`);
        navigate(createPageUrl("OrdensColeta"));
    };

    // Separar coletas por status
    let coletasFiltradas = coletas;
    
    if (dataFiltro) {
        coletasFiltradas = coletasFiltradas.filter(c => c.data_coleta === dataFiltro);
    }
    
    if (searchFiltro) {
        const search = searchFiltro.toLowerCase();
        coletasFiltradas = coletasFiltradas.filter(c => 
            c.remetente_nome?.toLowerCase().includes(search) ||
            c.destinatario_nome?.toLowerCase().includes(search)
        );
    }

    if (motoristaFiltro) {
        coletasFiltradas = coletasFiltradas.filter(c => c.motorista_id === motoristaFiltro);
    }

    const coletasPendentes = coletasFiltradas
        .filter(c => c.status === "pendente" || !c.status)
        .sort((a, b) => {
            // Primeiro por prioridade (prioritários primeiro)
            if (b.prioridade !== a.prioridade) return (b.prioridade ? 1 : 0) - (a.prioridade ? 1 : 0);
            // Depois por ordem (menor ordem primeiro)
            return (a.ordem || 0) - (b.ordem || 0);
        });
    const coletasRealizadas = coletasFiltradas.filter(c => c.status === "realizado" || c.status === "cancelado");

    const statusColors = {
        pendente: "bg-amber-100 text-amber-700",
        realizado: "bg-emerald-100 text-emerald-700",
        cancelado: "bg-red-100 text-red-700"
    };

    const statusLabels = {
        pendente: "Pendente",
        realizado: "Realizado",
        cancelado: "Cancelado"
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const handlePrint = () => {
        const coletasParaImprimir = activeTab === "pendentes" ? coletasPendentes : coletasRealizadas;
        const winPrint = window.open('', '_blank', 'width=900,height=650');
        if (!winPrint) {
            alert("Por favor, permita pop-ups para imprimir.");
            return;
        }

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Coletas Diárias - ${formatDate(dataFiltro)}</title>
                <style>
                    @media print {
                        @page { margin: 10mm; size: A4; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; font-size: 12px; }
                    .page { padding: 10mm; }
                    .header { display: flex; align-items: center; gap: 15px; padding-bottom: 10px; border-bottom: 2px solid #0ea5e9; margin-bottom: 15px; }
                    .logo { max-height: 50px; max-width: 120px; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 18px; font-weight: 800; color: #0369a1; }
                    .title { font-size: 16px; font-weight: 800; text-align: center; margin: 10px 0; color: #0369a1; }
                    .date-info { text-align: right; font-size: 14px; color: #64748b; font-weight: 600; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #0ea5e9; color: white; padding: 8px 10px; text-align: left; border: 1px solid #0284c7; font-weight: 700; font-size: 12px; }
                    td { padding: 8px 10px; border: 1px solid #cbd5e1; vertical-align: top; font-size: 11px; line-height: 1.4; }
                    .num { width: 40px; text-align: center; font-weight: 800; background: #f0f9ff; font-size: 14px; }
                    .status { text-align: center; width: 50px; font-size: 16px; }
                    .carga { text-align: center; width: 100px; font-size: 11px; }
                    tr:nth-child(even) { background: #f8fafc; }
                    .priority { background: #fef3c7 !important; }
                    strong { font-size: 12px; font-weight: 700; }
                    .avisos { margin-top: 15px; padding: 10px; border: 1px solid #f59e0b; background: #fef3c7; font-size: 11px; }
                    .avisos h3 { font-size: 12px; margin-bottom: 5px; }
                    .linhas-anotacao { margin-top: 20px; }
                    .linha { border-bottom: 1px solid #cbd5e1; height: 20mm; }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        ${config.logo_url ? `<img src="${config.logo_url}" class="logo" />` : ''}
                        <div class="company-info">
                            <p class="company-name">${config.nome_empresa || "Controle TWG"}</p>
                        </div>
                        <div class="date-info">
                            <strong>DATA:</strong> ${formatDate(dataFiltro) || formatDate(new Date().toISOString().split("T")[0])} | ${coletasParaImprimir.length} coleta(s)
                        </div>
                    </div>
                    <div class="title">COLETAS - ${activeTab === "pendentes" ? "PENDENTES" : "REALIZADAS"}</div>
                    <table>
                        <thead>
                            <tr>
                                <th class="num">Nº</th>
                                <th>FORNECEDOR/CLIENTE</th>
                                <th class="carga">CARGA</th>
                                <th class="status">✓</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${coletasParaImprimir.map((c, idx) => {
                                const endereco = [c.remetente_bairro, c.remetente_cidade].filter(Boolean).join(" - ");
                                return `
                                    <tr class="${c.prioridade ? 'priority' : ''}">
                                        <td class="num">${idx + 1}</td>
                                        <td>
                                            <strong>${c.remetente_fantasia || c.remetente_nome || ""} / ${c.destinatario_fantasia || c.destinatario_nome || ""}</strong>${c.prioridade ? ' ⚡' : ''}<br>
                                            ${endereco ? endereco + " | " : ""}${c.remetente_telefone || ""} ${c.remetente_horario ? "| " + c.remetente_horario : ""}
                                            ${c.recado ? `<br>📝 ${c.recado}` : ""}
                                        </td>
                                        <td class="carga">${c.volume || "-"} / ${c.peso || "-"}<br>NF: ${c.nfe || "-"}</td>
                                        <td class="status">${c.status === 'realizado' ? '✅' : c.status === 'cancelado' ? '❌' : '⬜'}</td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                    ${avisosAtivos.length > 0 ? `
                        <div class="avisos">
                            <h3>📢 AVISOS</h3>
                            ${avisosAtivos.map(aviso => `<strong>${aviso.titulo}:</strong> ${aviso.mensagem} `).join(' | ')}
                        </div>
                    ` : ''}
                    <div class="linhas-anotacao">
                        <div class="linha"></div>
                        <div class="linha"></div>
                        <div class="linha"></div>
                        <div class="linha"></div>
                        <div class="linha"></div>
                    </div>
                </div>
            </body>
            </html>
        `);
        
        winPrint.document.close();
        setTimeout(() => winPrint.print(), 300);
    };

    const handleShare = () => {
        const coletasParaCompartilhar = activeTab === "pendentes" ? coletasPendentes : coletasRealizadas;
        const dataLabel = dataFiltro ? formatDate(dataFiltro) : "Todas as datas";
        
        let texto = `*${config.nome_empresa || "COLETAS"}*\n`;
        texto += `📅 ${dataLabel}\n`;
        texto += `📦 ${coletasParaCompartilhar.length} coleta(s) ${activeTab === "pendentes" ? "pendentes" : "realizadas"}\n\n`;
        
        coletasParaCompartilhar.forEach((c, idx) => {
            const endereco = [c.remetente_endereco, c.remetente_bairro, c.remetente_cidade].filter(Boolean).join(" - ");
            texto += `*${idx + 1}.* ${c.remetente_fantasia || c.remetente_nome} / ${c.destinatario_fantasia || c.destinatario_nome}${c.prioridade ? ' ⚡' : ''}\n`;
            if (endereco) texto += `📍 ${endereco}\n`;
            if (c.remetente_telefone) texto += `📞 ${c.remetente_telefone}`;
            if (c.remetente_horario) texto += ` - ⏰ ${c.remetente_horario}`;
            texto += `\n`;
            if (c.volume || c.peso) texto += `📦 ${c.volume || "-"} / ${c.peso || "-"}`;
            if (c.nfe) texto += ` | NF: ${c.nfe}`;
            texto += `\n`;
            if (c.recado) texto += `📝 ${c.recado}\n`;
            texto += `\n`;
        });
        
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
    };

    const renderColetaRow = (coleta, index) => {
        const endereco = [
            coleta.remetente_endereco,
            coleta.remetente_bairro,
            coleta.remetente_cidade
        ].filter(Boolean).join(" - ");

        return (
            <tr key={coleta.id} className={`border-b-4 border-slate-400 hover:bg-sky-50/50 ${coleta.prioridade ? "bg-yellow-50" : ""}`}>
                <td className="p-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${coleta.prioridade ? "bg-yellow-400 text-yellow-900" : "bg-sky-100 text-sky-700"}`}>
                            {index + 1}
                        </span>
                        {coleta.prioridade && (
                            <Badge className="bg-yellow-400 text-yellow-900 text-xs">PRIORIDADE</Badge>
                        )}
                    </div>
                </td>
                <td className="p-3">
                    <div className="space-y-0.5 text-sm">
                        <p className="font-semibold text-slate-800">
                            {coleta.remetente_fantasia || coleta.remetente_nome} / {coleta.destinatario_fantasia || coleta.destinatario_nome}
                        </p>
                        {endereco && (
                            <a 
                                href={`https://waze.com/ul?q=${encodeURIComponent(endereco)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sky-600 hover:text-sky-800 hover:underline"
                            >
                                <MapPin className="w-3 h-3" />
                                {endereco}
                            </a>
                        )}
                        <p>{coleta.remetente_telefone || "-"}</p>
                        <p>HORARIO: {coleta.remetente_horario || "-"}{coleta.remetente_intervalo ? ` - INTERVALO ${coleta.remetente_intervalo}` : ""}</p>
                        {coleta.recado && (
                            <p className="text-sky-600"><strong>RECADO:</strong> {coleta.recado}</p>
                        )}
                    </div>
                </td>
                <td className="text-center p-3">
                    <div className="space-y-1">
                        <p className="font-medium">{coleta.volume || "-"} / {coleta.peso || "-"}</p>
                        <p className="text-sm">NFE{coleta.nfe || "-"}</p>
                    </div>
                </td>
                <td className="text-center p-3">
                    <div className="flex flex-col items-center gap-2">
                        <Badge className={statusColors[coleta.status || "pendente"]}>
                            {statusLabels[coleta.status || "pendente"]}
                        </Badge>
                        <Select 
                                          value={coleta.status || "pendente"} 
                                          onValueChange={(v) => updateStatusMutation.mutate({ id: coleta.id, status: v })}
                                      >
                                          <SelectTrigger className="w-28 h-7 text-xs">
                                              <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="pendente">
                                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pendente</span>
                                              </SelectItem>
                                              <SelectItem value="realizado">
                                                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Realizado</span>
                                              </SelectItem>
                                              <SelectItem value="cancelado">
                                                  <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelado</span>
                                              </SelectItem>
                                          </SelectContent>
                                      </Select>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moverParaInicio(coleta)}
                                title="Mover para início"
                            >
                                <ArrowUp className="w-3 h-3 text-blue-600" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moverParaFinal(coleta)}
                                title="Mover para final"
                            >
                                <ArrowDown className="w-3 h-3 text-orange-600" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => criarOrdemColeta(coleta)}
                                disabled={criandoOrdem === coleta.id}
                                title="Criar Ordem de Coleta"
                            >
                                {criandoOrdem === coleta.id ? (
                                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FileText className="w-3 h-3 text-indigo-600" />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => clonarColetaMutation.mutate(coleta)}
                                disabled={clonarColetaMutation.isPending}
                                title="Clonar Coleta"
                            >
                                <Copy className="w-3 h-3 text-purple-600" />
                            </Button>
                        </div>
                    </div>
                    </td>
            </tr>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl shadow-lg">
                            <Calendar className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Coletas Diárias</h1>
                            <p className="text-slate-500">Visualize coletas por data</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => {
                                queryClient.invalidateQueries({ queryKey: ["coletas-diarias"] });
                                queryClient.invalidateQueries({ queryKey: ["coletas-diarias-home"] });
                                toast.success("Coletas atualizadas!");
                            }} 
                            variant="outline" 
                            className="border-blue-500 text-blue-600 hover:bg-blue-50"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Atualizar
                        </Button>
                        <Button onClick={handleShare} variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                            <Share2 className="w-4 h-4 mr-2" />
                            Compartilhar
                        </Button>
                        <Button onClick={handlePrint} className="bg-sky-500 hover:bg-sky-600">
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                        </Button>
                    </div>
                </div>

                {/* Filtros */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Buscar por remetente ou destinatário..."
                                    value={searchFiltro}
                                    onChange={(e) => setSearchFiltro(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={dataFiltro}
                                    onChange={(e) => setDataFiltro(e.target.value)}
                                    className="w-40 bg-white"
                                    placeholder="Data"
                                />
                                {dataFiltro && (
                                    <Button variant="ghost" size="icon" onClick={() => setDataFiltro("")}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={motoristaFiltro} onValueChange={setMotoristaFiltro}>
                                <SelectTrigger className="w-full md:w-64 bg-white">
                                    <SelectValue placeholder="Filtrar por motorista..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>Todos os motoristas</SelectItem>
                                    {motoristas.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {motoristaFiltro && (
                                <Button variant="ghost" size="icon" onClick={() => setMotoristaFiltro("")}>
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="pendentes" value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="bg-white/80 backdrop-blur shadow-md p-1">
                                    <TabsTrigger value="pendentes" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">
                                        Pendentes ({coletasPendentes.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="realizadas" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                                        Realizadas/Canceladas ({coletasRealizadas.length})
                                    </TabsTrigger>
                                </TabsList>

                    <TabsContent value="pendentes">
                        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm" ref={printRef}>
                            <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-cyan-50">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        {config.logo_url && (
                                            <img src={config.logo_url} alt="Logo" className="h-12 object-contain" />
                                        )}
                                        <div>
                                            <h1 className="text-xl font-bold text-sky-700">COLETAS PENDENTES</h1>
                                            {config.nome_empresa && (
                                                <p className="text-sm text-slate-600">{config.nome_empresa}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-sky-700">DATA: {formatDate(dataFiltro) || "Todas"}</p>
                                        <p className="text-sm text-slate-500">{coletasPendentes.length} coleta(s)</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-sky-100 border-b">
                                            <th className="text-center p-3 font-bold w-16">Nº</th>
                                            <th className="text-left p-3 font-bold w-1/2">DADOS FORNECEDOR/CLIENTE</th>
                                            <th className="text-center p-3 font-bold w-1/6">DADOS CARGA</th>
                                            <th className="text-center p-3 font-bold w-1/6">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-12">
                                                    <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto" />
                                                </td>
                                            </tr>
                                        ) : coletasPendentes.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-12 text-slate-500">
                                                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                    Nenhuma coleta pendente
                                                </td>
                                            </tr>
                                        ) : (
                                            coletasPendentes.map((coleta, index) => renderColetaRow(coleta, index))
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="realizadas">
                        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        {config.logo_url && (
                                            <img src={config.logo_url} alt="Logo" className="h-12 object-contain" />
                                        )}
                                        <div>
                                            <h1 className="text-xl font-bold text-emerald-700">COLETAS REALIZADAS</h1>
                                            {config.nome_empresa && (
                                                <p className="text-sm text-slate-600">{config.nome_empresa}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-emerald-700">DATA: {formatDate(dataFiltro) || "Todas"}</p>
                                        <p className="text-sm text-slate-500">{coletasRealizadas.length} coleta(s)</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-emerald-100 border-b">
                                            <th className="text-center p-3 font-bold w-16">Nº</th>
                                            <th className="text-left p-3 font-bold w-1/2">DADOS FORNECEDOR/CLIENTE</th>
                                            <th className="text-center p-3 font-bold w-1/6">DADOS CARGA</th>
                                            <th className="text-center p-3 font-bold w-1/6">STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {coletasRealizadas.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-12 text-slate-500">
                                                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                    Nenhuma coleta realizada
                                                </td>
                                            </tr>
                                        ) : (
                                            coletasRealizadas.map((coleta, index) => renderColetaRow(coleta, index))
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Avisos no Rodapé */}
                {avisosAtivos.length > 0 && (
                    <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Bell className="w-5 h-5 text-amber-600" />
                                <h3 className="font-bold text-amber-800">Avisos Importantes</h3>
                            </div>
                            <div className="space-y-2">
                                {avisosAtivos.map(aviso => (
                                    <div 
                                        key={aviso.id} 
                                        className={`p-3 rounded-lg border-l-4 ${
                                            aviso.tipo === "urgente" 
                                                ? "bg-red-50 border-l-red-500" 
                                                : aviso.tipo === "alerta" 
                                                    ? "bg-amber-50 border-l-amber-500" 
                                                    : "bg-sky-50 border-l-sky-500"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            {aviso.tipo === "urgente" || aviso.tipo === "alerta" ? (
                                                <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                                                    aviso.tipo === "urgente" ? "text-red-600" : "text-amber-600"
                                                }`} />
                                            ) : (
                                                <Bell className="w-4 h-4 mt-0.5 text-sky-600" />
                                            )}
                                            <div>
                                                <h4 className={`font-semibold text-sm ${
                                                    aviso.tipo === "urgente" 
                                                        ? "text-red-800" 
                                                        : aviso.tipo === "alerta" 
                                                            ? "text-amber-800" 
                                                            : "text-sky-800"
                                                }`}>
                                                    {aviso.titulo}
                                                </h4>
                                                <p className="text-sm text-slate-600">{aviso.mensagem}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}