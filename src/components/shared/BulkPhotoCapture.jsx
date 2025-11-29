import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, RotateCcw, Check, Loader2, Camera, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BulkPhotoCapture({ onComplete, onClose }) {
    const [facingMode, setFacingMode] = useState("environment");
    const [fotos, setFotos] = useState([]);
    const [capturing, setCapturing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [facingMode]);

    const startCamera = async () => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            streamRef.current = mediaStream;
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Erro ao acessar câmera:", err);
            alert("Não foi possível acessar a câmera.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === "environment" ? "user" : "environment");
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current || capturing) return;

        setCapturing(true);
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = 800;
        canvas.height = (video.videoHeight / video.videoWidth) * 800;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                const novaFoto = { blob, url: imageUrl, id: Date.now() };
                setFotos(prev => [...prev, novaFoto]);
                toast.success(`Foto ${fotos.length + 1} capturada!`);
            }
            setCapturing(false);
        }, "image/jpeg", 0.7);
    };

    const removePhoto = (id) => {
        setFotos(prev => {
            const foto = prev.find(f => f.id === id);
            if (foto) URL.revokeObjectURL(foto.url);
            return prev.filter(f => f.id !== id);
        });
        toast.info("Foto removida");
    };

    const updateNotaFiscal = (id, valor) => {
        setFotos(prev => prev.map(f => f.id === id ? { ...f, notaFiscal: valor } : f));
    };

    const handleFinish = async () => {
        if (fotos.length === 0) {
            toast.error("Tire pelo menos uma foto");
            return;
        }

        setProcessing(true);
        stopCamera();

        const resultados = [];

        for (let i = 0; i < fotos.length; i++) {
            const foto = fotos[i];
            toast.info(`Enviando foto ${i + 1} de ${fotos.length}...`);

            try {
                const file = new File([foto.blob], `foto_${foto.id}.jpg`, { type: "image/jpeg" });
                const { file_url } = await base44.integrations.Core.UploadFile({ file });

                // Se usuário já informou a NF, usa ela, senão tenta identificar com IA
                let numero_nota = foto.notaFiscal || "";
                let observacoes = "";

                if (!numero_nota) {
                    try {
                        const resultado = await base44.integrations.Core.InvokeLLM({
                            prompt: `Analise esta imagem de um comprovante de entrega ou nota fiscal. 
                            Extraia o número da nota fiscal (procure por "NF", "NOTA FISCAL", "NFe", "Número", "Nº" ou sequências numéricas).`,
                            file_urls: [file_url],
                            response_json_schema: {
                                type: "object",
                                properties: {
                                    numero_nota: { type: "string", description: "Número da nota fiscal encontrado" },
                                    observacoes: { type: "string", description: "Outras informações relevantes" }
                                }
                            }
                        });
                        numero_nota = resultado?.numero_nota || "";
                        observacoes = resultado?.observacoes || "";
                    } catch (err) {
                        console.error("Erro IA:", err);
                    }
                }

                resultados.push({
                    url: file_url,
                    numero_nota: numero_nota || "Pendente",
                    observacoes
                });

            } catch (error) {
                console.error("Erro ao processar foto:", error);
            }
        }

        fotos.forEach(f => URL.revokeObjectURL(f.url));
        setProcessing(false);
        onComplete(resultados);
    };

    const handleClose = () => {
        stopCamera();
        fotos.forEach(f => URL.revokeObjectURL(f.url));
        onClose();
    };

    // Tela da câmera
    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20 h-12 w-12">
                    <X className="w-8 h-8" />
                </Button>
                <div className="text-center">
                    <span className="text-white text-lg font-bold block">Fotos em Massa</span>
                    <span className="text-white/70 text-sm">{fotos.length} foto(s) capturada(s)</span>
                </div>
                <Button variant="ghost" size="icon" onClick={switchCamera} className="text-white hover:bg-white/20 h-12 w-12">
                    <RotateCcw className="w-7 h-7" />
                </Button>
            </div>

            {/* Camera View */}
            <div className={`flex-1 flex items-center justify-center pt-20 ${fotos.length > 0 ? 'pb-80' : 'pb-52'}`}>
                {processing ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-16 h-16 text-white animate-spin" />
                        <span className="text-white text-xl font-medium">Salvando comprovantes...</span>
                        <span className="text-white/70 text-sm">Identificando notas fiscais com IA</span>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Lista de fotos capturadas com campo de NF */}
            {fotos.length > 0 && !processing && (
                <div className="absolute top-20 left-0 right-0 px-3 z-20 max-h-[40%] overflow-y-auto">
                    <div className="bg-black/80 rounded-xl p-3 space-y-2">
                        <p className="text-white text-sm font-bold mb-2">Fotos capturadas ({fotos.length}):</p>
                        {fotos.map((foto, idx) => (
                            <div key={foto.id} className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
                                <img 
                                    src={foto.url} 
                                    alt={`Foto ${idx + 1}`} 
                                    className="w-14 h-14 object-cover rounded-lg border border-white/50 flex-shrink-0" 
                                />
                                <div className="flex-1 min-w-0">
                                    <Input
                                        placeholder={`NF da foto ${idx + 1}`}
                                        value={foto.notaFiscal || ""}
                                        onChange={(e) => updateNotaFiscal(foto.id, e.target.value)}
                                        className="h-10 bg-white text-slate-800 text-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => removePhoto(foto.id)}
                                    className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center flex-shrink-0"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Controls */}
            {!processing && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
                    <div className="flex justify-center items-center gap-4">
                        {/* Botão de Captura */}
                        <button
                            onClick={capturePhoto}
                            disabled={capturing}
                            className="w-24 h-24 rounded-full bg-white hover:bg-gray-100 shadow-2xl border-[6px] border-orange-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
                        >
                            {capturing ? (
                                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
                            ) : (
                                <Camera className="w-12 h-12 text-orange-500" />
                            )}
                        </button>

                        {/* Botão Salvar */}
                        {fotos.length > 0 && (
                            <Button
                                onClick={handleFinish}
                                className="h-20 px-8 rounded-2xl bg-green-500 hover:bg-green-600 text-white shadow-2xl text-lg font-bold"
                            >
                                <Save className="w-7 h-7 mr-2" />
                                Salvar ({fotos.length})
                            </Button>
                        )}
                    </div>
                    
                    <p className="text-center text-white/60 text-sm mt-3">
                        {fotos.length === 0 ? "Tire as fotos dos comprovantes" : "Preencha as NFs e clique em Salvar"}
                    </p>
                </div>
            )}
        </div>
    );
}