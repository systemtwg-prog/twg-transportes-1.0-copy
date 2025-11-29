import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, RotateCcw, Check, Camera } from "lucide-react";

export default function FastPhotoCapture({ onCapture, onClose }) {
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
        return () => stopCamera();
    }, [facingMode, capturedImage]);

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
        if (!videoRef.current || !canvasRef.current || processing) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = 800;
        canvas.height = (video.videoHeight / video.videoWidth) * 800;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                setCapturedImage(imageUrl);
                setCapturedBlob(blob);
                stopCamera();
            }
        }, "image/jpeg", 0.7);
    };

    const retakePhoto = () => {
        if (capturedImage) {
            URL.revokeObjectURL(capturedImage);
        }
        setCapturedImage(null);
        setCapturedBlob(null);
    };

    const confirmPhoto = async () => {
        if (!capturedBlob || processing) return;
        
        setProcessing(true);
        const file = new File([capturedBlob], `foto_${Date.now()}.jpg`, { type: "image/jpeg" });
        
        try {
            await onCapture(file);
        } catch (error) {
            console.error("Erro ao processar foto:", error);
            setProcessing(false);
        }
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
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20 h-12 w-12">
                    <X className="w-8 h-8" />
                </Button>
                <span className="text-white text-lg font-medium">
                    {capturedImage ? "Verificar foto" : "Capturar Foto"}
                </span>
                {!capturedImage && (
                    <Button variant="ghost" size="icon" onClick={switchCamera} className="text-white hover:bg-white/20 h-12 w-12">
                        <RotateCcw className="w-7 h-7" />
                    </Button>
                )}
                {capturedImage && <div className="w-12" />}
            </div>

            {/* Camera View ou Preview */}
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

            <canvas ref={canvasRef} className="hidden" />

            {/* Footer Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center items-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
                {capturedImage ? (
                    <>
                        {/* Botão Tirar Outra */}
                        <Button
                            onClick={retakePhoto}
                            disabled={processing}
                            variant="outline"
                            className="h-16 px-6 rounded-full bg-white/20 border-2 border-white text-white hover:bg-white/30 text-lg"
                        >
                            <RotateCcw className="w-6 h-6 mr-2" />
                            Tirar Outra
                        </Button>
                        
                        {/* Botão Confirmar */}
                        <button
                            onClick={confirmPhoto}
                            disabled={processing}
                            className="w-28 h-28 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-2xl border-4 border-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                        >
                            {processing ? (
                                <div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full" />
                            ) : (
                                <Check className="w-14 h-14" />
                            )}
                        </button>
                    </>
                ) : (
                    <button
                        onClick={capturePhoto}
                        disabled={processing}
                        className="w-32 h-32 rounded-full bg-white hover:bg-gray-100 shadow-2xl border-8 border-sky-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
                    >
                        <Camera className="w-16 h-16 text-sky-500" />
                    </button>
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