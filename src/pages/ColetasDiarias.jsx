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
    Calendar, Printer, Package, CheckCircle, XCircle, Clock, Search, X, MapPin
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ColetasDiarias() {
    const [dataFiltro, setDataFiltro] = useState("");
    const [searchFiltro, setSearchFiltro] = useState("");
    const [motoristaFiltro, setMotoristaFiltro] = useState("");
    const [activeTab, setActiveTab] = useState("pendentes");
    const printRef = useRef();
    const queryClient = useQueryClient();

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

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => base44.entities.ColetaDiaria.update(id, { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coletas-diarias"] })
    });

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

    const coletasPendentes = coletasFiltradas.filter(c => c.status === "pendente" || !c.status);
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
                        .print-btn { display: none; }
                    }
                    body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
                    .print-btn { display: block; width: 100%; max-width: 300px; margin: 0 auto 20px; padding: 15px 30px; font-size: 18px; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer; }
                    .print-btn:hover { background: #0284c7; }
                    .header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #0ea5e9; }
                    .logo { max-height: 80px; max-width: 200px; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 20px; font-weight: bold; color: #0369a1; margin: 0; }
                    .company-details { font-size: 11px; color: #64748b; margin: 3px 0; }
                    .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; color: #0369a1; }
                    .date-info { text-align: right; font-size: 12px; color: #64748b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #0ea5e9; color: white; padding: 10px; text-align: left; border: 1px solid #0284c7; font-weight: bold; }
                    td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: top; }
                    .num { width: 40px; text-align: center; font-weight: bold; background: #f0f9ff; }
                    .status { text-align: center; }
                    .carga { text-align: center; }
                    .empty-row { height: 60px; }
                    tr:nth-child(even) { background: #f8fafc; }
                </style>
            </head>
            <body>
                <button class="print-btn" onclick="window.print()">📄 Imprimir / Salvar como PDF</button>
                <div class="header">
                    ${config.logo_url ? `<img src="${config.logo_url}" class="logo" />` : ''}
                    <div class="company-info">
                        <p class="company-name">${config.nome_empresa || "Controle TWG"}</p>
                        ${config.endereco ? `<p class="company-details">${config.endereco}</p>` : ''}
                        ${config.telefone ? `<p class="company-details">Tel: ${config.telefone}</p>` : ''}
                        ${config.cnpj ? `<p class="company-details">CNPJ: ${config.cnpj}</p>` : ''}
                    </div>
                    <div class="date-info">
                        <p><strong>DATA:</strong> ${formatDate(dataFiltro) || formatDate(new Date().toISOString().split("T")[0])}</p>
                        <p>${coletasParaImprimir.length} coleta(s)</p>
                    </div>
                </div>
                <div class="title">COLETAS DIÁRIAS - ${activeTab === "pendentes" ? "PENDENTES" : "REALIZADAS"}</div>
                <table>
                    <thead>
                        <tr>
                            <th class="num">Nº</th>
                            <th style="width: 45%">DADOS FORNECEDOR/CLIENTE</th>
                            <th style="width: 20%" class="carga">DADOS CARGA</th>
                            <th style="width: 20%" class="status">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${coletasParaImprimir.map((c, idx) => {
                            const endereco = [c.remetente_endereco, c.remetente_bairro, c.remetente_cidade].filter(Boolean).join(" - ");
                            return `
                                <tr>
                                    <td class="num">${idx + 1}</td>
                                    <td>
                                        <strong>REMETENTE:</strong> ${c.remetente_nome}<br>
                                        <strong>DESTINATARIO:</strong> ${c.destinatario_nome}<br>
                                        ${endereco}<br>
                                        CEP ${c.remetente_cep || "-"} - ${c.remetente_telefone || "-"}<br>
                                        HORARIO: ${c.remetente_horario || "-"}${c.remetente_intervalo ? ` - INTERVALO ${c.remetente_intervalo}` : ""}
                                        ${c.recado ? `<br><strong>RECADO:</strong> ${c.recado}` : ""}
                                    </td>
                                    <td class="carga">
                                        ${c.volume || "-"} / ${c.peso || "-"}<br>
                                        NFE${c.nfe || "-"}
                                    </td>
                                    <td class="status">${c.status === 'realizado' ? '✓ Realizado' : c.status === 'cancelado' ? '✗ Cancelado' : '○ Pendente'}</td>
                                </tr>
                            `;
                        }).join("")}
                        ${coletasParaImprimir.length < 8 ? 
                            Array(8 - coletasParaImprimir.length).fill('<tr class="empty-row"><td class="num"></td><td></td><td></td><td></td></tr>').join("") 
                            : ""
                        }
                    </tbody>
                </table>
            </body>
            </html>
        `);
        
        winPrint.document.close();
        };

    const renderColetaRow = (coleta, index) => {
        const endereco = [
            coleta.remetente_endereco,
            coleta.remetente_bairro,
            coleta.remetente_cidade
        ].filter(Boolean).join(" - ");

        return (
            <tr key={coleta.id} className="border-b hover:bg-sky-50/50">
                <td className="p-3 text-center">
                    <span className="w-8 h-8 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold text-sm mx-auto">
                        {index + 1}
                    </span>
                </td>
                <td className="p-3">
                    <div className="space-y-0.5 text-sm">
                        <p><strong>REMETENTE:</strong> {coleta.remetente_nome}</p>
                        <p><strong>DESTINATARIO:</strong> {coleta.destinatario_nome}</p>
                        {endereco && (
                            <a 
                                href={`https://waze.com/ul?q=${encodeURIComponent(endereco + " " + (coleta.remetente_cep || ""))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sky-600 hover:text-sky-800 hover:underline"
                            >
                                <MapPin className="w-3 h-3" />
                                {endereco}
                            </a>
                        )}
                        <p>CEP {coleta.remetente_cep || "-"} - {coleta.remetente_telefone || "-"}</p>
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
                    <Button onClick={handlePrint} className="bg-sky-500 hover:bg-sky-600">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>
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
            </div>
        </div>
    );
}