import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    Navigation, MapPin, Truck, Package, ExternalLink, 
    Trash2, Plus, Route, CheckCircle, Camera, Sparkles, 
    ArrowUp, ArrowDown, GripVertical, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import AudioRecorder from "@/components/shared/AudioRecorder";
import ScannerCamera from "@/components/shared/ScannerCamera";

export default function RotasGPS() {
    const [selectedRomaneio, setSelectedRomaneio] = useState(null);
    const [showAddDestino, setShowAddDestino] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [sourceType, setSourceType] = useState("coleta");
    const [destinoFinalizado, setDestinoFinalizado] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [processandoFoto, setProcessandoFoto] = useState(false);
    const [otimizandoRota, setOtimizandoRota] = useState(false);
    const [notaExtraidaFoto, setNotaExtraidaFoto] = useState(null);
    const [showNotaExtraida, setShowNotaExtraida] = useState(false);
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const { data: colaboradorVinculado } = useQuery({
        queryKey: ["colaborador-vinculado", currentUser?.id],
        queryFn: async () => {
            if (!currentUser?.id) return null;
            const colaboradores = await base44.entities.Motorista.filter({ usuario_vinculado: currentUser.id });
            return colaboradores[0] || null;
        },
        enabled: !!currentUser?.id
    });

    const isAdmin = currentUser?.role === "admin";

    const { data: romaneios = [], isLoading } = useQuery({
        queryKey: ["romaneios-rotas"],
        queryFn: () => base44.entities.Romaneio.list("-created_date")
    });

    const { data: romaneiosGerados = [] } = useQuery({
        queryKey: ["romaneios-gerados-rotas"],
        queryFn: () => base44.entities.RomaneioGerado.list("-created_date")
    });

    const { data: notasFiscais = [] } = useQuery({
        queryKey: ["notas-fiscais-rotas"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: clientes = [] } = useQuery({
        queryKey: ["clientes"],
        queryFn: () => base44.entities.Cliente.list()
    });

    const { data: coletasDiarias = [] } = useQuery({
        queryKey: ["coletas-diarias-rotas"],
        queryFn: () => base44.entities.ColetaDiaria.filter({ status: "pendente" })
    });

    const deleteRomaneioMutation = useMutation({
        mutationFn: (id) => base44.entities.Romaneio.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["romaneios-rotas"] });
            setSelectedRomaneio(null);
            toast.success("Romaneio excluído");
        }
    });

    const updateRomaneioMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Romaneio.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["romaneios-rotas"] });
        }
    });

    // Filtrar romaneios para o colaborador
    let romaneiosFiltrados = romaneios;
    if (!isAdmin && colaboradorVinculado) {
        romaneiosFiltrados = romaneios.filter(r => r.motorista_id === colaboradorVinculado.id);
    }

    // Filtrar apenas romaneios pendentes ou em andamento
    const romaneiosAtivos = romaneiosFiltrados.filter(r => 
        r.status === "pendente" || r.status === "coletado"
    );

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    // Buscar endereços dos destinatários nas notas fiscais
    const getDestinatariosComEndereco = (romaneio) => {
        if (!romaneio?.notas_fiscais) return [];
        
        return romaneio.notas_fiscais.map((nf, idx) => {
            const cliente = clientes.find(c => 
                c.razao_social?.toLowerCase().includes(nf.destinatario?.toLowerCase()) ||
                nf.destinatario?.toLowerCase().includes(c.razao_social?.toLowerCase())
            );
            
            return {
                ...nf,
                ordem: nf.ordem ?? idx + 1,
                endereco: nf.endereco || cliente?.endereco || "",
                cidade: nf.cidade || cliente?.cidade || "",
                bairro: cliente?.bairro || "",
                cep: cliente?.cep || ""
            };
        }).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    };

    const abrirRotaWaze = (endereco) => {
        if (!endereco) return;
        window.open(`https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`, "_blank");
    };

    const abrirRotaGoogleMaps = (endereco) => {
        if (!endereco) return;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`, "_blank");
    };

    const abrirRotaCompleta = (destinos, app) => {
        if (destinos.length === 0) return;
        
        const destinosComEndereco = destinos.filter(d => d.endereco || d.cidade);
        if (destinosComEndereco.length === 0) return;

        const enderecos = destinosComEndereco.map(d => 
            [d.endereco, d.bairro, d.cidade].filter(Boolean).join(", ")
        );

        if (app === "waze") {
            window.open(`https://waze.com/ul?q=${encodeURIComponent(enderecos[0])}&navigate=yes`, "_blank");
        } else {
            if (enderecos.length === 1) {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecos[0])}`, "_blank");
            } else {
                const destino = encodeURIComponent(enderecos.pop());
                const waypoints = enderecos.map(e => encodeURIComponent(e)).join("|");
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${destino}&waypoints=${waypoints}`, "_blank");
            }
        }
    };

    const handleDeleteRomaneio = (romaneio) => {
        if (confirm(`Excluir romaneio de ${formatDate(romaneio.data)}?`)) {
            deleteRomaneioMutation.mutate(romaneio.id);
        }
    };

    const handleAddDestino = (item) => {
        if (!selectedRomaneio) return;

        let novaNotaFiscal;
        if (sourceType === "coleta") {
            novaNotaFiscal = {
                numero_nf: item.nfe || "",
                destinatario: item.destinatario_nome || "",
                volume: item.volume || "",
                endereco: item.remetente_endereco || "",
                cidade: item.remetente_cidade || "",
                ordem: (selectedRomaneio.notas_fiscais?.length || 0) + 1
            };
        } else if (sourceType === "romaneioGerado") {
            const nota = notasFiscais.find(n => n.id === item.id);
            novaNotaFiscal = {
                numero_nf: nota?.numero_nf || item.numero_nf || "",
                destinatario: nota?.destinatario || item.destinatario || "",
                volume: nota?.volume || "",
                endereco: nota?.endereco || "",
                cidade: nota?.cidade || "",
                ordem: (selectedRomaneio.notas_fiscais?.length || 0) + 1
            };
        } else {
            novaNotaFiscal = {
                numero_nf: item.numero_nf || "",
                destinatario: item.destinatario || "",
                volume: item.volume || "",
                endereco: item.endereco || "",
                cidade: item.cidade || "",
                ordem: (selectedRomaneio.notas_fiscais?.length || 0) + 1
            };
        }

        const notasAtuais = selectedRomaneio.notas_fiscais || [];
        updateRomaneioMutation.mutate({
            id: selectedRomaneio.id,
            data: { notas_fiscais: [...notasAtuais, novaNotaFiscal] }
        });

        setSelectedRomaneio({
            ...selectedRomaneio,
            notas_fiscais: [...notasAtuais, novaNotaFiscal]
        });
        
        setShowAddDestino(false);
        toast.success("Destino adicionado!");
    };

    // Processar foto da nota fiscal
    const handleProcessarFoto = async (imageData) => {
        setShowCamera(false);
        setProcessandoFoto(true);

        try {
            // Converter base64 para blob
            const response = await fetch(imageData);
            const blob = await response.blob();
            const file = new File([blob], "nota_fiscal.jpg", { type: "image/jpeg" });
            
            // Fazer upload da imagem
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            // Usar LLM para extrair dados do endereço
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Analise esta imagem de uma nota fiscal e extraia as seguintes informações:
                - Nome do destinatário
                - Endereço completo (rua, número, bairro, cidade, estado, CEP)
                - Número da nota fiscal
                
                Retorne os dados estruturados.`,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        destinatario: { type: "string", description: "Nome do destinatário" },
                        endereco: { type: "string", description: "Endereço completo" },
                        bairro: { type: "string", description: "Bairro" },
                        cidade: { type: "string", description: "Cidade" },
                        estado: { type: "string", description: "Estado/UF" },
                        cep: { type: "string", description: "CEP" },
                        numero_nf: { type: "string", description: "Número da nota fiscal" }
                    }
                }
            });

            if (result) {
                setNotaExtraidaFoto({
                    ...result,
                    enderecoCompleto: [result.endereco, result.bairro, result.cidade, result.estado].filter(Boolean).join(", ")
                });
                setShowNotaExtraida(true);
                toast.success("Endereço extraído com sucesso!");
            } else {
                toast.error("Não foi possível extrair os dados da imagem");
            }
        } catch (error) {
            console.error("Erro ao processar foto:", error);
            toast.error("Erro ao processar a foto. Tente novamente.");
        }

        setProcessandoFoto(false);
    };

    // Adicionar nota extraída da foto
    const handleAddNotaFoto = () => {
        if (!selectedRomaneio || !notaExtraidaFoto) return;

        const novaNotaFiscal = {
            numero_nf: notaExtraidaFoto.numero_nf || "",
            destinatario: notaExtraidaFoto.destinatario || "",
            endereco: notaExtraidaFoto.endereco || "",
            bairro: notaExtraidaFoto.bairro || "",
            cidade: notaExtraidaFoto.cidade || "",
            cep: notaExtraidaFoto.cep || "",
            ordem: (selectedRomaneio.notas_fiscais?.length || 0) + 1
        };

        const notasAtuais = selectedRomaneio.notas_fiscais || [];
        updateRomaneioMutation.mutate({
            id: selectedRomaneio.id,
            data: { notas_fiscais: [...notasAtuais, novaNotaFiscal] }
        });

        setSelectedRomaneio({
            ...selectedRomaneio,
            notas_fiscais: [...notasAtuais, novaNotaFiscal]
        });

        setShowNotaExtraida(false);
        setNotaExtraidaFoto(null);
        toast.success("Rota adicionada!");
    };

    // Mover ordem do destino
    const moverDestino = (index, direcao) => {
        if (!selectedRomaneio?.notas_fiscais) return;

        const notas = [...selectedRomaneio.notas_fiscais];
        const novoIndex = direcao === "up" ? index - 1 : index + 1;

        if (novoIndex < 0 || novoIndex >= notas.length) return;

        // Trocar posições
        [notas[index], notas[novoIndex]] = [notas[novoIndex], notas[index]];

        // Atualizar ordem
        notas.forEach((nota, idx) => {
            nota.ordem = idx + 1;
        });

        updateRomaneioMutation.mutate({
            id: selectedRomaneio.id,
            data: { notas_fiscais: notas }
        });

        setSelectedRomaneio({
            ...selectedRomaneio,
            notas_fiscais: notas
        });
    };

    // Otimizar rota com base na localização atual
    const otimizarRota = async () => {
        if (!selectedRomaneio?.notas_fiscais?.length) {
            toast.error("Nenhum destino para otimizar");
            return;
        }

        setOtimizandoRota(true);

        try {
            // Obter localização atual
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000
                });
            });

            const { latitude, longitude } = position.coords;
            const destinos = getDestinatariosComEndereco(selectedRomaneio);

            // Usar LLM para otimizar a ordem das rotas
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um otimizador de rotas de entrega.

Localização atual do motorista: Latitude ${latitude}, Longitude ${longitude}

Lista de destinos para entregar:
${destinos.map((d, i) => `${i + 1}. ${d.destinatario} - ${[d.endereco, d.bairro, d.cidade].filter(Boolean).join(", ")}`).join("\n")}

Reorganize a lista de destinos na ordem mais eficiente, considerando:
1. Começar pelo destino mais próximo da localização atual
2. Agrupar entregas em bairros/regiões próximas
3. Evitar voltar para áreas já percorridas

Retorne APENAS os índices originais (1, 2, 3...) na nova ordem otimizada.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        ordem_otimizada: {
                            type: "array",
                            items: { type: "number" },
                            description: "Índices dos destinos na ordem otimizada (1-based)"
                        },
                        explicacao: {
                            type: "string",
                            description: "Breve explicação da otimização"
                        }
                    }
                }
            });

            if (result?.ordem_otimizada) {
                const notasOriginais = [...selectedRomaneio.notas_fiscais];
                const notasOtimizadas = result.ordem_otimizada.map((idx, novaOrdem) => ({
                    ...notasOriginais[idx - 1],
                    ordem: novaOrdem + 1
                }));

                updateRomaneioMutation.mutate({
                    id: selectedRomaneio.id,
                    data: { notas_fiscais: notasOtimizadas }
                });

                setSelectedRomaneio({
                    ...selectedRomaneio,
                    notas_fiscais: notasOtimizadas
                });

                toast.success("Rota otimizada! " + (result.explicacao || ""));
            } else {
                toast.error("Não foi possível otimizar a rota");
            }
        } catch (error) {
            console.error("Erro ao otimizar rota:", error);
            if (error.code === 1) {
                toast.error("Permita o acesso à localização para otimizar a rota");
            } else {
                toast.error("Erro ao otimizar rota. Tente novamente.");
            }
        }

        setOtimizandoRota(false);
    };

    // Remover destino
    const removerDestino = (index) => {
        if (!selectedRomaneio?.notas_fiscais) return;
        
        const notas = selectedRomaneio.notas_fiscais.filter((_, i) => i !== index);
        notas.forEach((nota, idx) => {
            nota.ordem = idx + 1;
        });

        updateRomaneioMutation.mutate({
            id: selectedRomaneio.id,
            data: { notas_fiscais: notas }
        });

        setSelectedRomaneio({
            ...selectedRomaneio,
            notas_fiscais: notas
        });

        toast.success("Destino removido");
    };

    const statusColors = {
        pendente: "bg-yellow-100 text-yellow-800",
        coletado: "bg-purple-100 text-purple-800",
        entregue: "bg-green-100 text-green-800"
    };

    // Notas do romaneio gerado selecionado
    const [selectedRomaneioGerado, setSelectedRomaneioGerado] = useState("");
    const notasDoRomaneioGerado = selectedRomaneioGerado 
        ? romaneiosGerados.find(r => r.id === selectedRomaneioGerado)?.notas_ids?.map(id => notasFiscais.find(n => n.id === id)).filter(Boolean) || []
        : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                        <Navigation className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Rotas GPS</h1>
                        <p className="text-slate-500">Navegue para os destinos do romaneio</p>
                    </div>
                </div>

                {/* Seletor de Romaneio */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Route className="w-5 h-5 text-green-600" />
                            Selecione o Romaneio
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select 
                            value={selectedRomaneio?.id || ""} 
                            onValueChange={(id) => setSelectedRomaneio(romaneiosAtivos.find(r => r.id === id))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Escolha um romaneio para navegar..." />
                            </SelectTrigger>
                            <SelectContent>
                                {romaneiosAtivos.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500">
                                        Nenhum romaneio ativo
                                    </div>
                                ) : (
                                    romaneiosAtivos.map(r => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {formatDate(r.data)} - {r.motorista_nome} ({r.notas_fiscais?.length || 0} entregas)
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Detalhes do Romaneio Selecionado */}
                {selectedRomaneio && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardHeader className="border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Truck className="w-5 h-5 text-blue-600" />
                                        Romaneio - {formatDate(selectedRomaneio.data)}
                                    </CardTitle>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {selectedRomaneio.motorista_nome} • {selectedRomaneio.placa}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={statusColors[selectedRomaneio.status]}>
                                        {selectedRomaneio.status === "pendente" ? "Pendente" : 
                                         selectedRomaneio.status === "coletado" ? "Coletado" : "Entregue"}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteRomaneio(selectedRomaneio)}
                                        className="text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {/* Botões de Navegação e Otimização */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                <Button 
                                    onClick={() => abrirRotaCompleta(getDestinatariosComEndereco(selectedRomaneio), "waze")}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                                >
                                    <Navigation className="w-5 h-5 mr-2" />
                                    Abrir no Waze
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                                <Button 
                                    onClick={() => abrirRotaCompleta(getDestinatariosComEndereco(selectedRomaneio), "maps")}
                                    variant="outline"
                                    className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                                >
                                    <MapPin className="w-5 h-5 mr-2" />
                                    Abrir no Google Maps
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                            </div>

                            {/* Botão Otimizar Rota */}
                            <Button 
                                onClick={otimizarRota}
                                disabled={otimizandoRota}
                                className="w-full mb-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                            >
                                {otimizandoRota ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Otimizando Rota...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2" />
                                        Otimizar Rota (GPS)
                                    </>
                                )}
                            </Button>

                            {/* Botões de Adicionar */}
                            <div className="flex gap-2 mb-4">
                                <Button 
                                    onClick={() => setShowCamera(true)}
                                    variant="outline"
                                    className="flex-1 border-dashed border-orange-400 text-orange-600 hover:bg-orange-50"
                                    disabled={processandoFoto}
                                >
                                    {processandoFoto ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Camera className="w-4 h-4 mr-2" />
                                    )}
                                    Adicionar por Foto
                                </Button>
                                <Button 
                                    onClick={() => setShowAddDestino(true)}
                                    variant="outline"
                                    className="flex-1 border-dashed border-green-400 text-green-600 hover:bg-green-50"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Adicionar Endereço
                                </Button>
                            </div>

                            {/* Lista de Destinos */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Destinos ({selectedRomaneio.notas_fiscais?.length || 0})
                                </h3>
                                {getDestinatariosComEndereco(selectedRomaneio).map((dest, index) => {
                                    const enderecoCompleto = [dest.endereco, dest.bairro, dest.cidade].filter(Boolean).join(", ");
                                    return (
                                        <div 
                                            key={index} 
                                            className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                                                            {index + 1}
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5"
                                                                onClick={() => moverDestino(index, "up")}
                                                                disabled={index === 0}
                                                            >
                                                                <ArrowUp className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5"
                                                                onClick={() => moverDestino(index, "down")}
                                                                disabled={index === (selectedRomaneio.notas_fiscais?.length || 0) - 1}
                                                            >
                                                                <ArrowDown className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-800">{dest.destinatario || "Sem nome"}</p>
                                                        {dest.numero_nf && (
                                                            <p className="text-sm text-slate-500">NF: {dest.numero_nf}</p>
                                                        )}
                                                        {enderecoCompleto && (
                                                            <button
                                                                onClick={() => abrirRotaWaze(enderecoCompleto)}
                                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1 flex items-center gap-1"
                                                            >
                                                                <MapPin className="w-3 h-3" />
                                                                {enderecoCompleto}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    {enderecoCompleto && (
                                                        <>
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost"
                                                                onClick={() => abrirRotaWaze(enderecoCompleto)}
                                                                title="Abrir no Waze"
                                                            >
                                                                <Navigation className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost"
                                                                onClick={() => abrirRotaGoogleMaps(enderecoCompleto)}
                                                                title="Abrir no Maps"
                                                            >
                                                                <MapPin className="w-4 h-4 text-green-600" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDestinoFinalizado(dest)}
                                                        className="text-green-600 hover:bg-green-50"
                                                        title="Finalizar entrega"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => removerDestino(index)}
                                                        className="text-red-600 hover:bg-red-50"
                                                        title="Remover"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {(!selectedRomaneio.notas_fiscais || selectedRomaneio.notas_fiscais.length === 0) && (
                                    <div className="text-center py-8 text-slate-500">
                                        <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                        Nenhum destino cadastrado neste romaneio
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Lista de Romaneios Ativos */}
                {!selectedRomaneio && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Romaneios Ativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
                                </div>
                            ) : romaneiosAtivos.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <Truck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                    Nenhum romaneio ativo no momento
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {romaneiosAtivos.map((r) => (
                                        <div 
                                            key={r.id}
                                            className="p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-green-500 hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div onClick={() => setSelectedRomaneio(r)} className="flex-1">
                                                    <p className="font-medium text-slate-800">{formatDate(r.data)}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {r.motorista_nome} • {r.placa}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline">
                                                        {r.notas_fiscais?.length || 0} entregas
                                                    </Badge>
                                                    <Badge className={statusColors[r.status]}>
                                                        {r.status === "pendente" ? "Pendente" : "Coletado"}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteRomaneio(r);
                                                        }}
                                                        className="text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Camera Scanner */}
            {showCamera && (
                <ScannerCamera
                    onCapture={handleProcessarFoto}
                    onClose={() => setShowCamera(false)}
                />
            )}

            {/* Dialog Nota Extraída da Foto */}
            <Dialog open={showNotaExtraida} onOpenChange={setShowNotaExtraida}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Camera className="w-5 h-5 text-orange-600" />
                            Endereço Extraído
                        </DialogTitle>
                    </DialogHeader>
                    {notaExtraidaFoto && (
                        <div className="space-y-4">
                            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                                <p className="font-semibold text-orange-800">{notaExtraidaFoto.destinatario || "Destinatário não identificado"}</p>
                                {notaExtraidaFoto.numero_nf && (
                                    <p className="text-sm text-orange-600">NF: {notaExtraidaFoto.numero_nf}</p>
                                )}
                                <p className="text-sm text-slate-600 mt-2">
                                    <MapPin className="w-3 h-3 inline mr-1" />
                                    {notaExtraidaFoto.enderecoCompleto || "Endereço não identificado"}
                                </p>
                            </div>

                            {/* Botões de navegação */}
                            {notaExtraidaFoto.enderecoCompleto && (
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={() => abrirRotaWaze(notaExtraidaFoto.enderecoCompleto)}
                                        className="flex-1 bg-blue-500 hover:bg-blue-600"
                                    >
                                        <Navigation className="w-4 h-4 mr-2" />
                                        Waze
                                    </Button>
                                    <Button 
                                        onClick={() => abrirRotaGoogleMaps(notaExtraidaFoto.enderecoCompleto)}
                                        variant="outline"
                                        className="flex-1 border-green-500 text-green-600"
                                    >
                                        <MapPin className="w-4 h-4 mr-2" />
                                        Maps
                                    </Button>
                                </div>
                            )}

                            <Button 
                                onClick={handleAddNotaFoto}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar como Rota
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog Finalizar Destino */}
            <Dialog open={!!destinoFinalizado} onOpenChange={() => { setDestinoFinalizado(null); setAudioUrl(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            Finalizar Entrega
                        </DialogTitle>
                    </DialogHeader>
                    {destinoFinalizado && (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                <p className="font-semibold text-green-800">{destinoFinalizado.destinatario}</p>
                                <p className="text-sm text-green-600">NF: {destinoFinalizado.numero_nf}</p>
                                {destinoFinalizado.endereco && (
                                    <p className="text-sm text-slate-600 mt-1">
                                        <MapPin className="w-3 h-3 inline mr-1" />
                                        {[destinoFinalizado.endereco, destinoFinalizado.bairro, destinoFinalizado.cidade].filter(Boolean).join(", ")}
                                    </p>
                                )}
                            </div>

                            {/* Gravação de Áudio */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700">Gravar observação em áudio:</p>
                                <AudioRecorder 
                                    onRecordingComplete={async (blob, url) => {
                                        setAudioUrl(url);
                                        const file = new File([blob], "audio_entrega.webm", { type: "audio/webm" });
                                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                        setAudioUrl(file_url);
                                        toast.success("Áudio gravado!");
                                    }}
                                />
                                {audioUrl && (
                                    <div className="p-2 bg-slate-100 rounded-lg">
                                        <audio controls src={audioUrl} className="w-full" />
                                    </div>
                                )}
                            </div>

                            {/* Botão Como Chegar */}
                            {destinoFinalizado.endereco && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-700">Navegar para o próximo destino:</p>
                                    <div className="flex gap-2">
                                        <Button 
                                            onClick={() => {
                                                const endereco = [destinoFinalizado.endereco, destinoFinalizado.bairro, destinoFinalizado.cidade].filter(Boolean).join(", ");
                                                abrirRotaWaze(endereco);
                                            }}
                                            className="flex-1 bg-blue-500 hover:bg-blue-600"
                                        >
                                            <Navigation className="w-4 h-4 mr-2" />
                                            Waze
                                        </Button>
                                        <Button 
                                            onClick={() => {
                                                const endereco = [destinoFinalizado.endereco, destinoFinalizado.bairro, destinoFinalizado.cidade].filter(Boolean).join(", ");
                                                abrirRotaGoogleMaps(endereco);
                                            }}
                                            variant="outline"
                                            className="flex-1 border-green-500 text-green-600"
                                        >
                                            <MapPin className="w-4 h-4 mr-2" />
                                            Maps
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <Button 
                                onClick={() => {
                                    toast.success("Entrega finalizada!");
                                    setDestinoFinalizado(null);
                                    setAudioUrl(null);
                                }}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Confirmar Finalização
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog para adicionar destino */}
            <Dialog open={showAddDestino} onOpenChange={setShowAddDestino}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Adicionar Endereço</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                variant={sourceType === "coleta" ? "default" : "outline"}
                                onClick={() => setSourceType("coleta")}
                                size="sm"
                            >
                                Coletas Ativas
                            </Button>
                            <Button
                                variant={sourceType === "romaneio" ? "default" : "outline"}
                                onClick={() => setSourceType("romaneio")}
                                size="sm"
                            >
                                Romaneios
                            </Button>
                            <Button
                                variant={sourceType === "romaneioGerado" ? "default" : "outline"}
                                onClick={() => setSourceType("romaneioGerado")}
                                size="sm"
                            >
                                Romaneios Gerados
                            </Button>
                        </div>

                        {/* Seletor de Romaneio Gerado */}
                        {sourceType === "romaneioGerado" && (
                            <div className="space-y-2">
                                <Label className="text-sm">Selecione o Romaneio</Label>
                                <Select value={selectedRomaneioGerado} onValueChange={setSelectedRomaneioGerado}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Escolha um romaneio..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {romaneiosGerados.map(r => (
                                            <SelectItem key={r.id} value={r.id}>
                                                {formatDate(r.data)} - {r.placa} ({r.total_notas || 0} notas)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {sourceType === "coleta" ? (
                                coletasDiarias.length === 0 ? (
                                    <p className="text-center text-slate-500 py-4">Nenhuma coleta ativa</p>
                                ) : (
                                    coletasDiarias.map((coleta) => (
                                        <div
                                            key={coleta.id}
                                            onClick={() => handleAddDestino(coleta)}
                                            className="p-3 bg-slate-50 rounded-lg border hover:border-green-500 cursor-pointer"
                                        >
                                            <p className="font-medium">{coleta.remetente_nome}</p>
                                            <p className="text-sm text-slate-500">
                                                {coleta.remetente_endereco} - {coleta.remetente_cidade}
                                            </p>
                                        </div>
                                    ))
                                )
                            ) : sourceType === "romaneioGerado" ? (
                                notasDoRomaneioGerado.length === 0 ? (
                                    <p className="text-center text-slate-500 py-4">
                                        {selectedRomaneioGerado ? "Nenhuma nota neste romaneio" : "Selecione um romaneio acima"}
                                    </p>
                                ) : (
                                    notasDoRomaneioGerado.map((nota) => (
                                        <div
                                            key={nota.id}
                                            onClick={() => handleAddDestino(nota)}
                                            className="p-3 bg-slate-50 rounded-lg border hover:border-green-500 cursor-pointer"
                                        >
                                            <p className="font-medium">{nota.destinatario}</p>
                                            <p className="text-sm text-slate-500">
                                                NF: {nota.numero_nf}
                                            </p>
                                        </div>
                                    ))
                                )
                            ) : (
                                romaneios.flatMap(r => r.notas_fiscais || []).length === 0 ? (
                                    <p className="text-center text-slate-500 py-4">Nenhuma nota fiscal</p>
                                ) : (
                                    romaneios.flatMap((r, ri) => 
                                        (r.notas_fiscais || []).map((nf, ni) => (
                                            <div
                                                key={`${ri}-${ni}`}
                                                onClick={() => handleAddDestino(nf)}
                                                className="p-3 bg-slate-50 rounded-lg border hover:border-green-500 cursor-pointer"
                                            >
                                                <p className="font-medium">{nf.destinatario}</p>
                                                <p className="text-sm text-slate-500">
                                                    NF: {nf.numero_nf} - {nf.endereco || nf.cidade}
                                                </p>
                                            </div>
                                        ))
                                    )
                                )
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}