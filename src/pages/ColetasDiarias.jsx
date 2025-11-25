import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Calendar, Printer, Package, Search
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ColetasDiarias() {
    const [dataFiltro, setDataFiltro] = useState(format(new Date(), "yyyy-MM-dd"));

    const { data: ordens = [], isLoading } = useQuery({
        queryKey: ["ordens"],
        queryFn: () => base44.entities.OrdemColeta.list("-created_date")
    });

    const { data: clientes = [] } = useQuery({
        queryKey: ["clientes"],
        queryFn: () => base44.entities.Cliente.list()
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    // Filtrar ordens pela data
    const ordensFiltradas = ordens.filter(o => o.data_coleta === dataFiltro || o.data_ordem === dataFiltro);

    // Buscar dados completos do cliente
    const getClienteInfo = (clienteId, tipo) => {
        const cliente = clientes.find(c => c.id === clienteId);
        if (!cliente) return null;
        return cliente;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const statusLabels = {
        pendente: "Pendente",
        em_andamento: "Em Andamento",
        coletado: "Coletado",
        entregue: "Entregue",
        cancelado: "Cancelado"
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8 print:p-0 print:bg-white">
            <div className="max-w-7xl mx-auto space-y-6 print:max-w-none">
                {/* Header - esconde na impressão */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                            <Calendar className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Coletas Diárias</h1>
                            <p className="text-slate-500">Listagem de coletas por data</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="space-y-1">
                            <Label>Data</Label>
                            <Input
                                type="date"
                                value={dataFiltro}
                                onChange={(e) => setDataFiltro(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 mt-6">
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                        </Button>
                    </div>
                </div>

                {/* Documento para Impressão */}
                <div id="coletas-print" className="bg-white print:block">
                    <style>
                        {`
                        @media print {
                            body * { visibility: hidden; }
                            #coletas-print, #coletas-print * { visibility: visible; }
                            #coletas-print { 
                                position: absolute; 
                                left: 0; 
                                top: 0; 
                                width: 100%;
                                padding: 10mm;
                            }
                            @page { 
                                size: A4; 
                                margin: 10mm; 
                            }
                            .print-hide { display: none !important; }
                        }
                        `}
                    </style>

                    <Card className="border-0 shadow-xl print:shadow-none print:border">
                        {/* Cabeçalho do Relatório */}
                        <CardHeader className="border-b print:border-b-2 print:border-black">
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
                                    <p className="text-sm text-slate-500 print:hidden">
                                        {ordensFiltradas.length} coleta(s)
                                    </p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-100 print:bg-gray-200">
                                        <TableHead className="font-bold text-black w-1/2">DADOS FORNECEDOR/CLIENTE</TableHead>
                                        <TableHead className="font-bold text-black text-center w-1/4">DADOS CARGA</TableHead>
                                        <TableHead className="font-bold text-black text-center w-1/4">STATUS</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-12">
                                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : ordensFiltradas.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                                                <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                Nenhuma coleta para esta data
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        ordensFiltradas.map((ordem) => {
                                            const remetenteInfo = getClienteInfo(ordem.remetente_id);
                                            
                                            // Montar endereço completo
                                            const endereco = [
                                                ordem.remetente_endereco,
                                                ordem.remetente_bairro,
                                                ordem.remetente_cidade
                                            ].filter(Boolean).join(" - ");
                                            
                                            // Horário de funcionamento
                                            let horario = ordem.horario || "";
                                            if (remetenteInfo) {
                                                if (remetenteInfo.horario_funcionamento_inicio && remetenteInfo.horario_funcionamento_fim) {
                                                    horario = `${remetenteInfo.horario_funcionamento_inicio} AS ${remetenteInfo.horario_funcionamento_fim}`;
                                                }
                                            }
                                            
                                            // Intervalo
                                            let intervalo = ordem.almoco || "";
                                            if (remetenteInfo) {
                                                if (remetenteInfo.horario_almoco_inicio && remetenteInfo.horario_almoco_fim) {
                                                    intervalo = `${remetenteInfo.horario_almoco_inicio} AS ${remetenteInfo.horario_almoco_fim}`;
                                                }
                                            }

                                            return (
                                                <TableRow key={ordem.id} className="border-b print:border-black align-top">
                                                    <TableCell className="py-3">
                                                        <div className="space-y-0.5 text-sm">
                                                            <p><strong>REMETENTE:</strong> {ordem.remetente_nome}</p>
                                                            <p><strong>DESTINATARIO:</strong> {ordem.destinatario_nome}</p>
                                                            <p>{endereco}</p>
                                                            <p>CEP {ordem.remetente_cep || "-"} - {ordem.remetente_telefone || "-"}</p>
                                                            <p>HORARIO: {horario}{intervalo ? ` - INTERVALO ${intervalo}` : ""}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center py-3">
                                                        <div className="space-y-1">
                                                            <p className="font-medium">{ordem.volume || "-"} / {ordem.peso || "-"}</p>
                                                            <p className="text-sm">NFE{ordem.nfe || "-"}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center py-3">
                                                        <span className="font-medium">
                                                            {statusLabels[ordem.status] || ordem.status}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                    {/* Linhas vazias para completar a página */}
                                    {ordensFiltradas.length > 0 && ordensFiltradas.length < 8 && (
                                        [...Array(8 - ordensFiltradas.length)].map((_, i) => (
                                            <TableRow key={`empty-${i}`} className="border-b print:border-black h-20">
                                                <TableCell></TableCell>
                                                <TableCell></TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}