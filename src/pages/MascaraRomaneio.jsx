import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    FileText, Printer, Truck, Calendar, Search, X, Plus
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MascaraRomaneio() {
    const [motorista, setMotorista] = useState("");
    const [dataRomaneio, setDataRomaneio] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notasSelecionadas, setNotasSelecionadas] = useState([]);
    const [search, setSearch] = useState("");
    const printRef = useRef();

    const { data: notasFiscais = [], isLoading } = useQuery({
        queryKey: ["notas-fiscais-romaneio"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas-romaneio"],
        queryFn: () => base44.entities.Motorista.filter({ status: "ativo" })
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    const toggleNota = (notaId) => {
        setNotasSelecionadas(prev => 
            prev.includes(notaId) 
                ? prev.filter(id => id !== notaId)
                : [...prev, notaId]
        );
    };

    const selecionarTodas = () => {
        if (notasSelecionadas.length === filtered.length) {
            setNotasSelecionadas([]);
        } else {
            setNotasSelecionadas(filtered.map(n => n.id));
        }
    };

    const filtered = notasFiscais.filter(n =>
        n.numero_nf?.toLowerCase().includes(search.toLowerCase()) ||
        n.destinatario?.toLowerCase().includes(search.toLowerCase()) ||
        n.transportadora?.toLowerCase().includes(search.toLowerCase())
    );

    const notasParaImprimir = notasFiscais.filter(n => notasSelecionadas.includes(n.id));
    const motoristaObj = motoristas.find(m => m.id === motorista);

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const handlePrint = () => {
        const winPrint = window.open('', '_blank', 'width=900,height=650');
        if (!winPrint) {
            alert("Por favor, permita pop-ups para imprimir.");
            return;
        }

        // Agrupar notas por transportadora
        const notasPorTransportadora = {};
        notasParaImprimir.forEach(nota => {
            const transp = nota.transportadora || "SEM TRANSPORTADORA";
            if (!notasPorTransportadora[transp]) {
                notasPorTransportadora[transp] = [];
            }
            notasPorTransportadora[transp].push(nota);
        });

        let rowsHtml = "";
        Object.entries(notasPorTransportadora).forEach(([transportadora, notas]) => {
            notas.forEach((nota, idx) => {
                rowsHtml += `
                    <tr>
                        <td class="remetente">${nota.remetente || config.nome_empresa || "TWG Transportes"}</td>
                        <td class="destinatario">${nota.destinatario || "-"}</td>
                        <td class="nfe">${nota.numero_nf || "-"}</td>
                        <td class="carimbo"></td>
                    </tr>
                    <tr class="transportadora-row">
                        <td colspan="2" class="transportadora-nome">${transportadora}</td>
                        <td class="volume">${nota.volume || "-"}</td>
                        <td class="vol-label">vol.</td>
                    </tr>
                `;
            });
        });

        // Adicionar linhas em branco para completar
        const linhasUsadas = notasParaImprimir.length * 2;
        const linhasRestantes = Math.max(0, 12 - linhasUsadas);
        for (let i = 0; i < linhasRestantes; i++) {
            rowsHtml += `
                <tr>
                    <td class="remetente"></td>
                    <td class="destinatario"></td>
                    <td class="nfe"></td>
                    <td class="carimbo"></td>
                </tr>
                <tr class="transportadora-row">
                    <td colspan="2" class="transportadora-nome"></td>
                    <td class="volume"></td>
                    <td class="vol-label">vol.</td>
                </tr>
            `;
        }

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Romaneio de Entregas</title>
                <style>
                    @media print {
                        @page { margin: 10mm; size: A4; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                    body { font-family: Arial, sans-serif; margin: 0; padding: 15px; }
                    .header { display: flex; align-items: flex-start; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .logo { width: 120px; margin-right: 20px; }
                    .logo img { max-width: 100%; max-height: 80px; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 22px; font-weight: bold; margin: 0; }
                    .company-address { font-size: 12px; color: #333; margin: 3px 0; }
                    .romaneio-info { text-align: right; }
                    .romaneio-title { font-size: 18px; font-weight: bold; margin: 0; }
                    .motorista-label { font-size: 14px; font-weight: bold; margin: 5px 0; }
                    .date { font-size: 20px; font-weight: bold; }
                    
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background: #f0f0f0; padding: 8px; text-align: left; border: 2px solid #000; font-size: 14px; }
                    td { padding: 10px 8px; border: 2px solid #000; font-size: 13px; }
                    
                    .remetente { width: 25%; }
                    .destinatario { width: 35%; text-align: center; font-weight: bold; font-size: 14px; }
                    .nfe { width: 20%; text-align: center; font-weight: bold; font-size: 18px; }
                    .carimbo { width: 20%; }
                    
                    .transportadora-row td { border-top: none; padding-top: 5px; padding-bottom: 15px; }
                    .transportadora-nome { font-size: 11px; font-weight: bold; }
                    .volume { text-align: center; font-size: 16px; font-weight: bold; }
                    .vol-label { font-size: 11px; font-weight: bold; }
                    
                    tr:nth-child(4n+1) td, tr:nth-child(4n+2) td { background: #fff; }
                    tr:nth-child(4n+3) td, tr:nth-child(4n) td { background: #fff; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        ${config.logo_url ? `<img src="${config.logo_url}" />` : '<div style="width:100px;height:60px;background:#0ea5e9;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:20px;">TWG</div>'}
                    </div>
                    <div class="company-info">
                        <p class="company-name">${config.nome_empresa || "TWG TRANSPORTES"}</p>
                        <p class="company-address">${config.endereco || "Rua Epaminondas de Oliveira, 249"}</p>
                        <p class="company-address">Centro, São Roque/SP CEP 18130-505</p>
                        <p class="company-address">Telefone: ${config.telefone || "11 4712.7072"}</p>
                    </div>
                    <div class="romaneio-info">
                        <p class="romaneio-title">ROMANEIO DE ENTREGAS</p>
                        <p class="motorista-label">Motorista: ${motoristaObj?.nome || motorista || ""}</p>
                        <p class="date">${formatDate(dataRomaneio)}</p>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Remetente</th>
                            <th>Destinatário</th>
                            <th>NFE</th>
                            <th>Carimbo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </body>
            </html>
        `);
        
        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                            <Truck className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Máscara Romaneio</h1>
                            <p className="text-slate-500">Gere romaneios com notas fiscais cadastradas</p>
                        </div>
                    </div>
                    <Button 
                        onClick={handlePrint}
                        disabled={notasSelecionadas.length === 0}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 h-14 px-8 text-lg"
                    >
                        <Printer className="w-6 h-6 mr-2" />
                        Imprimir Romaneio ({notasSelecionadas.length})
                    </Button>
                </div>

                {/* Configurações do Romaneio */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-emerald-600" />
                            Configurações do Romaneio
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Motorista</Label>
                                <Select value={motorista} onValueChange={setMotorista}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Selecione o motorista..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {motoristas.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Data do Romaneio</Label>
                                <Input
                                    type="date"
                                    value={dataRomaneio}
                                    onChange={(e) => setDataRomaneio(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Seleção de Notas Fiscais */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                Selecione as Notas Fiscais
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9 bg-white"
                                    />
                                </div>
                                <Button variant="outline" onClick={selecionarTodas}>
                                    {notasSelecionadas.length === filtered.length ? "Desmarcar" : "Selecionar"} Todas
                                </Button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                Nenhuma nota fiscal cadastrada. Cadastre notas no menu "Notas Fiscais".
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filtered.map((nota) => (
                                    <div 
                                        key={nota.id}
                                        onClick={() => toggleNota(nota.id)}
                                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                                            notasSelecionadas.includes(nota.id) 
                                                ? "bg-emerald-50 border-2 border-emerald-500" 
                                                : "bg-slate-50 border-2 border-transparent hover:bg-slate-100"
                                        }`}
                                    >
                                        <Checkbox 
                                            checked={notasSelecionadas.includes(nota.id)}
                                            onCheckedChange={() => toggleNota(nota.id)}
                                        />
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2">
                                            <div>
                                                <p className="text-xs text-slate-500">NF</p>
                                                <p className="font-bold text-blue-600">{nota.numero_nf}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Destinatário</p>
                                                <p className="font-medium">{nota.destinatario}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Transportadora</p>
                                                <p className="text-sm">{nota.transportadora || "-"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Volume</p>
                                                <p className="font-medium">{nota.volume || "-"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Peso</p>
                                                <p className="text-sm">{nota.peso || "-"}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Preview */}
                {notasSelecionadas.length > 0 && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-lg mb-4">Preview do Romaneio</h3>
                            <div className="bg-white border rounded-xl p-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="p-2 text-left border">Remetente</th>
                                            <th className="p-2 text-left border">Destinatário</th>
                                            <th className="p-2 text-center border">NFE</th>
                                            <th className="p-2 text-left border">Transportadora</th>
                                            <th className="p-2 text-center border">Vol.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notasParaImprimir.map(nota => (
                                            <tr key={nota.id} className="hover:bg-slate-50">
                                                <td className="p-2 border">{nota.remetente || config.nome_empresa || "TWG"}</td>
                                                <td className="p-2 border font-medium">{nota.destinatario}</td>
                                                <td className="p-2 border text-center font-bold text-blue-600">{nota.numero_nf}</td>
                                                <td className="p-2 border text-xs">{nota.transportadora || "-"}</td>
                                                <td className="p-2 border text-center">{nota.volume || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}