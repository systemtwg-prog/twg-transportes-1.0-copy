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
        if (!showReview) {
            startCamera();
        }
        return () => stopCamera();
    }, [facingMode, showReview]);

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
        if (previewFoto?.id === id) {
            setPreviewFoto(null);
        }
    };

    const goToReview = () => {
        if (fotos.length === 0) {
            toast.error("Tire pelo menos uma foto");
            return;
        }
        stopCamera();
        setShowReview(true);
    };

    const backToCamera = () => {
        setShowReview(false);
        setPreviewFoto(null);
    };

    const handleFinish = async () => {
        if (fotos.length === 0) {
            toast.error("Nenhuma foto para salvar");
            return;
        }

        setProcessing(true);

        const resultados = [];

        for (let i = 0; i < fotos.length; i++) {
            const foto = fotos[i];
            toast.info(`Processando foto ${i + 1} de ${fotos.length}...`);

            try {
                const file = new File([foto.blob], `foto_${foto.id}.jpg`, { type: "image/jpeg" });
                const { file_url } = await base44.integrations.Core.UploadFile({ file });

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

        fotos.forEach(f => URL.revokeObjectURL(f.url));
        setProcessing(false);
        onComplete(resultados);
    };

    const handleClose = () => {
        stopCamera();
        fotos.forEach(f => URL.revokeObjectURL(f.url));
        onClose();
    };

    // Tela de revisão das fotos
    if (showReview) {
        return (
            <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
                {/* Header */}
                <div className="p-4 flex justify-between items-center bg-slate-800">
                    <Button variant="ghost" onClick={backToCamera} className="text-white hover:bg-white/20">
                        <RotateCcw className="w-5 h-5 mr-2" />
                        Tirar mais fotos
                    </Button>
                    <span className="text-white text-lg font-bold">
                        Revisar {fotos.length} foto(s)
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
                        <X className="w-6 h-6" />
                    </Button>
                </div>

                {processing ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                            <span className="text-slate-700 font-medium text-lg">Processando fotos com IA...</span>
                            <p className="text-sm text-slate-500">Identificando números das notas fiscais</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Preview grande da foto selecionada */}
                        {previewFoto && (
                            <div className="flex-1 p-4 flex items-center justify-center bg-black">
                                <img 
                                    src={previewFoto.url} 
                                    alt="Preview" 
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                />
                            </div>
                        )}

                        {/* Grid de miniaturas */}
                        <div className={`${previewFoto ? 'h-32' : 'flex-1'} bg-slate-800 p-4 overflow-y-auto`}>
                            <div className="grid grid-cols-4 gap-3">
                                {fotos.map((foto, idx) => (
                                    <div 
                                        key={foto.id} 
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 ${previewFoto?.id === foto.id ? 'border-orange-500' : 'border-transparent'}`}
                                    >
                                        <img 
                                            src={foto.url} 
                                            alt={`Foto ${idx + 1}`} 
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => setPreviewFoto(foto)}
                                        />
                                        <button
                                            onClick={() => removePhoto(foto.id)}
                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                        <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                                            {idx + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Botão de salvar */}
                        <div className="p-4 bg-slate-800">
                            <Button
                                onClick={handleFinish}
                                disabled={fotos.length === 0}
                                className="w-full h-16 text-xl bg-green-500 hover:bg-green-600 text-white rounded-xl"
                            >
                                <Check className="w-8 h-8 mr-3" />
                                Salvar {fotos.length} Comprovante(s)
                            </Button>
                        </div>
                    </>
                )}
            </div>
        );
    }

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
            <div className="flex-1 flex items-center justify-center pt-20 pb-52">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Miniaturas das fotos capturadas */}
            {fotos.length > 0 && (
                <div className="absolute top-24 left-0 right-0 px-4 z-20">
                    <div className="bg-black/60 rounded-xl p-3">
                        <p className="text-white text-xs mb-2 font-medium">Fotos capturadas:</p>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                            {fotos.map((foto, idx) => (
                                <div key={foto.id} className="relative flex-shrink-0">
                                    <img 
                                        src={foto.url} 
                                        alt={`Foto ${idx + 1}`} 
                                        className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-lg" 
                                    />
                                    <button
                                        onClick={() => removePhoto(foto.id)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                    <span className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs text-center rounded-b-lg font-bold">
                                        {idx + 1}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
                <div className="flex justify-center items-center gap-6">
                    {/* Botão de Captura Grande */}
                    <button
                        onClick={capturePhoto}
                        disabled={capturing}
                        className="w-28 h-28 rounded-full bg-white hover:bg-gray-100 shadow-2xl border-[6px] border-orange-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
                    >
                        {capturing ? (
                            <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full" />
                        ) : (
                            <Camera className="w-14 h-14 text-orange-500" />
                        )}
                    </button>

                    {/* Botão Revisar e Salvar */}
                    {fotos.length > 0 && (
                        <Button
                            onClick={goToReview}
                            className="h-20 px-6 rounded-2xl bg-green-500 hover:bg-green-600 text-white shadow-2xl text-lg font-bold flex flex-col items-center"
                        >
                            <Eye className="w-7 h-7" />
                            <span className="text-sm">Revisar ({fotos.length})</span>
                        </Button>
                    )}
                </div>
                
                <p className="text-center text-white/60 text-sm mt-4">
                    {fotos.length === 0 ? "Tire as fotos dos comprovantes" : "Clique em Revisar para verificar as fotos"}
                </p>
            </div>
        </div>
    );
}