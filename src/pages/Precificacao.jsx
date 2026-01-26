import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Upload, Loader2, Edit2, Check, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Precificacao() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [capturing, setCapturing] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [editing, setEditing] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        remetente: "",
        destinatario: "",
        volume: "",
        peso: "",
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
            toast({ title: "Precificação salva com sucesso!" });
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Precificacao.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['precificacoes']);
            toast({ title: "Precificação atualizada!" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Precificacao.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['precificacoes']);
            toast({ title: "Precificação excluída!" });
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

    const processImage = async (imageBlob) => {
        setExtracting(true);
        try {
            // Upload da imagem
            const { file_url } = await base44.integrations.Core.UploadFile({ file: imageBlob });
            
            // Extrair dados da imagem usando LLM com visão
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Extraia as seguintes informações deste documento de transporte (CTE/Romaneio):
                
                - Remetente (empresa que envia)
                - Destinatário (empresa que recebe)
                - Volume (quantidade de volumes, ex: "01 VOL")
                - Peso em KG (ex: "520 KG" ou "520,000")
                - Valor da Nota Fiscal (campo VALOR ou similar)
                - Frete Peso/Vol (campo FRETE PESO/VOL)
                - Sec/Cat (campo SEC/CAT)
                - Despacho (campo DESPACHO)
                - Pedágio (campo PEDÁGIO)
                - Outros (campo OUTROS)
                - Total Prestação (campo TOTAL PRESTAÇÃO)
                
                Retorne apenas os valores numéricos sem símbolos de moeda. Para campos não encontrados, retorne 0.
                Para empresas, extraia o nome completo.`,
                file_urls: [file_url],
                response_json_schema: {
                    type: "object",
                    properties: {
                        remetente: { type: "string" },
                        destinatario: { type: "string" },
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

            setFormData(prev => ({
                ...prev,
                ...result,
                foto_url: file_url
            }));

            setEditing(true);
            toast({ title: "Dados extraídos com sucesso!" });
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

    const handleSave = () => {
        createMutation.mutate(formData);
    };

    const resetForm = () => {
        setFormData({
            remetente: "",
            destinatario: "",
            volume: "",
            peso: "",
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">Precificação</h1>
                </div>

                {/* Botões de Captura */}
                {!editing && (
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
                                        <Label>Sec/Cat</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.sec_cat}
                                            onChange={(e) => setFormData(prev => ({ ...prev, sec_cat: e.target.value }))}
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
                            <div className="space-y-4">
                                {precificacoes.map((prec) => (
                                    <div key={prec.id} className="border rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <p className="font-semibold text-lg">
                                                    {prec.remetente} / {prec.destinatario}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {prec.volume} - {prec.peso} - R$ {prec.valor_nota?.toFixed(2)}
                                                </p>
                                                <p className="text-sm font-semibold text-blue-600 mt-1">
                                                    R$ {prec.valor_servico?.toFixed(2)} ({prec.porcentagem}%)
                                                </p>
                                                {prec.confirmado && (
                                                    <span className="inline-flex items-center gap-1 text-green-600 text-sm mt-1">
                                                        <Check className="w-4 h-4" />
                                                        Confirmado
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
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