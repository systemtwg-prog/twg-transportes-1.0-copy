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
    const [activeTab, setActiveTab] = useState("pendentes");
    const printRef = useRef();
    const queryClient = useQueryClient();

    const { data: coletas = [], isLoading } = useQuery({
        queryKey: ["coletas-diarias"],
        queryFn: () => base44.entities.ColetaDiaria.list("-created_date")
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

    // Separar coletas pendentes e realizadas/canceladas
    const coletasPendentes = coletas.filter(c => c.status === "pendente" || !c.status);
    const coletasRealizadas = coletas.filter(c => c.status === "realizado" || c.status === "cancelado");

    // Aplicar filtros
    const aplicarFiltros = (lista) => {
        let resultado = lista;
        if (dataFiltro) {
            resultado = resultado.filter(c => c.data_coleta === dataFiltro);
        }
        if (searchFiltro) {
            const search = searchFiltro.toLowerCase();
            resultado = resultado.filter(c => 
                c.remetente_nome?.toLowerCase().includes(search) ||
                c.destinatario_nome?.toLowerCase().includes(search)
            );
        }
        return resultado;
    };

    const coletasPendentesFiltradas = aplicarFiltros(coletasPendentes);
    const coletasRealizadasFiltradas = aplicarFiltros(coletasRealizadas);

    const statusColors = {
        pendente: "bg-amber-100 text-amber-800",
        realizado: "bg-emerald-100 text-emerald-800",
        cancelado: "bg-red-100 text-red-800"
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
        const coletasParaImprimir = activeTab === "pendentes" ? coletasPendentesFiltradas : coletasRealizadasFiltradas;
        const winPrint = window.open('', '', 'width=900,height=650');
        
        winPrint.document.write(`
            <html>
            <head>
                <title>Coletas Diárias - ${formatDate(dataFiltro)}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
                    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #0ea5e9; }
                    .header-left { display: flex; align-items: center; gap: 15px; }
                    .logo { max-height: 60px; object-fit: contain; }
                    .company-info { }
                    .company-name { font-size: 20px; font-weight: bold; color: #0369a1; }
                    .company-details { font-size: 11px; color: #64748b; margin-top: 4px; }
                    .title { font-size: 18px; font-weight: bold; color: #0369a1; }
                    .date { font-size: 14px; color: #64748b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th { background: #0ea5e9; color: white; padding: 10px; text-align: left; border: 1px solid #0284c7; font-weight: bold; }
                    td { padding: 8px; border: 1px solid #cbd5e1; vertical-align: top; }
                    .num { background: #e0f2fe; font-weight: bold; text-align: center; width: 40px; }
                    .status { text-align: center; }
                    .carga { text-align: center; }
                    .empty-row { height: 60px; }
                    tr:nth-child(even) { background: #f8fafc; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-left">
                        ${config.logo_url ? `<img src="${config.logo_url}" class="logo" />` : ""}
                        <div class="company-info">
                            <div class="company-name">${config.nome_empresa || "CONTROLE TWG"}</div>
                            <div class="company-details">
                                ${config.endereco ? config.endereco + "<br>" : ""}
                                ${config.telefone ? "Tel: " + config.telefone : ""} ${config.email ? " | " + config.email : ""}
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div class="title">COLETAS DIÁRIAS</div>
                        <div class="date">DATA: ${formatDate(dataFiltro) || format(new Date(), "dd/MM/yyyy")}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px">Nº</th>
                            <th style="width: 45%">DADOS FORNECEDOR/CLIENTE</th>
                            <th style="width: 25%" class="carga">DADOS CARGA</th>
                            <th style="width: 20%" class="status">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${coletasParaImprimir.map((c, index) => {
                            const endereco = [c.remetente_endereco, c.remetente_bairro, c.remetente_cidade].filter(Boolean).join(" - ");
                            return `
                                <tr>
                                    <td class="num">${index + 1}</td>
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
                                        NFE ${c.nfe || "-"}
                                    </td>
                                    <td class="status">${c.status === 'realizado' ? 'Realizado' : c.status === 'cancelado' ? 'Cancelado' : 'Pendente'}</td>
                                </tr>
                            `;
                        }).join("")}
                    </tbody>
                </table>
            </body>
            </html>
        `);
        
        winPrint.document.close();
        winPrint.focus();
        setTimeout(() => {
            winPrint.print();
            winPrint.close();
        }, 250);
    };

    const renderColetas = (listaColetas, mostrarNumeracao = true) => (
        <table className="w-full">
            <thead>
                <tr className="bg-sky-100 border-b">
                    <th className="text-center p-3 font-bold w-12">Nº</th>
                    <th className="text-left p-3 font-bold w-1/2">DADOS FORNECEDOR/CLIENTE</th>
                    <th className="text-center p-3 font-bold w-1/4">DADOS CARGA</th>
                    <th className="text-center p-3 font-bold w-1/4">STATUS</th>
                </tr>
            </thead>
            <tbody>
                {isLoading ? (
                    <tr>
                        <td colSpan={4} className="text-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto" />
                        </td>
                    </tr>
                ) : listaColetas.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-500">
                            <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            Nenhuma coleta encontrada
                        </td>
                    </tr>
                ) : (
                    listaColetas.map((coleta, index) => {
                        const endereco = [
                            coleta.remetente_endereco,
                            coleta.remetente_bairro,
                            coleta.remetente_cidade
                        ].filter(Boolean).join(" - ");

                        return (
                            <tr key={coleta.id} className="border-b hover:bg-sky-50">
                                <td className="text-center p-3">
                                    <div className="w-8 h-8 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center mx-auto">
                                        {index + 1}
                                    </div>
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
                                        <p className="text-sm">NFE {coleta.nfe || "-"}</p>
                                    </div>
                                </td>
                                <td className="text-center p-3">
                                    <div className="flex flex-col items-center gap-2">
                                        <Badge className={statusColors[coleta.status || "pendente"]}>
                                            {statusLabels[coleta.status || "pendente"]}
                                        </Badge>
                                        {(coleta.status === "pendente" || !coleta.status) && (
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
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-2xl shadow-lg">
                            <Calendar className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Coletas Diárias</h1>
                            <p className="text-slate-500">Visualize e gerencie coletas</p>
                        </div>
                    </div>
                    <Button onClick={handlePrint} className="bg-sky-600 hover:bg-sky-700">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>
                </div>

                {/* Filtros */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
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
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="bg-white/80 backdrop-blur shadow-md p-1">
                        <TabsTrigger value="pendentes" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">
                            Pendentes ({coletasPendentesFiltradas.length})
                        </TabsTrigger>
                        <TabsTrigger value="realizadas" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                            Realizadas/Canceladas ({coletasRealizadasFiltradas.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pendentes">
                        <Card className="border-0 shadow-xl overflow-hidden" ref={printRef}>
                            <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-cyan-50">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        {config.logo_url && (
                                            <img src={config.logo_url} alt="Logo" className="h-12 object-contain" />
                                        )}
                                        <div>
                                            <h1 className="text-2xl font-bold text-sky-800">COLETAS PENDENTES</h1>
                                            {config.nome_empresa && (
                                                <p className="text-sm text-slate-600">{config.nome_empresa}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-sky-700">DATA: {formatDate(dataFiltro) || format(new Date(), "dd/MM/yyyy")}</p>
                                        <p className="text-sm text-slate-500">
                                            {coletasPendentesFiltradas.length} coleta(s)
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {renderColetas(coletasPendentesFiltradas)}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="realizadas">
                        <Card className="border-0 shadow-xl overflow-hidden">
                            <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-green-50">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        {config.logo_url && (
                                            <img src={config.logo_url} alt="Logo" className="h-12 object-contain" />
                                        )}
                                        <div>
                                            <h1 className="text-2xl font-bold text-emerald-800">COLETAS REALIZADAS</h1>
                                            {config.nome_empresa && (
                                                <p className="text-sm text-slate-600">{config.nome_empresa}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-emerald-700">DATA: {formatDate(dataFiltro) || format(new Date(), "dd/MM/yyyy")}</p>
                                        <p className="text-sm text-slate-500">
                                            {coletasRealizadasFiltradas.length} coleta(s)
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {renderColetas(coletasRealizadasFiltradas)}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}