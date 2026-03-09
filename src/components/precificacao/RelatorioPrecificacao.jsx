import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RelatorioPrecificacao({ open, onOpenChange, precificacoes }) {
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [pagadorId, setPagadorId] = useState("todos");

    const { data: pagadores = [] } = useQuery({
        queryKey: ['pagadores'],
        queryFn: () => base44.entities.Pagador.list('nome')
    });

    const { data: configs = [] } = useQuery({
        queryKey: ['configuracoes'],
        queryFn: () => base44.entities.Configuracoes.list()
    });
    const config = configs[0] || {};

    const dadosFiltrados = precificacoes.filter(p => {
        if (pagadorId !== "todos" && p.pagador_id !== pagadorId) return false;

        if (dataInicio || dataFim) {
            const precData = p.data_emissao;
            if (!precData) return true;
            const [dia, mes, ano] = precData.split('/');
            const dataFormatada = ano && mes && dia ? `${ano}-${mes}-${dia}` : precData;
            if (dataInicio && dataFormatada < dataInicio) return false;
            if (dataFim && dataFormatada > dataFim) return false;
        }

        return true;
    });

    const totais = {
        valor_nota: dadosFiltrados.reduce((acc, p) => acc + (parseFloat(p.valor_nota) || 0), 0),
        frete_peso: dadosFiltrados.reduce((acc, p) => acc + (parseFloat(p.frete_peso) || 0), 0),
        sec_cat: dadosFiltrados.reduce((acc, p) => acc + (parseFloat(p.sec_cat) || 0), 0),
        despacho: dadosFiltrados.reduce((acc, p) => acc + (parseFloat(p.despacho) || 0), 0),
        pedagio: dadosFiltrados.reduce((acc, p) => acc + (parseFloat(p.pedagio) || 0), 0),
        outros: dadosFiltrados.reduce((acc, p) => acc + (parseFloat(p.outros) || 0), 0),
        valor_servico: dadosFiltrados.reduce((acc, p) => acc + (parseFloat(p.valor_servico) || 0), 0),
    };

    const pagadorNome = pagadorId === "todos" ? "Todos" : (pagadores.find(p => p.id === pagadorId)?.nome || "Todos");

    const handlePrint = () => {
        const winPrint = window.open('', '_blank', 'width=1200,height=700');
        if (!winPrint) {
            alert("Permita pop-ups para imprimir.");
            return;
        }

        const rowsHtml = dadosFiltrados.map((p, i) => `
            <tr style="background: ${i % 2 === 0 ? '#f8fafc' : '#ffffff'}">
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0;">${p.data_emissao || '-'}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0;">${p.numero_documento || '-'}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0;">${(p.remetente || '-').substring(0, 22)}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0;">${(p.destinatario || '-').substring(0, 22)}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.volume || '-'}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">${p.peso || '-'}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Number(p.valor_nota || 0).toFixed(2)}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Number(p.frete_peso || 0).toFixed(2)}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Number(p.sec_cat || 0).toFixed(2)}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Number(p.despacho || 0).toFixed(2)}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Number(p.pedagio || 0).toFixed(2)}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Number(p.outros || 0).toFixed(2)}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #16a34a;">${Number(p.valor_servico || 0).toFixed(2)}</td>
                <td style="padding: 5px 6px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #d97706;">${Number(p.porcentagem || 0).toFixed(2)}%</td>
            </tr>
        `).join('');

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Precificação - ${pagadorNome}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; padding: 8mm; color: #1e293b; font-size: 8px; }
                    .header { display: flex; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 10px; }
                    .logo img { max-width: 55px; max-height: 38px; object-fit: contain; margin-right: 10px; }
                    .title { font-size: 13px; font-weight: bold; color: #1e40af; }
                    .subtitle { font-size: 9px; color: #64748b; margin-top: 2px; }
                    table { width: 100%; border-collapse: collapse; }
                    thead tr { background: #1e40af; color: white; }
                    th { padding: 5px 6px; text-align: left; font-size: 8px; }
                    th.right { text-align: right; }
                    th.center { text-align: center; }
                    tfoot tr { background: #dbeafe; font-weight: bold; }
                    tfoot td { padding: 5px 6px; font-size: 8px; }
                    @media print { body { padding: 5mm; } @page { margin: 0; size: landscape; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : ''}</div>
                    <div>
                        <p class="title">RELATÓRIO DE PRECIFICAÇÃO${pagadorNome !== 'Todos' ? ' - ' + pagadorNome : ''}</p>
                        <p class="subtitle">
                            Período: ${dataInicio ? dataInicio : 'Início'} até ${dataFim ? dataFim : 'Atual'} &nbsp;|&nbsp;
                            ${dadosFiltrados.length} registros &nbsp;|&nbsp;
                            Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>No. Doc</th>
                            <th>Remetente</th>
                            <th>Destinatário</th>
                            <th class="center">Vol</th>
                            <th class="center">Peso</th>
                            <th class="right">Valor NF</th>
                            <th class="right">Frete Peso/Vol</th>
                            <th class="right">Sec/Cat</th>
                            <th class="right">Despacho</th>
                            <th class="right">Pedágio</th>
                            <th class="right">Outros</th>
                            <th class="right">Vl. Serviço</th>
                            <th class="right">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="6"><strong>TOTAIS (${dadosFiltrados.length} registros)</strong></td>
                            <td style="text-align:right">${totais.valor_nota.toFixed(2)}</td>
                            <td style="text-align:right">${totais.frete_peso.toFixed(2)}</td>
                            <td style="text-align:right">${totais.sec_cat.toFixed(2)}</td>
                            <td style="text-align:right">${totais.despacho.toFixed(2)}</td>
                            <td style="text-align:right">${totais.pedagio.toFixed(2)}</td>
                            <td style="text-align:right">${totais.outros.toFixed(2)}</td>
                            <td style="text-align:right; color: #16a34a;"><strong>R$ ${totais.valor_servico.toFixed(2)}</strong></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `);

        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Relatório de Precificação
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label>Pagador</Label>
                        <Select value={pagadorId} onValueChange={setPagadorId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecionar pagador" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os pagadores</SelectItem>
                                {pagadores.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Data Início (emissão)</Label>
                            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                        </div>
                        <div>
                            <Label>Data Fim (emissão)</Label>
                            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm font-semibold text-blue-800 mb-3">
                            Prévia: {dadosFiltrados.length} registro(s) encontrado(s)
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-white rounded p-2 border">
                                <p className="text-gray-500 text-xs">Total Valor Notas</p>
                                <p className="font-bold text-blue-700">R$ {totais.valor_nota.toFixed(2)}</p>
                            </div>
                            <div className="bg-white rounded p-2 border">
                                <p className="text-gray-500 text-xs">Total Serviços</p>
                                <p className="font-bold text-green-700">R$ {totais.valor_servico.toFixed(2)}</p>
                            </div>
                            <div className="bg-white rounded p-2 border">
                                <p className="text-gray-500 text-xs">Frete Peso</p>
                                <p className="font-bold text-gray-700">R$ {totais.frete_peso.toFixed(2)}</p>
                            </div>
                            <div className="bg-white rounded p-2 border">
                                <p className="text-gray-500 text-xs">Sec/Cat + Despacho + Pedágio</p>
                                <p className="font-bold text-gray-700">R$ {(totais.sec_cat + totais.despacho + totais.pedagio).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handlePrint}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={dadosFiltrados.length === 0}
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Gerar e Imprimir Relatório
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}