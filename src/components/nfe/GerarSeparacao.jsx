import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Layers, MapPin, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GerarSeparacao({ open, onClose, notasDigitadas }) {
    const [loading, setLoading] = useState(false);
    const [dadosAgrupados, setDadosAgrupados] = useState(null);
    const [estatisticas, setEstatisticas] = useState({ total: 0, encontrados: 0, naoEncontrados: [] });

    useEffect(() => {
        if (open && notasDigitadas) {
            gerarSeparacao();
        }
        if (!open) {
            setDadosAgrupados(null);
            setEstatisticas({ total: 0, encontrados: 0, naoEncontrados: [] });
        }
    }, [open]);

    const normalizarNF = (num) => {
        if (!num) return "";
        const digitos = num.toString().replace(/\D/g, "");
        if (!digitos) return num.toString().toLowerCase().trim();
        return String(parseInt(digitos, 10));
    };

    const gerarSeparacao = async () => {
        const numeros = notasDigitadas
            .split(/[,;\s\n]+/)
            .map(n => n.trim())
            .filter(Boolean);

        if (numeros.length === 0) {
            toast.error("Digite ao menos uma nota");
            return;
        }

        setLoading(true);
        try {
            const todosXmls = await base44.entities.XmlNFe.list("-created_date", 10000);
            const numerosNormalizados = numeros.map(normalizarNF);

            const xmlsEncontrados = todosXmls.filter(x =>
                numerosNormalizados.includes(normalizarNF(x.numero_nf))
            );

            const naoEncontrados = numeros.filter(n =>
                !xmlsEncontrados.some(x => normalizarNF(x.numero_nf) === normalizarNF(n))
            );

            if (xmlsEncontrados.length === 0) {
                toast.error("Nenhum XML encontrado para as notas digitadas. Importe os XMLs primeiro.");
                setLoading(false);
                return;
            }

            // Agrupar por UF origem → UF destino → CFOP
            const grupos = {};
            xmlsEncontrados.forEach(xml => {
                const ufOrigem = xml.uf_origem || "SEM UF";
                const ufDestino = xml.uf_destino || "SEM UF";
                const cfop = xml.cfop || "SEM CFOP";

                if (!grupos[ufOrigem]) grupos[ufOrigem] = {};
                if (!grupos[ufOrigem][ufDestino]) grupos[ufOrigem][ufDestino] = {};
                if (!grupos[ufOrigem][ufDestino][cfop]) grupos[ufOrigem][ufDestino][cfop] = [];
                grupos[ufOrigem][ufDestino][cfop].push(xml);
            });

            setDadosAgrupados(grupos);
            setEstatisticas({
                total: numeros.length,
                encontrados: xmlsEncontrados.length,
                naoEncontrados
            });

            if (naoEncontrados.length > 0) {
                toast.warning(`${xmlsEncontrados.length} XML(s) encontrado(s). ${naoEncontrados.length} não encontrado(s).`);
            }
        } catch (error) {
            console.error("Erro ao gerar separação:", error);
            toast.error("Erro ao gerar separação");
        }
        setLoading(false);
    };

    const handleImprimir = () => {
        if (!dadosAgrupados) return;

        const winPrint = window.open('', '_blank', 'width=1200,height=800');
        if (!winPrint) {
            alert("Por favor, permita pop-ups para imprimir.");
            return;
        }

        let bodyHtml = "";
        let totalNotas = 0;
        let totalValor = 0;
        const transportadorasSet = new Set();

        Object.entries(dadosAgrupados)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([ufOrigem, destinos]) => {
                bodyHtml += `<div class="grupo-uf-origem"><h2 class="titulo-uf-origem">UF ORIGEM: ${ufOrigem}</h2>`;

                Object.entries(destinos)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .forEach(([ufDestino, cfops]) => {
                        bodyHtml += `<div class="grupo-uf-destino"><h3 class="titulo-uf-destino">UF DESTINO: ${ufDestino}</h3>`;

                        Object.entries(cfops)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .forEach(([cfop, notas]) => {
                                bodyHtml += `<div class="grupo-cfop"><h4 class="titulo-cfop">CFOP: ${cfop} (${notas.length} nota(s))</h4>`;
                                bodyHtml += `<table class="tabela-notas"><thead><tr>
                                    <th>NF</th><th>Data Emissão</th><th>CFOP</th><th>CT-e</th><th>Remetente</th><th>Destinatário</th><th>Transportadora</th><th>CNPJ Transp.</th><th>Valor</th><th>Peso</th>
                                </tr></thead><tbody>`;

                                notas.forEach(nota => {
                                    totalNotas++;
                                    totalValor += nota.valor_nfe || 0;
                                    const transpKey = `${nota.transportadora_nome || "SEM TRANSPORTADORA"}|${nota.transportadora_cnpj || ""}`;
                                    transportadorasSet.add(transpKey);

                                    const dataFmt = nota.data_emissao
                                        ? format(parseISO(nota.data_emissao), "dd/MM/yyyy", { locale: ptBR })
                                        : "-";

                                    bodyHtml += `<tr>
                                        <td class="nf">${nota.numero_nf || "-"}</td>
                                        <td>${dataFmt}</td>
                                        <td>${nota.cfop || "-"}</td>
                                        <td>${nota.cte || "-"}</td>
                                        <td>${nota.remetente_nome || "-"}</td>
                                        <td>${nota.destinatario_nome || "-"}</td>
                                        <td class="transp">${nota.transportadora_nome || "-"}</td>
                                        <td class="cnpj">${nota.transportadora_cnpj || "-"}</td>
                                        <td class="valor">R$ ${(nota.valor_nfe || 0).toFixed(2)}</td>
                                        <td>${nota.peso || "-"}</td>
                                    </tr>`;
                                });

                                bodyHtml += `</tbody></table></div>`;
                            });

                        bodyHtml += `</div>`;
                    });

                bodyHtml += `</div>`;
            });

        // Lista de transportadoras
        let transportadorasHtml = "";
        if (transportadorasSet.size > 0) {
            transportadorasHtml = `<div class="transportadoras-section">
                <h2 class="titulo-transportadoras">TRANSPORTADORAS UTILIZADAS</h2>
                <table class="tabela-transportadoras"><thead><tr><th>Transportadora</th><th>CNPJ</th></tr></thead><tbody>`;
            Array.from(transportadorasSet).forEach(key => {
                const [nome, cnpj] = key.split("|");
                transportadorasHtml += `<tr><td class="transp">${nome}</td><td class="cnpj">${cnpj || "-"}</td></tr>`;
            });
            transportadorasHtml += `</tbody></table></div>`;
        }

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Separação - CT-e Globalizado</title>
                <style>
                    @media print {
                        @page { margin: 8mm; size: A4 landscape; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
                    h1 { text-align: center; color: #1e3a8a; font-size: 18px; margin-bottom: 4px; }
                    .data { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 16px; }
                    .grupo-uf-origem { margin-bottom: 16px; border: 2px solid #2563eb; border-radius: 6px; overflow: hidden; page-break-inside: avoid; }
                    .titulo-uf-origem { background: #2563eb; color: white; padding: 6px 12px; font-size: 14px; font-weight: bold; }
                    .grupo-uf-destino { border-bottom: 1px solid #cbd5e1; }
                    .titulo-uf-destino { background: #dbeafe; color: #1e40af; padding: 4px 12px; font-size: 12px; font-weight: bold; border-bottom: 1px solid #93c5fd; }
                    .grupo-cfop { padding: 4px 8px; }
                    .titulo-cfop { color: #1e293b; font-size: 11px; font-weight: bold; margin: 6px 0 4px 0; padding: 2px 6px; background: #f1f5f9; border-left: 3px solid #64748b; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                    th { background: #e2e8f0; color: #1e293b; padding: 4px 6px; text-align: left; font-size: 10px; font-weight: bold; border: 1px solid #cbd5e1; }
                    td { padding: 3px 6px; border: 1px solid #e2e8f0; font-size: 10px; }
                    td.nf { font-weight: bold; color: #2563eb; }
                    td.transp { font-weight: 600; color: #7c3aed; }
                    td.cnpj { font-family: monospace; font-size: 9px; }
                    td.valor { text-align: right; font-weight: 600; }
                    tr:nth-child(even) td { background: #f8fafc; }
                    .transportadoras-section { margin-top: 20px; border: 2px solid #7c3aed; border-radius: 6px; overflow: hidden; }
                    .titulo-transportadoras { background: #7c3aed; color: white; padding: 6px 12px; font-size: 14px; font-weight: bold; }
                    .tabela-transportadoras th { background: #ede9fe; color: #5b21b6; }
                    .tabela-transportadoras td.transp { color: #7c3aed; }
                    .resumo-final { margin-top: 16px; background: #dbeafe; border: 2px solid #2563eb; border-radius: 6px; padding: 12px; display: flex; justify-content: space-around; }
                    .resumo-item { text-align: center; }
                    .resumo-item strong { display: block; font-size: 20px; color: #1e3a8a; }
                    .resumo-item span { font-size: 11px; color: #475569; }
                </style>
            </head>
            <body>
                <h1>RELATÓRIO DE SEPARAÇÃO - CT-e GLOBALIZADO</h1>
                <p class="data">Data: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                ${bodyHtml}
                ${transportadorasHtml}
                <div class="resumo-final">
                    <div class="resumo-item"><strong>${totalNotas}</strong><span>Total de Notas</span></div>
                    <div class="resumo-item"><strong>${transportadorasSet.size}</strong><span>Transportadoras</span></div>
                    <div class="resumo-item"><strong>R$ ${totalValor.toFixed(2)}</strong><span>Valor Total</span></div>
                </div>
            </body>
            </html>
        `);

        winPrint.document.close();
        setTimeout(() => {
            winPrint.print();
        }, 500);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-cyan-600" />
                        Relatório de Separação - CT-e Globalizado
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {loading && (
                        <div className="text-center py-12">
                            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-cyan-600" />
                            <p className="font-semibold text-slate-700">Gerando separação...</p>
                            <p className="text-sm text-slate-500 mt-1">Buscando XMLs e agrupando por UF/CFOP</p>
                        </div>
                    )}

                    {!loading && dadosAgrupados && (
                        <>
                            {/* Estatísticas */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-cyan-700">{estatisticas.encontrados}</p>
                                    <p className="text-xs text-cyan-600">XMLs Encontrados</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-blue-700">{Object.keys(dadosAgrupados).length}</p>
                                    <p className="text-xs text-blue-600">UFs de Origem</p>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-purple-700">
                                        {new Set(Object.values(dadosAgrupados).flatMap(destinos =>
                                            Object.values(destinos).flatMap(cfops =>
                                                Object.values(cfops).flatMap(notas =>
                                                    notas.map(n => n.transportadora_nome)
                                                )
                                            )
                                        )).size}
                                    </p>
                                    <p className="text-xs text-purple-600">Transportadoras</p>
                                </div>
                            </div>

                            {estatisticas.naoEncontrados.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <p className="text-sm font-semibold text-amber-800 mb-1">
                                        {estatisticas.naoEncontrados.length} nota(s) sem XML importado:
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {estatisticas.naoEncontrados.map((n, i) => (
                                            <span key={i} className="text-xs bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-700 font-mono">
                                                {n}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Preview do agrupamento */}
                            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                                {Object.entries(dadosAgrupados)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([ufOrigem, destinos]) => (
                                        <div key={ufOrigem} className="border-l-4 border-blue-500 pl-3">
                                            <p className="font-bold text-blue-700 text-sm">
                                                <MapPin className="w-4 h-4 inline mr-1" />
                                                UF ORIGEM: {ufOrigem}
                                            </p>
                                            {Object.entries(destinos)
                                                .sort(([a], [b]) => a.localeCompare(b))
                                                .map(([ufDestino, cfops]) => (
                                                    <div key={ufDestino} className="ml-4 mt-1">
                                                        <p className="font-semibold text-slate-600 text-xs">
                                                            → UF DESTINO: {ufDestino}
                                                        </p>
                                                        {Object.entries(cfops)
                                                            .sort(([a], [b]) => a.localeCompare(b))
                                                            .map(([cfop, notas]) => (
                                                                <div key={cfop} className="ml-4 text-xs text-slate-500">
                                                                    ▸ CFOP: {cfop} — {notas.length} nota(s)
                                                                </div>
                                                            ))}
                                                    </div>
                                                ))}
                                        </div>
                                    ))}
                            </div>

                            {/* Botão de impressão */}
                            <Button
                                onClick={handleImprimir}
                                className="w-full bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 h-12 text-lg font-semibold"
                            >
                                <Printer className="w-5 h-5 mr-2" />
                                Imprimir Relatório de Separação
                            </Button>
                        </>
                    )}

                    {!loading && !dadosAgrupados && (
                        <div className="text-center py-8">
                            <Layers className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <p className="text-slate-600">Nenhum dado de separação gerado.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}