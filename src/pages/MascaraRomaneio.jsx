import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
    FileText, Printer, Truck, Calendar, Search, X, Plus, Car, Building2, Save, Pencil, Trash2, Package, Scale, BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function MascaraRomaneio() {
    const [motorista, setMotorista] = useState("");
    const [dataRomaneio, setDataRomaneio] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notasSelecionadas, setNotasSelecionadas] = useState([]);
    const [search, setSearch] = useState("");
    const [filterPlaca, setFilterPlaca] = useState("");
    const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
    const [remetenteSelecionado, setRemetenteSelecionado] = useState("");
    const [notasDigitadas, setNotasDigitadas] = useState("");
    const [showCadastroRemetente, setShowCadastroRemetente] = useState(false);
    const [remetenteForm, setRemetenteForm] = useState({ nome: "", cnpj: "", endereco: "", telefone: "" });
    const [editingRemetente, setEditingRemetente] = useState(null);
    
    // Configurações de layout personalizáveis
    const [layoutConfig, setLayoutConfig] = useState({
        colRemetente: 18,
        colDestinatario: 42,
        colNfe: 15,
        colCarimbo: 25,
        alturaLinha: 45
    });
    const queryClient = useQueryClient();

    const { data: notasFiscais = [], isLoading } = useQuery({
        queryKey: ["notas-fiscais-romaneio"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas-romaneio"],
        queryFn: () => base44.entities.Motorista.filter({ status: "ativo" })
    });

    const { data: empresasRemetentes = [] } = useQuery({
        queryKey: ["empresas-remetentes"],
        queryFn: () => base44.entities.EmpresaRemetente.list()
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-romaneio"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const config = configs[0] || {};

    // Dashboard por placa
    const dashboardPorPlaca = useMemo(() => {
        const notasSelecionadasData = notasFiscais.filter(n => notasSelecionadas.includes(n.id));
        
        // Agrupar por placa
        const porPlaca = {};
        let pesoGeral = 0;
        let totalNotas = 0;
        let totalEntregasGeral = 0;
        
        notasSelecionadasData.forEach(nota => {
            const placa = nota.placa || "SEM_PLACA";
            if (!porPlaca[placa]) {
                porPlaca[placa] = {
                    notas: [],
                    transportadoras: new Set(),
                    pesoTotal: 0
                };
            }
            porPlaca[placa].notas.push(nota);
            totalNotas++;
            
            // Adicionar transportadora (para contar entregas únicas)
            if (nota.transportadora) {
                porPlaca[placa].transportadoras.add(nota.transportadora.trim().toUpperCase());
            }
            
            // Somar peso
            const pesoStr = nota.peso || "";
            const pesoNum = parseFloat(pesoStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
            porPlaca[placa].pesoTotal += pesoNum;
            pesoGeral += pesoNum;
        });
        
        // Calcular total de entregas
        Object.values(porPlaca).forEach(dados => {
            totalEntregasGeral += dados.transportadoras.size || dados.notas.length;
        });
        
        return {
            porPlaca,
            pesoGeral,
            totalNotas,
            totalEntregasGeral
        };
    }, [notasFiscais, notasSelecionadas]);

    // Mutations para empresas remetentes
    const createRemetenteMutation = useMutation({
        mutationFn: (data) => base44.entities.EmpresaRemetente.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["empresas-remetentes"] });
            setShowCadastroRemetente(false);
            setRemetenteForm({ nome: "", cnpj: "", endereco: "", telefone: "" });
            setEditingRemetente(null);
            toast.success("Empresa remetente cadastrada!");
        }
    });

    const updateRemetenteMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.EmpresaRemetente.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["empresas-remetentes"] });
            setShowCadastroRemetente(false);
            setRemetenteForm({ nome: "", cnpj: "", endereco: "", telefone: "" });
            setEditingRemetente(null);
            toast.success("Empresa remetente atualizada!");
        }
    });

    const deleteRemetenteMutation = useMutation({
        mutationFn: (id) => base44.entities.EmpresaRemetente.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["empresas-remetentes"] })
    });

    // Mutation para salvar romaneio gerado
    const createRomaneioMutation = useMutation({
        mutationFn: (data) => base44.entities.RomaneioGerado.create(data),
        onSuccess: () => {
            toast.success("Romaneio salvo com sucesso!");
        }
    });

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

    // Buscar notas digitadas manualmente
    const buscarNotasDigitadas = () => {
        if (!notasDigitadas.trim()) return;
        
        const numerosDigitados = notasDigitadas
            .split(/[,;\s\n]+/)
            .map(n => n.trim())
            .filter(Boolean);
        
        const notasEncontradas = notasFiscais.filter(n => 
            numerosDigitados.some(num => 
                n.numero_nf?.toLowerCase().includes(num.toLowerCase())
            )
        );
        
        if (notasEncontradas.length > 0) {
            setNotasSelecionadas(prev => {
                const novos = notasEncontradas.map(n => n.id).filter(id => !prev.includes(id));
                return [...prev, ...novos];
            });
            toast.success(`${notasEncontradas.length} nota(s) encontrada(s) e selecionada(s)`);
        } else {
            toast.error("Nenhuma nota encontrada com os números informados");
        }
    };

    const filtered = notasFiscais.filter(n => {
        const matchSearch = n.numero_nf?.toLowerCase().includes(search.toLowerCase()) ||
            n.destinatario?.toLowerCase().includes(search.toLowerCase()) ||
            n.transportadora?.toLowerCase().includes(search.toLowerCase());
        const matchPlaca = !filterPlaca || filterPlaca === "all" || n.placa === filterPlaca;
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

        // Agrupar notas por placa (usar veículo selecionado se houver)
        const notasPorPlaca = {};
        const placaParaUsar = veiculoSelecionado && veiculoSelecionado !== "individual" ? veiculoSelecionado : null;
        
        notasParaImprimir.forEach(nota => {
            const placa = placaParaUsar || nota.placa || "SEM_PLACA";
            if (!notasPorPlaca[placa]) {
                notasPorPlaca[placa] = [];
            }
            notasPorPlaca[placa].push(nota);
        });

        let pagesHtml = "";

        Object.entries(notasPorPlaca).forEach(([placa, notasPlaca]) => {
            const NOTAS_POR_PAGINA = 6;
            const totalPaginas = Math.ceil(notasPlaca.length / NOTAS_POR_PAGINA);

            for (let pagina = 0; pagina < totalPaginas; pagina++) {
                const notasDaPagina = notasPlaca.slice(pagina * NOTAS_POR_PAGINA, (pagina + 1) * NOTAS_POR_PAGINA);
                
                let rowsHtml = "";
                notasDaPagina.forEach((nota) => {
                    const remetenteNota = remetenteSelecionado || nota.remetente || "";
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

                // Adicionar linhas em branco para completar 6 notas (sem bordas)
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

                const placaDisplay = placa !== "SEM_PLACA" ? placa : "";
                const paginaInfo = totalPaginas > 1 ? ` (${pagina + 1}/${totalPaginas})` : "";
                
                // Buscar informações do veículo
                const veiculoInfo = veiculos.find(v => v.placa === placa);
                const veiculoDisplay = veiculoInfo ? `${veiculoInfo.modelo || ""} - ${veiculoInfo.placa}` : placaDisplay;

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
                                <p class="romaneio-title">ROMANEIO DE CARGAS${paginaInfo}</p>
                                <p class="motorista-veiculo">Motorista: ${motoristaObj ? motoristaObj.nome : "_________________"} | Veículo: ${veiculoDisplay || "_________________"}</p>
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
                        @page { margin: 5mm; size: A4; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        .page { page-break-after: always; }
                        .page:last-child { page-break-after: avoid; }
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; }
                    .page { 
                        padding: 5mm; 
                        height: 287mm; 
                        display: flex; 
                        flex-direction: column;
                    }
                    .header { 
                        display: flex; 
                        align-items: flex-start; 
                        margin-bottom: 8px; 
                        border-bottom: 3px solid #000; 
                        padding-bottom: 8px; 
                    }
                    .logo { width: 120px; margin-right: 20px; }
                    .logo img { max-width: 100%; max-height: 80px; object-fit: contain; }
                    .logo-placeholder { 
                        width: 100px; height: 60px; background: #0ea5e9; 
                        display: flex; align-items: center; justify-content: center; 
                        color: white; font-weight: bold; font-size: 20px; 
                    }
                    .company-info { flex: 1; }
                    .company-name { font-size: 24px; font-weight: bold; margin: 0; }
                    .company-address { font-size: 11px; color: #333; margin: 2px 0; }
                    .romaneio-info { text-align: right; }
                    .romaneio-title { font-size: 20px; font-weight: bold; margin: 0; }
                    .motorista-veiculo { font-size: 14px; font-weight: bold; margin: 5px 0; }
                    .date { font-size: 22px; font-weight: bold; }
                    
                    table { width: 100%; border-collapse: collapse; flex: 1; }
                    th { 
                        background: #d0d0d0; 
                        padding: 10px; 
                        text-align: left; 
                        border: 2px solid #000; 
                        font-size: 16px; 
                    }
                    td { 
                        border: 2px solid #000; 
                        font-size: 14px; 
                        vertical-align: top;
                    }
                    
                    .col-remetente { width: ${layoutConfig.colRemetente}%; }
                    .col-destinatario { width: ${layoutConfig.colDestinatario}%; }
                    .col-nfe { width: ${layoutConfig.colNfe}%; text-align: center; }
                    .col-carimbo { width: ${layoutConfig.colCarimbo}%; }
                    
                    .nota-row .remetente { 
                        padding: 6px 8px; 
                        font-size: 12px;
                        font-weight: bold;
                        text-align: center;
                        vertical-align: middle;
                        border-bottom: 2px solid #000;
                    }
                    .nota-row .destinatario { 
                        text-align: center; 
                        font-weight: bold; 
                        font-size: 18px; 
                        padding: 6px 8px;
                        vertical-align: middle;
                        border-bottom: 2px solid #000;
                    }
                    .nota-row .nfe { 
                        text-align: center; 
                        font-weight: bold; 
                        font-size: 20px; 
                        padding: 6px 8px;
                        vertical-align: middle;
                        border-bottom: 2px solid #000;
                    }
                    .nota-row .carimbo { 
                        min-height: ${layoutConfig.alturaLinha * 2}px;
                        padding: 6px;
                        vertical-align: middle;
                    }

                    .transportadora-row td { 
                        border-top: none; 
                        padding: 8px; 
                        text-align: center;
                        vertical-align: middle;
                    }
                    .transportadora-row .transportadora-nome { 
                        font-size: 16px; 
                        font-weight: bold;
                        line-height: 1.3;
                        text-transform: uppercase;
                        color: #333;
                    }
                    .transportadora-row .volume { 
                        text-align: center; 
                        font-size: 16px; 
                        font-weight: bold; 
                    }
                </style>
            </head>
            <body>
                ${pagesHtml}
            </body>
            </html>
        `);
        
        winPrint.document.close();
        setTimeout(() => winPrint.print(), 500);

        // Salvar romaneio gerado para cada placa
        Object.entries(notasPorPlaca).forEach(([placa, notasPlaca]) => {
            // Calcular notas por transportadora
            const notasPorTransp = {};
            notasPlaca.forEach(nota => {
                const transp = nota.transportadora || "Sem transportadora";
                if (!notasPorTransp[transp]) notasPorTransp[transp] = 0;
                notasPorTransp[transp]++;
            });

            const notasPorTransportadora = Object.entries(notasPorTransp).map(([t, q]) => ({
                transportadora: t,
                quantidade: q
            }));

            // Calcular peso total
            const pesoTotal = notasPlaca.reduce((acc, nota) => {
                const pesoStr = nota.peso || "";
                const pesoNum = parseFloat(pesoStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
                return acc + pesoNum;
            }, 0);

            // Lista de destinatários únicos
            const destinatarios = [...new Set(notasPlaca.map(n => n.destinatario).filter(Boolean))];

            // Contar entregas (transportadoras únicas)
            const transportadorasUnicas = new Set(notasPlaca.map(n => n.transportadora?.trim().toUpperCase()).filter(Boolean));

            createRomaneioMutation.mutate({
                nome: `Romaneio ${placa !== "SEM_PLACA" ? placa : ""} - ${formatDate(dataRomaneio)}`,
                placa: placa !== "SEM_PLACA" ? placa : "",
                data: dataRomaneio,
                motorista_id: motorista || "",
                motorista_nome: motoristaObj?.nome || "",
                total_notas: notasPlaca.length,
                total_entregas: transportadorasUnicas.size || notasPlaca.length,
                peso_total: pesoTotal,
                notas_por_transportadora: notasPorTransportadora,
                notas_ids: notasPlaca.map(n => n.id),
                destinatarios: destinatarios,
                status: "gerado"
            });
        });
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                                            <Label className="flex items-center gap-2">
                                                                <Car className="w-4 h-4" /> Veículo (aplica em todos)
                                                            </Label>
                                                            <Select value={veiculoSelecionado} onValueChange={setVeiculoSelecionado}>
                                                                <SelectTrigger className="bg-white">
                                                                    <SelectValue placeholder="Selecione o veículo..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="individual">Usar individual da nota</SelectItem>
                                                                    {veiculos.map(v => (
                                                                        <SelectItem key={v.id} value={v.placa}>
                                                                            {v.modelo} - {v.placa}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Remetente (aplica em todas)
                                </Label>
                                <div className="flex gap-1">
                                    <Select value={remetenteSelecionado || "individual"} onValueChange={(v) => setRemetenteSelecionado(v === "individual" ? "" : v)}>
                                        <SelectTrigger className="bg-white flex-1">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="individual">Usar individual</SelectItem>
                                            {empresasRemetentes.map(emp => (
                                                <SelectItem key={emp.id} value={emp.nome}>{emp.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="icon"
                                        onClick={() => { setRemetenteForm({ nome: "", cnpj: "", endereco: "", telefone: "" }); setEditingRemetente(null); setShowCadastroRemetente(true); }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    </Card>

                    {/* Configurações de Layout */}
                    <Card className="bg-white/80 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-600" />
                            Layout da Impressão (%)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Remetente (%)</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="50"
                                    value={layoutConfig.colRemetente}
                                    onChange={(e) => setLayoutConfig({...layoutConfig, colRemetente: parseInt(e.target.value) || 18})}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Destinatário (%)</Label>
                                <Input
                                    type="number"
                                    min="10"
                                    max="60"
                                    value={layoutConfig.colDestinatario}
                                    onChange={(e) => setLayoutConfig({...layoutConfig, colDestinatario: parseInt(e.target.value) || 42})}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">NFE (%)</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="30"
                                    value={layoutConfig.colNfe}
                                    onChange={(e) => setLayoutConfig({...layoutConfig, colNfe: parseInt(e.target.value) || 15})}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Carimbo (%)</Label>
                                <Input
                                    type="number"
                                    min="10"
                                    max="40"
                                    value={layoutConfig.colCarimbo}
                                    onChange={(e) => setLayoutConfig({...layoutConfig, colCarimbo: parseInt(e.target.value) || 25})}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Altura Linha (px)</Label>
                                <Input
                                    type="number"
                                    min="30"
                                    max="80"
                                    value={layoutConfig.alturaLinha}
                                    onChange={(e) => setLayoutConfig({...layoutConfig, alturaLinha: parseInt(e.target.value) || 45})}
                                    className="bg-white"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Total colunas: {layoutConfig.colRemetente + layoutConfig.colDestinatario + layoutConfig.colNfe + layoutConfig.colCarimbo}% (ideal: 100%)
                        </p>
                    </CardContent>
                    </Card>

                    {/* Campo para digitar notas fiscais */}
                    <Card className="bg-white/80 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-600" />
                            Buscar Notas por Número
                        </h3>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Digite os números das notas separados por vírgula, espaço ou enter..."
                                value={notasDigitadas}
                                onChange={(e) => setNotasDigitadas(e.target.value)}
                                className="bg-white flex-1"
                                onKeyDown={(e) => { if (e.key === "Enter") buscarNotasDigitadas(); }}
                            />
                            <Button onClick={buscarNotasDigitadas} className="bg-purple-600 hover:bg-purple-700">
                                <Search className="w-4 h-4 mr-2" />
                                Buscar e Selecionar
                            </Button>
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
                                Nenhuma nota fiscal encontrada.
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

                {/* Dashboard por Placa */}
                {notasSelecionadas.length > 0 && (
                    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BarChart3 className="w-5 h-5 text-indigo-600" />
                                Dashboard por Placa
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                            {/* Resumo Geral */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                        <FileText className="w-4 h-4" />
                                        Total Notas
                                    </div>
                                    <p className="text-2xl font-bold text-indigo-600">{dashboardPorPlaca.totalNotas}</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                        <Package className="w-4 h-4" />
                                        Total Entregas
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-600">{dashboardPorPlaca.totalEntregasGeral}</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                        <Scale className="w-4 h-4" />
                                        Peso Total
                                    </div>
                                    <p className="text-2xl font-bold text-orange-600">{dashboardPorPlaca.pesoGeral.toFixed(2)} kg</p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                        <Car className="w-4 h-4" />
                                        Veículos
                                    </div>
                                    <p className="text-2xl font-bold text-purple-600">{Object.keys(dashboardPorPlaca.porPlaca).length}</p>
                                </div>
                            </div>

                            {/* Detalhamento por Placa */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(dashboardPorPlaca.porPlaca).map(([placa, dados]) => (
                                    <div key={placa} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-indigo-500">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Car className="w-5 h-5 text-indigo-600" />
                                                <span className="font-bold text-lg text-indigo-700">
                                                    {placa === "SEM_PLACA" ? "Sem Placa" : placa}
                                                </span>
                                            </div>
                                            <Badge className="bg-indigo-100 text-indigo-700">
                                                {dados.notas.length} NF{dados.notas.length > 1 ? "s" : ""}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <Package className="w-3 h-3" /> Entregas
                                                </span>
                                                <span className="font-semibold text-emerald-600">
                                                    {dados.transportadoras.size || dados.notas.length}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <Scale className="w-3 h-3" /> Peso
                                                </span>
                                                <span className="font-semibold text-orange-600">
                                                    {dados.pesoTotal.toFixed(2)} kg
                                                </span>
                                            </div>
                                            {dados.transportadoras.size > 0 && (
                                                <div className="pt-2 border-t">
                                                    <span className="text-xs text-slate-400">Transportadoras:</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {Array.from(dados.transportadoras).slice(0, 3).map((transp, i) => (
                                                            <Badge key={i} variant="outline" className="text-xs truncate max-w-[100px]">
                                                                {transp}
                                                            </Badge>
                                                        ))}
                                                        {dados.transportadoras.size > 3 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{dados.transportadoras.size - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Preview */}
                {notasSelecionadas.length > 0 && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-lg mb-4">Preview do Romaneio</h3>
                            {remetenteSelecionado && (
                                <p className="text-sm text-emerald-600 font-medium mb-2">
                                    ✓ Remetente "{remetenteSelecionado}" será aplicado em todas as notas
                                </p>
                            )}
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
                                                <td className="p-2 border">{remetenteSelecionado || nota.remetente || "-"}</td>
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

            {/* Dialog Cadastro de Empresas Remetentes */}
            <Dialog open={showCadastroRemetente} onOpenChange={setShowCadastroRemetente}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-orange-600" />
                            Empresas Remetentes
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Lista de empresas */}
                        {empresasRemetentes.length > 0 && !editingRemetente && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                <Label className="text-xs text-slate-500">Empresas Cadastradas</Label>
                                {empresasRemetentes.map(emp => (
                                    <div key={emp.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                        <div>
                                            <span className="font-medium">{emp.nome}</span>
                                            {emp.cnpj && <span className="text-xs text-slate-500 ml-2">({emp.cnpj})</span>}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => { setRemetenteForm(emp); setEditingRemetente(emp); }}
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => { if(confirm("Excluir esta empresa?")) deleteRemetenteMutation.mutate(emp.id); }}
                                            >
                                                <Trash2 className="w-3 h-3 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Formulário */}
                        <div className="border-t pt-4 space-y-4">
                            <h4 className="font-medium text-sm">{editingRemetente ? "Editar Empresa" : "Nova Empresa"}</h4>
                            <div className="space-y-2">
                                <Label>Nome *</Label>
                                <Input
                                    value={remetenteForm.nome}
                                    onChange={(e) => setRemetenteForm({ ...remetenteForm, nome: e.target.value })}
                                    placeholder="Nome da empresa"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>CNPJ</Label>
                                    <Input
                                        value={remetenteForm.cnpj}
                                        onChange={(e) => setRemetenteForm({ ...remetenteForm, cnpj: e.target.value })}
                                        placeholder="00.000.000/0001-00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input
                                        value={remetenteForm.telefone}
                                        onChange={(e) => setRemetenteForm({ ...remetenteForm, telefone: e.target.value })}
                                        placeholder="(00) 0000-0000"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Endereço</Label>
                                <Input
                                    value={remetenteForm.endereco}
                                    onChange={(e) => setRemetenteForm({ ...remetenteForm, endereco: e.target.value })}
                                    placeholder="Endereço completo"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                {editingRemetente && (
                                    <Button variant="ghost" onClick={() => { setEditingRemetente(null); setRemetenteForm({ nome: "", cnpj: "", endereco: "", telefone: "" }); }}>
                                        Cancelar
                                    </Button>
                                )}
                                <Button 
                                    onClick={() => {
                                        if (editingRemetente) {
                                            updateRemetenteMutation.mutate({ id: editingRemetente.id, data: remetenteForm });
                                        } else {
                                            createRemetenteMutation.mutate(remetenteForm);
                                        }
                                    }}
                                    disabled={!remetenteForm.nome}
                                    className="bg-orange-500 hover:bg-orange-600"
                                >
                                    <Save className="w-4 h-4 mr-1" />
                                    {editingRemetente ? "Atualizar" : "Cadastrar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}