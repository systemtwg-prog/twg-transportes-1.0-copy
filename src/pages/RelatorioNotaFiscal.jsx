import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, Printer, Building2, Package, Scale, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RelatorioNotaFiscal() {
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [searchNF, setSearchNF] = useState("");
    const [searchTransportadora, setSearchTransportadora] = useState("");

    const { data: notasFiscais = [] } = useQuery({
        queryKey: ["notas-fiscais-relatorio-nf"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });
    const config = configs[0] || {};

    // Filtrar notas
    const notasFiltradas = useMemo(() => {
        return notasFiscais.filter(n => {
            const matchDataInicio = !dataInicio || n.data >= dataInicio;
            const matchDataFim = !dataFim || n.data <= dataFim;
            const matchNF = !searchNF || 
                n.numero_nf?.toLowerCase().includes(searchNF.toLowerCase());
            const matchTransportadora = !searchTransportadora || 
                n.transportadora?.toLowerCase().includes(searchTransportadora.toLowerCase());
            return matchDataInicio && matchDataFim && matchNF && matchTransportadora;
        });
    }, [notasFiscais, dataInicio, dataFim, searchNF, searchTransportadora]);

    // Estatísticas
    const stats = useMemo(() => {
        let totalVolume = 0;
        let totalPeso = 0;
        const transportadoras = new Set();

        notasFiltradas.forEach(nota => {
            const volume = parseInt(nota.volume?.match(/\d+/)?.[0]) || 0;
            const peso = parseFloat(nota.peso?.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
            totalVolume += volume;
            totalPeso += peso;
            if (nota.transportadora) transportadoras.add(nota.transportadora);
        });

        return { totalVolume, totalPeso, totalTransportadoras: transportadoras.size };
    }, [notasFiltradas]);

    const handleImprimir = () => {
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        const notasHtml = notasFiltradas.map(nota => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #2563eb;">${nota.numero_nf || '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${nota.destinatario || '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${nota.transportadora || '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${nota.volume || '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${nota.peso || '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${nota.data ? format(new Date(nota.data), "dd/MM/yyyy") : '-'}</td>
            </tr>
        `).join('');

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório por Nota Fiscal</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; padding: 15px; color: #1e293b; }
                    .header { display: flex; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 15px; }
                    .logo { width: 80px; margin-right: 15px; }
                    .logo img { max-width: 100%; max-height: 60px; object-fit: contain; }
                    .company-name { font-size: 16px; font-weight: bold; }
                    .company-details { font-size: 10px; color: #64748b; }
                    .title { text-align: center; font-size: 14px; font-weight: bold; color: #1e40af; margin: 10px 0; padding: 8px; background: #eff6ff; border-radius: 6px; }
                    .summary { display: flex; justify-content: center; gap: 20px; background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 15px; }
                    .summary-item { text-align: center; }
                    .summary-label { color: #64748b; text-transform: uppercase; font-size: 9px; }
                    .summary-value { font-size: 16px; font-weight: bold; color: #1e40af; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    thead { background: #f8fafc; }
                    th { padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: bold; }
                    @media print { @page { margin: 10mm; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        ${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : ''}
                    </div>
                    <div>
                        <p class="company-name">${config.nome_empresa || 'TWG TRANSPORTES'}</p>
                        <p class="company-details">${config.endereco || ''}</p>
                    </div>
                </div>

                <div class="title">RELATÓRIO POR NOTA FISCAL ${dataInicio && dataFim ? `- ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}` : ''}</div>

                <div class="summary">
                    <div class="summary-item">
                        <div class="summary-label">Total Notas</div>
                        <div class="summary-value">${notasFiltradas.length}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Volume Total</div>
                        <div class="summary-value">${stats.totalVolume}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Peso Total</div>
                        <div class="summary-value">${stats.totalPeso.toFixed(1)} kg</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Transportadoras</div>
                        <div class="summary-value">${stats.totalTransportadoras}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>NF</th>
                            <th>Destinatário</th>
                            <th>Transportadora</th>
                            <th style="text-align: center;">Volume</th>
                            <th style="text-align: center;">Peso</th>
                            <th style="text-align: center;">Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${notasHtml}
                    </tbody>
                </table>
            </body>
            </html>
        `);

        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Relatório por Nota Fiscal</h1>
                            <p className="text-slate-500">Listagem completa de notas fiscais</p>
                        </div>
                    </div>
                    <Button
                        onClick={handleImprimir}
                        disabled={notasFiltradas.length === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>
                </div>

                {/* Filtros */}
                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Data Início</Label>
                                <Input
                                    type="date"
                                    value={dataInicio}
                                    onChange={(e) => setDataInicio(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data Fim</Label>
                                <Input
                                    type="date"
                                    value={dataFim}
                                    onChange={(e) => setDataFim(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Número NF</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar NF..."
                                        value={searchNF}
                                        onChange={(e) => setSearchNF(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Transportadora</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar transportadora..."
                                        value={searchTransportadora}
                                        onChange={(e) => setSearchTransportadora(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Resumo */}
                <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-white border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-1">
                                <FileText className="w-4 h-4" />
                                Total NFs
                            </div>
                            <p className="text-3xl font-bold text-blue-600">{notasFiltradas.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-1">
                                <Package className="w-4 h-4" />
                                Volume Total
                            </div>
                            <p className="text-3xl font-bold text-amber-600">{stats.totalVolume}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-1">
                                <Scale className="w-4 h-4" />
                                Peso Total
                            </div>
                            <p className="text-3xl font-bold text-orange-600">{stats.totalPeso.toFixed(1)} kg</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-1">
                                <Building2 className="w-4 h-4" />
                                Transportadoras
                            </div>
                            <p className="text-3xl font-bold text-indigo-600">{stats.totalTransportadoras}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabela de Notas */}
                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Notas Fiscais ({notasFiltradas.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>NF</TableHead>
                                        <TableHead>Destinatário</TableHead>
                                        <TableHead>Transportadora</TableHead>
                                        <TableHead className="text-center">Volume</TableHead>
                                        <TableHead className="text-center">Peso</TableHead>
                                        <TableHead>Placa</TableHead>
                                        <TableHead className="text-center">Data</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {notasFiltradas.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                                                Nenhuma nota fiscal encontrada
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        notasFiltradas.map(nota => (
                                            <TableRow key={nota.id} className="hover:bg-slate-50">
                                                <TableCell className="font-bold text-blue-600">{nota.numero_nf}</TableCell>
                                                <TableCell>{nota.destinatario || "-"}</TableCell>
                                                <TableCell className="text-sm">{nota.transportadora || "-"}</TableCell>
                                                <TableCell className="text-center">{nota.volume || "-"}</TableCell>
                                                <TableCell className="text-center">{nota.peso || "-"}</TableCell>
                                                <TableCell className="font-medium text-emerald-600">{nota.placa || "-"}</TableCell>
                                                <TableCell className="text-center">
                                                    {nota.data ? format(new Date(nota.data), "dd/MM/yyyy") : "-"}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}