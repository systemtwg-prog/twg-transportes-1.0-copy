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
    FileText, Printer, Truck, Calendar, Search, X, Plus, Car
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MascaraRomaneio() {
    const [motorista, setMotorista] = useState("");
    const [dataRomaneio, setDataRomaneio] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notasSelecionadas, setNotasSelecionadas] = useState([]);
    const [search, setSearch] = useState("");
    const [filterPlaca, setFilterPlaca] = useState("");
    const printRef = useRef();

    const { data: notasFiscais = [], isLoading } = useQuery({
        queryKey: ["notas-fiscais-romaneio"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas-romaneio"],
        queryFn: () => base44.entities.Motorista.filter({ status: "ativo" })
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-romaneio"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    // Obter placas únicas das notas fiscais
    const placasUnicas = [...new Set(notasFiscais.map(n => n.placa).filter(Boolean))];

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

    const filtered = notasFiscais.filter(n => {
        const matchSearch = n.numero_nf?.toLowerCase().includes(search.toLowerCase()) ||
            n.destinatario?.toLowerCase().includes(search.toLowerCase()) ||
            n.transportadora?.toLowerCase().includes(search.toLowerCase());
        const matchPlaca = !filterPlaca || n.placa === filterPlaca;
        return matchSearch && matchPlaca;
    });

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

        // Agrupar notas por placa
        const notasPorPlaca = {};
        notasParaImprimir.forEach(nota => {
            const placa = nota.placa || "SEM_PLACA";
            if (!notasPorPlaca[placa]) {
                notasPorPlaca[placa] = [];
            }
            notasPorPlaca[placa].push(nota);
        });

        let pagesHtml = "";

        Object.entries(notasPorPlaca).forEach(([placa, notasPlaca]) => {
            // Dividir em grupos de 6 notas por página
            const NOTAS_POR_PAGINA = 6;
            const totalPaginas = Math.ceil(notasPlaca.length / NOTAS_POR_PAGINA);

            for (let pagina = 0; pagina < totalPaginas; pagina++) {
                const notasDaPagina = notasPlaca.slice(pagina * NOTAS_POR_PAGINA, (pagina + 1) * NOTAS_POR_PAGINA);
                
                let rowsHtml = "";
                notasDaPagina.forEach((nota) => {
                    rowsHtml += `
                        <tr class="nota-row">
                            <td class="remetente">${nota.remetente || ""}</td>
                            <td class="destinatario">${nota.destinatario || "-"}</td>
                            <td class="nfe">${nota.numero_nf || "-"}</td>
                            <td class="carimbo" rowspan="2"></td>
                        </tr>
                        <tr class="transportadora-row">
                            <td class="transportadora-nome" colspan="2">${nota.transportadora || ""}</td>
                            <td class="volume">${nota.volume || "-"} vol</td>
                        </tr>
                    `;
                });

                // Adicionar linhas em branco para completar 6 notas
                const linhasRestantes = NOTAS_POR_PAGINA - notasDaPagina.length;
                for (let i = 0; i < linhasRestantes; i++) {
                    rowsHtml += `
                        <tr class="nota-row">
                            <td class="remetente"></td>
                            <td class="destinatario"></td>
                            <td class="nfe"></td>
                            <td class="carimbo" rowspan="2"></td>
                        </tr>
                        <tr class="transportadora-row">
                            <td class="transportadora-nome" colspan="2"></td>
                            <td class="volume"></td>
                        </tr>
                    `;
                }

                const placaDisplay = placa !== "SEM_PLACA" ? placa : "";
                const paginaInfo = totalPaginas > 1 ? ` (${pagina + 1}/${totalPaginas})` : "";

                pagesHtml += `
                    <div class="page">
                        <div class="header">
                            <div class="logo">
                                ${config.logo_url ? `<img src="${config.logo_url}" />` : '<div class="logo-placeholder">TWG</div>'}
                            </div>
                            <div class="company-info">
                                <p class="company-name">${config.nome_empresa || "TWG TRANSPORTES"}</p>
                                <p class="company-address">${config.endereco || "Rua Epaminondas de Oliveira, 249"}</p>
                                <p class="company-address">Centro, São Roque/SP CEP 18130-505</p>
                                <p class="company-address">Telefone: ${config.telefone || "11 4712.7072"}</p>
                            </div>
                            <div class="romaneio-info">
                                <p class="romaneio-title">ROMANEIO DE ENTREGAS${paginaInfo}</p>
                                <p class="motorista-label">Motorista: ${motoristaObj?.nome || motorista || ""}</p>
                                ${placaDisplay ? `<p class="placa-label">Placa: ${placaDisplay}</p>` : ""}
                                <p class="date">${formatDate(dataRomaneio)}</p>
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th class="col-remetente">Remetente</th>
                                    <th class="col-destinatario">Destinatário</th>
                                    <th class="col-nfe">NFE</th>
                                    <th class="col-carimbo">Carimbo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        });

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Romaneio de Entregas</title>
                <style>
                    @media print {
                        @page { margin: 8mm; size: A4; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        .page { page-break-after: always; }
                        .page:last-child { page-break-after: avoid; }
                    }
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                    .page { padding: 10px; min-height: 100vh; }
                    .header { display: flex; align-items: flex-start; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 8px; }
                    .logo { width: 100px; margin-right: 15px; }
                    .logo img { max-width: 100%; max-height: 70px; }
                    .logo-placeholder { width: 80px; height: 50px; background: #0ea5e9; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 18px; font-weight: bold; margin: 0; }
                    .company-address { font-size: 10px; color: #333; margin: 2px 0; }
                    .romaneio-info { text-align: right; }
                    .romaneio-title { font-size: 14px; font-weight: bold; margin: 0; }
                    .motorista-label { font-size: 12px; font-weight: bold; margin: 3px 0; }
                    .placa-label { font-size: 12px; font-weight: bold; margin: 3px 0; color: #0ea5e9; }
                    .date { font-size: 16px; font-weight: bold; }
                    
                    table { width: 100%; border-collapse: collapse; }
                    th { background: #e5e5e5; padding: 6px; text-align: left; border: 2px solid #000; font-size: 12px; }
                    td { padding: 4px 6px; border: 2px solid #000; font-size: 11px; }
                    
                    .col-remetente { width: 25%; }
                    .col-destinatario { width: 35%; }
                    .col-nfe { width: 15%; text-align: center; }
                    .col-carimbo { width: 25%; }
                    
                    .nota-row .remetente { vertical-align: top; height: 30px; }
                    .nota-row .destinatario { text-align: center; font-weight: bold; font-size: 13px; vertical-align: top; }
                    .nota-row .nfe { text-align: center; font-weight: bold; font-size: 16px; vertical-align: top; }
                    .nota-row .carimbo { vertical-align: top; min-height: 60px; }
                    
                    .transportadora-row td { border-top: none; padding-top: 0; padding-bottom: 8px; }
                    .transportadora-row .transportadora-nome { font-size: 9px; line-height: 1.1; }
                    .transportadora-row .volume { text-align: center; font-size: 12px; font-weight: bold; }
                </style>
            </head>
            <body>
                ${pagesHtml}
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Car className="w-4 h-4" /> Filtrar por Placa
                                </Label>
                                <Select value={filterPlaca} onValueChange={setFilterPlaca}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Todas as placas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>Todas as placas</SelectItem>
                                        {placasUnicas.map(placa => (
                                            <SelectItem key={placa} value={placa}>{placa}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                    {notasSelecionadas.length === filtered.length && filtered.length > 0 ? "Desmarcar" : "Selecionar"} Todas
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
                                Nenhuma nota fiscal encontrada. Cadastre notas no menu "Notas Fiscais".
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
                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-2">
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
                                                <p className="font-medium">{nota.volume || "-"} vol</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Peso</p>
                                                <p className="text-sm">{nota.peso || "-"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Placa</p>
                                                <p className="font-medium text-emerald-600">{nota.placa || "-"}</p>
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
                            <p className="text-sm text-slate-500 mb-4">
                                {Object.keys(
                                    notasParaImprimir.reduce((acc, n) => {
                                        acc[n.placa || "SEM_PLACA"] = true;
                                        return acc;
                                    }, {})
                                ).length > 1 && (
                                    <span className="text-orange-600 font-medium">
                                        ⚠️ Notas com placas diferentes serão impressas em romaneios separados.
                                    </span>
                                )}
                            </p>
                            <div className="bg-white border rounded-xl p-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-100">
                                            <th className="p-2 text-left border">Remetente</th>
                                            <th className="p-2 text-left border">Destinatário</th>
                                            <th className="p-2 text-center border">NFE</th>
                                            <th className="p-2 text-left border">Transportadora</th>
                                            <th className="p-2 text-center border">Vol.</th>
                                            <th className="p-2 text-center border">Placa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notasParaImprimir.map(nota => (
                                            <tr key={nota.id} className="hover:bg-slate-50">
                                                <td className="p-2 border">{nota.remetente || "-"}</td>
                                                <td className="p-2 border font-medium">{nota.destinatario}</td>
                                                <td className="p-2 border text-center font-bold text-blue-600">{nota.numero_nf}</td>
                                                <td className="p-2 border text-xs">{nota.transportadora || "-"}</td>
                                                <td className="p-2 border text-center">{nota.volume || "-"} vol</td>
                                                <td className="p-2 border text-center font-medium text-emerald-600">{nota.placa || "-"}</td>
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