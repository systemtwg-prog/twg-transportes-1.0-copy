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
    Upload, Pencil, MessageSquare, BarChart3, Search
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import AudioRecorder from "@/components/shared/AudioRecorder";
import ScannerCamera from "@/components/shared/ScannerCamera";
import { Mic, MicOff } from "lucide-react";

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
    const [audioChunks, setAudioChunks] = useState([]);

    // Dashboard por veículo
    const dashboardPorVeiculo = useMemo(() => {
        const hoje = format(new Date(), "yyyy-MM-dd");
        const porVeiculo = {};

        // Contar entregas pendentes dos romaneios gerados
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

        // Contar coletas pendentes
        coletasDiarias.forEach(c => {
            if (c.status === "pendente") {
                // Tentar associar coleta a um veículo (se tiver motorista vinculado)
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

            // 1. PRIMEIRO: Buscar nas transportadoras cadastradas
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

            // 2. SEGUNDO: Buscar online via Google (priorizar SP)
            const resultado = await base44.integrations.Core.InvokeLLM({
                prompt: `Preciso encontrar os endereços da transportadora/empresa: "${termoBusca}" no ESTADO DE SÃO PAULO.

IMPORTANTE: 
- Busque APENAS filiais, matrizes ou bases localizadas no ESTADO DE SÃO PAULO (SP)
- Se for uma transportadora conhecida (Braspress, Jamef, TNT, Fedex, Total Express, Sequoia, Jadlog, etc), busque a filial de SP
- Retorne até 3 endereços diferentes encontrados em SP
- Se não encontrar em SP, busque em estados próximos (RJ, MG, PR)

Busque no Google Maps e sites oficiais das transportadoras.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        enderecos: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    nome_empresa: { type: "string", description: "Nome da empresa/filial" },
                                    endereco: { type: "string", description: "Endereço (rua e número)" },
                                    bairro: { type: "string", description: "Bairro" },
                                    cidade: { type: "string", description: "Cidade" },
                                    estado: { type: "string", description: "Estado/UF (ex: SP)" },
                                    cep: { type: "string", description: "CEP" },
                                    telefone: { type: "string", description: "Telefone" },
                                    tipo: { type: "string", description: "Tipo (Matriz, Filial, CD, Base)" }
                                }
                            }
                        },
                        encontrado: { type: "boolean", description: "Se encontrou algum endereço" }
                    }
                }
            });

            if (resultado?.encontrado && resultado?.enderecos?.length > 0) {
                resultado.enderecos.forEach((end, idx) => {
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
                // Se só tem 1 endereço, usa direto
                selecionarEndereco(enderecos[0], nota);
            } else {
                // Se tem mais de 1, mostra opções para o motorista escolher
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
        
        // Abrir no Waze automaticamente
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
            // Converter base64 para blob
            const response = await fetch(imageData);
            const blob = await response.blob();
            const file = new File([blob], "nota_fiscal.jpg", { type: "image/jpeg" });
            
            // Fazer upload da imagem
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            // Usar LLM para extrair dados da imagem
            const extractedData = await base44.integrations.Core.InvokeLLM({
            prompt: `Analise esta imagem de uma nota fiscal, etiqueta ou documento de transporte e extraia as seguintes informações:
            - Nome do destinatário ou empresa de destino
            - Nome da transportadora (se houver)
            - Endereço COMPLETO de entrega (rua, número, bairro, cidade, estado, CEP)
            - Número da nota fiscal
            - CNPJ (se visível)
            - Número de volumes
            - Peso

            IMPORTANTE: Foque em extrair o ENDEREÇO DE ENTREGA que aparece no documento.
            Extraia o máximo de informações possíveis para que o motorista possa navegar até o destino.`,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        destinatario: { type: "string", description: "Nome do destinatário ou empresa" },
                        transportadora: { type: "string", description: "Nome da transportadora" },
                        endereco: { type: "string", description: "Endereço completo" },
                        bairro: { type: "string", description: "Bairro" },
                        cidade: { type: "string", description: "Cidade" },
                        estado: { type: "string", description: "Estado/UF" },
                        cep: { type: "string", description: "CEP" },
                        numero_nf: { type: "string", description: "Número da nota fiscal" },
                        cnpj: { type: "string", description: "CNPJ" }
                    }
                }
            });

            let enderecoFinal = [extractedData.endereco, extractedData.bairro, extractedData.cidade, extractedData.estado].filter(Boolean).join(", ");

            // Se não encontrou endereço completo, buscar online pela transportadora ou destinatário
            if (!extractedData.endereco || extractedData.endereco.length < 10) {
                const termoBusca = extractedData.transportadora || extractedData.destinatario || extractedData.cnpj;
                
                if (termoBusca) {
                    toast.info("Buscando endereço online...");
                    
                    const buscaOnline = await base44.integrations.Core.InvokeLLM({
                        prompt: `Preciso encontrar o endereço completo da empresa/transportadora: "${termoBusca}"
                        ${extractedData.cnpj ? `CNPJ: ${extractedData.cnpj}` : ""}
                        ${extractedData.cidade ? `Cidade provável: ${extractedData.cidade}` : ""}
                        
                        Busque na internet e retorne o endereço completo com rua, número, bairro, cidade, estado e CEP.
                        Se for uma transportadora conhecida, busque o endereço da filial ou matriz mais próxima.`,
                        add_context_from_internet: true,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                nome_empresa: { type: "string", description: "Nome da empresa encontrada" },
                                endereco: { type: "string", description: "Endereço completo (rua e número)" },
                                bairro: { type: "string", description: "Bairro" },
                                cidade: { type: "string", description: "Cidade" },
                                estado: { type: "string", description: "Estado/UF" },
                                cep: { type: "string", description: "CEP" },
                                telefone: { type: "string", description: "Telefone" },
                                encontrado: { type: "boolean", description: "Se encontrou o endereço" }
                            }
                        }
                    });

                    if (buscaOnline?.encontrado && buscaOnline?.endereco) {
                        extractedData.endereco = buscaOnline.endereco;
                        extractedData.bairro = buscaOnline.bairro || extractedData.bairro;
                        extractedData.cidade = buscaOnline.cidade || extractedData.cidade;
                        extractedData.estado = buscaOnline.estado || extractedData.estado;
                        extractedData.cep = buscaOnline.cep || extractedData.cep;
                        extractedData.destinatario = buscaOnline.nome_empresa || extractedData.destinatario || extractedData.transportadora;
                        enderecoFinal = [buscaOnline.endereco, buscaOnline.bairro, buscaOnline.cidade, buscaOnline.estado].filter(Boolean).join(", ");
                        toast.success("Endereço encontrado online!");
                    }
                }
            }

            if (extractedData) {
                const novaRota = {
                    ...extractedData,
                    enderecoCompleto: enderecoFinal,
                    id: Date.now()
                };
                setNotaExtraidaFoto(novaRota);
                
                // Adiciona automaticamente à lista de rotas
                if (enderecoFinal) {
                    setRotasAdicionadas(prev => [...prev, novaRota]);
                    toast.success("Rota adicionada! Clique no endereço para navegar.");
                } else {
                    setShowNotaExtraida(true);
                    toast.warning("Dados extraídos, mas endereço incompleto");
                }
            } else {
                toast.error("Não foi possível extrair os dados da imagem");
            }
        } catch (error) {
            console.error("Erro ao processar foto:", error);
            toast.error("Erro ao processar a foto. Tente novamente.");
        }

        setProcessandoFoto(false);
    };

    // Remover rota da lista
    const removerRotaAdicionada = (id) => {
        setRotasAdicionadas(prev => prev.filter(r => r.id !== id));
        toast.success("Rota removida");
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

    // Funções de comando de voz
    const iniciarGravacaoVoz = async () => {
        if (gravandoVoz) {
            // Parar gravação
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
                    // Upload do áudio
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });

                    // Transcrever e buscar endereço
                    const resultado = await base44.integrations.Core.InvokeLLM({
                        prompt: `Transcreva este áudio e extraia o endereço mencionado.
O usuário está ditando um endereço para navegação GPS.
Retorne o endereço completo formatado para usar no Waze/Google Maps.`,
                        file_urls: [file_url],
                        response_json_schema: {
                            type: "object",
                            properties: {
                                transcricao: { type: "string", description: "Texto transcrito do áudio" },
                                endereco: { type: "string", description: "Endereço extraído formatado" },
                                cidade: { type: "string", description: "Cidade identificada" },
                                estado: { type: "string", description: "Estado identificado" }
                            }
                        }
                    });

                    if (resultado?.transcricao) {
                        const enderecoCompleto = [resultado.endereco, resultado.cidade, resultado.estado].filter(Boolean).join(", ");
                        setTranscricaoVoz(resultado.transcricao);
                        
                        // Adicionar rota
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

                {/* Ações Rápidas - Sempre visíveis */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Camera className="w-5 h-5 text-orange-600" />
                            Adicionar Nota por Foto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-500 mb-4">
                            Tire uma foto do endereço da nota fiscal para adicionar automaticamente como rota.
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

                {/* Rotas Adicionadas por Foto */}
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
                                <Label className="text-sm text-slate-500">Notas do Romaneio ({notasDoRomaneioGerado.length}) - Clique para navegar</Label>
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
                                                        // Buscar endereço online pela transportadora
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
                                                            title="Buscar endereço online"
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
                                                                    title="Abrir no Waze"
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
                                                                    title="Abrir no Maps"
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
                                                                // Adicionar como rota
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
                                                            title="Adicionar às rotas"
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

                {/* Seletor de Romaneio Ativo */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Route className="w-5 h-5 text-green-600" />
                            Selecione o Romaneio Ativo
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
                                                        {dest.observacoes && (
                                                            <p className="text-xs text-slate-500 mt-1 italic">📝 {dest.observacoes}</p>
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
                                                        onClick={() => {
                                                            setEditingNotaObs(dest);
                                                            setObsTexto(dest.observacoes || "");
                                                            setShowEditObs(true);
                                                        }}
                                                        className="text-purple-600 hover:bg-purple-50"
                                                        title="Editar/Adicionar observação"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setComprovanteNota(dest);
                                                            setComprovanteArquivos([]);
                                                            setComprovanteObs("");
                                                            setShowAddComprovante(true);
                                                        }}
                                                        className="text-orange-600 hover:bg-orange-50"
                                                        title="Adicionar comprovante"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </Button>
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

            {/* Dialog Adicionar Comprovante de Entrega */}
            <Dialog open={showAddComprovante} onOpenChange={setShowAddComprovante}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-orange-600" />
                            Adicionar Comprovante de Entrega
                        </DialogTitle>
                    </DialogHeader>
                    {comprovanteNota && (
                        <div className="space-y-4">
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <p className="font-semibold text-orange-800">{comprovanteNota.destinatario}</p>
                                <p className="text-sm text-orange-600">NF: {comprovanteNota.numero_nf}</p>
                            </div>

                            {/* Upload de arquivos */}
                            <div className="space-y-2">
                                <Label>Fotos do Comprovante</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1 border-2 border-dashed border-orange-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const files = Array.from(e.target.files);
                                                if (files.length === 0) return;
                                                setUploadingComprovante(true);
                                                const novosArquivos = [];
                                                for (const file of files) {
                                                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                                    novosArquivos.push({ nome: file.name, url: file_url, tipo: file.type });
                                                }
                                                setComprovanteArquivos(prev => [...prev, ...novosArquivos]);
                                                setUploadingComprovante(false);
                                            }}
                                            className="hidden"
                                            id="comprovante-upload"
                                        />
                                        <label htmlFor="comprovante-upload" className="cursor-pointer">
                                            {uploadingComprovante ? (
                                                <Loader2 className="w-8 h-8 mx-auto text-orange-400 animate-spin" />
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 mx-auto text-orange-400" />
                                                    <span className="text-sm text-orange-600">Selecionar</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                    <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setUploadingComprovante(true);
                                                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                                                setComprovanteArquivos(prev => [...prev, { nome: file.name, url: file_url, tipo: file.type }]);
                                                setUploadingComprovante(false);
                                            }}
                                            className="hidden"
                                            id="comprovante-camera"
                                        />
                                        <label htmlFor="comprovante-camera" className="cursor-pointer">
                                            <Camera className="w-8 h-8 mx-auto text-orange-400" />
                                            <span className="text-sm text-orange-600">Câmera</span>
                                        </label>
                                    </div>
                                </div>
                                {comprovanteArquivos.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {comprovanteArquivos.map((arq, i) => (
                                            <div key={i} className="relative">
                                                <img src={arq.url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                                                <button
                                                    onClick={() => setComprovanteArquivos(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                                                >×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Observações</Label>
                                <Textarea
                                    value={comprovanteObs}
                                    onChange={(e) => setComprovanteObs(e.target.value)}
                                    placeholder="Observações sobre a entrega..."
                                    rows={3}
                                />
                            </div>

                            <Button
                                onClick={async () => {
                                    // Criar comprovante
                                    await createComprovanteMutation.mutateAsync({
                                        nota_fiscal: comprovanteNota.numero_nf,
                                        data: format(new Date(), "yyyy-MM-dd"),
                                        arquivos: comprovanteArquivos,
                                        observacoes: comprovanteObs
                                    });

                                    // Atualizar status da nota fiscal se existir
                                    const notaFiscal = notasFiscais.find(n => n.numero_nf === comprovanteNota.numero_nf);
                                    if (notaFiscal) {
                                        await updateNotaFiscalMutation.mutateAsync({
                                            id: notaFiscal.id,
                                            data: { 
                                                observacoes: (notaFiscal.observacoes || "") + `\n[${format(new Date(), "dd/MM HH:mm")}] Comprovante adicionado. ${comprovanteObs}`
                                            }
                                        });
                                    }

                                    setShowAddComprovante(false);
                                    setComprovanteNota(null);
                                    setComprovanteArquivos([]);
                                    setComprovanteObs("");
                                }}
                                disabled={comprovanteArquivos.length === 0 || createComprovanteMutation.isPending}
                                className="w-full bg-orange-600 hover:bg-orange-700"
                            >
                                {createComprovanteMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                Salvar Comprovante
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog Editar Observação */}
            <Dialog open={showEditObs} onOpenChange={setShowEditObs}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-purple-600" />
                            Editar Observação
                        </DialogTitle>
                    </DialogHeader>
                    {editingNotaObs && (
                        <div className="space-y-4">
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <p className="font-semibold text-purple-800">{editingNotaObs.destinatario}</p>
                                <p className="text-sm text-purple-600">NF: {editingNotaObs.numero_nf}</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Observação</Label>
                                <Textarea
                                    value={obsTexto}
                                    onChange={(e) => setObsTexto(e.target.value)}
                                    placeholder="Digite a observação..."
                                    rows={4}
                                />
                            </div>

                            <Button
                                onClick={() => {
                                    if (!selectedRomaneio?.notas_fiscais) return;
                                    
                                    const notas = selectedRomaneio.notas_fiscais.map(n => 
                                        n.numero_nf === editingNotaObs.numero_nf 
                                            ? { ...n, observacoes: obsTexto }
                                            : n
                                    );

                                    updateRomaneioMutation.mutate({
                                        id: selectedRomaneio.id,
                                        data: { notas_fiscais: notas }
                                    });

                                    setSelectedRomaneio({
                                        ...selectedRomaneio,
                                        notas_fiscais: notas
                                    });

                                    setShowEditObs(false);
                                    setEditingNotaObs(null);
                                    toast.success("Observação salva!");
                                }}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                Salvar Observação
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

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
                            Encontramos {enderecosEncontrados.length} endereço(s) para <strong>{notaParaEndereco?.transportadora || notaParaEndereco?.destinatario}</strong>. Selecione o correto:
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