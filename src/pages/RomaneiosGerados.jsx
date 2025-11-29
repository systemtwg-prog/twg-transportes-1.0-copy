import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Truck, Calendar, Search, Car, Package, Scale, FileText, 
    BarChart3, Pencil, Trash2, Eye, X, Save, Building2, ChevronDown, ChevronUp, AlertTriangle, Printer, Filter, Settings, Mic, MicOff, Navigation, MapPin, Loader2
} from "lucide-react";
import TableColumnFilter from "@/components/shared/TableColumnFilter";
import PrintConfigDialog from "@/components/shared/PrintConfigDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function RomaneiosGerados() {
    const [filterData, setFilterData] = useState("");
    const [filterDataFim, setFilterDataFim] = useState("");
    const [filterDestinatario, setFilterDestinatario] = useState("");
    const [filterPlaca, setFilterPlaca] = useState("");
    const [expandedRomaneio, setExpandedRomaneio] = useState(null);
    const [showEdit, setShowEdit] = useState(false);
    const [editingRomaneio, setEditingRomaneio] = useState(null);
    const [editForm, setEditForm] = useState({ nome: "", placa: "", data: "", observacoes: "" });
    const [showNotasVeiculo, setShowNotasVeiculo] = useState(null);
    const [columnFilters, setColumnFilters] = useState({
        placa: [],
        motorista_nome: [],
        status: []
    });
    const [showPrintConfig, setShowPrintConfig] = useState(false);
    const [buscaTransportadora, setBuscaTransportadora] = useState("");
    const [buscandoTransp, setBuscandoTransp] = useState(false);
    const [resultadoBusca, setResultadoBusca] = useState(null);
    const [showResultadoBusca, setShowResultadoBusca] = useState(false);
    const [gravandoBusca, setGravandoBusca] = useState(false);
    const [mediaRecorderBusca, setMediaRecorderBusca] = useState(null);
    const queryClient = useQueryClient();

    const { data: romaneios = [], isLoading } = useQuery({
        queryKey: ["romaneios-gerados"],
        queryFn: () => base44.entities.RomaneioGerado.list("-created_date")
    });

    const { data: notasFiscais = [] } = useQuery({
        queryKey: ["notas-fiscais-romaneios"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-romaneios"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const config = configs[0] || {};

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.RomaneioGerado.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["romaneios-gerados"] });
            setShowEdit(false);
            setEditingRomaneio(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.RomaneioGerado.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["romaneios-gerados"] })
    });

    // Filtrar romaneios
        const filtered = useMemo(() => {
            return romaneios.filter(r => {
                const matchDataInicio = !filterData || r.data >= filterData;
                const matchDataFim = !filterDataFim || r.data <= filterDataFim;
                const matchDestinatario = !filterDestinatario || 
                    r.destinatarios?.some(d => d.toLowerCase().includes(filterDestinatario.toLowerCase()));
                const matchPlaca = !filterPlaca || filterPlaca === "all" || r.placa === filterPlaca;
                
                // Filtros de coluna
                const matchColPlaca = columnFilters.placa.length === 0 || columnFilters.placa.includes(r.placa || "");
                const matchColMotorista = columnFilters.motorista_nome.length === 0 || columnFilters.motorista_nome.includes(r.motorista_nome || "");
                const matchColStatus = columnFilters.status.length === 0 || columnFilters.status.includes(r.status || "gerado");
                
                return matchDataInicio && matchDataFim && matchDestinatario && matchPlaca && matchColPlaca && matchColMotorista && matchColStatus;
            });
        }, [romaneios, filterData, filterDataFim, filterDestinatario, filterPlaca, columnFilters]);

        // Todas as notas dos romaneios filtrados
        const todasNotasIds = useMemo(() => {
            const ids = new Set();
            filtered.forEach(r => {
                (r.notas_ids || []).forEach(id => ids.add(id));
            });
            return ids;
        }, [filtered]);

        const notasDosFiltrados = useMemo(() => {
            return notasFiscais.filter(n => todasNotasIds.has(n.id));
        }, [notasFiscais, todasNotasIds]);

    // Dashboard geral
    const dashboard = useMemo(() => {
        const totalNotas = filtered.reduce((acc, r) => acc + (r.total_notas || 0), 0);
        const totalEntregas = filtered.reduce((acc, r) => acc + (r.total_entregas || 0), 0);
        const pesoTotal = filtered.reduce((acc, r) => acc + (r.peso_total || 0), 0);
        
        // Por transportadora
        const porTransportadora = {};
        filtered.forEach(r => {
            (r.notas_por_transportadora || []).forEach(t => {
                if (!porTransportadora[t.transportadora]) {
                    porTransportadora[t.transportadora] = 0;
                }
                porTransportadora[t.transportadora] += t.quantidade;
            });
        });

        // Por placa
        const porPlaca = {};
        filtered.forEach(r => {
            const placa = r.placa || "SEM_PLACA";
            if (!porPlaca[placa]) {
                porPlaca[placa] = { notas: 0, entregas: 0, peso: 0 };
            }
            porPlaca[placa].notas += r.total_notas || 0;
            porPlaca[placa].entregas += r.total_entregas || 0;
            porPlaca[placa].peso += r.peso_total || 0;
        });

        return { totalNotas, totalEntregas, pesoTotal, porTransportadora, porPlaca };
    }, [filtered]);

    const placasUnicas = [...new Set(romaneios.map(r => r.placa).filter(Boolean))];

    // Funções de busca de transportadora
    const buscarTransportadoraOnline = async () => {
        if (!buscaTransportadora.trim()) {
            toast.error("Digite o nome da transportadora");
            return;
        }
        
        setBuscandoTransp(true);
        toast.info("Buscando endereço...");
        
        try {
            const resultado = await base44.integrations.Core.InvokeLLM({
                prompt: `Busque o endereço da transportadora ou empresa "${buscaTransportadora}" em São Paulo. Retorne o endereço completo, telefone e site se disponível.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        nome_empresa: { type: "string" },
                        endereco: { type: "string" },
                        bairro: { type: "string" },
                        cidade: { type: "string" },
                        estado: { type: "string" },
                        cep: { type: "string" },
                        telefone: { type: "string" },
                        site: { type: "string" },
                        encontrado: { type: "boolean" }
                    }
                }
            });

            if (resultado?.encontrado) {
                const enderecoCompleto = [resultado.endereco, resultado.bairro, resultado.cidade, resultado.estado].filter(Boolean).join(", ");
                setResultadoBusca({ ...resultado, enderecoCompleto });
                setShowResultadoBusca(true);
                toast.success("Endereço encontrado!");
            } else {
                toast.error("Endereço não encontrado");
            }
        } catch (error) {
            console.error("Erro na busca:", error);
            toast.error("Erro ao buscar endereço");
        }
        
        setBuscandoTransp(false);
    };

    const iniciarGravacaoBusca = async () => {
        if (gravandoBusca) {
            if (mediaRecorderBusca) mediaRecorderBusca.stop();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                setGravandoBusca(false);
                setBuscandoTransp(true);

                const audioBlob = new Blob(chunks, { type: "audio/webm" });
                const file = new File([audioBlob], "busca_voz.webm", { type: "audio/webm" });

                try {
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    const resultado = await base44.integrations.Core.InvokeLLM({
                        prompt: "Transcreva este áudio e extraia o nome da empresa ou transportadora mencionada.",
                        file_urls: [file_url],
                        response_json_schema: {
                            type: "object",
                            properties: {
                                transcricao: { type: "string" },
                                nome_empresa: { type: "string" }
                            }
                        }
                    });

                    if (resultado?.nome_empresa || resultado?.transcricao) {
                        setBuscaTransportadora(resultado.nome_empresa || resultado.transcricao);
                        toast.success("Áudio transcrito!");
                    }
                } catch (error) {
                    toast.error("Erro ao processar áudio");
                }
                setBuscandoTransp(false);
            };

            mediaRecorder.start();
            setMediaRecorderBusca(mediaRecorder);
            setGravandoBusca(true);
            toast.info("Fale o nome da transportadora...");
        } catch (error) {
            toast.error("Permita o acesso ao microfone");
        }
    };

    const abrirRotaWaze = (endereco) => {
        if (!endereco) return;
        window.open(`https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`, "_blank");
    };

    const abrirRotaGoogleMaps = (endereco) => {
        if (!endereco) return;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`, "_blank");
    };

    const handlePrintDashboard = (printConfig = {}) => {
        const cfg = {
            marginTop: printConfig.marginTop ?? 5,
            fontSize: printConfig.fontSize ?? 9,
            columns: printConfig.columns ?? 2,
        };

        const winPrint = window.open('', '_blank', 'width=800,height=600');
        if (!winPrint) return;

        let html = '';
        Object.entries(dashboard.porPlaca).forEach(([placa, dados]) => {
            const veiculo = veiculos.find(v => v.placa === placa);
            html += `
                <div class="card">
                    <div class="header">🚗 ${placa} ${veiculo?.modelo ? '- ' + veiculo.modelo : ''}</div>
                    <div class="content">Notas: ${dados.notas} | Entregas: ${dados.entregas} | Peso: ${dados.peso.toFixed(1)}kg</div>
                </div>
            `;
        });

        winPrint.document.write(`
            <html><head><title>Dashboard Romaneios</title>
            <style>
                body { font-family: Arial; padding: ${cfg.marginTop}mm; font-size: ${cfg.fontSize}px; }
                .grid { display: grid; grid-template-columns: repeat(${cfg.columns}, 1fr); gap: 8px; }
                .card { border: 1px solid #2563eb; border-radius: 4px; overflow: hidden; }
                .header { background: #2563eb; color: white; padding: 4px 8px; font-weight: bold; }
                .content { padding: 8px; }
            </style></head>
            <body><h2>Resumo por Placa - ${format(new Date(), "dd/MM/yyyy")}</h2><div class="grid">${html}</div></body></html>
        `);
        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const handleEdit = (romaneio) => {
        setEditingRomaneio(romaneio);
        setEditForm({
            nome: romaneio.nome || "",
            placa: romaneio.placa || "",
            data: romaneio.data || "",
            observacoes: romaneio.observacoes || ""
        });
        setShowEdit(true);
    };

    const statusColors = {
        gerado: "bg-blue-100 text-blue-700",
        em_transito: "bg-amber-100 text-amber-700",
        entregue: "bg-emerald-100 text-emerald-700",
        cancelado: "bg-red-100 text-red-700"
    };

    const statusLabels = {
        gerado: "Gerado",
        em_transito: "Em Trânsito",
        entregue: "Entregue",
        cancelado: "Cancelado"
    };

    const handleReprint = (romaneio) => {
        const notasDoRomaneio = (romaneio.notas_ids || [])
            .map(id => notasFiscais.find(n => n.id === id))
            .filter(Boolean);

        if (notasDoRomaneio.length === 0) {
            alert("Nenhuma nota fiscal encontrada para este romaneio.");
            return;
        }

        const winPrint = window.open('', '_blank', 'width=900,height=650');
        if (!winPrint) {
            alert("Por favor, permita pop-ups para imprimir.");
            return;
        }

        const NOTAS_POR_PAGINA = 6;
        const totalPaginas = Math.ceil(notasDoRomaneio.length / NOTAS_POR_PAGINA);
        let pagesHtml = "";

        for (let pagina = 0; pagina < totalPaginas; pagina++) {
            const notasDaPagina = notasDoRomaneio.slice(pagina * NOTAS_POR_PAGINA, (pagina + 1) * NOTAS_POR_PAGINA);
            
            let rowsHtml = "";
            notasDaPagina.forEach((nota) => {
                const remetenteNota = nota.remetente || "";
                const destinatarioNota = nota.destinatario || "";
                const numeroNf = nota.numero_nf || "";
                const transportadoraNota = nota.transportadora || "";
                const volumeNota = nota.volume ? nota.volume + " vol" : "";
                
                rowsHtml += '<tr class="nota-row">';
                rowsHtml += '<td class="remetente">' + remetenteNota + '</td>';
                rowsHtml += '<td class="destinatario">' + destinatarioNota + '</td>';
                rowsHtml += '<td class="nfe">' + numeroNf + '</td>';
                rowsHtml += '<td class="carimbo" rowspan="2"></td>';
                rowsHtml += '</tr>';
                rowsHtml += '<tr class="transportadora-row">';
                rowsHtml += '<td class="transportadora-nome" colspan="2">' + transportadoraNota + '</td>';
                rowsHtml += '<td class="volume">' + volumeNota + '</td>';
                rowsHtml += '</tr>';
            });

            const linhasRestantes = NOTAS_POR_PAGINA - notasDaPagina.length;
            for (let i = 0; i < linhasRestantes; i++) {
                rowsHtml += `
                    <tr class="nota-row vazia">
                        <td class="remetente"></td>
                        <td class="destinatario"></td>
                        <td class="nfe"></td>
                        <td class="carimbo" rowspan="2"></td>
                    </tr>
                    <tr class="transportadora-row vazia">
                        <td class="transportadora-nome" colspan="2"></td>
                        <td class="volume"></td>
                    </tr>
                `;
            }

            const paginaInfo = totalPaginas > 1 ? ` (${pagina + 1}/${totalPaginas})` : "";
            const veiculoInfo = veiculos.find(v => v.placa === romaneio.placa);
            const veiculoDisplay = veiculoInfo ? `${veiculoInfo.modelo || ""} - ${veiculoInfo.placa}` : (romaneio.placa || "");

            pagesHtml += `
                <div class="page">
                    <div class="header">
                        <div class="logo">
                            ${config.logo_url ? '<img src="' + config.logo_url + '" alt="Logo" />' : '<div class="logo-placeholder">TWG</div>'}
                        </div>
                        <div class="company-info">
                            <p class="company-name">TWG TRANSPORTES</p>
                            <p class="company-address">${config.endereco || ""} - ${config.cep ? "CEP " + config.cep : ""}</p>
                            <p class="company-address">${config.telefone ? "Tel: " + config.telefone : ""}</p>
                        </div>
                        <div class="romaneio-info">
                            <p class="date">${formatDate(romaneio.data)}</p>
                            <p class="romaneio-title">ROMANEIO DE CARGAS${paginaInfo}</p>
                            <p class="motorista-veiculo">Motorista: ${romaneio.motorista_nome || "_________________"} | Veículo: ${veiculoDisplay || "_________________"}</p>
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

        winPrint.document.write(`
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Romaneio de Entregas - Reimpressão</title>
                <style>
                    @media print {
                        @page { margin: 5mm; size: A4; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        .page { page-break-after: always; }
                        .page:last-child { page-break-after: avoid; }
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; }
                    .page { padding: 5mm; height: 287mm; display: flex; flex-direction: column; }
                    .header { display: flex; align-items: flex-start; margin-bottom: 8px; border-bottom: 3px solid #000; padding-bottom: 8px; }
                    .logo { width: 120px; margin-right: 20px; }
                    .logo img { max-width: 100%; max-height: 80px; object-fit: contain; }
                    .logo-placeholder { width: 100px; height: 60px; background: #0ea5e9; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 24px; font-weight: bold; margin: 0; }
                    .company-address { font-size: 11px; color: #333; margin: 2px 0; }
                    .romaneio-info { text-align: right; }
                    .romaneio-title { font-size: 20px; font-weight: bold; margin: 0; }
                    .motorista-veiculo { font-size: 14px; font-weight: bold; margin: 5px 0; }
                    .date { font-size: 22px; font-weight: bold; }
                    
                    table { width: 100%; border-collapse: collapse; flex: 1; }
                    th { background: #d0d0d0; padding: 10px; text-align: left; border: 2px solid #000; font-size: 16px; }
                    td { border: 2px solid #000; font-size: 14px; vertical-align: top; }
                    
                    .col-remetente { width: 18%; }
                    .col-destinatario { width: 42%; }
                    .col-nfe { width: 15%; text-align: center; }
                    .col-carimbo { width: 25%; }
                    
                    .nota-row .remetente { padding: 6px 8px; font-size: 12px; font-weight: bold; text-align: center; vertical-align: middle; border-bottom: 2px solid #000; }
                    .nota-row .destinatario { text-align: center; font-weight: bold; font-size: 18px; padding: 6px 8px; vertical-align: middle; border-bottom: 2px solid #000; }
                    .nota-row .nfe { text-align: center; font-weight: bold; font-size: 20px; padding: 6px 8px; vertical-align: middle; border-bottom: 2px solid #000; }
                    .nota-row .carimbo { min-height: 90px; padding: 6px; vertical-align: middle; }

                    .transportadora-row td { border-top: none; padding: 8px; text-align: center; vertical-align: middle; }
                    .transportadora-row .transportadora-nome { font-size: 16px; font-weight: bold; line-height: 1.3; text-transform: uppercase; color: #333; }
                    .transportadora-row .volume { text-align: center; font-size: 16px; font-weight: bold; }

                    .nota-row.vazia td,
                    .transportadora-row.vazia td { border: none !important; }
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
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                        <Truck className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Romaneios Gerados</h1>
                        <p className="text-slate-500">Histórico de cargas e entregas realizadas</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link to={createPageUrl("NotasFiscais")}>
                        <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                            <FileText className="w-4 h-4 mr-2" />
                            Notas Fiscais
                        </Button>
                    </Link>
                    <Link to={createPageUrl("MascaraRomaneio")}>
                        <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                            <Truck className="w-4 h-4 mr-2" />
                            Máscara Romaneio
                        </Button>
                    </Link>
                </div>

                {/* Filtros */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Data Início</Label>
                                <Input
                                    type="date"
                                    value={filterData}
                                    onChange={(e) => setFilterData(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Data Fim</Label>
                                <Input
                                    type="date"
                                    value={filterDataFim}
                                    onChange={(e) => setFilterDataFim(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Destinatário</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar destinatário..."
                                        value={filterDestinatario}
                                        onChange={(e) => setFilterDestinatario(e.target.value)}
                                        className="pl-9 bg-white"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Placa</Label>
                                <Select value={filterPlaca} onValueChange={setFilterPlaca}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as placas</SelectItem>
                                        {placasUnicas.map(p => (
                                            <SelectItem key={p} value={p}>{p}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button 
                                    variant="outline" 
                                    onClick={() => { setFilterData(""); setFilterDataFim(""); setFilterDestinatario(""); setFilterPlaca(""); }}
                                >
                                    <X className="w-4 h-4 mr-1" /> Limpar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Dashboard Resumo Geral */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Truck className="w-4 h-4" />
                                Romaneios
                            </div>
                            <p className="text-2xl font-bold text-indigo-600">{filtered.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <FileText className="w-4 h-4" />
                                Total Notas
                            </div>
                            <p className="text-2xl font-bold text-blue-600">{dashboard.totalNotas}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Package className="w-4 h-4" />
                                Total Entregas
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">{dashboard.totalEntregas}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Scale className="w-4 h-4" />
                                Peso Total
                            </div>
                            <p className="text-2xl font-bold text-orange-600">{dashboard.pesoTotal.toFixed(2)} kg</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Dashboard por Transportadora */}
                {Object.keys(dashboard.porTransportadora).length > 0 && (
                    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="w-5 h-5 text-purple-600" />
                                Notas por Transportadora
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {Object.entries(dashboard.porTransportadora)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([transp, qtd]) => (
                                        <div key={transp} className="bg-white rounded-xl p-3 shadow-sm">
                                            <p className="text-xs text-slate-500 truncate" title={transp}>{transp || "Sem transportadora"}</p>
                                            <p className="text-xl font-bold text-purple-600">{qtd}</p>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Dashboard Pendências por Veículo - Clicável */}
                {Object.entries(dashboard.porPlaca).filter(([placa, dados]) => 
                    filtered.some(r => r.placa === placa && (r.status === "gerado" || r.status === "em_transito"))
                ).length > 0 && (
                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                Pendências por Veículo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {Object.entries(dashboard.porPlaca)
                                    .filter(([placa]) => filtered.some(r => r.placa === placa && (r.status === "gerado" || r.status === "em_transito")))
                                    .map(([placa, dados]) => {
                                        const notasDoVeiculo = notasDosFiltrados.filter(n => {
                                            const romaneio = filtered.find(r => r.placa === placa && (r.notas_ids || []).includes(n.id));
                                            return !!romaneio;
                                        });
                                        const transportadoras = {};
                                        filtered.filter(r => r.placa === placa).forEach(r => {
                                            (r.notas_por_transportadora || []).forEach(t => {
                                                if (!transportadoras[t.transportadora]) transportadoras[t.transportadora] = 0;
                                                transportadoras[t.transportadora] += t.quantidade;
                                            });
                                        });
                                        
                                        return (
                                            <div 
                                                key={placa}
                                                className="p-3 bg-white rounded-xl border-l-4 border-orange-500 shadow-sm cursor-pointer hover:shadow-md hover:bg-orange-50 transition-all"
                                                onClick={() => setShowNotasVeiculo({ placa, dados, notas: notasDoVeiculo, transportadoras })}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Car className="w-4 h-4 text-orange-600" />
                                                    <span className="font-bold text-sm text-orange-700">
                                                        {placa === "SEM_PLACA" ? "Sem Placa" : placa}
                                                    </span>
                                                </div>
                                                <div className="flex gap-3 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Package className="w-3 h-3 text-orange-500" />
                                                        <span className="font-semibold text-orange-600">{dados.entregas}</span>
                                                        <span className="text-xs text-slate-400">entregas</span>
                                                    </div>
                                                </div>
                                                {Object.keys(transportadoras).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {Object.entries(transportadoras).slice(0, 2).map(([transp, qtd]) => (
                                                            <span key={transp} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                                                {transp}: {qtd}
                                                            </span>
                                                        ))}
                                                        {Object.keys(transportadoras).length > 2 && (
                                                            <span className="text-xs text-slate-400">+{Object.keys(transportadoras).length - 2}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Lista de Notas do Período por Placa do Romaneio */}
                {notasDosFiltrados.length > 0 && (
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="w-5 h-5 text-blue-600" />
                                Notas Fiscais do Período ({notasDosFiltrados.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {Object.entries(
                                    filtered.reduce((acc, romaneio) => {
                                        const placa = romaneio.placa || "SEM_PLACA";
                                        if (!acc[placa]) acc[placa] = [];
                                        (romaneio.notas_ids || []).forEach(id => {
                                            const nota = notasFiscais.find(n => n.id === id);
                                            if (nota && !acc[placa].find(n => n.id === nota.id)) {
                                                acc[placa].push(nota);
                                            }
                                        });
                                        return acc;
                                    }, {})
                                ).map(([placa, notas]) => (
                                    <div key={placa} className="bg-white rounded-xl p-4 border-l-4 border-indigo-500">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Car className="w-5 h-5 text-indigo-600" />
                                            <span className="font-bold text-indigo-700">
                                                {placa === "SEM_PLACA" ? "Sem Placa" : placa}
                                            </span>
                                            <Badge className="bg-indigo-100 text-indigo-700 ml-auto">
                                                {notas.length} nota{notas.length > 1 ? "s" : ""}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {notas.map(nota => (
                                                <Badge key={nota.id} className="bg-blue-100 text-blue-700 text-sm">
                                                    {nota.numero_nf}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Dashboard por Placa */}
                {Object.keys(dashboard.porPlaca).length > 0 && (
                    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Car className="w-5 h-5 text-indigo-600" />
                                Resumo por Placa
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(dashboard.porPlaca).map(([placa, dados]) => (
                                    <div key={placa} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-indigo-500">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Car className="w-5 h-5 text-indigo-600" />
                                            <span className="font-bold text-lg text-indigo-700">
                                                {placa === "SEM_PLACA" ? "Sem Placa" : placa}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                                <p className="text-slate-500">Notas</p>
                                                <p className="font-bold text-blue-600">{dados.notas}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Entregas</p>
                                                <p className="font-bold text-emerald-600">{dados.entregas}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Peso</p>
                                                <p className="font-bold text-orange-600">{dados.peso.toFixed(1)}kg</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tabela de Romaneios */}
                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Data</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Placa
                                                <TableColumnFilter
                                                    data={romaneios}
                                                    columnKey="placa"
                                                    columnLabel="Placa"
                                                    selectedValues={columnFilters.placa}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, placa: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Motorista
                                                <TableColumnFilter
                                                    data={romaneios}
                                                    columnKey="motorista_nome"
                                                    columnLabel="Motorista"
                                                    selectedValues={columnFilters.motorista_nome}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, motorista_nome: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-center">Notas</TableHead>
                                        <TableHead className="text-center">Entregas</TableHead>
                                        <TableHead className="text-center">Peso</TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Status
                                                <TableColumnFilter
                                                    data={romaneios}
                                                    columnKey="status"
                                                    columnLabel="Status"
                                                    selectedValues={columnFilters.status}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, status: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-12">
                                                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                                                <Truck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                Nenhum romaneio encontrado
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((romaneio) => (
                                            <React.Fragment key={romaneio.id}>
                                                <TableRow className="hover:bg-slate-50">
                                                    <TableCell className="font-medium">{formatDate(romaneio.data)}</TableCell>
                                                    <TableCell>{romaneio.nome || "-"}</TableCell>
                                                    <TableCell className="font-bold text-indigo-600">{romaneio.placa || "-"}</TableCell>
                                                    <TableCell>{romaneio.motorista_nome || "-"}</TableCell>
                                                    <TableCell className="text-center">{romaneio.total_notas || 0}</TableCell>
                                                    <TableCell className="text-center">{romaneio.total_entregas || 0}</TableCell>
                                                    <TableCell className="text-center">{(romaneio.peso_total || 0).toFixed(1)}kg</TableCell>
                                                    <TableCell>
                                                        <Select 
                                                            value={romaneio.status || "gerado"}
                                                            onValueChange={(v) => updateMutation.mutate({ id: romaneio.id, data: { status: v } })}
                                                        >
                                                            <SelectTrigger className="w-32 h-8">
                                                                <Badge className={statusColors[romaneio.status || "gerado"]}>
                                                                    {statusLabels[romaneio.status || "gerado"]}
                                                                </Badge>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="gerado">Gerado</SelectItem>
                                                                <SelectItem value="em_transito">Em Trânsito</SelectItem>
                                                                <SelectItem value="entregue">Entregue</SelectItem>
                                                                <SelectItem value="cancelado">Cancelado</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => setExpandedRomaneio(expandedRomaneio === romaneio.id ? null : romaneio.id)}
                                                            >
                                                                {expandedRomaneio === romaneio.id ? (
                                                                    <ChevronUp className="w-4 h-4 text-slate-600" />
                                                                ) : (
                                                                    <ChevronDown className="w-4 h-4 text-slate-600" />
                                                                )}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleReprint(romaneio)} title="Reimprimir">
                                                                <Printer className="w-4 h-4 text-emerald-600" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(romaneio)}>
                                                                <Pencil className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => {
                                                                if (confirm("Excluir este romaneio?")) deleteMutation.mutate(romaneio.id);
                                                            }}>
                                                                <Trash2 className="w-4 h-4 text-red-600" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedRomaneio === romaneio.id && (
                                                    <TableRow>
                                                        <TableCell colSpan={9} className="bg-slate-50 p-4">
                                                            <div className="space-y-2">
                                                                <p className="text-sm font-medium text-slate-600">Notas Fiscais:</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {(romaneio.notas_ids || []).map(id => {
                                                                        const nota = notasFiscais.find(n => n.id === id);
                                                                        return nota ? (
                                                                            <Badge key={id} className="bg-blue-100 text-blue-700">
                                                                                {nota.numero_nf} - {nota.destinatario}
                                                                            </Badge>
                                                                        ) : null;
                                                                    })}
                                                                    {(!romaneio.notas_ids || romaneio.notas_ids.length === 0) && (
                                                                        <span className="text-slate-400 text-sm">Nenhuma nota vinculada</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Notas do Veículo */}
            <Dialog open={!!showNotasVeiculo} onOpenChange={() => setShowNotasVeiculo(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-orange-600" />
                            Notas Pendentes - {showNotasVeiculo?.placa === "SEM_PLACA" ? "Sem Placa" : showNotasVeiculo?.placa}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        {/* Resumo por Transportadora */}
                        {showNotasVeiculo?.transportadoras && Object.keys(showNotasVeiculo.transportadoras).length > 0 && (
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 mb-4">
                                <p className="text-sm font-semibold text-purple-700 mb-2">Por Transportadora:</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(showNotasVeiculo.transportadoras).map(([transp, qtd]) => (
                                        <Badge key={transp} className="bg-purple-100 text-purple-700">
                                            {transp}: {qtd}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {showNotasVeiculo?.notas?.length === 0 ? (
                            <p className="text-center text-slate-500 py-4">Nenhuma nota encontrada</p>
                        ) : (
                            showNotasVeiculo?.notas?.map((nota, idx) => (
                                <div key={nota.id || idx} className="p-3 bg-slate-50 rounded-lg border">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-indigo-700">NF: {nota.numero_nf}</span>
                                        <Badge className="bg-orange-100 text-orange-700">Pendente</Badge>
                                    </div>
                                    <p className="text-sm text-slate-600">{nota.destinatario}</p>
                                    <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                        {nota.volume && <span>Vol: {nota.volume}</span>}
                                        {nota.peso && <span>Peso: {nota.peso}</span>}
                                        {nota.transportadora && <span>Transp: {nota.transportadora}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Resultado da Busca */}
            <Dialog open={showResultadoBusca} onOpenChange={setShowResultadoBusca}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-amber-600" />
                            Endereço Encontrado
                        </DialogTitle>
                    </DialogHeader>
                    {resultadoBusca && (
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <p className="font-semibold text-amber-800 text-lg">{resultadoBusca.nome_empresa}</p>
                                <p className="text-slate-700 mt-2">{resultadoBusca.enderecoCompleto}</p>
                                {resultadoBusca.telefone && (
                                    <p className="text-sm text-slate-600 mt-1">📞 {resultadoBusca.telefone}</p>
                                )}
                                {resultadoBusca.site && (
                                    <a href={resultadoBusca.site} target="_blank" className="text-sm text-blue-600 hover:underline mt-1 block">
                                        🌐 {resultadoBusca.site}
                                    </a>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    onClick={() => {
                                        abrirRotaWaze(resultadoBusca.enderecoCompleto);
                                        setShowResultadoBusca(false);
                                    }}
                                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                                >
                                    <Navigation className="w-5 h-5 mr-2" />
                                    Waze
                                </Button>
                                <Button 
                                    onClick={() => {
                                        abrirRotaGoogleMaps(resultadoBusca.enderecoCompleto);
                                        setShowResultadoBusca(false);
                                    }}
                                    variant="outline"
                                    className="flex-1 border-green-500 text-green-600"
                                >
                                    <MapPin className="w-5 h-5 mr-2" />
                                    Maps
                                </Button>
                            </div>
                            <Button variant="outline" onClick={() => setShowResultadoBusca(false)} className="w-full">
                                Fechar
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Print Config Dialog */}
            <PrintConfigDialog
                open={showPrintConfig}
                onOpenChange={setShowPrintConfig}
                onPrint={handlePrintDashboard}
                configKey="romaneiosGeradosDashboardPrint"
            />

            {/* Dialog Editar Romaneio */}
            <Dialog open={showEdit} onOpenChange={setShowEdit}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-blue-600" />
                            Editar Romaneio
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                                value={editForm.nome}
                                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                                placeholder="Nome do romaneio"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Placa</Label>
                                <Input
                                    value={editForm.placa}
                                    onChange={(e) => setEditForm({ ...editForm, placa: e.target.value })}
                                    placeholder="ABC-1234"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    value={editForm.data}
                                    onChange={(e) => setEditForm({ ...editForm, data: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Input
                                value={editForm.observacoes}
                                onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                                placeholder="Observações..."
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowEdit(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => updateMutation.mutate({ id: editingRomaneio.id, data: editForm })}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Save className="w-4 h-4 mr-1" /> Salvar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}