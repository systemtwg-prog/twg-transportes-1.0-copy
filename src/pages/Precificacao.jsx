import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Upload, Loader2, Edit2, Check, Trash2, Search } from "lucide-react";
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
            toast({ title: "Erro ao acessar câmera", variant: "destructive" });
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
        const file = event.target.files[0];
        if (file) {
            setCapturedImage(URL.createObjectURL(file));
            await processImage(file);
        }
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

            // Calcular Sec/Cat se estiver em branco (0,5% do valor da nota)
            let secCat = parseFloat(result.sec_cat) || 0;
            if (secCat === 0 && valorNota > 0) {
                secCat = parseFloat((valorNota * 0.005).toFixed(2));
            }

            // Calcular Pedágio se estiver em branco ((peso/100) * 1.40 / 100)
            let pedagio = parseFloat(result.pedagio) || 0;
            if (pedagio === 0) {
                const pesoNumerico = parseFloat(result.peso?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                if (pesoNumerico > 0) {
                    pedagio = parseFloat(((pesoNumerico / 100) * 1.40 / 100).toFixed(2));
                }
            }

            setFormData(prev => ({
                ...prev,
                ...result,
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
                variant: "destructive" 
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

        setFormData(prev => ({
            ...prev,
            valor_servico: valorServicoCalculado,
            porcentagem: parseFloat(porcentagemCalculada)
        }));
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Precificação</h1>
                </div>

                {/* Botões de Captura */}
                {!editing && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
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
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>
                        
                        <Card 
                            ref={pasteAreaRef}
                            className="border-2 border-dashed border-blue-300 bg-blue-50/50 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                            onClick={() => {
                                toast({ 
                                    title: "Cole uma imagem aqui", 
                                    description: "Pressione Ctrl+V (ou Cmd+V no Mac) para colar uma imagem do print screen"
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
                                        onChange={(e) => {
                                            const peso = e.target.value;
                                            setFormData(prev => {
                                                const newData = { ...prev, peso };
                                                // Recalcular Pedágio se estiver em 0
                                                if ((parseFloat(prev.pedagio) || 0) === 0) {
                                                    const pesoNumerico = parseFloat(peso.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                                                    if (pesoNumerico > 0) {
                                                        newData.pedagio = ((pesoNumerico / 100) * 1.40 / 100).toFixed(2);
                                                    }
                                                }
                                                return newData;
                                            });
                                        }}
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
                                            placeholder="Auto-calculado"
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
                                        <Label>Pedágio (baseado no peso)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.pedagio}
                                            onChange={(e) => setFormData(prev => ({ ...prev, pedagio: e.target.value }))}
                                            placeholder="Auto-calculado"
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
                            <div className="mb-4">
                                <Input
                                    placeholder="Buscar por data, remetente ou destinatário..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-4">
                                {precificacoes.filter(prec => {
                                    if (!searchTerm) return true;
                                    const termo = searchTerm.toLowerCase();
                                    return (
                                        prec.remetente?.toLowerCase().includes(termo) ||
                                        prec.destinatario?.toLowerCase().includes(termo) ||
                                        prec.transportadora?.toLowerCase().includes(termo) ||
                                        prec.numero_documento?.toLowerCase().includes(termo) ||
                                        prec.data_emissao?.includes(termo) ||
                                        prec.data?.includes(termo)
                                    );
                                }).map((prec) => (
                                    <div key={prec.id} className={`border rounded-lg p-4 space-y-2 ${prec.confirmado ? 'bg-gray-100' : ''}`}>
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
                                                   {prec.volume} - {prec.peso} - R$ {prec.valor_nota?.toFixed(2)}
                                               </p>

                                               {/* Linha 3: Valores separados por + e = no final */}
                                               <p className="text-sm text-gray-600 mt-1">
                                                   {[
                                                       prec.frete_peso > 0 ? prec.frete_peso?.toFixed(2) : null,
                                                       prec.sec_cat > 0 ? prec.sec_cat?.toFixed(2) : null,
                                                       prec.despacho > 0 ? prec.despacho?.toFixed(2) : null,
                                                       prec.pedagio > 0 ? prec.pedagio?.toFixed(2) : null,
                                                       prec.outros > 0 ? prec.outros?.toFixed(2) : null
                                                   ].filter(Boolean).join(' + ')} = 
                                               </p>

                                               {/* Linha 4: Valor Total e Porcentagem em Azul */}
                                               <p className="text-sm font-semibold text-blue-600">
                                                   R$ {prec.valor_servico?.toFixed(2)} ({prec.porcentagem}%)
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
        </div>
    );
}