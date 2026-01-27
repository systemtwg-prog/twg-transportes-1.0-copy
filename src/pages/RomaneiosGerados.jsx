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
    BarChart3, Pencil, Trash2, Eye, X, Save, Building2, ChevronDown, ChevronUp, AlertTriangle, Printer, Filter, Settings, Mic, MicOff, Navigation, MapPin, Loader2, MoreVertical, ChevronRight
} from "lucide-react";
import TableColumnFilter from "@/components/shared/TableColumnFilter";
import PrintConfigDialog from "@/components/shared/PrintConfigDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
    const [buscaNota, setBuscaNota] = useState("");
    const [resultadoBuscaNota, setResultadoBuscaNota] = useState(null);
    const [showDetalhes, setShowDetalhes] = useState(false);
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
                h2 { margin: 0 0 8px 0; font-size: 14px; }
                .grid { display: grid; grid-template-columns: repeat(${cfg.columns}, 1fr); gap: 4px; }
                .card { border: 1px solid #2563eb; border-radius: 2px; overflow: hidden; }
                .header { background: #2563eb; color: white; padding: 2px 6px; font-weight: bold; font-size: 10px; }
                .content { padding: 4px 6px; font-size: 10px; }
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

    // Buscar nota nos romaneios - busca em TODOS
    const buscarNotaNosRomaneios = () => {
        if (!buscaNota.trim()) {
            setResultadoBuscaNota(null);
            return;
        }

        const normalizar = (num) => {
            if (!num) return "";
            return parseInt(num.replace(/\D/g, ""), 10).toString().toLowerCase();
        };

        const numeroNormalizado = normalizar(buscaNota);
        
        // Procurar em TODOS os romaneios e guardar todas as ocorrências
        const romaneiosEncontrados = [];
        
        for (const romaneio of romaneios) {
            const notasDoRomaneio = (romaneio.notas_ids || [])
                .map(id => notasFiscais.find(n => n.id === id))
                .filter(Boolean);
            
            const notaEncontrada = notasDoRomaneio.find(n => {
                const nfNormalizada = normalizar(n.numero_nf);
                return nfNormalizada === numeroNormalizado || n.numero_nf?.toLowerCase() === buscaNota.toLowerCase();
            });

            if (notaEncontrada) {
                romaneiosEncontrados.push({
                    nota: notaEncontrada,
                    romaneio: romaneio
                });
            }
        }

        if (romaneiosEncontrados.length > 0) {
            setResultadoBuscaNota({
                multipleResults: romaneiosEncontrados.length > 1,
                results: romaneiosEncontrados
            });
            if (romaneiosEncontrados.length > 1) {
                toast.success(`Nota encontrada em ${romaneiosEncontrados.length} romaneios!`);
            } else {
                toast.success(`Nota encontrada no romaneio!`);
            }
        } else {
            setResultadoBuscaNota({ notFound: true });
            toast.error("Nota não encontrada em nenhum romaneio");
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
                        @page { margin: 3mm; size: A4; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        .page { page-break-after: always; }
                        .page:last-child { page-break-after: avoid; }
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; }
                    .page { padding: 3mm; height: 291mm; display: flex; flex-direction: column; }
                    .header { display: flex; align-items: flex-start; margin-bottom: 4px; border-bottom: 2px solid #000; padding-bottom: 4px; }
                    .logo { width: 80px; margin-right: 12px; }
                    .logo img { max-width: 100%; max-height: 50px; object-fit: contain; }
                    .logo-placeholder { width: 70px; height: 40px; background: #0ea5e9; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; }
                    .company-info { flex: 1; }
                    .company-name { font-size: 18px; font-weight: bold; margin: 0; }
                    .company-address { font-size: 9px; color: #333; margin: 1px 0; }
                    .romaneio-info { text-align: right; }
                    .romaneio-title { font-size: 16px; font-weight: bold; margin: 0; }
                    .motorista-veiculo { font-size: 11px; font-weight: bold; margin: 2px 0; }
                    .date { font-size: 18px; font-weight: bold; }
                    
                    table { width: 100%; border-collapse: collapse; flex: 1; }
                    th { background: #d0d0d0; padding: 6px; text-align: left; border: 2px solid #000; font-size: 13px; }
                    td { border: 2px solid #000; font-size: 12px; vertical-align: top; }
                    
                    .col-remetente { width: 18%; }
                    .col-destinatario { width: 42%; }
                    .col-nfe { width: 15%; text-align: center; }
                    .col-carimbo { width: 25%; }
                    
                    .nota-row .remetente { padding: 3px 5px; font-size: 10px; font-weight: bold; text-align: center; vertical-align: middle; border-bottom: 2px solid #000; }
                    .nota-row .destinatario { text-align: center; font-weight: bold; font-size: 15px; padding: 3px 5px; vertical-align: middle; border-bottom: 2px solid #000; }
                    .nota-row .nfe { text-align: center; font-weight: bold; font-size: 16px; padding: 3px 5px; vertical-align: middle; border-bottom: 2px solid #000; }
                    .nota-row .carimbo { min-height: 60px; padding: 4px; vertical-align: middle; }

                    .transportadora-row td { border-top: none; padding: 4px; text-align: center; vertical-align: middle; }
                    .transportadora-row .transportadora-nome { font-size: 13px; font-weight: bold; line-height: 1.2; text-transform: uppercase; color: #333; }
                    .transportadora-row .volume { text-align: center; font-size: 13px; font-weight: bold; }

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



                {/* Dashboard Pendências por Veículo */}
                {Object.entries(dashboard.porPlaca).filter(([placa, dados]) => 
                    filtered.some(r => r.placa === placa && (r.status === "gerado" || r.status === "em_transito"))
                ).length > 0 && (
                    <Card className="bg-white border-0 shadow-xl rounded-2xl overflow-hidden">
                        <CardHeader className="pb-2 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                                        <AlertTriangle className="w-4 h-4 text-white" />
                                    </div>
                                    Pendências por Veículo
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={() => setShowPrintConfig(true)}
                                        size="sm"
                                        variant="outline"
                                        className="border-orange-500 text-orange-600"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                        onClick={() => handlePrintDashboard()}
                                        size="sm"
                                        className="bg-orange-600 hover:bg-orange-700"
                                    >
                                        <Printer className="w-4 h-4 mr-1" />
                                        Imprimir
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="sm" variant="outline">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setShowDetalhes(!showDetalhes)}>
                                                <Eye className="w-4 h-4 mr-2" />
                                                {showDetalhes ? 'Ocultar' : 'Mostrar'} Detalhes
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(dashboard.porPlaca)
                                    .filter(([placa]) => filtered.some(r => r.placa === placa && (r.status === "gerado" || r.status === "em_transito")))
                                    .map(([placa, dados]) => {
                                        const veiculo = veiculos.find(v => v.placa === placa);
                                        const notasDoVeiculo = notasDosFiltrados.filter(n => {
                                            const romaneio = filtered.find(r => r.placa === placa && (r.notas_ids || []).includes(n.id));
                                            return !!romaneio;
                                        });
                                        
                                        return (
                                            <div 
                                                key={placa}
                                                onClick={() => setShowNotasVeiculo({ placa, dados, notas: notasDoVeiculo })}
                                                className="p-3 rounded-xl border-l-4 border-orange-500 cursor-pointer transition-all duration-200 hover:scale-102 hover:shadow-lg bg-white shadow-md hover:shadow-xl"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-orange-100 rounded-lg">
                                                            <Car className="w-3.5 h-3.5 text-orange-600" />
                                                        </div>
                                                        <span className="font-bold text-sm text-black">
                                                            {placa === "SEM_PLACA" ? "Sem Placa" : placa}
                                                        </span>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                </div>
                                                {veiculo && (
                                                    <p className="text-xs mb-1 text-slate-500">{veiculo.modelo}</p>
                                                )}
                                                <div className="flex gap-3 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Package className="w-3 h-3 text-orange-500" />
                                                        <span className="font-semibold text-orange-600">{dados.entregas}</span>
                                                        <span className="text-xs text-slate-400">entregas</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </CardContent>
                    </Card>
                )}



                {/* Buscar Nota em Romaneios */}
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Search className="w-5 h-5 text-green-600" />
                            Buscar Nota nos Romaneios
                        </h3>
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Digite o número da nota fiscal..."
                                    value={buscaNota}
                                    onChange={(e) => {
                                        setBuscaNota(e.target.value);
                                        if (!e.target.value.trim()) setResultadoBuscaNota(null);
                                    }}
                                    className="bg-white"
                                    onKeyDown={(e) => { if (e.key === "Enter") buscarNotaNosRomaneios(); }}
                                />
                                <Button 
                                    onClick={buscarNotaNosRomaneios}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <Search className="w-4 h-4 mr-2" />
                                    Buscar
                                </Button>
                            </div>

                            {/* Resultado da Busca */}
                            {resultadoBuscaNota && !resultadoBuscaNota.notFound && (
                                <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5">
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-green-800 mb-2">
                                                ✓ Nota Encontrada{resultadoBuscaNota.multipleResults ? ` em ${resultadoBuscaNota.results.length} Romaneios!` : "!"}
                                            </p>
                                            <div className="space-y-3">
                                                {resultadoBuscaNota.results.map((resultado, idx) => (
                                                    <div key={idx} className="space-y-2 text-sm">
                                                        <div className="bg-white rounded-lg p-3">
                                                            <p className="text-slate-600">Número NF: <span className="font-bold text-blue-600">{resultado.nota.numero_nf}</span></p>
                                                            <p className="text-slate-600">Destinatário: <span className="font-semibold">{resultado.nota.destinatario}</span></p>
                                                            <p className="text-slate-600">Transportadora: <span className="font-semibold">{resultado.nota.transportadora || "-"}</span></p>
                                                        </div>
                                                        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                                                            <p className="text-indigo-800 font-semibold mb-1">Romaneio {resultadoBuscaNota.multipleResults ? `#${idx + 1}` : ""}:</p>
                                                            <p className="text-slate-700">{resultado.romaneio.nome || resultado.romaneio.numero || "-"}</p>
                                                            <div className="flex gap-3 mt-2 text-xs flex-wrap">
                                                                <span className="text-slate-600">Placa: <strong>{resultado.romaneio.placa}</strong></span>
                                                                <span className="text-slate-600">Data: <strong>{formatDate(resultado.romaneio.data)}</strong></span>
                                                                <span className="text-slate-600">Motorista: <strong>{resultado.romaneio.motorista_nome || "-"}</strong></span>
                                                                <Badge className={statusColors[resultado.romaneio.status || "gerado"]}>
                                                                    {statusLabels[resultado.romaneio.status || "gerado"]}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {resultadoBuscaNota?.notFound && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <p className="font-semibold text-red-800">Nota não encontrada</p>
                                            <p className="text-sm text-red-600 mt-1">
                                                A nota fiscal <strong>{buscaNota}</strong> não foi encontrada em nenhum romaneio gerado.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

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
                                                   <TableCell>
                                                       {romaneio.numero && (
                                                           <Badge className="bg-purple-100 text-purple-700 mr-2">
                                                               #{romaneio.numero}
                                                           </Badge>
                                                       )}
                                                       {romaneio.nome || "-"}
                                                   </TableCell>
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
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <Car className="w-5 h-5 text-orange-600" />
                                Notas do Veículo {showNotasVeiculo?.placa === "SEM_PLACA" ? "Sem Placa" : showNotasVeiculo?.placa}
                            </DialogTitle>
                            <Button 
                                onClick={() => {
                                    const veiculo = veiculos.find(v => v.placa === showNotasVeiculo?.placa);
                                    const notasAgrupadas = {};
                                    (showNotasVeiculo?.notas || []).forEach(nota => {
                                        const transp = nota.transportadora || "SEM TRANSPORTADORA";
                                        if (!notasAgrupadas[transp]) notasAgrupadas[transp] = [];
                                        notasAgrupadas[transp].push(nota);
                                    });

                                    const winPrint = window.open('', '_blank', 'width=800,height=600');
                                    if (!winPrint) return;

                                    const notasHtml = Object.entries(notasAgrupadas).map(([transportadora, notas]) => `
                                        <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                            <div style="background: #eff6ff; padding: 10px 15px; border-bottom: 1px solid #dbeafe;">
                                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                                    <span style="font-weight: bold; color: #1e40af; font-size: 14px;">${transportadora}</span>
                                                    <span style="background: #dbeafe; color: #1e40af; padding: 2px 10px; border-radius: 10px; font-size: 12px;">${notas.length} nota${notas.length > 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                                <thead>
                                                    <tr style="background: #f8fafc;">
                                                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">NF</th>
                                                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">Destinatário</th>
                                                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">Volume</th>
                                                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">Peso</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${notas.map(nota => `
                                                        <tr>
                                                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #2563eb;">${nota.numero_nf || '-'}</td>
                                                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${nota.destinatario || '-'}</td>
                                                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">${nota.volume || '-'}</td>
                                                            <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">${nota.peso || '-'}</td>
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
                                            <title>Notas Pendentes - ${showNotasVeiculo?.placa}</title>
                                            <style>
                                                * { box-sizing: border-box; margin: 0; padding: 0; }
                                                body { font-family: Arial, sans-serif; padding: 15px; color: #1e293b; }
                                                .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #2563eb; }
                                                h1 { font-size: 20px; font-weight: bold; color: #1e40af; }
                                                .subtitle { font-size: 12px; color: #64748b; margin-top: 5px; }
                                                .summary { background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 20px; text-align: center; }
                                                @media print { @page { margin: 10mm; } }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="header">
                                                <h1>Notas Pendentes - ${showNotasVeiculo?.placa}</h1>
                                                <p class="subtitle">${veiculo?.modelo || ''} | ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                                            </div>
                                            <div class="summary">
                                                <strong>${(showNotasVeiculo?.notas || []).length}</strong> nota(s) pendente(s) | 
                                                <strong>${Object.keys(notasAgrupadas).length}</strong> transportadora(s)
                                            </div>
                                            ${notasHtml}
                                        </body>
                                        </html>
                                    `);
                                    winPrint.document.close();
                                    setTimeout(() => winPrint.print(), 500);
                                }}
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700"
                            >
                                <Printer className="w-4 h-4 mr-1" />
                                Imprimir
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Agrupar por Transportadora */}
                        {(() => {
                            const notasAgrupadas = {};
                            (showNotasVeiculo?.notas || []).forEach(nota => {
                                const transp = nota.transportadora || "SEM TRANSPORTADORA";
                                if (!notasAgrupadas[transp]) notasAgrupadas[transp] = [];
                                notasAgrupadas[transp].push(nota);
                            });

                            return Object.entries(notasAgrupadas).map(([transportadora, notas]) => (
                                <div key={transportadora} className="border rounded-xl overflow-hidden">
                                    <div className="bg-orange-50 p-3 border-b">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-orange-800 flex items-center gap-2">
                                                <Building2 className="w-4 h-4" />
                                                {transportadora}
                                            </h4>
                                            <Badge className="bg-orange-100 text-orange-700">
                                                {notas.length} nota{notas.length > 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="divide-y">
                                        {notas.map((nota) => (
                                            <div key={nota.id} className="p-3 hover:bg-slate-50">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-slate-800">{nota.destinatario}</p>
                                                        <p className="text-sm text-orange-600 font-semibold">NF: {nota.numero_nf}</p>
                                                    </div>
                                                    <div className="text-right text-sm">
                                                        <p className="text-slate-500">{nota.volume || "-"} vol</p>
                                                        <p className="text-slate-500">{nota.peso || "-"}</p>
                                                    </div>
                                                </div>
                                                {nota.filial && (
                                                    <Badge variant="outline" className="mt-1 text-xs">
                                                        Filial: {nota.filial}
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ));
                        })()}
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

            {/* Dialog Detalhes Adicionais */}
            <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalhes Adicionais</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                        {/* Notas por Transportadora */}
                        {Object.keys(dashboard.porTransportadora).length > 0 && (
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-purple-600" />
                                    Notas por Transportadora
                                </h3>
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
                            </div>
                        )}

                        {/* Notas Fiscais do Período */}
                        {notasDosFiltrados.length > 0 && (
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    Notas Fiscais do Período ({notasDosFiltrados.length})
                                </h3>
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
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Print Config Dialog */}
            <PrintConfigDialog
                open={showPrintConfig}
                onOpenChange={setShowPrintConfig}
                onPrint={handlePrintDashboard}
                configKey="romaneiosGeradosDashboardPrint"
            />

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