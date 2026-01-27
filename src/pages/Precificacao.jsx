import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Loader2, Edit2, Check, Trash2, Search, FileText, Download, BarChart3 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Precificacao() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [capturing, setCapturing] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [editing, setEditing] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
    const [showTextDialog, setShowTextDialog] = useState(false);
    const [pastedText, setPastedText] = useState("");
    const [showBulkDialog, setShowBulkDialog] = useState(false);
    const [bulkText, setBulkText] = useState("");
    const [processingBulk, setProcessingBulk] = useState(false);
    const [showAnalises, setShowAnalises] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);
    const pasteAreaRef = useRef(null);

    const [formData, setFormData] = useState({
        id: null,
        remetente: "",
        destinatario: "",
        transportadora: "",
        volume: "",
        peso: "",
        numero_documento: "",
        data_emissao: "",
        valor_nota: "",
        frete_peso: "",
        sec_cat: "",
        despacho: "",
        pedagio: "",
        outros: "",
        total_prestacao: "",
        valor_servico: "",
        porcentagem: "",
        foto_url: "",
        confirmado: false,
        data: new Date().toISOString().split('T')[0],
        observacoes: ""
    });

    const { data: precificacoes = [] } = useQuery({
        queryKey: ['precificacoes'],
        queryFn: () => base44.entities.Precificacao.list('-created_date')
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Precificacao.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['precificacoes']);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Precificacao.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['precificacoes']);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Precificacao.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['precificacoes']);
        }
    });

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
            setShowCamera(true);
        } catch (error) {
            toast({ title: "Erro ao acessar câmera", variant: "destructive", duration: 3000 });
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
            canvas.toBlob(async (blob) => {
                setCapturedImage(URL.createObjectURL(blob));
                stopCamera();
                await processImage(blob);
            }, 'image/jpeg', 0.95);
        }
    };

    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setExtracting(true);

        for (const file of files) {
            const fileType = file.type;
            const fileName = file.name.toLowerCase();

            // Se for imagem, processar como antes
            if (fileType.startsWith('image/')) {
                setCapturedImage(URL.createObjectURL(file));
                await processImage(file);
                break;
            }

            // Se for PDF ou Excel, extrair dados e criar múltiplos registros
            if (fileType === 'application/pdf' || fileName.endsWith('.pdf') || 
                fileType.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
                
                try {
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    
                    // Extrair dados do arquivo
                    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                        file_url,
                        json_schema: {
                            type: "object",
                            properties: {
                                registros: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            remetente: { type: "string" },
                                            destinatario: { type: "string" },
                                            transportadora: { type: "string" },
                                            numero_cte: { type: "string", description: "Número do CTe se houver campo CTE" },
                                            numero_documento: { type: "string", description: "Número do documento principal (Nº)" },
                                            data_emissao: { type: "string" },
                                            volume: { type: "string" },
                                            peso: { type: "string" },
                                            valor_nota: { type: "number" },
                                            frete_peso: { type: "number" },
                                            sec_cat: { type: "number" },
                                            despacho: { type: "number" },
                                            pedagio: { type: "number" },
                                            outros: { type: "number" },
                                            total_prestacao: { type: "number" }
                                        }
                                    }
                                }
                            }
                        }
                    });

                    if (result.status === "success" && result.output?.registros?.length > 0) {
                        // Processar cada registro
                        for (const registro of result.output.registros) {
                            await processAndSaveRecord(registro, file_url);
                        }
                        toast({ title: `${result.output.registros.length} registros importados com sucesso!`, duration: 3000 });
                    } else {
                        toast({ title: "Nenhum dado encontrado no arquivo", variant: "destructive", duration: 3000 });
                    }
                } catch (error) {
                    toast({ title: "Erro ao processar arquivo", description: error.message, variant: "destructive", duration: 3000 });
                }
                break;
            }
        }

        setExtracting(false);
        event.target.value = '';
    };

    const processAndSaveRecord = async (registro, foto_url = "") => {
        const valorNota = parseFloat(registro.valor_nota) || 0;
        const totalPrestacao = parseFloat(registro.total_prestacao) || 0;
        
        // Priorizar CTe, depois número do documento
        const numeroDoc = registro.numero_cte || registro.numero_documento || "";
        
        // Normalizar peso
        let pesoLimpo = registro.peso || "";
        if (typeof pesoLimpo === 'string') {
            pesoLimpo = pesoLimpo.replace(/[^\d.,]/g, '').replace(',', '.');
        }
        const pesoNumerico = parseFloat(pesoLimpo) || 0;

        // Calcular Sec/Cat se estiver em branco
        let secCat = parseFloat(registro.sec_cat) || 0;
        if (secCat === 0 && valorNota > 0) {
            secCat = parseFloat((valorNota * 0.005).toFixed(2));
        }

        // Calcular Pedágio se estiver em branco
        let pedagio = parseFloat(registro.pedagio) || 0;
        if (pedagio === 0 && pesoNumerico > 0) {
            pedagio = parseFloat(((pesoNumerico / 100) * 1.40).toFixed(2));
        }

        // Calcular porcentagem
        const valorServico = (parseFloat(registro.frete_peso) || 0) + secCat + (parseFloat(registro.despacho) || 0) + pedagio + (parseFloat(registro.outros) || 0);
        const porcentagem = valorNota > 0 ? ((valorServico / valorNota) * 100).toFixed(2) : 0;

        // Criar registro
        await createMutation.mutateAsync({
            remetente: registro.remetente || "",
            destinatario: registro.destinatario || "",
            transportadora: registro.transportadora || "",
            numero_documento: numeroDoc,
            data_emissao: registro.data_emissao || "",
            volume: registro.volume || "",
            peso: pesoLimpo,
            valor_nota: valorNota,
            frete_peso: parseFloat(registro.frete_peso) || 0,
            sec_cat: secCat,
            despacho: parseFloat(registro.despacho) || 0,
            pedagio: pedagio,
            outros: parseFloat(registro.outros) || 0,
            total_prestacao: totalPrestacao,
            valor_servico: valorServico,
            porcentagem: parseFloat(porcentagem),
            foto_url: foto_url,
            confirmado: false,
            data: new Date().toISOString().split('T')[0],
            observacoes: ""
        });
    };

    const handlePaste = async (event) => {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    setCapturedImage(URL.createObjectURL(blob));
                    await processImage(blob);
                }
                break;
            }
        }
    };

    React.useEffect(() => {
        const handleGlobalPaste = (e) => {
            if (!editing) {
                handlePaste(e);
            }
        };

        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [editing]);

    const processImage = async (imageBlob) => {
        setExtracting(true);
        try {
            // Upload da imagem
            const { file_url } = await base44.integrations.Core.UploadFile({ file: imageBlob });
            
            // Extrair dados da imagem usando LLM com visão
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um especialista em extrair dados de documentos de transporte (CTe, Romaneios, Notas Fiscais).

Analise cuidadosamente este documento e extraia TODAS as seguintes informações:

**EMPRESAS:**
- Remetente: Nome completo da empresa/pessoa que está enviando a mercadoria (EXPEDIDOR/REMETENTE)
- Destinatário: Nome completo da empresa/pessoa que irá receber (DESTINATÁRIO/RECEBEDOR)
- Transportadora: Nome da empresa transportadora responsável pelo frete

**DOCUMENTO:**
- Número do Documento: Número do CTe, NFe ou documento (campo "No.", "NÚMERO", "DOC")
- Data de Emissão: Data de emissão do documento (campo "EMISSÃO", "DATA EMISSÃO", "DT. EMISSÃO")

**CARGA:**
- Volume: Quantidade de volumes/pacotes (ex: "1 VOL", "3 VOLUMES", "10 UN")
- Peso: Peso total em quilogramas (ex: "500 KG", "1.250,00 KG")

**VALORES FINANCEIROS (extrair todos os valores numéricos):**
- Valor da Nota Fiscal: Valor total da nota/mercadoria (campo "VALOR DA NOTA" ou "VALOR MERC")
- Frete Peso/Vol: Valor do frete baseado em peso ou volume (campo "FRETE PESO" ou "FRETE PESO/VOL" ou "VL. FRETE PESO")
- Sec/Cat: Valor de seguro ou CAT (campo "SEC/CAT" ou "SEGURO" ou "ADVALOREM")
- Despacho: Taxa de despacho (campo "DESPACHO" ou "TX DESPACHO")
- Pedágio: Valor do pedágio (campo "PEDÁGIO" ou "PEDAGIO")
- Outros: Outras taxas/valores (campo "OUTROS" ou "OUTRAS TAXAS")
- Total Prestação: Valor total do serviço de transporte (campo "TOTAL PRESTAÇÃO" ou "VL. TOTAL SERVIÇO" ou "TOTAL A PAGAR")

**INSTRUÇÕES IMPORTANTES:**
1. Extraia APENAS valores numéricos, removendo símbolos de moeda (R$), pontos de milhar e vírgulas decimais (converta vírgula em ponto)
2. Se um campo não existir no documento, retorne 0 (zero)
3. Para Volume e Peso, extraia o texto completo com a unidade (ex: "10 VOL", "850 KG")
4. Seja preciso: procure por rótulos como "REMETENTE:", "DESTINATÁRIO:", "VALOR MERC:", etc.
5. O Total Prestação geralmente é a SOMA de todos os valores de frete
6. Extraia números mesmo que estejam formatados (ex: "1.250,00" deve virar 1250.00)`,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        remetente: { 
                            type: "string",
                            description: "Nome completo do remetente/expedidor"
                        },
                        destinatario: { 
                            type: "string",
                            description: "Nome completo do destinatário/recebedor"
                        },
                        transportadora: {
                            type: "string",
                            description: "Nome da transportadora"
                        },
                        numero_documento: {
                            type: "string",
                            description: "Número do documento (CTe, NFe, etc)"
                        },
                        data_emissao: {
                            type: "string",
                            description: "Data de emissão no formato DD/MM/YYYY"
                        },
                        volume: { 
                            type: "string",
                            description: "Quantidade de volumes com unidade (ex: 10 VOL)"
                        },
                        peso: { 
                            type: "string",
                            description: "Peso com unidade (ex: 850 KG)"
                        },
                        valor_nota: { 
                            type: "number",
                            description: "Valor da nota fiscal em número decimal"
                        },
                        frete_peso: { 
                            type: "number",
                            description: "Valor do frete peso/volume"
                        },
                        sec_cat: { 
                            type: "number",
                            description: "Valor seguro/CAT/advalorem"
                        },
                        despacho: { 
                            type: "number",
                            description: "Valor da taxa de despacho"
                        },
                        pedagio: { 
                            type: "number",
                            description: "Valor do pedágio"
                        },
                        outros: { 
                            type: "number",
                            description: "Outros valores/taxas"
                        },
                        total_prestacao: { 
                            type: "number",
                            description: "Valor total do serviço de transporte"
                        }
                    },
                    required: ["remetente", "destinatario", "volume", "peso", "valor_nota", "total_prestacao"]
                }
            });

            // Calcular automaticamente a porcentagem com base no Total Prestação e Valor da Nota
            const valorNota = parseFloat(result.valor_nota) || 0;
            const totalPrestacao = parseFloat(result.total_prestacao) || 0;
            let porcentagem = 0;
            
            if (valorNota > 0 && totalPrestacao > 0) {
                porcentagem = ((totalPrestacao / valorNota) * 100).toFixed(2);
            }

            // Calcular Sec/Cat se estiver em branco (0,5% do valor da nota) - apenas na importação inicial
            let secCat = parseFloat(result.sec_cat) || 0;
            if (secCat === 0 && valorNota > 0) {
                secCat = parseFloat((valorNota * 0.005).toFixed(2));
            }

            // Normalizar peso: remover texto e converter vírgula para ponto
            let pesoLimpo = result.peso || "";
            if (typeof pesoLimpo === 'string') {
                pesoLimpo = pesoLimpo.replace(/[^\d.,]/g, '').replace(',', '.');
            }
            const pesoNumerico = parseFloat(pesoLimpo) || 0;

            // Calcular Pedágio se estiver em branco ((peso/100) * 1.40)
            let pedagio = parseFloat(result.pedagio) || 0;
            if (pedagio === 0 && pesoNumerico > 0) {
                pedagio = parseFloat(((pesoNumerico / 100) * 1.40).toFixed(2));
            }

            setFormData(prev => ({
                ...prev,
                ...result,
                peso: pesoLimpo, // Peso já normalizado
                sec_cat: secCat,
                pedagio: pedagio,
                foto_url: file_url,
                valor_servico: totalPrestacao,
                porcentagem: porcentagem
            }));

            setEditing(true);
        } catch (error) {
            toast({ 
                title: "Erro ao processar imagem", 
                description: error.message,
                variant: "destructive",
                duration: 3000
            });
        } finally {
            setExtracting(false);
        }
    };

    const calculatePercentage = () => {
        const servico = parseFloat(formData.valor_servico) || 0;
        const nota = parseFloat(formData.valor_nota) || 0;
        if (nota > 0) {
            const percent = (servico / nota) * 100;
            setFormData(prev => ({ ...prev, porcentagem: percent.toFixed(2) }));
        }
    };

    // Recalcular automaticamente valor_servico e porcentagem quando qualquer campo for editado
    useEffect(() => {
        const fretePeso = parseFloat(formData.frete_peso) || 0;
        const secCat = parseFloat(formData.sec_cat) || 0;
        const despacho = parseFloat(formData.despacho) || 0;
        const pedagio = parseFloat(formData.pedagio) || 0;
        const outros = parseFloat(formData.outros) || 0;
        const valorNota = parseFloat(formData.valor_nota) || 0;

        const valorServicoCalculado = fretePeso + secCat + despacho + pedagio + outros;
        const porcentagemCalculada = valorNota > 0 ? ((valorServicoCalculado / valorNota) * 100).toFixed(2) : "0.00";

        // Apenas atualiza se os valores calculados mudaram (evita loop infinito)
        if (formData.valor_servico !== valorServicoCalculado || formData.porcentagem !== parseFloat(porcentagemCalculada)) {
            setFormData(prev => ({
                ...prev,
                valor_servico: valorServicoCalculado,
                porcentagem: parseFloat(porcentagemCalculada)
            }));
        }
    }, [formData.frete_peso, formData.sec_cat, formData.despacho, formData.pedagio, formData.outros, formData.valor_nota]);

    const handleSave = () => {
        if (formData.id) {
            // Atualizar registro existente
            const { id, ...dataToUpdate } = formData;
            updateMutation.mutate({ id, data: dataToUpdate });
        } else {
            // Criar novo registro
            createMutation.mutate(formData);
        }
    };

    const resetForm = () => {
        setFormData({
            id: null,
            remetente: "",
            destinatario: "",
            transportadora: "",
            volume: "",
            peso: "",
            numero_documento: "",
            data_emissao: "",
            valor_nota: "",
            frete_peso: "",
            sec_cat: "",
            despacho: "",
            pedagio: "",
            outros: "",
            total_prestacao: "",
            valor_servico: "",
            porcentagem: "",
            foto_url: "",
            confirmado: false,
            data: new Date().toISOString().split('T')[0],
            observacoes: ""
        });
        setCapturedImage(null);
        setEditing(false);
    };

    const handleConfirm = (prec) => {
        updateMutation.mutate({
            id: prec.id,
            data: { ...prec, confirmado: true }
        });
    };

    const handleDownload = async (prec) => {
        if (!prec.foto_url) {
            toast({ title: "Sem imagem para baixar", variant: "destructive", duration: 3000 });
            return;
        }
        
        try {
            const response = await fetch(prec.foto_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `comprovante_${prec.numero_documento || prec.id}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({ title: "Download concluído", duration: 2000 });
        } catch (error) {
            toast({ title: "Erro ao baixar imagem", variant: "destructive", duration: 3000 });
        }
    };

    const processText = async (text) => {
        setExtracting(true);
        setShowTextDialog(false);
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Você é um especialista em extrair dados de documentos de transporte (CTe, Romaneios, Notas Fiscais).

Analise cuidadosamente este texto e extraia TODAS as seguintes informações:

**EMPRESAS:**
- Remetente: Nome completo da empresa/pessoa que está enviando a mercadoria (EXPEDIDOR/REMETENTE)
- Destinatário: Nome completo da empresa/pessoa que irá receber (DESTINATÁRIO/RECEBEDOR)
- Transportadora: Nome da empresa transportadora responsável pelo frete

**DOCUMENTO:**
- Número do Documento: Número do CTe, NFe ou documento (campo "No.", "NÚMERO", "DOC")
- Data de Emissão: Data de emissão do documento (campo "EMISSÃO", "DATA EMISSÃO", "DT. EMISSÃO")

**CARGA:**
- Volume: Quantidade de volumes/pacotes (ex: "1 VOL", "3 VOLUMES", "10 UN")
- Peso: Peso total em quilogramas (ex: "500 KG", "1.250,00 KG")

**VALORES FINANCEIROS (extrair todos os valores numéricos):**
- Valor da Nota Fiscal: Valor total da nota/mercadoria (campo "VALOR DA NOTA" ou "VALOR MERC")
- Frete Peso/Vol: Valor do frete baseado em peso ou volume (campo "FRETE PESO" ou "FRETE PESO/VOL" ou "VL. FRETE PESO")
- Sec/Cat: Valor de seguro ou CAT (campo "SEC/CAT" ou "SEGURO" ou "ADVALOREM")
- Despacho: Taxa de despacho (campo "DESPACHO" ou "TX DESPACHO")
- Pedágio: Valor do pedágio (campo "PEDÁGIO" ou "PEDAGIO")
- Outros: Outras taxas/valores (campo "OUTROS" ou "OUTRAS TAXAS")
- Total Prestação: Valor total do serviço de transporte (campo "TOTAL PRESTAÇÃO" ou "VL. TOTAL SERVIÇO" ou "TOTAL A PAGAR")

**INSTRUÇÕES IMPORTANTES:**
1. Extraia APENAS valores numéricos, removendo símbolos de moeda (R$), pontos de milhar e vírgulas decimais (converta vírgula em ponto)
2. Se um campo não existir no documento, retorne 0 (zero)
3. Para Volume e Peso, extraia o texto completo com a unidade (ex: "10 VOL", "850 KG")
4. Seja preciso: procure por rótulos como "REMETENTE:", "DESTINATÁRIO:", "VALOR MERC:", etc.
5. O Total Prestação geralmente é a SOMA de todos os valores de frete
6. Extraia números mesmo que estejam formatados (ex: "1.250,00" deve virar 1250.00)

TEXTO DO DOCUMENTO:
${text}`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        remetente: { 
                            type: "string",
                            description: "Nome completo do remetente/expedidor"
                        },
                        destinatario: { 
                            type: "string",
                            description: "Nome completo do destinatário/recebedor"
                        },
                        transportadora: {
                            type: "string",
                            description: "Nome da transportadora"
                        },
                        numero_documento: {
                            type: "string",
                            description: "Número do documento (CTe, NFe, etc)"
                        },
                        data_emissao: {
                            type: "string",
                            description: "Data de emissão no formato DD/MM/YYYY"
                        },
                        volume: { 
                            type: "string",
                            description: "Quantidade de volumes com unidade (ex: 10 VOL)"
                        },
                        peso: { 
                            type: "string",
                            description: "Peso com unidade (ex: 850 KG)"
                        },
                        valor_nota: { 
                            type: "number",
                            description: "Valor da nota fiscal em número decimal"
                        },
                        frete_peso: { 
                            type: "number",
                            description: "Valor do frete peso/volume"
                        },
                        sec_cat: { 
                            type: "number",
                            description: "Valor seguro/CAT/advalorem"
                        },
                        despacho: { 
                            type: "number",
                            description: "Valor da taxa de despacho"
                        },
                        pedagio: { 
                            type: "number",
                            description: "Valor do pedágio"
                        },
                        outros: { 
                            type: "number",
                            description: "Outros valores/taxas"
                        },
                        total_prestacao: { 
                            type: "number",
                            description: "Valor total do serviço de transporte"
                        }
                    },
                    required: ["remetente", "destinatario", "volume", "peso", "valor_nota", "total_prestacao"]
                }
            });

            const valorNota = parseFloat(result.valor_nota) || 0;
            const totalPrestacao = parseFloat(result.total_prestacao) || 0;
            let porcentagem = 0;
            
            if (valorNota > 0 && totalPrestacao > 0) {
                porcentagem = ((totalPrestacao / valorNota) * 100).toFixed(2);
            }

            let secCat = parseFloat(result.sec_cat) || 0;
            if (secCat === 0 && valorNota > 0) {
                secCat = parseFloat((valorNota * 0.005).toFixed(2));
            }

            // Normalizar peso do texto
            let pesoLimpo = result.peso || "";
            if (typeof pesoLimpo === 'string') {
                pesoLimpo = pesoLimpo.replace(/[^\d.,]/g, '').replace(',', '.');
            }
            const pesoNumerico = parseFloat(pesoLimpo) || 0;

            let pedagio = parseFloat(result.pedagio) || 0;
            if (pedagio === 0 && pesoNumerico > 0) {
                pedagio = parseFloat(((pesoNumerico / 100) * 1.40).toFixed(2));
            }

            setFormData(prev => ({
                ...prev,
                ...result,
                peso: pesoLimpo,
                sec_cat: secCat,
                pedagio: pedagio,
                valor_servico: totalPrestacao,
                porcentagem: porcentagem
            }));

            setEditing(true);
            setPastedText("");
        } catch (error) {
            toast({ 
                title: "Erro ao processar texto", 
                description: error.message,
                variant: "destructive",
                duration: 3000
            });
        } finally {
            setExtracting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Precificação</h1>
                    <Button
                        onClick={() => setShowAnalises(true)}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                        <BarChart3 className="w-5 h-5 mr-2" />
                        Análises Inteligentes
                    </Button>
                </div>

                {/* Botões de Captura */}
                {!editing && (
                    <>
                        <div className="grid grid-cols-3 gap-4">
                            <Button
                                onClick={startCamera}
                                className="h-32 flex flex-col gap-2"
                                variant="outline"
                            >
                                <Camera className="w-8 h-8" />
                                <span>Tirar Foto</span>
                            </Button>
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="h-32 flex flex-col gap-2"
                                variant="outline"
                            >
                                <Upload className="w-8 h-8" />
                                <span>Carregar Arquivo</span>
                            </Button>
                            <Button
                                onClick={() => setShowTextDialog(true)}
                                className="h-32 flex flex-col gap-2"
                                variant="outline"
                            >
                                <FileText className="w-8 h-8" />
                                <span>Colar Texto</span>
                            </Button>
                        </div>

                        <Button
                            onClick={() => setShowBulkDialog(true)}
                            className="w-full h-20 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-xl"
                        >
                            <FileText className="w-6 h-6 mr-3" />
                            Colar Dados em Massa
                        </Button>
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf,.xlsx,.xls,.csv"
                            multiple
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        
                        <Card 
                            ref={pasteAreaRef}
                            className="border-2 border-dashed border-blue-300 bg-blue-50/50 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                            onClick={() => {
                                toast({ 
                                    title: "Cole uma imagem aqui", 
                                    description: "Pressione Ctrl+V (ou Cmd+V no Mac) para colar uma imagem do print screen",
                                    duration: 3000
                                });
                            }}
                        >
                            <CardContent className="p-8 flex flex-col items-center gap-3">
                                <Upload className="w-12 h-12 text-blue-500" />
                                <div className="text-center">
                                    <p className="font-semibold text-blue-700">Cole uma Imagem Aqui</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Pressione <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Ctrl+V</kbd> para colar do print screen
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Câmera */}
                {showCamera && (
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full rounded-lg"
                            />
                            <div className="flex gap-2">
                                <Button onClick={capturePhoto} className="flex-1">
                                    <Camera className="mr-2" />
                                    Capturar
                                </Button>
                                <Button onClick={stopCamera} variant="outline">
                                    Cancelar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Processando */}
                {extracting && (
                    <Card>
                        <CardContent className="p-8 flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                            <p className="text-lg font-semibold">Extraindo informações...</p>
                        </CardContent>
                    </Card>
                )}

                {/* Formulário de Edição */}
                {editing && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados Extraídos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {capturedImage && (
                                <div className="mb-4">
                                    <img src={capturedImage} alt="Documento" className="w-full rounded-lg" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Remetente</Label>
                                    <Input
                                        value={formData.remetente}
                                        onChange={(e) => setFormData(prev => ({ ...prev, remetente: e.target.value }))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Destinatário</Label>
                                    <Input
                                        value={formData.destinatario}
                                        onChange={(e) => setFormData(prev => ({ ...prev, destinatario: e.target.value }))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Transportadora</Label>
                                    <Input
                                        value={formData.transportadora}
                                        onChange={(e) => setFormData(prev => ({ ...prev, transportadora: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>No. Documento</Label>
                                    <Input
                                        value={formData.numero_documento}
                                        onChange={(e) => setFormData(prev => ({ ...prev, numero_documento: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Data Emissão</Label>
                                    <Input
                                        value={formData.data_emissao}
                                        onChange={(e) => setFormData(prev => ({ ...prev, data_emissao: e.target.value }))}
                                        placeholder="DD/MM/YYYY"
                                    />
                                </div>
                                <div>
                                    <Label>Volume</Label>
                                    <Input
                                        value={formData.volume}
                                        onChange={(e) => setFormData(prev => ({ ...prev, volume: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Peso (KG)</Label>
                                    <Input
                                        value={formData.peso}
                                        onChange={(e) => setFormData(prev => ({ ...prev, peso: e.target.value }))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Valor da Nota (R$)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.valor_nota}
                                        onChange={(e) => setFormData(prev => ({ ...prev, valor_nota: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-semibold mb-3">Valores de Frete</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Frete Peso/Vol</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.frete_peso}
                                            onChange={(e) => setFormData(prev => ({ ...prev, frete_peso: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label>Sec/Cat (0,5% do valor)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.sec_cat}
                                            onChange={(e) => setFormData(prev => ({ ...prev, sec_cat: e.target.value }))}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                    <div>
                                        <Label>Despacho</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.despacho}
                                            onChange={(e) => setFormData(prev => ({ ...prev, despacho: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label>Pedágio</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.pedagio}
                                            onChange={(e) => setFormData(prev => ({ ...prev, pedagio: e.target.value }))}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                    <div>
                                        <Label>Outros</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.outros}
                                            onChange={(e) => setFormData(prev => ({ ...prev, outros: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label>Total Prestação</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.total_prestacao}
                                            onChange={(e) => setFormData(prev => ({ ...prev, total_prestacao: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-semibold mb-3">Cálculo de Porcentagem</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Valor do Serviço (R$)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.valor_servico}
                                            onChange={(e) => setFormData(prev => ({ ...prev, valor_servico: e.target.value }))}
                                            onBlur={calculatePercentage}
                                        />
                                    </div>
                                    <div>
                                        <Label>Porcentagem (%)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.porcentagem}
                                            readOnly
                                            className="bg-gray-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label>Observações</Label>
                                <Textarea
                                    value={formData.observacoes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                                    rows={3}
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t">
                                <Checkbox
                                    id="confirmado"
                                    checked={formData.confirmado}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, confirmado: checked }))}
                                />
                                <Label htmlFor="confirmado" className="cursor-pointer">
                                    Confirmar dados
                                </Label>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={handleSave} className="flex-1">
                                    <Check className="mr-2" />
                                    Salvar
                                </Button>
                                <Button onClick={resetForm} variant="outline">
                                    Cancelar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Lista de Precificações Salvas */}
                {precificacoes.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Precificações Salvas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 space-y-3">
                                <Input
                                    placeholder="Buscar por remetente, destinatário ou transportadora..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full"
                                />
                                <div className="flex gap-2 items-center">
                                    <Label className="text-sm">Data:</Label>
                                    <Input
                                        type="date"
                                        value={dateFilter.start}
                                        onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                                        className="flex-1"
                                        placeholder="De"
                                    />
                                    <span className="text-gray-500">até</span>
                                    <Input
                                        type="date"
                                        value={dateFilter.end}
                                        onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                                        className="flex-1"
                                        placeholder="Até"
                                    />
                                    {(dateFilter.start || dateFilter.end) && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setDateFilter({ start: "", end: "" })}
                                        >
                                            Limpar
                                        </Button>
                                    )}
                                </div>
                                </div>

                                {/* Estatísticas dos Dados Filtrados */}
                                {(() => {
                                const filtrados = precificacoes.filter(prec => {
                                   if (searchTerm) {
                                       const termo = searchTerm.toLowerCase();
                                       const matchText = 
                                           prec.remetente?.toLowerCase().includes(termo) ||
                                           prec.destinatario?.toLowerCase().includes(termo) ||
                                           prec.transportadora?.toLowerCase().includes(termo) ||
                                           prec.numero_documento?.toLowerCase().includes(termo);
                                       if (!matchText) return false;
                                   }

                                   if (dateFilter.start || dateFilter.end) {
                                       const precData = prec.data_emissao;
                                       if (!precData) return true;
                                       const [dia, mes, ano] = precData.split('/');
                                       const dataFormatada = ano && mes && dia ? `${ano}-${mes}-${dia}` : precData;
                                       if (dateFilter.start && dataFormatada < dateFilter.start) return false;
                                       if (dateFilter.end && dataFormatada > dateFilter.end) return false;
                                   }

                                   return true;
                                });

                                const totalVolume = filtrados.reduce((acc, p) => {
                                   const vol = parseInt(p.volume?.match(/\d+/)?.[0]) || 0;
                                   return acc + vol;
                                }, 0);

                                const totalPeso = filtrados.reduce((acc, p) => {
                                   const peso = parseFloat(p.peso?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                                   return acc + peso;
                                }, 0);

                                const totalValorNotas = filtrados.reduce((acc, p) => acc + (parseFloat(p.valor_nota) || 0), 0);
                                const totalValorServicos = filtrados.reduce((acc, p) => acc + (parseFloat(p.valor_servico) || 0), 0);
                                const mediaPorcentagem = filtrados.length > 0 
                                   ? filtrados.reduce((acc, p) => acc + (parseFloat(p.porcentagem) || 0), 0) / filtrados.length 
                                   : 0;

                                if (filtrados.length === 0) return null;

                                return (
                                   <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                       <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                           📊 Estatísticas dos Registros Filtrados ({filtrados.length} registros)
                                       </h3>
                                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                           <div className="bg-white p-3 rounded-lg border border-blue-100">
                                               <p className="text-xs text-gray-500 mb-1">Volume Total</p>
                                               <p className="text-lg font-bold text-blue-600">{totalVolume}</p>
                                           </div>
                                           <div className="bg-white p-3 rounded-lg border border-blue-100">
                                               <p className="text-xs text-gray-500 mb-1">Peso Total (KG)</p>
                                               <p className="text-lg font-bold text-blue-600">{totalPeso.toFixed(2)}</p>
                                           </div>
                                           <div className="bg-white p-3 rounded-lg border border-green-100">
                                               <p className="text-xs text-gray-500 mb-1">Valor Notas</p>
                                               <p className="text-lg font-bold text-green-600">R$ {totalValorNotas.toFixed(2)}</p>
                                           </div>
                                           <div className="bg-white p-3 rounded-lg border border-purple-100">
                                               <p className="text-xs text-gray-500 mb-1">Valor Serviços</p>
                                               <p className="text-lg font-bold text-purple-600">R$ {totalValorServicos.toFixed(2)}</p>
                                           </div>
                                           <div className="bg-white p-3 rounded-lg border border-orange-100">
                                               <p className="text-xs text-gray-500 mb-1">% Média</p>
                                               <p className="text-lg font-bold text-orange-600">{mediaPorcentagem.toFixed(2)}%</p>
                                           </div>
                                           <div className="bg-white p-3 rounded-lg border border-indigo-100">
                                               <p className="text-xs text-gray-500 mb-1">Média Serviço</p>
                                               <p className="text-lg font-bold text-indigo-600">R$ {(totalValorServicos / filtrados.length).toFixed(2)}</p>
                                           </div>
                                       </div>
                                   </div>
                                );
                                })()}

                                <div className="space-y-4">
                                {precificacoes.filter(prec => {
                                    // Filtro de texto
                                    if (searchTerm) {
                                        const termo = searchTerm.toLowerCase();
                                        const matchText = 
                                            prec.remetente?.toLowerCase().includes(termo) ||
                                            prec.destinatario?.toLowerCase().includes(termo) ||
                                            prec.transportadora?.toLowerCase().includes(termo) ||
                                            prec.numero_documento?.toLowerCase().includes(termo);
                                        if (!matchText) return false;
                                    }
                                    
                                    // Filtro de data (por data de emissão)
                                    if (dateFilter.start || dateFilter.end) {
                                        const precData = prec.data_emissao;
                                        if (!precData) return true; // Se não tem data de emissão, não filtra
                                        // Converter DD/MM/YYYY para YYYY-MM-DD para comparação
                                        const [dia, mes, ano] = precData.split('/');
                                        const dataFormatada = ano && mes && dia ? `${ano}-${mes}-${dia}` : precData;
                                        if (dateFilter.start && dataFormatada < dateFilter.start) return false;
                                        if (dateFilter.end && dataFormatada > dateFilter.end) return false;
                                    }
                                    
                                    return true;
                                }).map((prec) => (
                                    <div key={prec.id} className={`border rounded-lg p-4 space-y-2 ${prec.confirmado ? 'bg-gray-200 border-gray-300' : 'bg-white'}`}>
                                        <div className="flex justify-between items-start">
                                           <div className="flex-1">
                                                {/* Linha 1: Remetente / Destinatário (4 primeiras palavras) */}
                                                <p className="font-semibold text-lg">
                                                    {prec.remetente?.split(' ').slice(0, 4).join(' ')} / {prec.destinatario?.split(' ').slice(0, 4).join(' ')}
                                                </p>

                                                {/* Transportadora em cinza (4 primeiras palavras) */}
                                                {prec.transportadora && (
                                                    <p className="text-sm text-gray-500">
                                                        {prec.transportadora?.split(' ').slice(0, 4).join(' ')}
                                                    </p>
                                                )}

                                                {/* Linha 2: Volume, Peso e Valor da Nota */}
                                               <p className="text-sm text-gray-600">
                                                   {prec.volume} - {prec.peso} - R$ {Number(prec.valor_nota || 0).toFixed(2)}
                                               </p>

                                               {/* Linha 3: Valores separados por + e = no final */}
                                               <p className="text-sm text-gray-600 mt-1">
                                                   {[
                                                       prec.frete_peso > 0 ? `R$ ${Number(prec.frete_peso).toFixed(2)}` : null,
                                                       prec.sec_cat > 0 ? `R$ ${Number(prec.sec_cat).toFixed(2)}` : null,
                                                       prec.despacho > 0 ? `R$ ${Number(prec.despacho).toFixed(2)}` : null,
                                                       prec.pedagio > 0 ? `R$ ${Number(prec.pedagio).toFixed(2)}` : null,
                                                       prec.outros > 0 ? `R$ ${Number(prec.outros).toFixed(2)}` : null
                                                   ].filter(Boolean).join(' + ')} = 
                                               </p>

                                               {/* Linha 4: Valor Total e Porcentagem em Azul */}
                                               <p className="text-sm font-semibold text-blue-600">
                                                   R$ {Number(prec.valor_servico || 0).toFixed(2)} ({Number(prec.porcentagem || 0).toFixed(2)}%)
                                               </p>

                                               {/* Linha 5: Nº e Data de Emissão */}
                                               <p className="text-xs text-gray-500 mt-1">
                                                   {prec.numero_documento && `Nº ${prec.numero_documento}`}
                                                   {prec.numero_documento && prec.data_emissao && ' - '}
                                                   {prec.data_emissao && `Emissão: ${prec.data_emissao}`}
                                               </p>

                                               {prec.confirmado && (
                                                   <span className="inline-flex items-center gap-1 text-green-600 text-sm mt-1">
                                                       <Check className="w-4 h-4" />
                                                       Confirmado
                                                   </span>
                                               )}
                                           </div>
                                           <div className="flex gap-2">
                                               {!prec.confirmado && (
                                                   <Button
                                                       size="icon"
                                                       variant="outline"
                                                       onClick={() => handleConfirm(prec)}
                                                       className="text-green-600 hover:text-green-700"
                                                   >
                                                       <Check className="w-4 h-4" />
                                                   </Button>
                                               )}
                                               {prec.foto_url && (
                                                   <Button
                                                       size="icon"
                                                       variant="outline"
                                                       onClick={() => handleDownload(prec)}
                                                       className="text-blue-600 hover:text-blue-700"
                                                   >
                                                       <Download className="w-4 h-4" />
                                                   </Button>
                                               )}
                                               <Button
                                                   size="icon"
                                                   variant="outline"
                                                   onClick={() => {
                                                       setFormData(prec);
                                                       setEditing(true);
                                                       setCapturedImage(prec.foto_url);
                                                   }}
                                               >
                                                   <Edit2 className="w-4 h-4" />
                                               </Button>
                                               <Button
                                                   size="icon"
                                                   variant="outline"
                                                   onClick={() => deleteMutation.mutate(prec.id)}
                                               >
                                                   <Trash2 className="w-4 h-4" />
                                               </Button>
                                           </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Dialog para Colar Dados em Massa */}
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Colar Dados em Massa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Cole aqui múltiplos documentos separados por linhas em branco ou por "---". 
                            O sistema irá processar automaticamente e criar vários registros.
                        </p>
                        <Textarea
                            placeholder="Cole aqui vários CTes, NFes ou Romaneios separados..."
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            rows={16}
                            className="font-mono text-xs"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={async () => {
                                    if (!bulkText.trim()) return;
                                    
                                    setProcessingBulk(true);
                                    setShowBulkDialog(false);
                                    
                                    try {
                                        // Separar os documentos por linhas em branco ou ---
                                        const documentos = bulkText.split(/\n\s*\n|---/).filter(doc => doc.trim());
                                        
                                        for (const documento of documentos) {
                                            // Processar cada documento
                                            const result = await base44.integrations.Core.InvokeLLM({
                                                prompt: `Extraia os dados deste documento de transporte. Se não encontrar algum campo, retorne 0 ou string vazia:

${documento}`,
                                                response_json_schema: {
                                                    type: "object",
                                                    properties: {
                                                        remetente: { type: "string" },
                                                        destinatario: { type: "string" },
                                                        transportadora: { type: "string" },
                                                        numero_documento: { type: "string" },
                                                        data_emissao: { type: "string" },
                                                        volume: { type: "string" },
                                                        peso: { type: "string" },
                                                        valor_nota: { type: "number" },
                                                        frete_peso: { type: "number" },
                                                        sec_cat: { type: "number" },
                                                        despacho: { type: "number" },
                                                        pedagio: { type: "number" },
                                                        outros: { type: "number" },
                                                        total_prestacao: { type: "number" }
                                                    }
                                                }
                                            });

                                            await processAndSaveRecord(result);
                                        }

                                        toast({ title: `${documentos.length} registros processados com sucesso!`, duration: 3000 });
                                        setBulkText("");
                                    } catch (error) {
                                        toast({ title: "Erro ao processar dados", description: error.message, variant: "destructive", duration: 3000 });
                                    } finally {
                                        setProcessingBulk(false);
                                    }
                                }}
                                disabled={!bulkText.trim() || processingBulk}
                                className="flex-1"
                            >
                                {processingBulk ? (
                                    <>
                                        <Loader2 className="mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="mr-2" />
                                        Processar Dados em Massa
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowBulkDialog(false);
                                    setBulkText("");
                                }}
                                variant="outline"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog para Colar Texto */}
            <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Colar Texto do Documento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Cole aqui o texto do CTe, NFe ou Romaneio..."
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            rows={12}
                            className="font-mono text-sm"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={() => processText(pastedText)}
                                disabled={!pastedText.trim()}
                                className="flex-1"
                            >
                                <FileText className="mr-2" />
                                Processar Texto
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowTextDialog(false);
                                    setPastedText("");
                                }}
                                variant="outline"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Análises Inteligentes */}
            <Dialog open={showAnalises} onOpenChange={setShowAnalises}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-purple-600" />
                            Análises Inteligentes de Precificação
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                        {(() => {
                            const filtrados = precificacoes.filter(prec => {
                                if (searchTerm) {
                                    const termo = searchTerm.toLowerCase();
                                    const matchText = 
                                        prec.remetente?.toLowerCase().includes(termo) ||
                                        prec.destinatario?.toLowerCase().includes(termo) ||
                                        prec.transportadora?.toLowerCase().includes(termo) ||
                                        prec.numero_documento?.toLowerCase().includes(termo);
                                    if (!matchText) return false;
                                }
                                if (dateFilter.start || dateFilter.end) {
                                    const precData = prec.data_emissao;
                                    if (!precData) return true;
                                    const [dia, mes, ano] = precData.split('/');
                                    const dataFormatada = ano && mes && dia ? `${ano}-${mes}-${dia}` : precData;
                                    if (dateFilter.start && dataFormatada < dateFilter.start) return false;
                                    if (dateFilter.end && dataFormatada > dateFilter.end) return false;
                                }
                                return true;
                            });

                            if (filtrados.length === 0) {
                                return <p className="text-center text-slate-500 py-8">Nenhum registro para analisar</p>;
                            }

                            // Calcular média de porcentagem
                            const mediaPercentual = filtrados.reduce((acc, p) => acc + (parseFloat(p.porcentagem) || 0), 0) / filtrados.length;

                            // Análise por Peso
                            const porPeso = filtrados.map(p => {
                                const peso = parseFloat(p.peso?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                                return { ...p, pesoNum: peso };
                            }).filter(p => p.pesoNum > 0).sort((a, b) => a.pesoNum - b.pesoNum);

                            const pesoMenor = porPeso[0];
                            const pesoMaior = porPeso[porPeso.length - 1];
                            const mediaPorPeso = porPeso.length > 0 
                                ? porPeso.reduce((acc, p) => acc + (parseFloat(p.porcentagem) || 0), 0) / porPeso.length 
                                : 0;

                            // Análise por Valor da Nota
                            const porValor = filtrados.filter(p => p.valor_nota > 0).sort((a, b) => a.valor_nota - b.valor_nota);
                            const valorMenor = porValor[0];
                            const valorMaior = porValor[porValor.length - 1];

                            // Análise por Transportadora
                            const porTransportadora = {};
                            filtrados.forEach(p => {
                                const t = p.transportadora || "Sem Transportadora";
                                if (!porTransportadora[t]) {
                                    porTransportadora[t] = { count: 0, totalPerc: 0, servicos: [] };
                                }
                                porTransportadora[t].count++;
                                porTransportadora[t].totalPerc += parseFloat(p.porcentagem) || 0;
                                porTransportadora[t].servicos.push(parseFloat(p.valor_servico) || 0);
                            });

                            return (
                                <>
                                    {/* Tabela Detalhada */}
                                    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                                <tr>
                                                    <th className="px-3 py-3 text-left whitespace-nowrap">Data Emissão</th>
                                                    <th className="px-3 py-3 text-center whitespace-nowrap">Volumes</th>
                                                    <th className="px-3 py-3 text-center whitespace-nowrap">Peso</th>
                                                    <th className="px-3 py-3 text-right whitespace-nowrap">Valor Nota</th>
                                                    <th className="px-3 py-3 text-right whitespace-nowrap">Valor Tabela</th>
                                                    <th className="px-3 py-3 text-right whitespace-nowrap">Coleta</th>
                                                    <th className="px-3 py-3 text-right whitespace-nowrap">Pedágio</th>
                                                    <th className="px-3 py-3 text-right whitespace-nowrap">Seguro</th>
                                                    <th className="px-3 py-3 text-right whitespace-nowrap">Valor Serviço</th>
                                                    <th className="px-3 py-3 text-right whitespace-nowrap">%</th>
                                                    <th className="px-3 py-3 text-right whitespace-nowrap">Média %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtrados.map((prec, index) => (
                                                    <tr key={prec.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                                        <td className="px-3 py-2 whitespace-nowrap">{prec.data_emissao || '-'}</td>
                                                        <td className="px-3 py-2 text-center">{prec.volume || '-'}</td>
                                                        <td className="px-3 py-2 text-center">{prec.peso || '-'}</td>
                                                        <td className="px-3 py-2 text-right font-medium text-blue-600">
                                                            R$ {Number(prec.valor_nota || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            R$ {Number(prec.frete_peso || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            R$ {Number(prec.despacho || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            R$ {Number(prec.pedagio || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            R$ {Number(prec.sec_cat || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-semibold text-green-600">
                                                            R$ {Number(prec.valor_servico || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-semibold text-orange-600">
                                                            {Number(prec.porcentagem || 0).toFixed(2)}%
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-semibold text-purple-600">
                                                            {mediaPercentual.toFixed(2)}%
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gradient-to-r from-indigo-100 to-purple-100 font-bold">
                                                <tr>
                                                    <td className="px-3 py-3 text-left">TOTAIS</td>
                                                    <td className="px-3 py-3 text-center">
                                                        {filtrados.reduce((acc, p) => acc + (parseInt(p.volume?.match(/\d+/)?.[0]) || 0), 0)}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {filtrados.reduce((acc, p) => acc + (parseFloat(p.peso?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0), 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-blue-700">
                                                        R$ {filtrados.reduce((acc, p) => acc + (parseFloat(p.valor_nota) || 0), 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right">
                                                        R$ {filtrados.reduce((acc, p) => acc + (parseFloat(p.frete_peso) || 0), 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right">
                                                        R$ {filtrados.reduce((acc, p) => acc + (parseFloat(p.despacho) || 0), 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right">
                                                        R$ {filtrados.reduce((acc, p) => acc + (parseFloat(p.pedagio) || 0), 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right">
                                                        R$ {filtrados.reduce((acc, p) => acc + (parseFloat(p.sec_cat) || 0), 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-green-700">
                                                        R$ {filtrados.reduce((acc, p) => acc + (parseFloat(p.valor_servico) || 0), 0).toFixed(2)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-orange-700">-</td>
                                                    <td className="px-3 py-3 text-right text-purple-700">
                                                        {mediaPercentual.toFixed(2)}%
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Análise Geral */}
                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                                        <h3 className="font-semibold text-purple-900 mb-3">📊 Visão Geral</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-white p-3 rounded-lg">
                                                <p className="text-xs text-gray-500">Total Registros</p>
                                                <p className="text-2xl font-bold text-purple-600">{filtrados.length}</p>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg">
                                                <p className="text-xs text-gray-500">% Médio Geral</p>
                                                <p className="text-2xl font-bold text-indigo-600">
                                                    {(filtrados.reduce((acc, p) => acc + (parseFloat(p.porcentagem) || 0), 0) / filtrados.length).toFixed(2)}%
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg">
                                                <p className="text-xs text-gray-500">Serviço Médio</p>
                                                <p className="text-lg font-bold text-green-600">
                                                    R$ {(filtrados.reduce((acc, p) => acc + (parseFloat(p.valor_servico) || 0), 0) / filtrados.length).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg">
                                                <p className="text-xs text-gray-500">Valor Médio Nota</p>
                                                <p className="text-lg font-bold text-blue-600">
                                                    R$ {(filtrados.reduce((acc, p) => acc + (parseFloat(p.valor_nota) || 0), 0) / filtrados.length).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Análise por Peso */}
                                    {porPeso.length > 1 && (
                                        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                                            <h3 className="font-semibold text-blue-900 mb-3">⚖️ Análise por Peso</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-4 rounded-lg border border-blue-100">
                                                    <p className="text-sm text-blue-700 font-semibold mb-2">Carga mais LEVE</p>
                                                    <p className="text-xs text-gray-500">Peso: <span className="font-bold">{pesoMenor.peso}</span></p>
                                                    <p className="text-xs text-gray-500">Serviço: <span className="font-bold text-green-600">R$ {Number(pesoMenor.valor_servico).toFixed(2)}</span></p>
                                                    <p className="text-xs text-gray-500">%: <span className="font-bold text-orange-600">{Number(pesoMenor.porcentagem).toFixed(2)}%</span></p>
                                                </div>
                                                <div className="bg-white p-4 rounded-lg border border-blue-100">
                                                    <p className="text-sm text-blue-700 font-semibold mb-2">Carga mais PESADA</p>
                                                    <p className="text-xs text-gray-500">Peso: <span className="font-bold">{pesoMaior.peso}</span></p>
                                                    <p className="text-xs text-gray-500">Serviço: <span className="font-bold text-green-600">R$ {Number(pesoMaior.valor_servico).toFixed(2)}</span></p>
                                                    <p className="text-xs text-gray-500">%: <span className="font-bold text-orange-600">{Number(pesoMaior.porcentagem).toFixed(2)}%</span></p>
                                                </div>
                                            </div>
                                            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                                                <p className="text-sm text-blue-900">
                                                    💡 <strong>Insight:</strong> O peso médio é <strong>{(porPeso.reduce((acc, p) => acc + p.pesoNum, 0) / porPeso.length).toFixed(2)} KG</strong> com percentual médio de <strong>{mediaPorPeso.toFixed(2)}%</strong>
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Análise por Valor da Nota */}
                                    {porValor.length > 1 && (
                                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                            <h3 className="font-semibold text-green-900 mb-3">💰 Análise por Valor da Nota</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-4 rounded-lg border border-green-100">
                                                    <p className="text-sm text-green-700 font-semibold mb-2">Nota de MENOR Valor</p>
                                                    <p className="text-xs text-gray-500">Valor: <span className="font-bold text-blue-600">R$ {Number(valorMenor.valor_nota).toFixed(2)}</span></p>
                                                    <p className="text-xs text-gray-500">Serviço: <span className="font-bold text-green-600">R$ {Number(valorMenor.valor_servico).toFixed(2)}</span></p>
                                                    <p className="text-xs text-gray-500">%: <span className="font-bold text-orange-600">{Number(valorMenor.porcentagem).toFixed(2)}%</span></p>
                                                </div>
                                                <div className="bg-white p-4 rounded-lg border border-green-100">
                                                    <p className="text-sm text-green-700 font-semibold mb-2">Nota de MAIOR Valor</p>
                                                    <p className="text-xs text-gray-500">Valor: <span className="font-bold text-blue-600">R$ {Number(valorMaior.valor_nota).toFixed(2)}</span></p>
                                                    <p className="text-xs text-gray-500">Serviço: <span className="font-bold text-green-600">R$ {Number(valorMaior.valor_servico).toFixed(2)}</span></p>
                                                    <p className="text-xs text-gray-500">%: <span className="font-bold text-orange-600">{Number(valorMaior.porcentagem).toFixed(2)}%</span></p>
                                                </div>
                                            </div>
                                            <div className="mt-3 p-3 bg-green-100 rounded-lg">
                                                <p className="text-sm text-green-900">
                                                    💡 <strong>Insight:</strong> Notas de maior valor tendem a ter percentual {valorMaior.porcentagem > valorMenor.porcentagem ? 'MAIOR' : 'MENOR'} ({Number(valorMaior.porcentagem).toFixed(2)}% vs {Number(valorMenor.porcentagem).toFixed(2)}%)
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Análise por Transportadora */}
                                    {Object.keys(porTransportadora).length > 0 && (
                                        <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                                            <h3 className="font-semibold text-orange-900 mb-3">🚛 Análise por Transportadora</h3>
                                            <div className="space-y-2">
                                                {Object.entries(porTransportadora)
                                                    .sort((a, b) => b[1].count - a[1].count)
                                                    .map(([transp, dados]) => {
                                                        const mediaPerc = dados.totalPerc / dados.count;
                                                        const mediaServico = dados.servicos.reduce((a, b) => a + b, 0) / dados.servicos.length;
                                                        return (
                                                            <div key={transp} className="bg-white p-3 rounded-lg border border-orange-100">
                                                                <div className="flex justify-between items-center">
                                                                    <div>
                                                                        <p className="font-semibold text-orange-800">{transp}</p>
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            {dados.count} serviço{dados.count > 1 ? 's' : ''} • 
                                                                            % Médio: <span className="font-bold text-orange-600">{mediaPerc.toFixed(2)}%</span> • 
                                                                            Valor Médio: <span className="font-bold text-green-600">R$ {mediaServico.toFixed(2)}</span>
                                                                        </p>
                                                                    </div>
                                                                    <Badge className="bg-orange-100 text-orange-700 text-lg px-3 py-1">
                                                                        {dados.count}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Comparativo de Percentuais */}
                                    <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-200">
                                        <h3 className="font-semibold text-pink-900 mb-3">📈 Distribuição de Percentuais</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-white p-3 rounded-lg text-center">
                                                <p className="text-xs text-gray-500">% Mínimo</p>
                                                <p className="text-xl font-bold text-green-600">
                                                    {Math.min(...filtrados.map(p => parseFloat(p.porcentagem) || 0)).toFixed(2)}%
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg text-center">
                                                <p className="text-xs text-gray-500">% Médio</p>
                                                <p className="text-xl font-bold text-blue-600">
                                                    {(filtrados.reduce((acc, p) => acc + (parseFloat(p.porcentagem) || 0), 0) / filtrados.length).toFixed(2)}%
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg text-center">
                                                <p className="text-xs text-gray-500">% Máximo</p>
                                                <p className="text-xl font-bold text-red-600">
                                                    {Math.max(...filtrados.map(p => parseFloat(p.porcentagem) || 0)).toFixed(2)}%
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 p-3 bg-pink-100 rounded-lg">
                                            <p className="text-sm text-pink-900">
                                                💡 <strong>Conclusão:</strong> Os percentuais variam entre {Math.min(...filtrados.map(p => parseFloat(p.porcentagem) || 0)).toFixed(2)}% e {Math.max(...filtrados.map(p => parseFloat(p.porcentagem) || 0)).toFixed(2)}%, com média de {(filtrados.reduce((acc, p) => acc + (parseFloat(p.porcentagem) || 0), 0) / filtrados.length).toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Razão das Variações */}
                                    <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-200">
                                        <h3 className="font-semibold text-violet-900 mb-3">🎯 Por que alguns serviços cobram mais?</h3>
                                        <div className="space-y-2 text-sm text-violet-900">
                                            <p>• <strong>Peso:</strong> Cargas mais pesadas podem ter percentual {pesoMaior && pesoMenor && pesoMaior.porcentagem > pesoMenor.porcentagem ? 'MAIOR' : 'MENOR'} devido ao custo de transporte</p>
                                            <p>• <strong>Valor da Nota:</strong> Notas de alto valor ({valorMaior && `R$ ${Number(valorMaior.valor_nota).toFixed(2)}`}) têm % de {valorMaior && Number(valorMaior.porcentagem).toFixed(2)}% vs notas menores ({valorMenor && `R$ ${Number(valorMenor.valor_nota).toFixed(2)}`}) com {valorMenor && Number(valorMenor.porcentagem).toFixed(2)}%</p>
                                            <p>• <strong>Transportadora:</strong> Cada transportadora tem sua própria tabela de preços e percentuais médios</p>
                                            <p>• <strong>Componentes:</strong> Pedágio, Sec/Cat e Despacho variam conforme peso e valor, impactando o % final</p>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}