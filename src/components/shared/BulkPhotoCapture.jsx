import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Check, Trash2, Loader2 } from "lucide-react";
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
                setFotos(prev => [...prev, { blob, url: imageUrl, id: Date.now() }]);
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
            toast.info(`Processando foto ${i + 1} de ${fotos.length}...`);

            try {
                // Upload da foto
                const file = new File([foto.blob], `foto_${foto.id}.jpg`, { type: "image/jpeg" });
                const { file_url } = await base44.integrations.Core.UploadFile({ file });

                // Processar com IA
                const resultado = await base44.integrations.Core.InvokeLLM({
                    prompt: `Analise esta imagem de um comprovante de entrega ou nota fiscal. 
                    Extraia o número da nota fiscal (procure por "NF", "NOTA FISCAL", "NFe", "Número", "Nº" ou sequências numéricas).
                    Retorne os dados encontrados.`,
                    file_urls: [file_url],
                    response_json_schema: {
                        type: "object",
                        properties: {
                            numero_nota: { type: "string", description: "Número da nota fiscal encontrado" },
                            observacoes: { type: "string", description: "Outras informações relevantes" }
                        }
                    }
                });

                resultados.push({
                    url: file_url,
                    numero_nota: resultado?.numero_nota || "",
                    observacoes: resultado?.observacoes || ""
                });

            } catch (error) {
                console.error("Erro ao processar foto:", error);
                resultados.push({
                    url: null,
                    numero_nota: "",
                    observacoes: "Erro ao processar"
                });
            }
        }

        // Limpar URLs
        fotos.forEach(f => URL.revokeObjectURL(f.url));

        setProcessing(false);
        onComplete(resultados);
    };

    const handleClose = () => {
        stopCamera();
        fotos.forEach(f => URL.revokeObjectURL(f.url));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20 h-12 w-12">
                    <X className="w-8 h-8" />
                </Button>
                <span className="text-white text-lg font-bold">
                    Fotos em Massa ({fotos.length})
                </span>
                <Button variant="ghost" size="icon" onClick={switchCamera} className="text-white hover:bg-white/20 h-12 w-12">
                    <RotateCcw className="w-7 h-7" />
                </Button>
            </div>

            {/* Camera View */}
            <div className="flex-1 flex items-center justify-center">
                {processing ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-16 h-16 text-white animate-spin" />
                        <span className="text-white text-xl font-medium">Processando fotos com IA...</span>
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

            {/* Miniaturas das fotos */}
            {fotos.length > 0 && !processing && (
                <div className="absolute top-20 left-0 right-0 px-4">
                    <div className="flex gap-2 overflow-x-auto py-2">
                        {fotos.map((foto, idx) => (
                            <div key={foto.id} className="relative flex-shrink-0">
                                <img src={foto.url} alt={`Foto ${idx + 1}`} className="w-16 h-16 object-cover rounded-lg border-2 border-white" />
                                <button
                                    onClick={() => removePhoto(foto.id)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                                <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center rounded-b-lg">
                                    {idx + 1}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Controls */}
            {!processing && (
                <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
                    {/* Botão de Captura */}
                    <button
                        onClick={capturePhoto}
                        disabled={capturing}
                        className="w-32 h-32 rounded-full bg-white hover:bg-gray-100 shadow-2xl border-8 border-sky-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
                    >
                        {capturing ? (
                            <div className="animate-spin w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full" />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-sky-500" />
                        )}
                    </button>

                    {/* Botão Finalizar */}
                    {fotos.length > 0 && (
                        <Button
                            onClick={handleFinish}
                            className="h-20 px-8 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-2xl text-lg font-bold"
                        >
                            <Check className="w-8 h-8 mr-2" />
                            Salvar ({fotos.length})
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}