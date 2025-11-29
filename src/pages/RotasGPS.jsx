import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    Navigation, MapPin, Truck, Package, ExternalLink, 
    Trash2, Plus, Route, CheckCircle, Camera, Sparkles, 
    ArrowUp, ArrowDown, GripVertical, Loader2, Car, FileText,
    Upload, Pencil, MessageSquare, BarChart3, Search, Mic, MicOff, Building2, Save
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
    const [rotasAdicionadas, setRotasAdicionadas] = useState([]);
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

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-rotas"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const { data: comprovantesInternos = [] } = useQuery({
        queryKey: ["comprovantes-internos-rotas"],
        queryFn: () => base44.entities.ComprovanteInterno.list("-created_date")
    });

    // Estados para adicionar comprovante
    const [showAddComprovante, setShowAddComprovante] = useState(false);
    const [comprovanteNota, setComprovanteNota] = useState(null);
    const [comprovanteArquivos, setComprovanteArquivos] = useState([]);
    const [comprovanteObs, setComprovanteObs] = useState("");
    const [uploadingComprovante, setUploadingComprovante] = useState(false);
    const [showEditObs, setShowEditObs] = useState(false);
    const [editingNotaObs, setEditingNotaObs] = useState(null);
    const [obsTexto, setObsTexto] = useState("");
    
    // Estados para comando de voz
    const [gravandoVoz, setGravandoVoz] = useState(false);
    const [transcricaoVoz, setTranscricaoVoz] = useState("");
    const [showVozDialog, setShowVozDialog] = useState(false);
    const [processandoVoz, setProcessandoVoz] = useState(false);
    const [mediaRecorderVoz, setMediaRecorderVoz] = useState(null);

    // Dashboard por veículo
    const dashboardPorVeiculo = useMemo(() => {
        const porVeiculo = {};

        romaneiosGerados.forEach(r => {
            if (r.status === "gerado" || r.status === "em_transito") {
                const placa = r.placa || "SEM_PLACA";
                if (!porVeiculo[placa]) {
                    porVeiculo[placa] = { entregas: 0, coletas: 0, notas: [] };
                }
                porVeiculo[placa].entregas += r.total_entregas || r.total_notas || 0;
                (r.notas_ids || []).forEach(id => {
                    const nota = notasFiscais.find(n => n.id === id);
                    if (nota) porVeiculo[placa].notas.push(nota);
                });
            }
        });

        coletasDiarias.forEach(c => {
            if (c.status === "pendente") {
                const placa = "COLETAS";
                if (!porVeiculo[placa]) {
                    porVeiculo[placa] = { entregas: 0, coletas: 0, notas: [] };
                }
                porVeiculo[placa].coletas++;
            }
        });

        return porVeiculo;
    }, [romaneiosGerados, notasFiscais, coletasDiarias]);

    // Mutation para criar comprovante
    const createComprovanteMutation = useMutation({
        mutationFn: (data) => base44.entities.ComprovanteInterno.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-internos-rotas"] });
            toast.success("Comprovante adicionado!");
        }
    });

    // Mutation para atualizar nota fiscal
    const updateNotaFiscalMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.NotaFiscal.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais-rotas"] });
        }
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

    // Buscar endereço online pela transportadora ou destinatário
    const [buscandoEndereco, setBuscandoEndereco] = useState(false);
    const [enderecosEncontrados, setEnderecosEncontrados] = useState([]);
    const [showSelecionarEndereco, setShowSelecionarEndereco] = useState(false);
    const [notaParaEndereco, setNotaParaEndereco] = useState(null);

    // Buscar transportadoras cadastradas
    const { data: transportadorasCadastradas = [] } = useQuery({
        queryKey: ["transportadoras-rotas"],
        queryFn: () => base44.entities.Transportadora.list()
    });
    
    const buscarEnderecoOnline = async (nota) => {
        setBuscandoEndereco(true);
        setNotaParaEndereco(nota);
        toast.info("Buscando endereço...");
        
        try {
            const termoBusca = nota.transportadora || nota.destinatario;
            const enderecos = [];

            // 1. Buscar nas transportadoras cadastradas
            const transportadoraCadastrada = transportadorasCadastradas.find(t => 
                t.razao_social?.toLowerCase().includes(termoBusca.toLowerCase()) ||
                t.nome_fantasia?.toLowerCase().includes(termoBusca.toLowerCase()) ||
                termoBusca.toLowerCase().includes(t.razao_social?.toLowerCase() || "") ||
                termoBusca.toLowerCase().includes(t.nome_fantasia?.toLowerCase() || "")
            );

            if (transportadoraCadastrada && transportadoraCadastrada.endereco) {
                const endCadastrado = [
                    transportadoraCadastrada.endereco,
                    transportadoraCadastrada.bairro,
                    transportadoraCadastrada.cidade,
                    transportadoraCadastrada.uf
                ].filter(Boolean).join(", ");
                
                enderecos.push({
                    id: 1,
                    fonte: "📋 Cadastro Local",
                    nome_empresa: transportadoraCadastrada.nome_fantasia || transportadoraCadastrada.razao_social,
                    endereco: transportadoraCadastrada.endereco,
                    bairro: transportadoraCadastrada.bairro,
                    cidade: transportadoraCadastrada.cidade,
                    estado: transportadoraCadastrada.uf,
                    cep: transportadoraCadastrada.cep,
                    telefone: transportadoraCadastrada.telefone,
                    enderecoCompleto: endCadastrado
                });
            }

            // 2. Buscar online via Google (priorizar SP)
            const resultado = await base44.integrations.Core.InvokeLLM({
                prompt: `Preciso encontrar os endereços da transportadora/empresa: "${termoBusca}" no ESTADO DE SÃO PAULO.
Busque APENAS filiais, matrizes ou bases localizadas no ESTADO DE SÃO PAULO (SP).
Retorne até 3 endereços diferentes encontrados em SP.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        enderecos: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    nome_empresa: { type: "string" },
                                    endereco: { type: "string" },
                                    bairro: { type: "string" },
                                    cidade: { type: "string" },
                                    estado: { type: "string" },
                                    cep: { type: "string" },
                                    telefone: { type: "string" },
                                    tipo: { type: "string" }
                                }
                            }
                        },
                        encontrado: { type: "boolean" }
                    }
                }
            });

            if (resultado?.encontrado && resultado?.enderecos?.length > 0) {
                resultado.enderecos.forEach((end) => {
                    const endCompleto = [end.endereco, end.bairro, end.cidade, end.estado].filter(Boolean).join(", ");
                    enderecos.push({
                        id: enderecos.length + 1,
                        fonte: `🌐 Google - ${end.tipo || 'Filial'}`,
                        nome_empresa: end.nome_empresa,
                        endereco: end.endereco,
                        bairro: end.bairro,
                        cidade: end.cidade,
                        estado: end.estado,
                        cep: end.cep,
                        telefone: end.telefone,
                        enderecoCompleto: endCompleto
                    });
                });
            }

            if (enderecos.length === 0) {
                toast.error("Nenhum endereço encontrado em SP");
            } else if (enderecos.length === 1) {
                selecionarEndereco(enderecos[0], nota);
            } else {
                setEnderecosEncontrados(enderecos);
                setShowSelecionarEndereco(true);
            }
        } catch (error) {
            console.error("Erro ao buscar endereço:", error);
            toast.error("Erro ao buscar endereço");
        }
        
        setBuscandoEndereco(false);
    };

    const selecionarEndereco = (endereco, nota) => {
        const novaRota = {
            id: Date.now(),
            destinatario: endereco.nome_empresa || nota?.destinatario || notaParaEndereco?.destinatario,
            numero_nf: nota?.numero_nf || notaParaEndereco?.numero_nf,
            transportadora: nota?.transportadora || notaParaEndereco?.transportadora,
            endereco: endereco.endereco,
            bairro: endereco.bairro,
            cidade: endereco.cidade,
            estado: endereco.estado,
            cep: endereco.cep,
            telefone: endereco.telefone,
            enderecoCompleto: endereco.enderecoCompleto
        };
        
        setRotasAdicionadas(prev => [...prev, novaRota]);
        toast.success("Endereço adicionado às rotas!");
        setShowSelecionarEndereco(false);
        setEnderecosEncontrados([]);
        setNotaParaEndereco(null);
        
        abrirRotaWaze(endereco.enderecoCompleto);
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
            const response = await fetch(imageData);
            const blob = await response.blob();
            const file = new File([blob], "nota_fiscal.jpg", { type: "image/jpeg" });
            
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            const extractedData = await base44.integrations.Core.InvokeLLM({
                prompt: `Analise esta imagem de uma nota fiscal e extraia o endereço de entrega.`,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        destinatario: { type: "string" },
                        transportadora: { type: "string" },
                        endereco: { type: "string" },
                        bairro: { type: "string" },
                        cidade: { type: "string" },
                        estado: { type: "string" },
                        cep: { type: "string" },
                        numero_nf: { type: "string" }
                    }
                }
            });

            let enderecoFinal = [extractedData.endereco, extractedData.bairro, extractedData.cidade, extractedData.estado].filter(Boolean).join(", ");

            if (extractedData) {
                const novaRota = {
                    ...extractedData,
                    enderecoCompleto: enderecoFinal,
                    id: Date.now()
                };
                setNotaExtraidaFoto(novaRota);
                
                if (enderecoFinal) {
                    setRotasAdicionadas(prev => [...prev, novaRota]);
                    toast.success("Rota adicionada!");
                } else {
                    setShowNotaExtraida(true);
                    toast.warning("Dados extraídos, mas endereço incompleto");
                }
            } else {
                toast.error("Não foi possível extrair os dados da imagem");
            }
        } catch (error) {
            console.error("Erro ao processar foto:", error);
            toast.error("Erro ao processar a foto");
        }

        setProcessandoFoto(false);
    };

    const removerRotaAdicionada = (id) => {
        setRotasAdicionadas(prev => prev.filter(r => r.id !== id));
        toast.success("Rota removida");
    };

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

    const moverDestino = (index, direcao) => {
        if (!selectedRomaneio?.notas_fiscais) return;

        const notas = [...selectedRomaneio.notas_fiscais];
        const novoIndex = direcao === "up" ? index - 1 : index + 1;

        if (novoIndex < 0 || novoIndex >= notas.length) return;

        [notas[index], notas[novoIndex]] = [notas[novoIndex], notas[index]];

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

    const otimizarRota = async () => {
        if (!selectedRomaneio?.notas_fiscais?.length) {
            toast.error("Nenhum destino para otimizar");
            return;
        }

        setOtimizandoRota(true);

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000
                });
            });

            const { latitude, longitude } = position.coords;
            const destinos = getDestinatariosComEndereco(selectedRomaneio);

            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um otimizador de rotas de entrega.
Localização atual do motorista: Latitude ${latitude}, Longitude ${longitude}
Lista de destinos:
${destinos.map((d, i) => `${i + 1}. ${d.destinatario} - ${[d.endereco, d.bairro, d.cidade].filter(Boolean).join(", ")}`).join("\n")}

Reorganize na ordem mais eficiente.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        ordem_otimizada: {
                            type: "array",
                            items: { type: "number" }
                        },
                        explicacao: { type: "string" }
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

                toast.success("Rota otimizada!");
            }
        } catch (error) {
            console.error("Erro ao otimizar rota:", error);
            toast.error("Erro ao otimizar rota");
        }

        setOtimizandoRota(false);
    };

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

    // Funções de comando de voz
    const iniciarGravacaoVoz = async () => {
        if (gravandoVoz) {
            if (mediaRecorderVoz) {
                mediaRecorderVoz.stop();
            }
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                setGravandoVoz(false);
                setProcessandoVoz(true);

                const audioBlob = new Blob(chunks, { type: "audio/webm" });
                const file = new File([audioBlob], "comando_voz.webm", { type: "audio/webm" });

                try {
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });

                    const resultado = await base44.integrations.Core.InvokeLLM({
                        prompt: `Transcreva este áudio e extraia o endereço mencionado.`,
                        file_urls: [file_url],
                        response_json_schema: {
                            type: "object",
                            properties: {
                                transcricao: { type: "string" },
                                endereco: { type: "string" },
                                cidade: { type: "string" },
                                estado: { type: "string" }
                            }
                        }
                    });

                    if (resultado?.transcricao) {
                        const enderecoCompleto = [resultado.endereco, resultado.cidade, resultado.estado].filter(Boolean).join(", ");
                        setTranscricaoVoz(resultado.transcricao);
                        
                        const novaRota = {
                            id: Date.now(),
                            destinatario: resultado.endereco || resultado.transcricao,
                            enderecoCompleto: enderecoCompleto || resultado.transcricao,
                            cidade: resultado.cidade,
                            estado: resultado.estado
                        };
                        
                        setRotasAdicionadas(prev => [...prev, novaRota]);
                        setShowVozDialog(true);
                        toast.success("Endereço reconhecido!");
                    } else {
                        toast.error("Não foi possível entender o áudio");
                    }
                } catch (error) {
                    console.error("Erro ao processar voz:", error);
                    toast.error("Erro ao processar comando de voz");
                }

                setProcessandoVoz(false);
            };

            mediaRecorder.start();
            setMediaRecorderVoz(mediaRecorder);
            setGravandoVoz(true);
            toast.info("Fale o endereço...");

        } catch (error) {
            console.error("Erro ao acessar microfone:", error);
            toast.error("Permita o acesso ao microfone");
        }
    };

    const statusColors = {
        pendente: "bg-yellow-100 text-yellow-800",
        coletado: "bg-purple-100 text-purple-800",
        entregue: "bg-green-100 text-green-800"
    };

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

                {/* Dashboard por Veículo */}
                {Object.keys(dashboardPorVeiculo).length > 0 && (
                    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-indigo-600" />
                                Pendências por Veículo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {Object.entries(dashboardPorVeiculo).map(([placa, dados]) => {
                                    const veiculo = veiculos.find(v => v.placa === placa);
                                    return (
                                        <div 
                                            key={placa}
                                            className="p-3 bg-white rounded-xl border-l-4 border-indigo-500 shadow-sm"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <Car className="w-4 h-4 text-indigo-600" />
                                                <span className="font-bold text-sm text-indigo-700">
                                                    {placa === "COLETAS" ? "Coletas" : placa}
                                                </span>
                                            </div>
                                            {veiculo && (
                                                <p className="text-xs text-slate-500 mb-1">{veiculo.modelo}</p>
                                            )}
                                            <div className="flex gap-3 text-sm">
                                                {dados.entregas > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <Package className="w-3 h-3 text-orange-500" />
                                                        <span className="font-semibold text-orange-600">{dados.entregas}</span>
                                                        <span className="text-xs text-slate-400">entregas</span>
                                                    </div>
                                                )}
                                                {dados.coletas > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <Truck className="w-3 h-3 text-blue-500" />
                                                        <span className="font-semibold text-blue-600">{dados.coletas}</span>
                                                        <span className="text-xs text-slate-400">coletas</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Ações Rápidas */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Camera className="w-5 h-5 text-orange-600" />
                            Adicionar Nota por Foto ou Voz
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-500 mb-4">
                            Tire uma foto ou fale o endereço para adicionar como rota.
                        </p>
                        <div className="flex gap-2">
                            <Button 
                                onClick={() => setShowCamera(true)}
                                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                                disabled={processandoFoto}
                            >
                                {processandoFoto ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <Camera className="w-5 h-5 mr-2" />
                                        Foto da Nota
                                    </>
                                )}
                            </Button>
                            <Button 
                                onClick={iniciarGravacaoVoz}
                                className={`flex-1 ${gravandoVoz ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"}`}
                                disabled={processandoVoz}
                            >
                                {processandoVoz ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : gravandoVoz ? (
                                    <>
                                        <MicOff className="w-5 h-5 mr-2" />
                                        Parar
                                    </>
                                ) : (
                                    <>
                                        <Mic className="w-5 h-5 mr-2" />
                                        Voz
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Rotas Adicionadas */}
                {rotasAdicionadas.length > 0 && (
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-green-600" />
                                Rotas Escaneadas ({rotasAdicionadas.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {rotasAdicionadas.map((rota, index) => (
                                <div 
                                    key={rota.id}
                                    className="p-4 bg-white rounded-xl border-2 border-green-200 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1">
                                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800">
                                                    {rota.destinatario || rota.transportadora || "Destino"}
                                                </p>
                                                {rota.numero_nf && (
                                                    <p className="text-sm text-slate-500">NF: {rota.numero_nf}</p>
                                                )}
                                                {rota.enderecoCompleto && (
                                                    <button
                                                        onClick={() => abrirRotaWaze(rota.enderecoCompleto)}
                                                        className="text-blue-600 hover:text-blue-800 hover:underline mt-1 text-sm flex items-center gap-1"
                                                    >
                                                        <MapPin className="w-3 h-3" />
                                                        {rota.enderecoCompleto}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Button 
                                                size="sm"
                                                onClick={() => abrirRotaWaze(rota.enderecoCompleto)}
                                                className="bg-blue-500 hover:bg-blue-600 text-white"
                                            >
                                                <Navigation className="w-4 h-4 mr-1" />
                                                Waze
                                            </Button>
                                            <Button 
                                                size="sm"
                                                variant="outline"
                                                onClick={() => abrirRotaGoogleMaps(rota.enderecoCompleto)}
                                                className="border-green-500 text-green-600"
                                            >
                                                <MapPin className="w-4 h-4 mr-1" />
                                                Maps
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => removerRotaAdicionada(rota.id)}
                                                className="text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Seletor de Romaneio Gerado */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Truck className="w-5 h-5 text-indigo-600" />
                            Buscar Nota do Romaneio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Selecione o Romaneio Gerado</Label>
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
                        
                        {selectedRomaneioGerado && notasDoRomaneioGerado.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm text-slate-500">Notas do Romaneio ({notasDoRomaneioGerado.length})</Label>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {notasDoRomaneioGerado.map((nota) => {
                                        const cliente = clientes.find(c => 
                                            c.razao_social?.toLowerCase().includes(nota.destinatario?.toLowerCase()) ||
                                            nota.destinatario?.toLowerCase().includes(c.razao_social?.toLowerCase())
                                        );
                                        const enderecoNota = cliente?.endereco || nota.endereco || "";
                                        const cidadeNota = cliente?.cidade || nota.cidade || "";
                                        const enderecoCompleto = [enderecoNota, cliente?.bairro, cidadeNota].filter(Boolean).join(", ");
                                        
                                        return (
                                            <div
                                                key={nota.id}
                                                className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all"
                                                onClick={() => {
                                                    if (enderecoCompleto) {
                                                        abrirRotaWaze(enderecoCompleto);
                                                    } else {
                                                        buscarEnderecoOnline(nota);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-800">{nota.destinatario}</p>
                                                        <p className="text-sm text-slate-500">NF: {nota.numero_nf} | Transp: {nota.transportadora || "-"}</p>
                                                        {enderecoCompleto ? (
                                                            <p className="text-sm text-blue-600 mt-1">
                                                                <MapPin className="w-3 h-3 inline mr-1" />
                                                                {enderecoCompleto}
                                                            </p>
                                                        ) : (
                                                            <p className="text-sm text-orange-600 mt-1">
                                                                <Search className="w-3 h-3 inline mr-1" />
                                                                Clique para buscar endereço online
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                buscarEnderecoOnline(nota);
                                                            }}
                                                        >
                                                            <Search className="w-4 h-4 text-orange-600" />
                                                        </Button>
                                                        {enderecoCompleto && (
                                                            <>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        abrirRotaWaze(enderecoCompleto);
                                                                    }}
                                                                >
                                                                    <Navigation className="w-4 h-4 text-blue-600" />
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        abrirRotaGoogleMaps(enderecoCompleto);
                                                                    }}
                                                                >
                                                                    <MapPin className="w-4 h-4 text-green-600" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const novaRota = {
                                                                    id: Date.now(),
                                                                    destinatario: nota.destinatario,
                                                                    numero_nf: nota.numero_nf,
                                                                    transportadora: nota.transportadora,
                                                                    enderecoCompleto: enderecoCompleto
                                                                };
                                                                setRotasAdicionadas(prev => [...prev, novaRota]);
                                                                toast.success("Nota adicionada às rotas!");
                                                            }}
                                                            className="text-green-600 hover:bg-green-50"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Camera Scanner */}
            {showCamera && (
                <ScannerCamera
                    onCapture={handleProcessarFoto}
                    onClose={() => setShowCamera(false)}
                />
            )}

            {/* Dialog Comando de Voz */}
            <Dialog open={showVozDialog} onOpenChange={setShowVozDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mic className="w-5 h-5 text-purple-600" />
                            Endereço Reconhecido
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                            <p className="text-sm text-slate-500 mb-1">Você disse:</p>
                            <p className="font-medium text-purple-800">{transcricaoVoz}</p>
                        </div>

                        {rotasAdicionadas.length > 0 && (
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                <p className="text-sm text-slate-500 mb-1">Endereço para navegação:</p>
                                <p className="font-medium text-green-800">
                                    {rotasAdicionadas[rotasAdicionadas.length - 1]?.enderecoCompleto}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button 
                                onClick={() => {
                                    const endereco = rotasAdicionadas[rotasAdicionadas.length - 1]?.enderecoCompleto;
                                    if (endereco) abrirRotaWaze(endereco);
                                    setShowVozDialog(false);
                                }}
                                className="flex-1 bg-blue-500 hover:bg-blue-600"
                            >
                                <Navigation className="w-5 h-5 mr-2" />
                                Abrir no Waze
                            </Button>
                            <Button 
                                onClick={() => {
                                    const endereco = rotasAdicionadas[rotasAdicionadas.length - 1]?.enderecoCompleto;
                                    if (endereco) abrirRotaGoogleMaps(endereco);
                                    setShowVozDialog(false);
                                }}
                                variant="outline"
                                className="flex-1 border-green-500 text-green-600"
                            >
                                <MapPin className="w-5 h-5 mr-2" />
                                Google Maps
                            </Button>
                        </div>

                        <Button 
                            variant="outline"
                            onClick={() => setShowVozDialog(false)}
                            className="w-full"
                        >
                            Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Selecionar Endereço */}
            <Dialog open={showSelecionarEndereco} onOpenChange={setShowSelecionarEndereco}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            Escolha o Endereço
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                            Encontramos {enderecosEncontrados.length} endereço(s). Selecione o correto:
                        </p>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {enderecosEncontrados.map((end) => (
                                <div
                                    key={end.id}
                                    className="p-3 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                                    onClick={() => selecionarEndereco(end, notaParaEndereco)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {end.fonte}
                                                </Badge>
                                                {end.estado === "SP" && (
                                                    <Badge className="bg-green-100 text-green-700 text-xs">SP</Badge>
                                                )}
                                            </div>
                                            <p className="font-medium text-slate-800">{end.nome_empresa}</p>
                                            <p className="text-sm text-slate-600">{end.enderecoCompleto}</p>
                                            {end.telefone && (
                                                <p className="text-xs text-slate-500 mt-1">📞 {end.telefone}</p>
                                            )}
                                        </div>
                                        <Navigation className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => setShowSelecionarEndereco(false)}
                        >
                            Cancelar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}