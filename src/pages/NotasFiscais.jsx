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
  Plus, FileText, Upload, Trash2, Pencil, Search, Save, X, ClipboardPaste, Sparkles, Car, Truck, Package, Building2, RefreshCw, Globe, Mic, Square, Play, Pause, Loader2, Users, MapPin, Replace, Filter, History, Calendar, Printer, BarChart3, Key, MoreVertical, Settings } from
"lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import TableColumnFilter from "@/components/shared/TableColumnFilter";
import ImportadorNFE from "@/components/nfe/ImportadorNFE";
import ImportacaoCard from "@/components/nfe/ImportacaoCard";
import PrintConfigNFE from "@/components/nfe/PrintConfigNFE";
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
  const [filterDataImportacao, setFilterDataImportacao] = useState("");
  const [importing, setImporting] = useState(false);
  const [selecionados, setSelecionados] = useState([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [placaEmMassa, setPlacaEmMassa] = useState("");
  const [filialEmMassa, setFilialEmMassa] = useState("");
  const [showCadastroTransp, setShowCadastroTransp] = useState(false);
  const [transpExtraidas, setTranspExtraidas] = useState([]);
  const [transpSelecionadas, setTranspSelecionadas] = useState([]);
  const [buscandoDados, setBuscandoDados] = useState({});
  const [showCadastroDestinatario, setShowCadastroDestinatario] = useState(false);
  const [novoDestinatario, setNovoDestinatario] = useState({ nome: "" });
  const [showCadastroRemetente, setShowCadastroRemetente] = useState(false);
  const [novoRemetente, setNovoRemetente] = useState({ nome: "" });
  const [showArquivados, setShowArquivados] = useState(false);
  const [notasNaoEncontradas, setNotasNaoEncontradas] = useState([]);

  // Estados para funcionalidades do romaneio
  const [motorista, setMotorista] = useState("");
  const [dataRomaneio, setDataRomaneio] = useState(format(new Date(), "yyyy-MM-dd"));
  const [veiculoSelecionado, setVeiculoSelecionado] = useState("");
  const [remetenteSelecionado, setRemetenteSelecionado] = useState("");
  const [notasDigitadas, setNotasDigitadas] = useState("");
  const [ordenacaoNotas, setOrdenacaoNotas] = useState("digitacao");
  const [otimizandoRota, setOtimizandoRota] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState({
    colRemetente: 18,
    colDestinatario: 42,
    colNfe: 15,
    colCarimbo: 25,
    alturaLinha: 45
  });
  const [showPrintConfigNFE, setShowPrintConfigNFE] = useState(false);

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
  const [showChaveAcesso, setShowChaveAcesso] = useState(false);
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [consultandoChave, setConsultandoChave] = useState(false);
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

  const { data: importacoes = [] } = useQuery({
    queryKey: ["registros-importacao"],
    queryFn: () => base44.entities.RegistroImportacao.list("-created_date", 10)
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

  const config = configs[0] || {};

  // Mutation para criar registro de importação
  const createImportacaoMutation = useMutation({
    mutationFn: (data) => base44.entities.RegistroImportacao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registros-importacao"] });
    }
  });

  // Mutation para salvar romaneio gerado
  const createRomaneioMutation = useMutation({
    mutationFn: (data) => base44.entities.RomaneioGerado.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["romaneios-gerados"] });
      toast.success("Romaneio salvo com sucesso!");
    }
  });

  // Mutation para excluir registro de importação (SEM excluir as notas)
  const deleteImportacaoMutation = useMutation({
    mutationFn: (id) => base44.entities.RegistroImportacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registros-importacao"] });
      toast.success("Registro excluído. As notas foram mantidas no sistema.");
    }
  });

  // Verificar CNPJ duplicado
  const cnpjJaCadastrado = (cnpj) => {
    if (!cnpj) return false;
    const cnpjLimpo = cnpj.replace(/\D/g, "");
    return transportadoras.some((t) => t.cnpj?.replace(/\D/g, "") === cnpjLimpo);
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

  // Criar remetente
  const createRemetenteMutation = useMutation({
    mutationFn: (data) => base44.entities.EmpresaRemetente.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["empresas-remetentes"] });
      setRemetenteSelecionado(data.nome);
      setShowCadastroRemetente(false);
      setNovoRemetente({ nome: "" });
      toast.success("Remetente cadastrado!");
    }
  });

  // Buscar dados online da transportadora
  const buscarDadosOnline = async (index, nome) => {
    setBuscandoDados((prev) => ({ ...prev, [index]: true }));

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
        setTranspExtraidas((prev) => {
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

    setBuscandoDados((prev) => ({ ...prev, [index]: false }));
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
      setFilialEmMassa("");
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

  // Consultar chave de acesso
  const handleConsultarChave = async () => {
    if (!chaveAcesso || chaveAcesso.length !== 44) {
      toast.error("Chave de acesso deve ter 44 dígitos");
      return;
    }

    setConsultandoChave(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `A partir da chave de acesso de NFe: ${chaveAcesso}
                
Extraia as seguintes informações:
- Número da nota fiscal (posições 25-33 da chave)
- UF emissor (posições 1-2)
- Data de emissão (posições 3-8 no formato AAMM)

Retorne apenas o número da nota fiscal extraído.`,
        response_json_schema: {
          type: "object",
          properties: {
            numero_nf: { type: "string" }
          }
        }
      });

      if (result?.numero_nf) {
        setForm({ ...form, numero_nf: result.numero_nf });
        setShowChaveAcesso(false);
        setChaveAcesso("");
        toast.success("Número da NF extraído da chave!");
      } else {
        toast.error("Não foi possível extrair dados da chave");
      }
    } catch (error) {
      console.error("Erro ao consultar chave:", error);
      toast.error("Erro ao processar chave de acesso");
    }
    setConsultandoChave(false);
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
    setSelecionados((prev) =>
    prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selecionarTodos = () => {
    if (selecionados.length === filtered.length) {
      setSelecionados([]);
    } else {
      setSelecionados(filtered.map((n) => n.id));
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

      // Buscar notas existentes para verificar duplicados
      const todasNotasExistentes = await base44.entities.NotaFiscal.list("-created_date", 2000);
      const numerosExistentes = new Set(
        todasNotasExistentes.map((n) => n.numero_nf?.toLowerCase().trim()).filter(Boolean)
      );

      if (notasEncontradas.length > 0) {
        let importados = 0;
        let duplicados = 0;
        const transportadorasUnicas = new Set();
        const notasIdsImportadas = [];

        for (const nota of notasEncontradas) {
          if (nota.numero_nf || nota.destinatario) {
            const numeroNf = (nota.numero_nf || "").toLowerCase().trim();

            // Verificar duplicidade
            if (numeroNf && numerosExistentes.has(numeroNf)) {
              duplicados++;
              continue;
            }

            const novaNota = await base44.entities.NotaFiscal.create({
              numero_nf: nota.numero_nf || "",
              destinatario: nota.destinatario || "",
              peso: nota.peso || "",
              volume: nota.volume || "",
              transportadora: nota.transportadora || "",
              remetente: "",
              data: format(new Date(), "yyyy-MM-dd")
            });
            importados++;
            notasIdsImportadas.push(novaNota.id);

            // Adicionar ao set para evitar duplicados no mesmo lote
            if (numeroNf) numerosExistentes.add(numeroNf);

            // Coletar transportadoras únicas
            if (nota.transportadora) {
              transportadorasUnicas.add(nota.transportadora.trim());
            }
          }
        }

        // Criar registro de importação
        if (importados > 0) {
          await createImportacaoMutation.mutateAsync({
            data_importacao: new Date().toISOString(),
            quantidade_notas: importados,
            origem: "colagem",
            notas_ids: notasIdsImportadas,
            status: "processado"
          });
        }

        queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });

        if (duplicados > 0) {
          toast.warning(`${importados} nota(s) importada(s). ${duplicados} ignorada(s) (já existentes).`);
        } else {
          toast.success(`✅ ${importados} nota(s) fiscal(is) criada(s)!`);
        }

        // Extrair transportadoras para cadastro
        if (transportadorasUnicas.size > 0) {
          const transpList = Array.from(transportadorasUnicas).map((nome) => ({
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
        const nomeExiste = transportadoras.some((t) =>
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

        // Buscar notas existentes
        const todasNotasExistentes = await base44.entities.NotaFiscal.list("-created_date", 2000);
        const numerosExistentes = new Set(
          todasNotasExistentes.map((n) => n.numero_nf?.toLowerCase().trim()).filter(Boolean)
        );

        let importados = 0;
        let duplicados = 0;
        const notasIdsImportadas = [];

        for (const nota of notasImport) {
          if (nota.numero_nf || nota.destinatario) {
            const numeroNf = (nota.numero_nf || "").toLowerCase().trim();

            // Verificar duplicidade
            if (numeroNf && numerosExistentes.has(numeroNf)) {
              duplicados++;
              continue;
            }

            const novaNota = await base44.entities.NotaFiscal.create({
              numero_nf: nota.numero_nf || "",
              destinatario: nota.destinatario || "",
              peso: nota.peso || "",
              volume: nota.volume || "",
              transportadora: nota.transportadora || "",
              remetente: "", // Sempre em branco
              data: format(new Date(), "yyyy-MM-dd")
            });
            importados++;
            notasIdsImportadas.push(novaNota.id);

            // Adicionar ao set para evitar duplicados no mesmo lote
            if (numeroNf) numerosExistentes.add(numeroNf);
          }
        }

        // Criar registro de importação
        if (importados > 0) {
          await createImportacaoMutation.mutateAsync({
            data_importacao: new Date().toISOString(),
            quantidade_notas: importados,
            origem: "arquivo",
            nome_arquivo: file.name,
            notas_ids: notasIdsImportadas,
            status: "processado"
          });
        }

        queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });

        if (duplicados > 0) {
          toast.warning(`${importados} nota(s) importada(s). ${duplicados} ignorada(s) (já existentes).`);
        } else {
          toast.success(`✅ Importado com sucesso! ${importados} nota(s) fiscal(is) adicionada(s).`);
        }
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

        stream.getTracks().forEach((track) => track.stop());
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

  // Substituir Washington Gonzales pela transportadora = destinatário (TODAS as notas do banco)
  const handleSubstituirWashington = async () => {
    // Buscar TODAS as notas do banco, não apenas as filtradas
    const todasNotas = await base44.entities.NotaFiscal.list("-created_date", 5000);
    const notasWashington = todasNotas.filter((n) =>
      n.transportadora?.toUpperCase().includes("WASHINGTON")
    );

    if (notasWashington.length === 0) {
      toast.info("Nenhuma nota com transportadora WASHINGTON encontrada em todo o banco");
      return;
    }

    if (!confirm(`Substituir transportadora pelo destinatário em ${notasWashington.length} nota(s) encontrada(s) em todo o banco de dados?`)) {
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
    toast.success(`${atualizadas} nota(s) atualizada(s) em todo o banco!`);
  };

  // Buscar notas digitadas manualmente - busca no banco de dados
  const buscarNotasDigitadas = async () => {
    if (!notasDigitadas.trim()) return;

    const numerosDigitados = notasDigitadas.
    split(/[,;\s\n]+/).
    map((n) => n.trim()).
    filter(Boolean);

    try {
      // Buscar TODAS as notas do banco de dados
      const todasNotas = await base44.entities.NotaFiscal.list("-created_date", 5000);

      const notasEncontradas = [];
      const naoEncontradas = [];

      // Função para normalizar número (remove zeros à esquerda e converte para minúsculas)
      const normalizar = (num) => {
        if (!num) return "";
        return parseInt(num.replace(/\D/g, ""), 10).toString().toLowerCase();
      };

      numerosDigitados.forEach((num) => {
        const numNormalizado = normalizar(num);
        const notaEncontrada = todasNotas.find((n) => {
          const nfNormalizada = normalizar(n.numero_nf);
          return nfNormalizada === numNormalizado || n.numero_nf?.toLowerCase() === num.toLowerCase();
        });
        if (notaEncontrada && !notasEncontradas.find((n) => n.id === notaEncontrada.id)) {
          notasEncontradas.push(notaEncontrada);
        } else if (!notaEncontrada) {
          naoEncontradas.push(num);
        }
      });

      // Atualizar lista de não encontradas
      setNotasNaoEncontradas(naoEncontradas);

      if (notasEncontradas.length > 0) {
        setSelecionados(notasEncontradas.map((n) => n.id));
        if (naoEncontradas.length > 0) {
          toast.warning(`${notasEncontradas.length} nota(s) encontrada(s). ${naoEncontradas.length} não encontrada(s).`);
        } else {
          toast.success(`${notasEncontradas.length} nota(s) selecionada(s)`);
        }
      } else {
        toast.error("Nenhuma nota encontrada no banco de dados");
      }
    } catch (error) {
      console.error("Erro ao buscar notas:", error);
      toast.error("Erro ao buscar notas no banco de dados");
    }
  };

  // Função de impressão de romaneio com configurações
  const handlePrintRomaneioComConfig = async (printConfig) => {
    await handlePrintRomaneio(printConfig);
  };

  // Imprimir romaneio
  const handlePrintRomaneio = async (printConfig = null) => {
    const notasSelecionadas = selecionados.
    map((id) => notas.find((n) => n.id === id)).
    filter(Boolean);

    if (notasSelecionadas.length === 0) {
      toast.error("Selecione ao menos uma nota");
      return;
    }

    const ultimaImportacao = importacoes[0];
    if (!ultimaImportacao) {
      toast.error("Nenhuma importação encontrada");
      return;
    }

    // 1. Atualizar placa das notas selecionadas
    const placaParaAtribuir = veiculoSelecionado && veiculoSelecionado !== "individual" ? veiculoSelecionado : null;

    for (const nota of notasSelecionadas) {
      const placa = placaParaAtribuir || nota.placa || "";
      await base44.entities.NotaFiscal.update(nota.id, { placa });
    }

    // 2. Adicionar notas à última importação
    const notasIdsImportacao = new Set(ultimaImportacao.notas_ids || []);
    for (const nota of notasSelecionadas) {
      notasIdsImportacao.add(nota.id);
    }

    await base44.entities.RegistroImportacao.update(ultimaImportacao.id, {
      notas_ids: Array.from(notasIdsImportacao),
      quantidade_notas: notasIdsImportacao.size
    });

    // Recarregar dados
    await queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
    await queryClient.invalidateQueries({ queryKey: ["registros-importacao"] });

    // 3. Imprimir
    const notasAtualizadas = await base44.entities.NotaFiscal.list("-created_date", 5000);
    const notasParaImprimir = selecionados.
    map((id) => notasAtualizadas.find((n) => n.id === id)).
    filter(Boolean);

    const motoristaObj = motoristas.find((m) => m.id === motorista);
    const winPrint = window.open('', '_blank', 'width=900,height=650');
    if (!winPrint) {
      alert("Por favor, permita pop-ups para imprimir.");
      return;
    }

    // Configurações de impressão
    const cfg = printConfig || {
      fontSize: 10,
      fontWeight: "normal",
      colNotaFiscal: 12,
      colPlaca: 8,
      colCliente: 35,
      colVolume: 12,
      colPeso: 12,
      colTransportadora: 21,
      alturaLinha: 25,
      alturaCabecalho: 35,
      alturaTitulo: 40,
      simbolosPlaca: true
    };

    // Símbolos para placas
    const simbolosPorPlaca = ["▲", "●", "■", "◆", "★", "▼", "◉", "◈", "♦", "✦"];
    const getSimboloPlaca = (placa, index) => {
      if (!cfg.simbolosPlaca) return "";
      return simbolosPorPlaca[index % simbolosPorPlaca.length] + " ";
    };

    // Agrupar por placa
    const notasPorPlaca = {};
    notasParaImprimir.forEach((nota) => {
      const placa = nota.placa || "SEM_PLACA";
      if (!notasPorPlaca[placa]) notasPorPlaca[placa] = [];
      notasPorPlaca[placa].push(nota);
    });

    // SEMPRE ordenar por número de nota fiscal (do menor para o maior)
    for (const placa in notasPorPlaca) {
      notasPorPlaca[placa].sort((a, b) => {
        const numA = parseInt(a.numero_nf?.replace(/\D/g, "") || "0");
        const numB = parseInt(b.numero_nf?.replace(/\D/g, "") || "0");
        return numA - numB;
      });

      // Aplicar ordenação adicional se configurado
      if (ordenacaoNotas === "transportadora") {
        // Ordenar por transportadora
        notasPorPlaca[placa].sort((a, b) => {
          const transpA = (a.transportadora || "").toUpperCase();
          const transpB = (b.transportadora || "").toUpperCase();
          return transpA.localeCompare(transpB);
        });
      } else if (ordenacaoNotas === "localizacao") {
        // Otimizar rota por localização
        const notasDaPlaca = notasPorPlaca[placa];
        if (notasDaPlaca.length > 1) {
          setOtimizandoRota(true);
          try {
            const transportadorasInfo = notasDaPlaca.map(n => ({
              id: n.id,
              transportadora: n.transportadora || n.destinatario || "",
              destinatario: n.destinatario || ""
            }));

            const result = await base44.integrations.Core.InvokeLLM({
              prompt: `Você é um otimizador de rotas de entregas. Receba a lista de transportadoras/destinatários e ordene-as por proximidade geográfica para criar um itinerário eficiente.

LISTA DE TRANSPORTADORAS/DESTINATÁRIOS:
${transportadorasInfo.map((t, i) => `${i + 1}. ${t.transportadora} - ${t.destinatario}`).join('\n')}

INSTRUÇÕES:
1. Busque a localização de cada transportadora/destinatário na internet
2. Calcule a rota mais eficiente considerando proximidade geográfica
3. Retorne a lista de IDs na ordem otimizada

Retorne apenas a lista de IDs na ordem ideal de entrega.`,
              add_context_from_internet: true,
              response_json_schema: {
                type: "object",
                properties: {
                  ids_ordenados: {
                    type: "array",
                    items: { type: "string" },
                    description: "IDs das notas na ordem otimizada"
                  }
                }
              }
            });

            if (result?.ids_ordenados) {
              const notasOrdenadas = [];
              result.ids_ordenados.forEach(id => {
                const nota = notasDaPlaca.find(n => n.id === id);
                if (nota) notasOrdenadas.push(nota);
              });
              // Adicionar notas que não foram ordenadas
              notasDaPlaca.forEach(nota => {
                if (!notasOrdenadas.find(n => n.id === nota.id)) {
                  notasOrdenadas.push(nota);
                }
              });
              notasPorPlaca[placa] = notasOrdenadas;
              toast.success(`Rota otimizada para placa ${placa}!`);
            }
          } catch (error) {
            console.error("Erro ao otimizar rota:", error);
            toast.error("Erro ao otimizar rota. Usando ordem de digitação.");
          }
          setOtimizandoRota(false);
        }
      }
      // Se for "digitacao", mantém a ordem original (não faz nada)
    }

    let pagesHtml = "";
    let placaIndex = 0;

    Object.entries(notasPorPlaca).forEach(([placa, notasPlaca]) => {
      const simboloPlaca = getSimboloPlaca(placa, placaIndex);
      placaIndex++;
      const notasOrdenadas = notasPlaca;

      const NOTAS_POR_PAGINA = 6;
      const totalPaginas = Math.ceil(notasOrdenadas.length / NOTAS_POR_PAGINA);

      for (let pagina = 0; pagina < totalPaginas; pagina++) {
        const notasDaPagina = notasOrdenadas.slice(pagina * NOTAS_POR_PAGINA, (pagina + 1) * NOTAS_POR_PAGINA);

        let rowsHtml = "";
        notasDaPagina.forEach((nota) => {
          const numeroNf = nota.numero_nf || "";
          const placaNota = simboloPlaca + (nota.placa || "");
          
          // Pegar apenas 3 primeiras palavras do destinatário
          const destinatarioCompleto = nota.destinatario || "";
          const destinatarioPalavras = destinatarioCompleto.split(" ");
          const destinatarioNota = destinatarioPalavras.slice(0, 3).join(" ");
          
          const volumeNota = nota.volume || "";
          const pesoNota = nota.peso || "";
          const transportadoraOriginal = nota.transportadora || "";
          const transportadoraNota = transportadoraOriginal.toUpperCase().includes("WASHINGTON") ?
            destinatarioNota : transportadoraOriginal;

          rowsHtml += '<tr class="nota-row">';
          rowsHtml += '<td class="col-nf">' + numeroNf + '</td>';
          rowsHtml += '<td class="col-placa">' + placaNota + '</td>';
          rowsHtml += '<td class="col-cliente">' + destinatarioNota + '</td>';
          rowsHtml += '<td class="col-volume">' + volumeNota + '</td>';
          rowsHtml += '<td class="col-peso">' + pesoNota + '</td>';
          rowsHtml += '<td class="col-transportadora">' + transportadoraNota + '</td>';
          rowsHtml += '</tr>';
        });

        const linhasRestantes = NOTAS_POR_PAGINA - notasDaPagina.length;
        for (let i = 0; i < linhasRestantes; i++) {
          rowsHtml += `
                        <tr class="nota-row vazia">
                            <td class="col-nf"></td>
                            <td class="col-placa"></td>
                            <td class="col-cliente"></td>
                            <td class="col-volume"></td>
                            <td class="col-peso"></td>
                            <td class="col-transportadora"></td>
                        </tr>
                    `;
        }

        const placaDisplay = placa !== "SEM_PLACA" ? placa : "";
        const paginaInfo = totalPaginas > 1 ? ` (${pagina + 1}/${totalPaginas})` : "";
        const veiculoInfo = veiculos.find((v) => v.placa === placa);
        const veiculoDisplay = veiculoInfo ? `${veiculoInfo.modelo || ""} - ${veiculoInfo.placa}` : placaDisplay;
        const dataFormatada = format(new Date(dataRomaneio), "dd/MM/yyyy");

        pagesHtml += `
                    <div class="page">
                        <div class="header">
                            <div class="logo">
                                ${config.logo_url ? `<img src="${config.logo_url}" alt="Logo" style="max-width: 100%; max-height: 60px; object-fit: contain;" />` : '<div class="logo-placeholder">TWG</div>'}
                            </div>
                            <div class="company-info">
                                <p class="company-name">TWG TRANSPORTES</p>
                                <p class="company-address">${config.endereco || ""} - ${config.cep ? "CEP " + config.cep : ""}</p>
                                <p class="company-address">${config.telefone ? "Tel: " + config.telefone : ""}</p>
                            </div>
                            <div class="romaneio-info">
                                <p class="date">${format(new Date(dataRomaneio), "dd/MM/yyyy")}</p>
                                <p class="romaneio-title">ROMANEIO DE CARGAS${paginaInfo}</p>
                                <p class="motorista-veiculo">Motorista: ${motoristaObj ? motoristaObj.nome : "_________________"} | Veículo: ${veiculoDisplay || "_________________"}</p>
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th class="col-nf">Nota Fiscal</th>
                                    <th class="col-placa">Placa</th>
                                    <th class="col-cliente">Nome do Cliente</th>
                                    <th class="col-volume">Qtde. Volume</th>
                                    <th class="col-peso">Peso</th>
                                    <th class="col-transportadora">Transportadora</th>
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
                    body { font-family: Arial, sans-serif; font-size: ${cfg.fontSize}px; }
                    .page { 
                        padding: 5mm; 
                        height: 287mm; 
                        display: flex; 
                        flex-direction: column;
                    }
                    .header { 
                        display: flex; 
                        align-items: flex-start; 
                        margin-bottom: 6px; 
                        border-bottom: 2px solid #000; 
                        padding-bottom: 6px;
                        min-height: ${cfg.alturaTitulo}px;
                    }
                    .logo { width: 80px; margin-right: 15px; }
                    .logo img { max-width: 100%; max-height: 50px; object-fit: contain; }
                    .logo-placeholder { 
                        width: 70px; height: 40px; background: #0ea5e9; 
                        display: flex; align-items: center; justify-content: center; 
                        color: white; font-weight: bold; font-size: 16px; 
                    }
                    .company-info { flex: 1; }
                    .company-name { font-size: ${cfg.fontSize + 8}px; font-weight: bold; margin: 0; }
                    .company-address { font-size: ${cfg.fontSize - 1}px; color: #333; margin: 1px 0; }
                    .romaneio-info { text-align: right; }
                    .romaneio-title { font-size: ${cfg.fontSize + 6}px; font-weight: bold; margin: 0; }
                    .motorista-veiculo { font-size: ${cfg.fontSize + 2}px; font-weight: bold; margin: 3px 0; }
                    .date { font-size: ${cfg.fontSize + 8}px; font-weight: bold; }
                    
                    table { width: 100%; border-collapse: collapse; flex: 1; }
                    th { 
                        background: #d0d0d0; 
                        padding: 6px; 
                        text-align: center; 
                        border: 2px solid #000; 
                        font-size: ${cfg.fontSize + 2}px;
                        height: ${cfg.alturaCabecalho}px;
                        font-weight: bold;
                        vertical-align: middle;
                    }
                    td { 
                        border: 2px solid #000; 
                        font-size: ${cfg.fontSize}px; 
                        vertical-align: middle;
                        text-align: center;
                        padding: 4px;
                        height: ${cfg.alturaLinha}px;
                        font-weight: ${cfg.fontWeight};
                    }
                    
                    .col-nf { width: ${cfg.colNotaFiscal}%; font-weight: bold; }
                    .col-placa { width: ${cfg.colPlaca}%; font-weight: bold; }
                    .col-cliente { width: ${cfg.colCliente}%; }
                    .col-volume { width: ${cfg.colVolume}%; }
                    .col-peso { width: ${cfg.colPeso}%; }
                    .col-transportadora { width: ${cfg.colTransportadora}%; }

                    .nota-row.vazia td {
                        border: 2px solid #000 !important;
                        background: #fff;
                    }
                </style>
            </head>
            <body>
                ${pagesHtml}
            </body>
            </html>
        `);

    winPrint.document.close();
    setTimeout(() => {
      winPrint.print();
      winPrint.close();
    }, 500);

    // 4. Salvar romaneios gerados
    Object.entries(notasPorPlaca).forEach(([placa, notasPlaca]) => {
      if (placa === "SEM_PLACA") return;

      const notasPorTransp = {};
      notasPlaca.forEach((nota) => {
        const transp = nota.transportadora || "Sem transportadora";
        if (!notasPorTransp[transp]) notasPorTransp[transp] = 0;
        notasPorTransp[transp]++;
      });

      const pesoTotal = notasPlaca.reduce((acc, nota) => {
        const pesoStr = nota.peso || "";
        const pesoNum = parseFloat(pesoStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
        return acc + pesoNum;
      }, 0);

      const destinatarios = [...new Set(notasPlaca.map((n) => n.destinatario).filter(Boolean))];
      const transportadorasUnicas = new Set(notasPlaca.map((n) => n.transportadora?.trim().toUpperCase()).filter(Boolean));

      createRomaneioMutation.mutate({
        nome: `Romaneio ${placa} - ${format(new Date(dataRomaneio), "dd/MM/yyyy")}`,
        placa: placa,
        data: dataRomaneio,
        motorista_id: motorista || "",
        motorista_nome: motoristaObj?.nome || "",
        total_notas: notasPlaca.length,
        total_entregas: transportadorasUnicas.size || notasPlaca.length,
        peso_total: pesoTotal,
        notas_por_transportadora: Object.entries(notasPorTransp).map(([t, q]) => ({
          transportadora: t,
          quantidade: q
        })),
        notas_ids: notasPlaca.map((n) => n.id),
        destinatarios: destinatarios,
        status: "gerado"
      });
    });

    toast.success("Romaneio impresso e registrado!");
  };

  // Dashboard resumo da última importação
  const dashboardImportacao = React.useMemo(() => {
    if (!importacoes[0]) return null;

    const ultimaImportacao = importacoes[0];
    const notasDaImportacao = notas.filter((n) => ultimaImportacao.notas_ids?.includes(n.id));

    // Agrupar por placa
    const porPlaca = {};
    let pesoConsolidado = 0;
    let totalNotas = 0;
    let totalEntregas = 0;

    notasDaImportacao.forEach((nota) => {
      if (!nota.placa) return; // Ignorar notas sem placa

      const placa = nota.placa;
      if (!porPlaca[placa]) {
        porPlaca[placa] = {
          notas: 0,
          transportadoras: new Set(),
          peso: 0
        };
      }

      porPlaca[placa].notas++;
      totalNotas++;

      if (nota.transportadora) {
        porPlaca[placa].transportadoras.add(nota.transportadora.trim().toUpperCase());
      }

      const pesoStr = nota.peso || "";
      const pesoNum = parseFloat(pesoStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
      porPlaca[placa].peso += pesoNum;
      pesoConsolidado += pesoNum;
    });

    // Calcular total de entregas
    Object.values(porPlaca).forEach((dados) => {
      totalEntregas += dados.transportadoras.size || dados.notas;
    });

    return { porPlaca, pesoConsolidado, totalNotas, totalEntregas };
  }, [importacoes, notas]);

  // Verificar se há alguma busca/filtro ativo
  const hasBuscaAtiva = search ||
  filterFilial && filterFilial !== "todas" ||
  columnFilters.destinatario.length > 0 ||
  columnFilters.transportadora.length > 0 ||
  columnFilters.filial.length > 0 ||
  columnFilters.placa.length > 0;

  const filtered = hasBuscaAtiva ? notas.filter((n) => {
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
  }) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-2 md:p-4 pb-2">
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Notas Fiscais</h1>
                            <p className="text-sm md:text-base text-slate-500">Gerencie notas fiscais para romaneios</p>
                        </div>
                    </div>

                    {/* Botões de ação organizados */}
                    <div className="flex gap-2 flex-wrap">
                        <Button
              onClick={() => {resetForm();setShowForm(true);}}
              className="bg-gradient-to-r from-blue-500 to-indigo-600">

                            <Plus className="w-4 h-4 mr-2" />
                            Nova Nota
                        </Button>
                        <Button
              onClick={() => setShowPasteForm(true)}
              variant="outline"
              className="border-purple-500 text-purple-700 hover:bg-purple-50">

                            <ClipboardPaste className="w-4 h-4 mr-2" />
                            Colar Texto
                        </Button>
                        <Button
              onClick={handleSubstituirWashington}
              variant="outline"
              className="border-orange-500 text-orange-700 hover:bg-orange-50"
              title="Substituir WASHINGTON em todas as notas do banco">

                            <Replace className="w-4 h-4 mr-2" />
                            Subst. Washington
                        </Button>
                        <Link to={createPageUrl("RomaneiosGerados")}>
                            <Button variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50">
                                <Package className="w-4 h-4 mr-2" />
                                Romaneios Gerados
                            </Button>
                        </Link>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setShowImportador(true)}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Importar Arquivo
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowChaveAcesso(true)}>
                                    <Key className="w-4 h-4 mr-2" />
                                    Chave de Acesso
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link to={createPageUrl("MascaraRomaneio")} className="cursor-pointer flex items-center">
                                        <Truck className="w-4 h-4 mr-2" />
                                        Máscara Romaneio
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Layout da Impressão */}
                <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Printer className="w-5 h-5 text-purple-600" />
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
                  onChange={(e) => setLayoutConfig({ ...layoutConfig, colRemetente: parseInt(e.target.value) || 18 })}
                  className="bg-white" />

                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Destinatário (%)</Label>
                                <Input
                  type="number"
                  min="10"
                  max="60"
                  value={layoutConfig.colDestinatario}
                  onChange={(e) => setLayoutConfig({ ...layoutConfig, colDestinatario: parseInt(e.target.value) || 42 })}
                  className="bg-white" />

                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">NFE (%)</Label>
                                <Input
                  type="number"
                  min="5"
                  max="30"
                  value={layoutConfig.colNfe}
                  onChange={(e) => setLayoutConfig({ ...layoutConfig, colNfe: parseInt(e.target.value) || 15 })}
                  className="bg-white" />

                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Carimbo (%)</Label>
                                <Input
                  type="number"
                  min="10"
                  max="40"
                  value={layoutConfig.colCarimbo}
                  onChange={(e) => setLayoutConfig({ ...layoutConfig, colCarimbo: parseInt(e.target.value) || 25 })}
                  className="bg-white" />

                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Altura Linha (px)</Label>
                                <Input
                  type="number"
                  min="30"
                  max="80"
                  value={layoutConfig.alturaLinha}
                  onChange={(e) => setLayoutConfig({ ...layoutConfig, alturaLinha: parseInt(e.target.value) || 45 })}
                  className="bg-white" />

                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Total: {layoutConfig.colRemetente + layoutConfig.colDestinatario + layoutConfig.colNfe + layoutConfig.colCarimbo}% (ideal: 100%)
                        </p>
                        
                        {/* Botão de Configuração de Impressão NFE */}
                        <div className="pt-4 border-t mt-4">
                            <Button
                                onClick={() => setShowPrintConfigNFE(true)}
                                variant="outline"
                                className="w-full border-indigo-500 text-indigo-700 hover:bg-indigo-50"
                            >
                                <Settings className="w-5 h-5 mr-2" />
                                Configurar Impressão de Importações
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Configurações do Romaneio */}
                <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-0 shadow-lg">
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
                  className="bg-white" />

                            </div>
                            <div className="space-y-2">
                                <Label>Motorista</Label>
                                <Select value={motorista} onValueChange={setMotorista}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {motoristas.map((m) =>
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Car className="w-4 h-4" /> Veículo (aplica em todos)
                                </Label>
                                <Select value={veiculoSelecionado} onValueChange={setVeiculoSelecionado}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="individual">Usar individual</SelectItem>
                                        {veiculos.map((v) =>
                    <SelectItem key={v.id} value={v.placa}>
                                                {v.placa}
                                            </SelectItem>
                    )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4" /> Remetente (aplica em todas)
                                    </span>
                                    <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCadastroRemetente(true)}
                    className="text-green-600 hover:text-green-700 h-auto p-0">

                                        <Plus className="w-4 h-4 mr-1" />
                                        Cadastrar
                                    </Button>
                                </Label>
                                <Select value={remetenteSelecionado || "individual"} onValueChange={(v) => setRemetenteSelecionado(v === "individual" ? "" : v)}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="individual">Usar individual</SelectItem>
                                        {empresasRemetentes.map((emp) =>
                    <SelectItem key={emp.id} value={emp.nome}>{emp.nome}</SelectItem>
                    )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notas para o Romaneio */}
                <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Notas para o Romaneio
                        </h3>
                        <div className="space-y-3">
                            {/* Campo de busca */}
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Input
                        placeholder="Digite os números das notas separados por vírgula, espaço ou enter..."
                        value={notasDigitadas}
                        onChange={(e) => {
                          setNotasDigitadas(e.target.value);
                          if (!e.target.value.trim()) setNotasNaoEncontradas([]);
                        }}
                        className="bg-white flex-1"
                        onKeyDown={(e) => {if (e.key === "Enter") buscarNotasDigitadas();}} />

                                    <Button onClick={buscarNotasDigitadas} className="bg-blue-600 hover:bg-blue-700">
                                        <Search className="w-4 h-4 mr-2" />
                                        Buscar e Selecionar
                                    </Button>
                                </div>

                                {/* Notas não encontradas */}
                                {notasNaoEncontradas.length > 0 && (
                                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                        <div className="flex items-start gap-2">
                                            <div className="mt-0.5">
                                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-red-800 mb-2">
                                                    {notasNaoEncontradas.length} nota(s) não encontrada(s) no banco de dados:
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {notasNaoEncontradas.map((numero, idx) => (
                                                        <Badge key={idx} variant="outline" className="bg-white border-red-300 text-red-700 font-mono">
                                                            {numero}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Faixa de ordenação */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
                                <Label className="text-sm font-semibold text-indigo-900 mb-2 block">Ordenação das Notas na Impressão</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        type="button"
                                        variant={ordenacaoNotas === "digitacao" ? "default" : "outline"}
                                        onClick={() => setOrdenacaoNotas("digitacao")}
                                        className={ordenacaoNotas === "digitacao" ? "bg-indigo-600 hover:bg-indigo-700" : "border-indigo-300 text-indigo-700 hover:bg-indigo-50"}
                                        size="sm"
                                    >
                                        <FileText className="w-4 h-4 mr-1" />
                                        Ordem de Digitação
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={ordenacaoNotas === "transportadora" ? "default" : "outline"}
                                        onClick={() => setOrdenacaoNotas("transportadora")}
                                        className={ordenacaoNotas === "transportadora" ? "bg-indigo-600 hover:bg-indigo-700" : "border-indigo-300 text-indigo-700 hover:bg-indigo-50"}
                                        size="sm"
                                    >
                                        <Truck className="w-4 h-4 mr-1" />
                                        Por Transportadora
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={ordenacaoNotas === "localizacao" ? "default" : "outline"}
                                        onClick={() => setOrdenacaoNotas("localizacao")}
                                        className={ordenacaoNotas === "localizacao" ? "bg-indigo-600 hover:bg-indigo-700" : "border-indigo-300 text-indigo-700 hover:bg-indigo-50"}
                                        size="sm"
                                    >
                                        <MapPin className="w-4 h-4 mr-1" />
                                        Por Localização
                                    </Button>
                                </div>
                            </div>

                            {/* Botões de impressão */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handlePrintRomaneio()}
                                    disabled={selecionados.length === 0 || otimizandoRota}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 flex-1 h-12 text-lg font-semibold"
                                >
                                    {otimizandoRota ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Otimizando Rota...
                                        </>
                                    ) : (
                                        <>
                                            <Printer className="w-5 h-5 mr-2" />
                                            Imprimir Romaneio ({selecionados.length})
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Filtro de Data para Importações */}
                <Card className="bg-white/80 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <Label className="font-medium">Filtrar Importações por Data:</Label>
                            </div>
                            <Input
                type="date"
                className="w-48 bg-white"
                value={filterDataImportacao}
                onChange={(e) => setFilterDataImportacao(e.target.value)} />

                            {filterDataImportacao &&
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterDataImportacao("")}>

                                    <X className="w-4 h-4 mr-1" />
                                    Limpar
                                </Button>
              }
                        </div>
                    </CardContent>
                </Card>

                {/* Registros de Importação */}
                {importacoes.length > 0 &&
        <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-700">
                                <History className="w-5 h-5 text-indigo-600" />
                                <h2 className="font-semibold">Importações</h2>
                            </div>
                            {importacoes.length > 1 &&
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArquivados(!showArquivados)}
              className="border-slate-400 text-slate-700 hover:bg-slate-100">

                                    <History className="w-4 h-4 mr-1" />
                                    {showArquivados ? "Ocultar" : "Ver"} Arquivadas ({importacoes.length - 1})
                                </Button>
            }
                        </div>
                        
                        {/* Última Importação */}
                        <div className="space-y-2">
                            {importacoes.
            filter((imp) => {
              if (!filterDataImportacao) return true;
              try {
                const dataImp = new Date(imp.data_importacao).toISOString().split('T')[0];
                return dataImp === filterDataImportacao;
              } catch {
                return true;
              }
            }).
            slice(0, 1).
            map((importacao) =>
            <ImportacaoCard
              key={importacao.id}
              importacao={importacao}
              notas={notas}
              notasSelecionadas={selecionados}
              onDelete={(id) => {
                if (confirm("Excluir este registro de importação?")) {
                  deleteImportacaoMutation.mutate(id);
                }
              }}
              onPrint={(notasParaImprimir) => {
                const notasIds = notasParaImprimir.map((n) => n.id).join(",");
                window.location.href = createPageUrl("MascaraRomaneio") + `?notas=${notasIds}`;
              }} />

            )}
                        </div>

                        {/* Importações Arquivadas */}
                        {showArquivados && importacoes.length > 1 &&
          <Card className="bg-slate-50 border-slate-300">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
                                        <Package className="w-4 h-4" />
                                        Importações Arquivadas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                                    {importacoes.
              filter((imp) => {
                if (!filterDataImportacao) return true;
                try {
                  const dataImp = new Date(imp.data_importacao).toISOString().split('T')[0];
                  return dataImp === filterDataImportacao;
                } catch {
                  return true;
                }
              }).
              slice(1).
              map((importacao) =>
              <ImportacaoCard
                key={importacao.id}
                importacao={importacao}
                notas={notas}
                notasSelecionadas={selecionados}
                onDelete={(id) => {
                  if (confirm("Excluir este registro de importação?")) {
                    deleteImportacaoMutation.mutate(id);
                  }
                }}
                onPrint={(notasParaImprimir) => {
                  const notasIds = notasParaImprimir.map((n) => n.id).join(",");
                  window.location.href = createPageUrl("MascaraRomaneio") + `?notas=${notasIds}`;
                }} />

              )}
                                </CardContent>
                            </Card>
          }
                    </div>
        }

                {/* Resumo da Última Importação */}
                {dashboardImportacao && Object.keys(dashboardImportacao.porPlaca).length > 0 &&
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-emerald-600" />
                                Resumo da Última Importação
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Totais Consolidados */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-white rounded-lg p-3 shadow-sm">
                                    <p className="text-xs text-slate-500">Total Notas</p>
                                    <p className="text-2xl font-bold text-blue-600">{dashboardImportacao.totalNotas}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 shadow-sm">
                                    <p className="text-xs text-slate-500">Total Entregas</p>
                                    <p className="text-2xl font-bold text-emerald-600">{dashboardImportacao.totalEntregas}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 shadow-sm">
                                    <p className="text-xs text-slate-500">Peso Consolidado</p>
                                    <p className="text-2xl font-bold text-orange-600">{dashboardImportacao.pesoConsolidado.toFixed(2)} kg</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 shadow-sm">
                                    <p className="text-xs text-slate-500">Veículos</p>
                                    <p className="text-2xl font-bold text-purple-600">{Object.keys(dashboardImportacao.porPlaca).length}</p>
                                </div>
                            </div>

                            {/* Por Placa */}
                            <div>
                                <h4 className="font-semibold text-sm text-slate-700 mb-2">Por Veículo:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.entries(dashboardImportacao.porPlaca).map(([placa, dados]) =>
                <div key={placa} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-emerald-500">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-emerald-700">{placa}</span>
                                                <Badge className="bg-emerald-100 text-emerald-700">
                                                    {dados.notas} NF{dados.notas > 1 ? "s" : ""}
                                                </Badge>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Entregas:</span>
                                                    <span className="font-semibold">{dados.transportadoras.size || dados.notas}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Peso:</span>
                                                    <span className="font-semibold text-orange-600">{dados.peso.toFixed(2)} kg</span>
                                                </div>
                                            </div>
                                        </div>
                )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
        }

                {/* Busca por Nota Fiscal, Destinatário e Transportadora */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Search className="w-5 h-5 text-blue-600" />
                            Busca e Filtros
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                  placeholder="Buscar por NF, destinatário ou transportadora..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white" />

                            </div>
                            <Select value={filterFilial} onValueChange={setFilterFilial}>
                                <SelectTrigger className="w-40 bg-white">
                                    <SelectValue placeholder="Filiais" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todas Filiais</SelectItem>
                                    <SelectItem value="SP">Filial SP</SelectItem>
                                    <SelectItem value="SC">Filial SC</SelectItem>
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
                                            className="border-purple-500 text-purple-700 hover:bg-purple-50"
                                            onClick={() => setShowEditDialog(true)}
                                        >
                                            <Pencil className="w-4 h-4 mr-1" />
                                            Editar ({selecionados.length})
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
                        onCheckedChange={selecionarTodos} />

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
                          onFilterChange={(v) => setColumnFilters((prev) => ({ ...prev, destinatario: v }))} />

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
                          onFilterChange={(v) => setColumnFilters((prev) => ({ ...prev, transportadora: v }))} />

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
                          onFilterChange={(v) => setColumnFilters((prev) => ({ ...prev, filial: v }))} />

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
                          onFilterChange={(v) => setColumnFilters((prev) => ({ ...prev, placa: v }))} />

                                            </div>
                                        </TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ?
                  <TableRow>
                                            <TableCell colSpan={11} className="text-center py-12">
                                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                            </TableCell>
                                        </TableRow> :
                  !hasBuscaAtiva ?
                  <TableRow>
                                            <TableCell colSpan={11} className="text-center py-12 text-slate-500">
                                                <Search className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                <p className="text-lg font-medium">Use a busca para visualizar as notas fiscais</p>
                                                <p className="text-sm text-slate-400 mt-1">Digite no campo de busca ou use os filtros acima</p>
                                            </TableCell>
                                        </TableRow> :
                  filtered.length === 0 ?
                  <TableRow>
                                            <TableCell colSpan={11} className="text-center py-12 text-slate-500">
                                                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                Nenhuma nota fiscal encontrada
                                            </TableCell>
                                        </TableRow> :

                  filtered.map((nota) =>
                  <TableRow key={nota.id} className={`hover:bg-slate-50 ${selecionados.includes(nota.id) ? "bg-blue-50" : ""}`}>
                                                <TableCell>
                                                    <Checkbox
                        checked={selecionados.includes(nota.id)}
                        onCheckedChange={() => toggleSelecionado(nota.id)} />

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
                  )
                  }
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Editar em Massa */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-purple-600" />
                            Editar em Massa
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Editar <strong>{selecionados.length}</strong> nota(s) fiscal(is) selecionada(s).
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
                                    <SelectItem value={null}>Não alterar</SelectItem>
                                    {veiculos.map((v) =>
                                        <SelectItem key={v.id} value={v.placa}>
                                            {v.placa} - {v.modelo}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Filial
                            </Label>
                            <Select value={filialEmMassa} onValueChange={setFilialEmMassa}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione a filial..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>Não alterar</SelectItem>
                                    <SelectItem value="SP">Filial SP</SelectItem>
                                    <SelectItem value="SC">Filial SC</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {
                                setShowEditDialog(false);
                                setPlacaEmMassa("");
                                setFilialEmMassa("");
                            }}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => {
                                    const updates = {};
                                    if (placaEmMassa) updates.placa = placaEmMassa;
                                    if (filialEmMassa) updates.filial = filialEmMassa;
                                    
                                    if (Object.keys(updates).length > 0) {
                                        updateEmMassaMutation.mutate({ ids: selecionados, data: updates });
                                    } else {
                                        toast.error("Selecione ao menos um campo para atualizar");
                                    }
                                }}
                                disabled={updateEmMassaMutation.isPending || (!placaEmMassa && !filialEmMassa)}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {updateEmMassaMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Paste Dialog */}
            <Dialog open={showPasteForm} onOpenChange={setShowPasteForm}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardPaste className="w-5 h-5 text-purple-600" />
                            Colar Informações
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Cole abaixo as informações de notas fiscais. O sistema irá identificar e organizar automaticamente os dados.
                            <strong className="block mt-1 text-orange-600">Obs: O campo remetente será deixado em branco para você preencher depois.</strong>
                        </p>
                        <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Cole aqui as informações das notas fiscais...

Exemplo:
NF 123456 - Destinatário ABC LTDA - 5 volumes - Transportadora XYZ
NF 789012 - Cliente DEF - Peso 100kg - 3 vol"
























              rows={10}
              className="font-mono text-sm" />

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {setShowPasteForm(false);setPasteText("");}}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button
                onClick={handleProcessPaste}
                disabled={processingPaste || !pasteText.trim()}
                className="bg-purple-600 hover:bg-purple-700">

                                {processingPaste ?
                <>
                                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                                        Processando...
                                    </> :

                <>
                                        <Sparkles className="w-4 h-4 mr-1" /> Processar
                                    </>
                }
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
                            {transpExtraidas.map((transp, index) =>
              <div
                key={index}
                className={`p-4 rounded-xl border-2 transition-colors ${
                transpSelecionadas.includes(index) ?
                "border-violet-500 bg-violet-50" :
                "border-slate-200 bg-white"}`
                }>

                                    <div className="flex items-start gap-3">
                                        <Checkbox
                    checked={transpSelecionadas.includes(index)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setTranspSelecionadas((prev) => [...prev, index]);
                      } else {
                        setTranspSelecionadas((prev) => prev.filter((i) => i !== index));
                      }
                    }}
                    className="mt-1" />

                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-lg text-slate-800">{transp.nome}</h4>
                                                <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => buscarDadosOnline(index, transp.nome)}
                        disabled={buscandoDados[index]}
                        className="border-blue-500 text-blue-600 hover:bg-blue-50">

                                                    {buscandoDados[index] ?
                        <>
                                                            <div className="animate-spin w-4 h-4 mr-1 border-2 border-blue-500 border-t-transparent rounded-full" />
                                                            Buscando...
                                                        </> :

                        <>
                                                            <Globe className="w-4 h-4 mr-1" />
                                                            Atualizar Dados
                                                        </>
                        }
                                                </Button>
                                            </div>
                                            
                                            {/* Dados preenchidos */}
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                {transp.cnpj &&
                      <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className="text-xs">CNPJ</Badge>
                                                        <span>{transp.cnpj}</span>
                                                    </div>
                      }
                                                {transp.telefone &&
                      <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className="text-xs">Tel</Badge>
                                                        <span>{transp.telefone}</span>
                                                    </div>
                      }
                                                {transp.cidade && transp.uf &&
                      <div className="flex items-center gap-1">
                                                        <Badge variant="outline" className="text-xs">Cidade</Badge>
                                                        <span>{transp.cidade}/{transp.uf}</span>
                                                    </div>
                      }
                                                {transp.endereco &&
                      <div className="flex items-center gap-1 col-span-2">
                                                        <Badge variant="outline" className="text-xs">End</Badge>
                                                        <span className="truncate">{transp.endereco}</span>
                                                    </div>
                      }
                                                {transp.horario_funcionamento &&
                      <div className="flex items-center gap-1 col-span-2">
                                                        <Badge variant="outline" className="text-xs">Horário</Badge>
                                                        <span>{transp.horario_funcionamento}</span>
                                                    </div>
                      }
                                            </div>
                                            
                                            {!transp.cnpj && !transp.telefone && !transp.cidade &&
                    <p className="text-xs text-slate-400 italic">
                                                    Clique em "Atualizar Dados" para buscar informações online
                                                </p>
                    }
                                        </div>
                                    </div>
                                </div>
              )}
                        </div>
                        
                        <div className="flex justify-between items-center pt-4 border-t">
                            <div className="text-sm text-slate-500">
                                {transpSelecionadas.length} de {transpExtraidas.length} selecionada(s)
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => {setShowCadastroTransp(false);setTranspExtraidas([]);}}>
                                    <X className="w-4 h-4 mr-1" /> Cancelar
                                </Button>
                                <Button
                  onClick={handleCadastrarTransportadoras}
                  disabled={transpSelecionadas.length === 0}
                  className="bg-violet-600 hover:bg-violet-700">

                                    <Building2 className="w-4 h-4 mr-1" />
                                    Cadastrar ({transpSelecionadas.length})
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Gravar Áudio e Buscar Online */}
            <Dialog open={showAudioDialog} onOpenChange={(open) => {if (!open) resetAudioDialog();else setShowAudioDialog(true);}}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mic className="w-5 h-5 text-red-600" />
                            Gravar Áudio e Buscar Dados
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Grave um áudio descrevendo o que deseja buscar (empresa, transportadora, cliente, etc). 
                            O sistema irá transcrever e buscar informações online.
                        </p>

                        {/* Controles de Gravação */}
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                            {!isRecording ?
              <Button
                onClick={startRecording}
                className="bg-red-500 hover:bg-red-600"
                disabled={isTranscribing}>

                                    <Mic className="w-5 h-5 mr-2" />
                                    Iniciar Gravação
                                </Button> :

              <Button
                onClick={stopRecording}
                variant="destructive"
                className="animate-pulse">

                                    <Square className="w-5 h-5 mr-2" />
                                    Parar Gravação
                                </Button>
              }

                            {audioUrl && !isRecording &&
              <Button
                variant="outline"
                onClick={togglePlayback}
                className="border-blue-500 text-blue-600">

                                    {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                                    {isPlaying ? "Pausar" : "Ouvir"}
                                </Button>
              }

                            {isTranscribing &&
              <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Transcrevendo...
                                </div>
              }

                            {isRecording &&
              <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                    <span className="text-red-600 font-medium">Gravando...</span>
                                </div>
              }
                        </div>

                        {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />}

                        {/* Transcrição */}
                        {transcription &&
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                <p className="text-xs text-blue-600 font-medium mb-2">Transcrição do áudio:</p>
                                <p className="text-slate-700">{transcription}</p>
                            </div>
            }

                        {/* Botão Buscar Online */}
                        {transcription && !dadosExtraidos &&
            <Button
              onClick={buscarDadosOnlineAudio}
              disabled={buscandoOnline}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600">

                                {buscandoOnline ?
              <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Buscando na internet...
                                    </> :

              <>
                                        <Globe className="w-5 h-5 mr-2" />
                                        Buscar Dados Online
                                    </>
              }
                            </Button>
            }

                        {/* Dados Encontrados */}
                        {dadosExtraidos &&
            <div className="space-y-4">
                                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                                    <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                        <Search className="w-4 h-4" />
                                        Dados Encontrados
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        {dadosExtraidos.razao_social &&
                  <div><span className="text-slate-500">Razão Social:</span> <strong>{dadosExtraidos.razao_social}</strong></div>
                  }
                                        {dadosExtraidos.nome_fantasia &&
                  <div><span className="text-slate-500">Nome Fantasia:</span> <strong>{dadosExtraidos.nome_fantasia}</strong></div>
                  }
                                        {dadosExtraidos.cnpj &&
                  <div><span className="text-slate-500">CNPJ:</span> <strong>{dadosExtraidos.cnpj}</strong></div>
                  }
                                        {dadosExtraidos.telefone &&
                  <div><span className="text-slate-500">Telefone:</span> <strong>{dadosExtraidos.telefone}</strong></div>
                  }
                                        {dadosExtraidos.telefone2 &&
                  <div><span className="text-slate-500">Telefone 2:</span> <strong>{dadosExtraidos.telefone2}</strong></div>
                  }
                                        {dadosExtraidos.email &&
                  <div><span className="text-slate-500">Email:</span> <strong>{dadosExtraidos.email}</strong></div>
                  }
                                        {dadosExtraidos.site &&
                  <div><span className="text-slate-500">Site:</span> <strong>{dadosExtraidos.site}</strong></div>
                  }
                                        {dadosExtraidos.endereco &&
                  <div className="col-span-2"><span className="text-slate-500">Endereço:</span> <strong>{dadosExtraidos.endereco}</strong></div>
                  }
                                        {dadosExtraidos.bairro &&
                  <div><span className="text-slate-500">Bairro:</span> <strong>{dadosExtraidos.bairro}</strong></div>
                  }
                                        {dadosExtraidos.cidade && dadosExtraidos.uf &&
                  <div><span className="text-slate-500">Cidade:</span> <strong>{dadosExtraidos.cidade}/{dadosExtraidos.uf}</strong></div>
                  }
                                        {dadosExtraidos.cep &&
                  <div><span className="text-slate-500">CEP:</span> <strong>{dadosExtraidos.cep}</strong></div>
                  }
                                        {dadosExtraidos.horario_funcionamento &&
                  <div className="col-span-2"><span className="text-slate-500">Horário:</span> <strong>{dadosExtraidos.horario_funcionamento}</strong></div>
                  }
                                        {dadosExtraidos.ramo_atividade &&
                  <div className="col-span-2"><span className="text-slate-500">Ramo:</span> <strong>{dadosExtraidos.ramo_atividade}</strong></div>
                  }
                                    </div>
                                </div>

                                {/* Seleção de Destino */}
                                <div className="space-y-2">
                                    <Label className="font-semibold">Onde deseja cadastrar?</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Button
                    type="button"
                    variant={destinoSelecionado === "nota_fiscal" ? "default" : "outline"}
                    onClick={() => setDestinoSelecionado("nota_fiscal")}
                    className={destinoSelecionado === "nota_fiscal" ? "bg-blue-600" : ""}>

                                            <FileText className="w-4 h-4 mr-1" />
                                            Nota Fiscal
                                        </Button>
                                        <Button
                    type="button"
                    variant={destinoSelecionado === "transportadora" ? "default" : "outline"}
                    onClick={() => setDestinoSelecionado("transportadora")}
                    className={destinoSelecionado === "transportadora" ? "bg-violet-600" : ""}>

                                            <Truck className="w-4 h-4 mr-1" />
                                            Transportadora
                                        </Button>
                                        <Button
                    type="button"
                    variant={destinoSelecionado === "cliente" ? "default" : "outline"}
                    onClick={() => setDestinoSelecionado("cliente")}
                    className={destinoSelecionado === "cliente" ? "bg-emerald-600" : ""}>

                                            <Users className="w-4 h-4 mr-1" />
                                            Cliente
                                        </Button>
                                    </div>
                                </div>

                                <Button
                onClick={cadastrarDados}
                disabled={!destinoSelecionado}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600">

                                    <Save className="w-5 h-5 mr-2" />
                                    Cadastrar como {destinoSelecionado === "nota_fiscal" ? "Nota Fiscal" : destinoSelecionado === "transportadora" ? "Transportadora" : destinoSelecionado === "cliente" ? "Cliente" : "..."}
                                </Button>
                            </div>
            }

                        <div className="flex justify-end">
                            <Button variant="outline" onClick={resetAudioDialog}>
                                <X className="w-4 h-4 mr-1" /> Fechar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Importador de Arquivos */}
            <ImportadorNFE
        open={showImportador}
        onClose={() => setShowImportador(false)}
        onImportSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
          queryClient.invalidateQueries({ queryKey: ["registros-importacao"] });
        }} />

            {/* Dialog de Configuração de Impressão */}
            <PrintConfigNFE
                open={showPrintConfigNFE}
                onOpenChange={setShowPrintConfigNFE}
                onPrint={handlePrintRomaneioComConfig}
                configKey="nfePrintConfig"
            />


                {/* Dialog Chave de Acesso */}
                <Dialog open={showChaveAcesso} onOpenChange={setShowChaveAcesso}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-green-600" />
                            Cadastrar por Chave de Acesso
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Digite a chave de acesso da NFe (44 dígitos):
                        </p>
                        <Input
              value={chaveAcesso}
              onChange={(e) => setChaveAcesso(e.target.value.replace(/\D/g, ""))}
              placeholder="00000000000000000000000000000000000000000000"
              maxLength={44}
              className="font-mono" />

                        <p className="text-xs text-slate-500">
                            {chaveAcesso.length}/44 dígitos
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {setShowChaveAcesso(false);setChaveAcesso("");}}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button
                onClick={handleConsultarChave}
                disabled={consultandoChave || chaveAcesso.length !== 44}
                className="bg-green-600 hover:bg-green-700">

                                {consultandoChave ?
                <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Consultando...
                                    </> :

                <>
                                        <Search className="w-4 h-4 mr-1" /> Consultar
                                    </>
                }
                            </Button>
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
                autoFocus />

                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                type="button"
                variant="outline"
                onClick={() => {setShowCadastroDestinatario(false);setNovoDestinatario({ nome: "" });}}>

                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button
                onClick={() => createDestinatarioMutation.mutate(novoDestinatario)}
                disabled={!novoDestinatario.nome || createDestinatarioMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700">

                                {createDestinatarioMutation.isPending ? "Salvando..." :
                <>
                                        <Save className="w-4 h-4 mr-1" /> Salvar
                                    </>
                }
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Cadastrar Remetente */}
            <Dialog open={showCadastroRemetente} onOpenChange={setShowCadastroRemetente}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-green-600" />
                            Cadastrar Remetente
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Cadastre uma nova empresa remetente para aplicar em todas as notas.
                        </p>
                        <div className="space-y-2">
                            <Label>Nome da Empresa *</Label>
                            <Input
                value={novoRemetente.nome}
                onChange={(e) => setNovoRemetente({ nome: e.target.value })}
                placeholder="Nome da empresa remetente"
                autoFocus />

                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                type="button"
                variant="outline"
                onClick={() => {setShowCadastroRemetente(false);setNovoRemetente({ nome: "" });}}>

                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button
                onClick={() => createRemetenteMutation.mutate(novoRemetente)}
                disabled={!novoRemetente.nome || createRemetenteMutation.isPending}
                className="bg-green-600 hover:bg-green-700">

                                {createRemetenteMutation.isPending ? "Salvando..." :
                <>
                                        <Save className="w-4 h-4 mr-1" /> Salvar
                                    </>
                }
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
                  placeholder="Ex: 123456" />

                            </div>
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })} />

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
                  className="text-blue-600 hover:text-blue-700 h-auto p-0">

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
                  list="destinatarios-list" />

                                <datalist id="destinatarios-list">
                                    {destinatarios.
                  sort((a, b) => a.nome.localeCompare(b.nome)).
                  filter((d) => d.nome.toLowerCase().includes(form.destinatario.toLowerCase())).
                  map((d) =>
                  <option key={d.id} value={d.nome}>
                                                {d.cidade && `${d.nome} (${d.cidade})`}
                                            </option>
                  )}
                                </datalist>
                                {form.destinatario &&
                <div className="text-xs text-slate-500">
                                        {destinatarios.filter((d) =>
                  d.nome.toLowerCase().includes(form.destinatario.toLowerCase())
                  ).length} destinatário(s) encontrado(s)
                                    </div>
                }
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Peso</Label>
                                <Input
                  value={form.peso}
                  onChange={(e) => setForm({ ...form, peso: e.target.value })}
                  placeholder="Ex: 100kg" />

                            </div>
                            <div className="space-y-2">
                                <Label>Volume</Label>
                                <Input
                  value={form.volume}
                  onChange={(e) => setForm({ ...form, volume: e.target.value })}
                  placeholder="Ex: 5" />

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
                  list="transportadoras-list" />

                                <datalist id="transportadoras-list">
                                    {transportadoras.
                  sort((a, b) => (a.razao_social || a.nome_fantasia || "").localeCompare(b.razao_social || b.nome_fantasia || "")).
                  filter((t) => {
                    const nome = (t.razao_social || t.nome_fantasia || "").toLowerCase();
                    return nome.includes((form.transportadora || "").toLowerCase());
                  }).
                  map((t) =>
                  <option key={t.id} value={t.razao_social || t.nome_fantasia}>
                                                {t.cidade && `${t.razao_social || t.nome_fantasia} (${t.cidade})`}
                                            </option>
                  )}
                                </datalist>
                                {form.transportadora &&
                <div className="text-xs text-slate-500">
                                        {transportadoras.filter((t) =>
                  (t.razao_social || t.nome_fantasia || "").toLowerCase().includes(form.transportadora.toLowerCase())
                  ).length} transportadora(s) encontrada(s)
                                    </div>
                }
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Filial
                                </Label>
                                <Input
                  value={form.filial}
                  onChange={(e) => setForm({ ...form, filial: e.target.value })}
                  placeholder="Ex: SP, RJ, MG..." />

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
                                    {veiculos.map((v) =>
                  <SelectItem key={v.id} value={v.placa}>
                                            {v.placa} - {v.modelo}
                                        </SelectItem>
                  )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => {setShowForm(false);resetForm();}}>
                                <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                <Save className="w-4 h-4 mr-1" /> Salvar
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>);

}