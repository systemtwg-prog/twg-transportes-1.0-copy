import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Search, Printer, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RelatorioDestinatario() {
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [searchDestinatario, setSearchDestinatario] = useState("");

    const { data: notasFiscais = [] } = useQuery({
        queryKey: ["notas-fiscais-relatorio-dest"],
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
            const matchDestinatario = !searchDestinatario || 
                n.destinatario?.toLowerCase().includes(searchDestinatario.toLowerCase());
            return matchDataInicio && matchDataFim && matchDestinatario;
        });
    }, [notasFiscais, dataInicio, dataFim, searchDestinatario]);

    // Agrupar por destinatário
    const porDestinatario = useMemo(() => {
        const agrupado = {};
        notasFiltradas.forEach(nota => {
            const dest = nota.destinatario || "SEM DESTINATÁRIO";
            if (!agrupado[dest]) {
                agrupado[dest] = {
                    notas: [],
                    totalVolume: 0,
                    totalPeso: 0
                };
            }
            agrupado[dest].notas.push(nota);
            
            // Somar volumes e pesos
            const volume = parseInt(nota.volume?.match(/\d+/)?.[0]) || 0;
            const peso = parseFloat(nota.peso?.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
            agrupado[dest].totalVolume += volume;
            agrupado[dest].totalPeso += peso;
        });
        return agrupado;
    }, [notasFiltradas]);

    const handleImprimir = () => {
        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        const destinatariosHtml = Object.entries(porDestinatario)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([destinatario, dados]) => `
                <div style="margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                    <div style="background: #eff6ff; padding: 10px 15px; border-bottom: 1px solid #dbeafe;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: bold; color: #1e40af; font-size: 14px;">${destinatario}</span>
                            <div style="display: flex; gap: 10px;">
                                <span style="background: #dbeafe; color: #1e40af; padding: 3px 10px; border-radius: 10px; font-size: 11px;">${dados.notas.length} NF(s)</span>
                                <span style="background: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 10px; font-size: 11px;">${dados.totalVolume} vol</span>
                                <span style="background: #fed7aa; color: #9a3412; padding: 3px 10px; border-radius: 10px; font-size: 11px;">${dados.totalPeso.toFixed(1)} kg</span>
                            </div>
                        </div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="padding: 6px; text-align: left; border-bottom: 1px solid #e2e8f0;">NF</th>
                                <th style="padding: 6px; text-align: left; border-bottom: 1px solid #e2e8f0;">Transportadora</th>
                                <th style="padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0;">Volume</th>
                                <th style="padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0;">Peso</th>
                                <th style="padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0;">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dados.notas.map(nota => `
                                <tr>
                                    <td style="padding: 6px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #2563eb;">${nota.numero_nf || '-'}</td>
                                    <td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${nota.transportadora || '-'}</td>
                                    <td style="padding: 6px; border-bottom: 1px solid #f1f5f9; text-align: center;">${nota.volume || '-'}</td>
                                    <td style="padding: 6px; border-bottom: 1px solid #f1f5f9; text-align: center;">${nota.peso || '-'}</td>
                                    <td style="padding: 6px; border-bottom: 1px solid #f1f5f9; text-align: center;">${nota.data ? format(new Date(nota.data), "dd/MM/yyyy") : '-'}</td>
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
                <title>Relatório por Destinatário</title>
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

                <div class="title">RELATÓRIO POR DESTINATÁRIO ${dataInicio && dataFim ? `- ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}` : ''}</div>

                <div class="summary">
                    <div class="summary-item">
                        <div class="summary-label">Destinatários</div>
                        <div class="summary-value">${Object.keys(porDestinatario).length}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Total Notas</div>
                        <div class="summary-value">${notasFiltradas.length}</div>
                    </div>
                </div>

                ${destinatariosHtml}
            </body>
            </html>
        `);

        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Relatório por Destinatário</h1>
                            <p className="text-slate-500">Notas fiscais agrupadas por destinatário</p>
                        </div>
                    </div>
                    <Button
                        onClick={handleImprimir}
                        disabled={Object.keys(porDestinatario).length === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>
                </div>

                {/* Filtros */}
                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                <Label>Buscar Destinatário</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Nome do destinatário..."
                                        value={searchDestinatario}
                                        onChange={(e) => setSearchDestinatario(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Resumo */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-white border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <p className="text-sm text-slate-500">Destinatários</p>
                            <p className="text-3xl font-bold text-indigo-600">{Object.keys(porDestinatario).length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-0 shadow-lg">
                        <CardContent className="p-4 text-center">
                            <p className="text-sm text-slate-500">Total de Notas</p>
                            <p className="text-3xl font-bold text-blue-600">{notasFiltradas.length}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabela por Destinatário */}
                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                            Notas por Destinatário
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(porDestinatario)
                                .sort((a, b) => a[0].localeCompare(b[0]))
                                .map(([destinatario, dados]) => (
                                    <div key={destinatario} className="border rounded-xl overflow-hidden">
                                        <div className="bg-indigo-50 p-4 border-b flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-indigo-800 text-lg">{destinatario}</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <Badge className="bg-blue-100 text-blue-700">
                                                    {dados.notas.length} NF(s)
                                                </Badge>
                                                <Badge className="bg-amber-100 text-amber-700">
                                                    {dados.totalVolume} vol
                                                </Badge>
                                                <Badge className="bg-orange-100 text-orange-700">
                                                    {dados.totalPeso.toFixed(1)} kg
                                                </Badge>
                                            </div>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50">
                                                    <TableHead>NF</TableHead>
                                                    <TableHead>Transportadora</TableHead>
                                                    <TableHead className="text-center">Volume</TableHead>
                                                    <TableHead className="text-center">Peso</TableHead>
                                                    <TableHead className="text-center">Data</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {dados.notas.map(nota => (
                                                    <TableRow key={nota.id}>
                                                        <TableCell className="font-bold text-blue-600">{nota.numero_nf}</TableCell>
                                                        <TableCell>{nota.transportadora || "-"}</TableCell>
                                                        <TableCell className="text-center">{nota.volume || "-"}</TableCell>
                                                        <TableCell className="text-center">{nota.peso || "-"}</TableCell>
                                                        <TableCell className="text-center">
                                                            {nota.data ? format(new Date(nota.data), "dd/MM/yyyy") : "-"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}