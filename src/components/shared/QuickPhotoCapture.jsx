import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check } from "lucide-react";

export default function QuickPhotoCapture({ onCapture, onClose }) {
    const [processing, setProcessing] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");
    const [capturedImage, setCapturedImage] = useState(null);
    const [capturedBlob, setCapturedBlob] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (!capturedImage) {
            startCamera();
        }
        return () => {
            stopCamera();
        };
    }, [facingMode, capturedImage]);

    const startCamera = async () => {
        try {
            // Parar stream anterior se existir
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            streamRef.current = mediaStream;
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Erro ao acessar câmera:", err);
            alert("Não foi possível acessar a câmera. Verifique as permissões.");
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
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Reduzir resolução para upload mais rápido
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Mostrar preview da foto capturada
        canvas.toBlob((blob) => {
            if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                setCapturedImage(imageUrl);
                setCapturedBlob(blob);
                stopCamera();
            }
        }, "image/jpeg", 0.85);
    };

    const retakePhoto = () => {
        if (capturedImage) {
            URL.revokeObjectURL(capturedImage);
        }
        setCapturedImage(null);
        setCapturedBlob(null);
    };

    const confirmPhoto = () => {
        if (!capturedBlob) return;
        
        setProcessing(true);
        const file = new File([capturedBlob], `foto_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
    };

    const handleClose = () => {
        stopCamera();
        if (capturedImage) {
            URL.revokeObjectURL(capturedImage);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
                    <X className="w-6 h-6" />
                </Button>
                <span className="text-white text-sm font-medium">
                    {capturedImage ? "Confirme a foto" : "Toque para capturar"}
                </span>
                {!capturedImage && (
                    <Button variant="ghost" size="icon" onClick={switchCamera} className="text-white hover:bg-white/20">
                        <RotateCcw className="w-6 h-6" />
                    </Button>
                )}
                {capturedImage && <div className="w-10" />}
            </div>

            {/* Camera View ou Preview da Foto */}
            <div className="flex-1 flex items-center justify-center">
                {capturedImage ? (
                    <img 
                        src={capturedImage} 
                        alt="Foto capturada" 
                        className="w-full h-full object-contain"
                    />
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

            {/* Canvas oculto para processamento */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Footer Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center items-center gap-6 bg-gradient-to-t from-black/70 to-transparent">
                {capturedImage ? (
                    <>
                        {/* Botão Tirar Outra */}
                        <Button
                            onClick={retakePhoto}
                            disabled={processing}
                            variant="outline"
                            className="h-16 px-6 rounded-full bg-white/20 border-white text-white hover:bg-white/30"
                        >
                            <RotateCcw className="w-6 h-6 mr-2" />
                            Tirar Outra
                        </Button>
                        
                        {/* Botão Confirmar */}
                        <Button
                            onClick={confirmPhoto}
                            disabled={processing}
                            className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
                        >
                            {processing ? (
                                <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
                            ) : (
                                <Check className="w-10 h-10" />
                            )}
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={capturePhoto}
                        disabled={processing}
                        className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 text-black shadow-lg"
                    >
                        <Camera className="w-10 h-10" />
                    </Button>
                )}
            </div>

            {/* Indicador de processamento */}
            {processing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3">
                        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
                        <span className="text-slate-700 font-medium">Enviando...</span>
                    </div>
                </div>
            )}
        </div>
    );
}