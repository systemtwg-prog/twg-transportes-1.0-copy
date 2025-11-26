import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Calendar, Printer, Package, CheckCircle, XCircle, Clock, Search, X, MapPin
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ColetasDiarias() {
    const [dataFiltro, setDataFiltro] = useState("");
    const [statusFiltro, setStatusFiltro] = useState("todos");
    const [searchFiltro, setSearchFiltro] = useState("");
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

    // Aplicar todos os filtros - ocultar cancelados e pendentes por padrão
    let coletasFiltradas = coletas.filter(c => c.status !== "cancelado");
    
    if (dataFiltro) {
        coletasFiltradas = coletasFiltradas.filter(c => c.data_coleta === dataFiltro);
    }
    
    if (statusFiltro !== "todos") {
        if (statusFiltro === "cancelado") {
            // Se explicitamente filtrar por cancelado, mostrar todos os cancelados
            coletasFiltradas = coletas.filter(c => c.status === "cancelado");
        } else {
            coletasFiltradas = coletasFiltradas.filter(c => c.status === statusFiltro);
        }
    }
    
    if (searchFiltro) {
        const search = searchFiltro.toLowerCase();
        coletasFiltradas = coletasFiltradas.filter(c => 
            c.remetente_nome?.toLowerCase().includes(search) ||
            c.destinatario_nome?.toLowerCase().includes(search)
        );
    }

    const statusColors = {
        pendente: "bg-yellow-100 text-yellow-800",
        realizado: "bg-green-100 text-green-800",
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
        const printContent = printRef.current;
        const winPrint = window.open('', '', 'width=900,height=650');
        
        winPrint.document.write(`
            <html>
            <head>
                <title>Coletas Diárias - ${formatDate(dataFiltro)}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
                    .title { font-size: 18px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; }
                    th { background: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #000; font-weight: bold; }
                    td { padding: 8px; border: 1px solid #000; vertical-align: top; }
                    .status { text-align: center; }
                    .carga { text-align: center; }
                    .empty-row { height: 60px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">COLETAS DIÁRIAS</div>
                    <div>DATA: ${formatDate(dataFiltro)}</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50%">DADOS FORNECEDOR/CLIENTE</th>
                            <th style="width: 25%" class="carga">DADOS CARGA</th>
                            <th style="width: 25%" class="status">STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${coletasFiltradas.map(c => {
                            const endereco = [c.remetente_endereco, c.remetente_bairro, c.remetente_cidade].filter(Boolean).join(" - ");
                            return `
                                <tr>
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
                                    <td class="status">${c.status === 'realizado' ? 'Realizado' : c.status === 'cancelado' ? 'Cancelado' : 'Pendente'}</td>
                                </tr>
                            `;
                        }).join("")}
                        ${coletasFiltradas.length < 8 ? 
                            Array(8 - coletasFiltradas.length).fill('<tr class="empty-row"><td></td><td></td><td></td></tr>').join("") 
                            : ""
                        }
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                            <Calendar className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Coletas Diárias</h1>
                            <p className="text-slate-500">Visualize coletas realizadas por data</p>
                        </div>
                    </div>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
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
                            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                                <SelectTrigger className="w-full md:w-40 bg-white">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="realizado">Realizado</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                            {coletasFiltradas.length} coleta(s) encontrada(s)
                        </p>
                    </CardContent>
                </Card>

                {/* Documento */}
                <Card className="border-0 shadow-xl" ref={printRef}>
                    <CardHeader className="border-b">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                {config.logo_url && (
                                    <img src={config.logo_url} alt="Logo" className="h-12 object-contain" />
                                )}
                                <div>
                                    <h1 className="text-2xl font-bold">COLETAS DIÁRIAS</h1>
                                    {config.nome_empresa && (
                                        <p className="text-sm text-slate-600">{config.nome_empresa}</p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold">DATA: {formatDate(dataFiltro)}</p>
                                <p className="text-sm text-slate-500">
                                    {coletasFiltradas.length} coleta(s) cadastrada(s)
                                </p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-100 border-b">
                                    <th className="text-left p-3 font-bold w-1/2">DADOS FORNECEDOR/CLIENTE</th>
                                    <th className="text-center p-3 font-bold w-1/4">DADOS CARGA</th>
                                    <th className="text-center p-3 font-bold w-1/4">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-12">
                                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                        </td>
                                    </tr>
                                ) : coletasFiltradas.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="text-center py-12 text-slate-500">
                                            <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                            Nenhuma coleta realizada para esta data
                                        </td>
                                    </tr>
                                ) : (
                                    coletasFiltradas.map((coleta) => {
                                        const endereco = [
                                            coleta.remetente_endereco,
                                            coleta.remetente_bairro,
                                            coleta.remetente_cidade
                                        ].filter(Boolean).join(" - ");

                                        return (
                                            <tr key={coleta.id} className="border-b hover:bg-slate-50">
                                                <td className="p-3">
                                                    <div className="space-y-0.5 text-sm">
                                                        <p><strong>REMETENTE:</strong> {coleta.remetente_nome}</p>
                                                        <p><strong>DESTINATARIO:</strong> {coleta.destinatario_nome}</p>
                                                        {endereco && (
                                                            <a 
                                                                href={`https://waze.com/ul?q=${encodeURIComponent(endereco + " " + (coleta.remetente_cep || ""))}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                                            >
                                                                <MapPin className="w-3 h-3" />
                                                                {endereco}
                                                            </a>
                                                        )}
                                                        <p>CEP {coleta.remetente_cep || "-"} - {coleta.remetente_telefone || "-"}</p>
                                                        <p>HORARIO: {coleta.remetente_horario || "-"}{coleta.remetente_intervalo ? ` - INTERVALO ${coleta.remetente_intervalo}` : ""}</p>
                                                        {coleta.recado && (
                                                            <p className="text-blue-600"><strong>RECADO:</strong> {coleta.recado}</p>
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
                                                        <Badge className={statusColors[coleta.status]}>
                                                            {statusLabels[coleta.status]}
                                                        </Badge>
                                                        <Select 
                                                            value={coleta.status} 
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
                                    })
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}