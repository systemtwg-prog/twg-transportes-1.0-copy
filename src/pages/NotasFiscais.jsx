import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Plus, FileText, Upload, Trash2, Pencil, Search, Save, X, ClipboardPaste, Sparkles, Car, Truck, Package, Building2, RefreshCw, Globe, Mic, Square, Play, Pause, Loader2, Users, MapPin, Replace, Filter
} from "lucide-react";
import TableColumnFilter from "@/components/shared/TableColumnFilter";

import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotasFiscais() {
    const [showForm, setShowForm] = useState(false);
    const [showPasteForm, setShowPasteForm] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [processingPaste, setProcessingPaste] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");
    const [columnFilters, setColumnFilters] = useState({
        destinatario: [],
        transportadora: [],
        filial: [],
        placa: []
    });
    const [filterFilial, setFilterFilial] = useState("");
    const [importing, setImporting] = useState(false);
    const [selecionados, setSelecionados] = useState([]);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [placaEmMassa, setPlacaEmMassa] = useState("");
    const [showCadastroTransp, setShowCadastroTransp] = useState(false);
    const [transpExtraidas, setTranspExtraidas] = useState([]);
    const [transpSelecionadas, setTranspSelecionadas] = useState([]);
    const [buscandoDados, setBuscandoDados] = useState({});
    const [showCadastroDestinatario, setShowCadastroDestinatario] = useState(false);
    const [novoDestinatario, setNovoDestinatario] = useState({ nome: "" });
    
    // Estados para gravação de áudio
    const [showAudioDialog, setShowAudioDialog] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [transcription, setTranscription] = useState("");
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioFileUrl, setAudioFileUrl] = useState("");
    const [buscandoOnline, setBuscandoOnline] = useState(false);
    const [dadosExtraidos, setDadosExtraidos] = useState(null);
    const [destinoSelecionado, setDestinoSelecionado] = useState("");
    const [showImportador, setShowImportador] = useState(false);
    const mediaRecorderRef = React.useRef(null);
    const audioChunksRef = React.useRef([]);
    const audioRef = React.useRef(null);
    
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        numero_nf: "",
        destinatario: "",
        peso: "",
        volume: "",
        transportadora: "",
        filial: "",
        placa: "",
        data: format(new Date(), "yyyy-MM-dd"),
        observacoes: ""
    });

    const { data: notas = [], isLoading } = useQuery({
        queryKey: ["notas-fiscais"],
        queryFn: () => base44.entities.NotaFiscal.list("-created_date")
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-notas"],
        queryFn: () => base44.entities.Veiculo.list()
    });

    const { data: transportadoras = [] } = useQuery({
        queryKey: ["transportadoras-notas"],
        queryFn: () => base44.entities.Transportadora.list()
    });

    const { data: destinatarios = [] } = useQuery({
        queryKey: ["destinatarios-notas"],
        queryFn: () => base44.entities.Destinatario.list()
    });

    // Verificar CNPJ duplicado
    const cnpjJaCadastrado = (cnpj) => {
        if (!cnpj) return false;
        const cnpjLimpo = cnpj.replace(/\D/g, "");
        return transportadoras.some(t => t.cnpj?.replace(/\D/g, "") === cnpjLimpo);
    };

    // Criar transportadora
    const createTranspMutation = useMutation({
        mutationFn: (data) => base44.entities.Transportadora.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transportadoras-notas"] });
        }
    });

    // Criar destinatário
    const createDestinatarioMutation = useMutation({
        mutationFn: (data) => base44.entities.Destinatario.create(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["destinatarios-notas"] });
            setForm({ ...form, destinatario: data.nome });
            setShowCadastroDestinatario(false);
            setNovoDestinatario({ nome: "" });
            toast.success("Destinatário cadastrado!");
        }
    });

    // Buscar dados online da transportadora
    const buscarDadosOnline = async (index, nome) => {
        setBuscandoDados(prev => ({ ...prev, [index]: true }));
        
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Busque informações sobre a transportadora "${nome}" no Brasil.

Retorne os dados encontrados sobre esta empresa de transporte/logística:
- razao_social: nome completo da empresa
- nome_fantasia: nome fantasia
- cnpj: CNPJ se encontrar
- telefone: telefone de contato
- email: email de contato
- endereco: endereço completo
- bairro: bairro
- cidade: cidade
- uf: estado (sigla)
- cep: CEP
- horario_funcionamento: horário de funcionamento (ex: 08:00 às 18:00)

Se não encontrar algum dado, deixe em branco.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        razao_social: { type: "string" },
                        nome_fantasia: { type: "string" },
                        cnpj: { type: "string" },
                        telefone: { type: "string" },
                        email: { type: "string" },
                        endereco: { type: "string" },
                        bairro: { type: "string" },
                        cidade: { type: "string" },
                        uf: { type: "string" },
                        cep: { type: "string" },
                        horario_funcionamento: { type: "string" }
                    }
                }
            });

            if (result) {
                setTranspExtraidas(prev => {
                    const newList = [...prev];
                    newList[index] = {
                        ...newList[index],
                        ...result,
                        razao_social: result.razao_social || newList[index].nome
                    };
                    return newList;
                });
                toast.success(`Dados atualizados para ${nome}!`);
            }
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            toast.error("Não foi possível buscar dados online.");
        }
        
        setBuscandoDados(prev => ({ ...prev, [index]: false }));
    };

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.NotaFiscal.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setShowForm(false);
            resetForm();
            toast.success("Nota fiscal cadastrada com sucesso!");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.NotaFiscal.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setShowForm(false);
            resetForm();
            toast.success("Nota fiscal atualizada!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.NotaFiscal.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            toast.success("Nota fiscal excluída!");
        }
    });

    // Mutation para atualizar em massa
    const updateEmMassaMutation = useMutation({
        mutationFn: async ({ ids, data }) => {
            for (const id of ids) {
                await base44.entities.NotaFiscal.update(id, data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setShowEditDialog(false);
            setSelecionados([]);
            setPlacaEmMassa("");
            toast.success("Notas fiscais atualizadas!");
        }
    });

    // Mutation para excluir em massa
    const deleteEmMassaMutation = useMutation({
        mutationFn: async (ids) => {
            for (const id of ids) {
                await base44.entities.NotaFiscal.delete(id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            setSelecionados([]);
            toast.success("Notas fiscais excluídas!");
        }
    });

    const resetForm = () => {
        setForm({
            numero_nf: "",
            destinatario: "",
            peso: "",
            volume: "",
            transportadora: "",
            filial: "",
            placa: "",
            data: format(new Date(), "yyyy-MM-dd"),
            observacoes: ""
        });
        setEditing(null);
    };

    const handleEdit = (nota) => {
        setForm(nota);
        setEditing(nota);
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const toggleSelecionado = (id) => {
        setSelecionados(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selecionarTodos = () => {
        if (selecionados.length === filtered.length) {
            setSelecionados([]);
        } else {
            setSelecionados(filtered.map(n => n.id));
        }
    };

    const handleProcessPaste = async () => {
        if (!pasteText.trim()) return;
        
        setProcessingPaste(true);
        
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um extrator de dados. Analise o texto abaixo e extraia as informações de notas fiscais.

TEXTO PARA ANALISAR:
"""
${pasteText}
"""

IMPORTANTE: 
- Extraia TODAS as notas fiscais encontradas
- NÃO preencha o campo remetente, deixe em branco
- Extraia o nome da transportadora de cada nota`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        notas: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    numero_nf: { type: "string", description: "Número da NF" },
                                    destinatario: { type: "string", description: "Destinatário" },
                                    peso: { type: "string", description: "Peso" },
                                    volume: { type: "string", description: "Volumes" },
                                    transportadora: { type: "string", description: "Transportadora" }
                                }
                            }
                        }
                    },
                    required: ["notas"]
                }
            });

            console.log("Resultado LLM:", result);

            const notasEncontradas = result?.notas || [];
            
            if (notasEncontradas.length > 0) {
                let importados = 0;
                const transportadorasUnicas = new Set();
                
                for (const nota of notasEncontradas) {
                    if (nota.numero_nf || nota.destinatario) {
                        await base44.entities.NotaFiscal.create({
                            numero_nf: nota.numero_nf || "",
                            destinatario: nota.destinatario || "",
                            peso: nota.peso || "",
                            volume: nota.volume || "",
                            transportadora: nota.transportadora || "",
                            remetente: "",
                            data: format(new Date(), "yyyy-MM-dd")
                        });
                        importados++;
                        
                        // Coletar transportadoras únicas
                        if (nota.transportadora) {
                            transportadorasUnicas.add(nota.transportadora.trim());
                        }
                    }
                }
                
                queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
                toast.success(`✅ ${importados} nota(s) fiscal(is) criada(s)!`);
                
                // Extrair transportadoras para cadastro
                if (transportadorasUnicas.size > 0) {
                    const transpList = Array.from(transportadorasUnicas).map(nome => ({
                        nome,
                        razao_social: nome,
                        selecionada: true
                    }));
                    setTranspExtraidas(transpList);
                    setTranspSelecionadas(transpList.map((_, i) => i));
                    setShowCadastroTransp(true);
                }
                
                setShowPasteForm(false);
                setPasteText("");
            } else {
                toast.error("Não foi possível identificar notas fiscais no texto.");
            }
        } catch (error) {
            console.error("Erro ao processar texto:", error);
            toast.error("Erro ao processar texto. Tente novamente.");
        }
        
        setProcessingPaste(false);
    };

    // Cadastrar transportadoras selecionadas
    const handleCadastrarTransportadoras = async () => {
        let cadastradas = 0;
        let ignoradas = 0;
        
        for (const index of transpSelecionadas) {
            const transp = transpExtraidas[index];
            if (transp) {
                // Verificar se já existe pelo CNPJ ou nome
                if (transp.cnpj && cnpjJaCadastrado(transp.cnpj)) {
                    ignoradas++;
                    continue;
                }
                
                // Verificar se já existe pelo nome
                const nomeExiste = transportadoras.some(t => 
                    t.razao_social?.toLowerCase() === transp.razao_social?.toLowerCase() ||
                    t.nome_fantasia?.toLowerCase() === transp.nome?.toLowerCase()
                );
                
                if (nomeExiste) {
                    ignoradas++;
                    continue;
                }
                
                await createTranspMutation.mutateAsync({
                    razao_social: transp.razao_social || transp.nome,
                    nome_fantasia: transp.nome_fantasia || transp.nome,
                    cnpj: transp.cnpj || "",
                    telefone: transp.telefone || "",
                    email: transp.email || "",
                    endereco: transp.endereco || "",
                    bairro: transp.bairro || "",
                    cidade: transp.cidade || "",
                    uf: transp.uf || "",
                    cep: transp.cep || "",
                    observacoes: transp.horario_funcionamento ? `Horário: ${transp.horario_funcionamento}` : "",
                    status: "ativo"
                });
                cadastradas++;
            }
        }
        
        queryClient.invalidateQueries({ queryKey: ["transportadoras-notas"] });
        
        if (ignoradas > 0) {
            toast.warning(`${cadastradas} transportadora(s) cadastrada(s). ${ignoradas} ignorada(s) (já existentes).`);
        } else if (cadastradas > 0) {
            toast.success(`✅ ${cadastradas} transportadora(s) cadastrada(s)!`);
        }
        
        setShowCadastroTransp(false);
        setTranspExtraidas([]);
        setTranspSelecionadas([]);
    };

    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        notas: {
                            type: "array",
                            description: "Lista de notas fiscais extraídas do documento. NÃO extraia o campo remetente.",
                            items: {
                                type: "object",
                                properties: {
                                    numero_nf: { type: "string", description: "Número da nota fiscal (NFE)" },
                                    destinatario: { type: "string", description: "Nome do destinatário" },
                                    peso: { type: "string", description: "Peso da carga" },
                                    volume: { type: "string", description: "Quantidade de volumes" },
                                    transportadora: { type: "string", description: "Nome da transportadora" }
                                }
                            }
                        }
                    }
                }
            });

            if (result.status === "success" && result.output) {
                const notasImport = result.output.notas || (Array.isArray(result.output) ? result.output : [result.output]);
                let importados = 0;
                
                for (const nota of notasImport) {
                    if (nota.numero_nf || nota.destinatario) {
                        await base44.entities.NotaFiscal.create({
                            numero_nf: nota.numero_nf || "",
                            destinatario: nota.destinatario || "",
                            peso: nota.peso || "",
                            volume: nota.volume || "",
                            transportadora: nota.transportadora || "",
                            remetente: "", // Sempre em branco
                            data: format(new Date(), "yyyy-MM-dd")
                        });
                        importados++;
                    }
                }
                
                queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
                toast.success(`✅ Importado com sucesso! ${importados} nota(s) fiscal(is) adicionada(s).`);
            } else {
                toast.error("Erro ao processar arquivo. Verifique o formato.");
            }
        } catch (error) {
            console.error("Erro na importação:", error);
            toast.error("Erro ao importar arquivo. Tente novamente.");
        }
        
        setImporting(false);
        e.target.value = "";
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    // Funções de gravação de áudio
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);

                // Upload do áudio
                const file = new File([audioBlob], "audio_busca.webm", { type: "audio/webm" });
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                setAudioFileUrl(file_url);

                // Transcrever áudio
                setIsTranscribing(true);
                try {
                    const result = await base44.integrations.Core.InvokeLLM({
                        prompt: "Transcreva o áudio anexado. Retorne apenas o texto transcrito, sem comentários adicionais.",
                        file_urls: [file_url],
                        response_json_schema: {
                            type: "object",
                            properties: {
                                transcricao: { type: "string" }
                            }
                        }
                    });
                    const texto = result.transcricao || "";
                    setTranscription(texto);
                } catch (err) {
                    console.error("Erro na transcrição:", err);
                    toast.error("Erro ao transcrever áudio");
                }
                setIsTranscribing(false);

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Erro ao acessar microfone:", err);
            toast.error("Não foi possível acessar o microfone. Verifique as permissões.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Buscar dados online com base na transcrição
    const buscarDadosOnlineAudio = async () => {
        if (!transcription.trim()) {
            toast.error("Grave um áudio primeiro");
            return;
        }

        setBuscandoOnline(true);
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um assistente de busca de dados empresariais. Analise o texto transcrito e busque informações COMPLETAS e REAIS na internet.

TEXTO TRANSCRITO DO ÁUDIO:
"${transcription}"

INSTRUÇÕES DE BUSCA:
1. Identifique EXATAMENTE o que o usuário está procurando (nome de empresa, transportadora, cliente, endereço, etc)
2. Faça uma busca AMPLA em MÚLTIPLAS fontes online
3. Priorize dados OFICIAIS e ATUALIZADOS

FONTES DE PESQUISA OBRIGATÓRIAS:
- Google Maps / Google Meu Negócio
- Bing Places / Bing Maps
- Yahoo Local
- Páginas Amarelas / TeleListas
- Receita Federal (consulta CNPJ)
- Sites oficiais das empresas
- LinkedIn Companies
- Reclame Aqui
- Guia Mais / Apontador
- iLocal
- Para transportes: ANTT, NTC, SETCESP, FETCESP

EXTRAIA TODOS OS DADOS DISPONÍVEIS:
- Nome completo / Razão Social
- Nome Fantasia
- CNPJ formatado
- Telefones (todos encontrados)
- Email comercial
- Endereço completo com número
- Bairro, Cidade, UF, CEP
- Site oficial
- Horário de funcionamento
- Ramo de atividade

IMPORTANTE: Busque TODAS as informações possíveis, mesmo que parciais. Quanto mais dados melhor.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        tipo_dado: { type: "string", description: "Tipo: transportadora, cliente, nota_fiscal, endereco, outro" },
                        razao_social: { type: "string" },
                        nome_fantasia: { type: "string" },
                        cnpj: { type: "string" },
                        telefone: { type: "string" },
                        telefone2: { type: "string" },
                        email: { type: "string" },
                        site: { type: "string" },
                        endereco: { type: "string" },
                        bairro: { type: "string" },
                        cidade: { type: "string" },
                        uf: { type: "string" },
                        cep: { type: "string" },
                        horario_funcionamento: { type: "string" },
                        ramo_atividade: { type: "string" },
                        observacoes: { type: "string" },
                        numero_nf: { type: "string" },
                        destinatario: { type: "string" },
                        peso: { type: "string" },
                        volume: { type: "string" }
                    }
                }
            });

            if (result) {
                setDadosExtraidos(result);
                toast.success("Dados encontrados! Escolha onde cadastrar.");
            } else {
                toast.warning("Não foi possível encontrar dados relevantes.");
            }
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            toast.error("Erro ao buscar dados online.");
        }
        setBuscandoOnline(false);
    };

    // Cadastrar dados extraídos
    const cadastrarDados = async () => {
        if (!dadosExtraidos || !destinoSelecionado) {
            toast.error("Selecione onde deseja cadastrar");
            return;
        }

        try {
            if (destinoSelecionado === "nota_fiscal") {
                await base44.entities.NotaFiscal.create({
                    numero_nf: dadosExtraidos.numero_nf || "",
                    destinatario: dadosExtraidos.destinatario || dadosExtraidos.razao_social || "",
                    peso: dadosExtraidos.peso || "",
                    volume: dadosExtraidos.volume || "",
                    transportadora: dadosExtraidos.nome_fantasia || "",
                    data: format(new Date(), "yyyy-MM-dd"),
                    observacoes: dadosExtraidos.observacoes || ""
                });
                queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
                toast.success("Nota fiscal cadastrada!");
            } else if (destinoSelecionado === "transportadora") {
                await base44.entities.Transportadora.create({
                    razao_social: dadosExtraidos.razao_social || dadosExtraidos.nome_fantasia || "",
                    nome_fantasia: dadosExtraidos.nome_fantasia || "",
                    cnpj: dadosExtraidos.cnpj || "",
                    telefone: dadosExtraidos.telefone || "",
                    email: dadosExtraidos.email || "",
                    endereco: dadosExtraidos.endereco || "",
                    bairro: dadosExtraidos.bairro || "",
                    cidade: dadosExtraidos.cidade || "",
                    uf: dadosExtraidos.uf || "",
                    cep: dadosExtraidos.cep || "",
                    status: "ativo"
                });
                queryClient.invalidateQueries({ queryKey: ["transportadoras-notas"] });
                toast.success("Transportadora cadastrada!");
            } else if (destinoSelecionado === "cliente") {
                await base44.entities.Cliente.create({
                    razao_social: dadosExtraidos.razao_social || dadosExtraidos.nome_fantasia || "",
                    nome_fantasia: dadosExtraidos.nome_fantasia || "",
                    cnpj_cpf: dadosExtraidos.cnpj || "",
                    telefone: dadosExtraidos.telefone || "",
                    email: dadosExtraidos.email || "",
                    endereco: dadosExtraidos.endereco || "",
                    bairro: dadosExtraidos.bairro || "",
                    cidade: dadosExtraidos.cidade || "",
                    uf: dadosExtraidos.uf || "",
                    cep: dadosExtraidos.cep || "",
                    tipo: "ambos"
                });
                queryClient.invalidateQueries({ queryKey: ["clientes"] });
                toast.success("Cliente cadastrado!");
            }

            // Limpar e fechar
            resetAudioDialog();
        } catch (error) {
            console.error("Erro ao cadastrar:", error);
            toast.error("Erro ao cadastrar dados.");
        }
    };

    const resetAudioDialog = () => {
        setShowAudioDialog(false);
        setAudioUrl(null);
        setTranscription("");
        setDadosExtraidos(null);
        setDestinoSelecionado("");
        setAudioFileUrl("");
    };

    // Substituir Washington Gonzales pela transportadora = destinatário
    const handleSubstituirWashington = async () => {
        const notasWashington = notas.filter(n => 
            n.transportadora?.toUpperCase().includes("WASHINGTON GONZALES")
        );

        if (notasWashington.length === 0) {
            toast.info("Nenhuma nota com transportadora WASHINGTON GONZALES encontrada");
            return;
        }

        if (!confirm(`Substituir transportadora pelo destinatário em ${notasWashington.length} nota(s)?`)) {
            return;
        }

        let atualizadas = 0;
        for (const nota of notasWashington) {
            await base44.entities.NotaFiscal.update(nota.id, {
                transportadora: nota.destinatario || "SEM TRANSPORTADORA"
            });
            atualizadas++;
        }

        queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
        toast.success(`${atualizadas} nota(s) atualizada(s)!`);
    };

    const filtered = notas.filter(n => {
        // Busca geral
        const matchSearch = !search || 
            n.numero_nf?.toLowerCase().includes(search.toLowerCase()) ||
            n.destinatario?.toLowerCase().includes(search.toLowerCase()) ||
            n.transportadora?.toLowerCase().includes(search.toLowerCase());

        // Filtro de filial (select)
        const matchFilialSelect = !filterFilial || filterFilial === "todas" || n.filial === filterFilial;

        // Filtros de coluna
        const matchDestinatario = columnFilters.destinatario.length === 0 || 
            columnFilters.destinatario.includes(n.destinatario || "");
        const matchTransportadora = columnFilters.transportadora.length === 0 || 
            columnFilters.transportadora.includes(n.transportadora || "");
        const matchFilial = columnFilters.filial.length === 0 || 
            columnFilters.filial.includes(n.filial || "");
        const matchPlaca = columnFilters.placa.length === 0 || 
            columnFilters.placa.includes(n.placa || "");

        return matchSearch && matchFilialSelect && matchDestinatario && matchTransportadora && matchFilial && matchPlaca;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Notas Fiscais</h1>
                            <p className="text-slate-500">Gerencie notas fiscais para romaneios</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link to={createPageUrl("MascaraRomaneio")}>
                            <Button variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                                <Truck className="w-4 h-4 mr-2" />
                                Máscara Romaneio
                            </Button>
                        </Link>
                        <Link to={createPageUrl("RomaneiosGerados")}>
                            <Button variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50">
                                <Package className="w-4 h-4 mr-2" />
                                Romaneios Gerados
                            </Button>
                        </Link>
                    </div>
                    <div className="flex gap-2 flex-wrap">

                        <Button 
                            onClick={handleSubstituirWashington}
                            variant="outline"
                            className="border-orange-500 text-orange-700 hover:bg-orange-50"
                            title="Substituir WASHINGTON GONZALES pelo destinatário"
                        >
                            <Replace className="w-4 h-4 mr-2" />
                            Subst. Washington
                        </Button>
                        <Button 
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-14 px-8 text-lg"
                        >
                            <Plus className="w-6 h-6 mr-2" />
                            Nova Nota
                        </Button>
                    </div>
                </div>

                {/* Search e Ações em Massa */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Buscar por NF, destinatário ou transportadora..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                            <Select value={filterFilial} onValueChange={setFilterFilial}>
                                <SelectTrigger className="w-40 bg-white">
                                    <SelectValue placeholder="Filial" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todas Filiais</SelectItem>
                                    {[...new Set(notas.map(n => n.filial).filter(Boolean))].map(filial => (
                                        <SelectItem key={filial} value={filial}>{filial}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex gap-2 flex-wrap">
                                <Button variant="outline" onClick={selecionarTodos}>
                                    {selecionados.length === filtered.length && filtered.length > 0 ? "Desmarcar Todos" : "Selecionar Todos"}
                                </Button>
                                {selecionados.length > 0 && (
                                    <>
                                        <Button 
                                            variant="outline"
                                            className="border-green-500 text-green-700 hover:bg-green-50"
                                            onClick={() => setShowEditDialog(true)}
                                        >
                                            <Car className="w-4 h-4 mr-1" />
                                            Atribuir Placa ({selecionados.length})
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            className="border-blue-500 text-blue-700 hover:bg-blue-50"
                                            onClick={() => {
                                                const notasSelecionadas = notas.filter(n => selecionados.includes(n.id));
                                                const destinatariosUnicos = [...new Set(notasSelecionadas.map(n => n.destinatario).filter(Boolean))];
                                                
                                                const novosDestinatarios = destinatariosUnicos.filter(nome => 
                                                    !destinatarios.some(d => d.nome.toLowerCase() === nome.toLowerCase())
                                                );
                                                
                                                if (novosDestinatarios.length === 0) {
                                                    toast.info("Todos os destinatários já estão cadastrados!");
                                                    return;
                                                }
                                                
                                                if (confirm(`Cadastrar ${novosDestinatarios.length} destinatário(s) novo(s)?`)) {
                                                    Promise.all(
                                                        novosDestinatarios.map(nome => 
                                                            base44.entities.Destinatario.create({ nome })
                                                        )
                                                    ).then(() => {
                                                        queryClient.invalidateQueries({ queryKey: ["destinatarios-notas"] });
                                                        toast.success(`${novosDestinatarios.length} destinatário(s) cadastrado(s)!`);
                                                    }).catch(err => {
                                                        console.error(err);
                                                        toast.error("Erro ao cadastrar destinatários");
                                                    });
                                                }
                                            }}
                                        >
                                            <Users className="w-4 h-4 mr-1" />
                                            Cadastrar Destinatários ({selecionados.length})
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            className="border-red-500 text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                                if (confirm(`Excluir ${selecionados.length} nota(s) fiscal(is)?`)) {
                                                    deleteEmMassaMutation.mutate(selecionados);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Excluir ({selecionados.length})
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabela */}
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-10">
                                            <Checkbox 
                                                checked={selecionados.length === filtered.length && filtered.length > 0}
                                                onCheckedChange={selecionarTodos}
                                            />
                                        </TableHead>
                                        <TableHead>NF</TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Destinatário
                                                <TableColumnFilter
                                                    data={notas}
                                                    columnKey="destinatario"
                                                    columnLabel="Destinatário"
                                                    selectedValues={columnFilters.destinatario}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, destinatario: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead>Peso</TableHead>
                                        <TableHead>Volume</TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Transportadora
                                                <TableColumnFilter
                                                    data={notas}
                                                    columnKey="transportadora"
                                                    columnLabel="Transportadora"
                                                    selectedValues={columnFilters.transportadora}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, transportadora: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Filial
                                                <TableColumnFilter
                                                    data={notas}
                                                    columnKey="filial"
                                                    columnLabel="Filial"
                                                    selectedValues={columnFilters.filial}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, filial: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead>
                                            <div className="flex items-center gap-1">
                                                Placa
                                                <TableColumnFilter
                                                    data={notas}
                                                    columnKey="placa"
                                                    columnLabel="Placa"
                                                    selectedValues={columnFilters.placa}
                                                    onFilterChange={(v) => setColumnFilters(prev => ({ ...prev, placa: v }))}
                                                />
                                            </div>
                                        </TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-12">
                                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-12 text-slate-500">
                                                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                Nenhuma nota fiscal encontrada
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((nota) => (
                                            <TableRow key={nota.id} className={`hover:bg-slate-50 ${selecionados.includes(nota.id) ? "bg-blue-50" : ""}`}>
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={selecionados.includes(nota.id)}
                                                        onCheckedChange={() => toggleSelecionado(nota.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-bold text-blue-600">{nota.numero_nf}</TableCell>
                                                <TableCell className="font-medium">{nota.destinatario}</TableCell>
                                                <TableCell>{nota.peso || "-"}</TableCell>
                                                <TableCell>{nota.volume || "-"}</TableCell>
                                                <TableCell>{nota.transportadora || "-"}</TableCell>
                                                <TableCell className="font-medium text-purple-600">{nota.filial || "-"}</TableCell>
                                                <TableCell className="font-medium text-emerald-600">{nota.placa || "-"}</TableCell>
                                                <TableCell>{formatDate(nota.data)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(nota)}>
                                                            <Pencil className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => {
                                                            if (confirm("Excluir esta nota fiscal?")) deleteMutation.mutate(nota.id);
                                                        }}>
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Atribuir Placa em Massa */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-green-600" />
                            Atribuir Placa
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Atribuir placa a <strong>{selecionados.length}</strong> nota(s) fiscal(is) selecionada(s).
                        </p>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Car className="w-4 h-4" /> Placa do Veículo
                            </Label>
                            <Select value={placaEmMassa} onValueChange={setPlacaEmMassa}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione a placa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {veiculos.map(v => (
                                        <SelectItem key={v.id} value={v.placa}>
                                            {v.placa} - {v.modelo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => {
                                    if (placaEmMassa) {
                                        updateEmMassaMutation.mutate({ ids: selecionados, data: { placa: placaEmMassa } });
                                    }
                                }}
                                disabled={updateEmMassaMutation.isPending || !placaEmMassa}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {updateEmMassaMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Cadastrar Transportadoras */}
            <Dialog open={showCadastroTransp} onOpenChange={setShowCadastroTransp}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-violet-600" />
                            Cadastrar Transportadoras Extraídas
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Foram encontradas <strong>{transpExtraidas.length}</strong> transportadora(s) nas notas importadas.
                            Selecione quais deseja cadastrar e clique em "Atualizar Dados" para buscar informações online.
                        </p>
                        
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {transpExtraidas.map((transp, index) => (
                                <div 
                                    key={index} 
                                    className={`p-4 rounded-xl border-2 transition-colors ${
                                        transpSelecionadas.includes(index) 
                                            ? "border-violet-500 bg-violet-50" 
                                            : "border-slate-200 bg-white"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <Checkbox 
                                            checked={transpSelecionadas.includes(index)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setTranspSelecionadas(prev => [...prev, index]);
                                                } else {
                                                    setTranspSelecionadas(prev => prev.filter(i => i !== index));
                                                }
                                            }}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-lg text-slate-800">{transp.nome}</h4>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => buscarDadosOnline(index, transp.nome)}
                                                    disabled={buscandoDados[index]}
                                                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                                >
                                                    {buscandoDados[index] ? (
                                                        <>
                                                            <div className="animate-spin w-4 h-4 mr-1 border-2 border-blue-500 border-t-transparent rounded-full" />
                                                            Buscando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Globe className="w-4 h-4 mr-1" />
                                                            Atualizar Dados
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                            
                                            {/* Dados preenchidos */}
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                {transp.cnpj && (
                                                    <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className="text-xs">CNPJ</Badge>
                                                        <span>{transp.cnpj}</span>
                                                    </div>
                                                )}
                                                {transp.telefone && (
                                                    <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className="text-xs">Tel</Badge>
                                                        <span>{transp.telefone}</span>
                                                    </div>
                                                )}
                                                {transp.cidade && transp.uf && (
                                                    <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className="text-xs">Cidade</Badge>
                                                        <span>{transp.cidade}/{transp.uf}</span>
                                                    </div>
                                                )}
                                                {transp.endereco && (
                                                    <div className="flex items-center gap-1 col-span-2">
                                                        <Badge variant="outline" className="text-xs">End</Badge>
                                                        <span className="truncate">{transp.endereco}</span>
                                                    </div>
                                                )}
                                                {transp.horario_funcionamento && (
                                                    <div className="flex items-center gap-1 col-span-2">
                                                        <Badge variant="outline" className="text-xs">Horário</Badge>
                                                        <span>{transp.horario_funcionamento}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {!transp.cnpj && !transp.telefone && !transp.cidade && (
                                                <p className="text-xs text-slate-400 italic">
                                                    Clique em "Atualizar Dados" para buscar informações online
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex justify-between items-center pt-4 border-t">
                            <div className="text-sm text-slate-500">
                                {transpSelecionadas.length} de {transpExtraidas.length} selecionada(s)
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => { setShowCadastroTransp(false); setTranspExtraidas([]); }}>
                                    <X className="w-4 h-4 mr-1" /> Cancelar
                                </Button>
                                <Button 
                                    onClick={handleCadastrarTransportadoras}
                                    disabled={transpSelecionadas.length === 0}
                                    className="bg-violet-600 hover:bg-violet-700"
                                >
                                    <Building2 className="w-4 h-4 mr-1" />
                                    Cadastrar ({transpSelecionadas.length})
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>



            {/* Dialog Cadastrar Destinatário */}
            <Dialog open={showCadastroDestinatario} onOpenChange={setShowCadastroDestinatario}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-600" />
                            Cadastrar Destinatário
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Cadastre um novo destinatário para usar nas notas fiscais.
                        </p>
                        <div className="space-y-2">
                            <Label>Nome *</Label>
                            <Input
                                value={novoDestinatario.nome}
                                onChange={(e) => setNovoDestinatario({ nome: e.target.value })}
                                placeholder="Nome do destinatário"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => { setShowCadastroDestinatario(false); setNovoDestinatario({ nome: "" }); }}
                            >
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button 
                                onClick={() => createDestinatarioMutation.mutate(novoDestinatario)}
                                disabled={!novoDestinatario.nome || createDestinatarioMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {createDestinatarioMutation.isPending ? "Salvando..." : (
                                    <>
                                        <Save className="w-4 h-4 mr-1" /> Salvar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            {editing ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Número NF *</Label>
                                <Input
                                    value={form.numero_nf}
                                    onChange={(e) => setForm({ ...form, numero_nf: e.target.value })}
                                    required
                                    placeholder="Ex: 123456"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    value={form.data}
                                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center justify-between">
                                <span>Destinatário *</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowCadastroDestinatario(true)}
                                    className="text-blue-600 hover:text-blue-700 h-auto p-0"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Cadastrar Novo
                                </Button>
                            </Label>
                            <div className="space-y-2">
                                <Input
                                    value={form.destinatario}
                                    onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                                    required
                                    placeholder="Digite o nome do destinatário..."
                                    className="bg-white"
                                    list="destinatarios-list"
                                />
                                <datalist id="destinatarios-list">
                                    {destinatarios
                                        .sort((a, b) => a.nome.localeCompare(b.nome))
                                        .filter(d => d.nome.toLowerCase().includes(form.destinatario.toLowerCase()))
                                        .map(d => (
                                            <option key={d.id} value={d.nome}>
                                                {d.cidade && `${d.nome} (${d.cidade})`}
                                            </option>
                                        ))}
                                </datalist>
                                {form.destinatario && (
                                    <div className="text-xs text-slate-500">
                                        {destinatarios.filter(d => 
                                            d.nome.toLowerCase().includes(form.destinatario.toLowerCase())
                                        ).length} destinatário(s) encontrado(s)
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Peso</Label>
                                <Input
                                    value={form.peso}
                                    onChange={(e) => setForm({ ...form, peso: e.target.value })}
                                    placeholder="Ex: 100kg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Volume</Label>
                                <Input
                                    value={form.volume}
                                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                                    placeholder="Ex: 5"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Transportadora</Label>
                                <Input
                                    value={form.transportadora}
                                    onChange={(e) => setForm({ ...form, transportadora: e.target.value })}
                                    placeholder="Nome da transportadora"
                                    className="bg-white"
                                    list="transportadoras-list"
                                />
                                <datalist id="transportadoras-list">
                                    {transportadoras
                                        .sort((a, b) => (a.razao_social || a.nome_fantasia || "").localeCompare(b.razao_social || b.nome_fantasia || ""))
                                        .filter(t => {
                                            const nome = (t.razao_social || t.nome_fantasia || "").toLowerCase();
                                            return nome.includes((form.transportadora || "").toLowerCase());
                                        })
                                        .map(t => (
                                            <option key={t.id} value={t.razao_social || t.nome_fantasia}>
                                                {t.cidade && `${t.razao_social || t.nome_fantasia} (${t.cidade})`}
                                            </option>
                                        ))}
                                </datalist>
                                {form.transportadora && (
                                    <div className="text-xs text-slate-500">
                                        {transportadoras.filter(t => 
                                            (t.razao_social || t.nome_fantasia || "").toLowerCase().includes(form.transportadora.toLowerCase())
                                        ).length} transportadora(s) encontrada(s)
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Filial
                                </Label>
                                <Input
                                    value={form.filial}
                                    onChange={(e) => setForm({ ...form, filial: e.target.value })}
                                    placeholder="Ex: SP, RJ, MG..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Car className="w-4 h-4" /> Placa do Veículo
                            </Label>
                            <Select value={form.placa} onValueChange={(v) => setForm({ ...form, placa: v })}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione a placa..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {veiculos.map(v => (
                                        <SelectItem key={v.id} value={v.placa}>
                                            {v.placa} - {v.modelo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                <Save className="w-4 h-4 mr-1" /> Salvar
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}