import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";

export default function FastPhotoCapture({ onCapture, onClose }) {
    const [processing, setProcessing] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");
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

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current || processing) return;

        setProcessing(true);
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = 800;
        canvas.height = (video.videoHeight / video.videoWidth) * 800;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (blob) {
                const file = new File([blob], `foto_${Date.now()}.jpg`, { type: "image/jpeg" });
                try {
                    await onCapture(file);
                } catch (error) {
                    console.error("Erro:", error);
                }
            }
            setProcessing(false);
        }, "image/jpeg", 0.7);
    };

    const handleClose = () => {
        stopCamera();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20 h-12 w-12">
                    <X className="w-8 h-8" />
                </Button>
                <span className="text-white text-lg font-medium">Capturar Foto</span>
                <Button variant="ghost" size="icon" onClick={switchCamera} className="text-white hover:bg-white/20 h-12 w-12">
                    <RotateCcw className="w-7 h-7" />
                </Button>
            </div>

            {/* Camera View */}
            <div className="flex-1 flex items-center justify-center">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Botão Grande de Captura */}
            <div className="absolute bottom-0 left-0 right-0 p-10 flex justify-center bg-gradient-to-t from-black/80 to-transparent">
                <button
                    onClick={capturePhoto}
                    disabled={processing}
                    className="w-36 h-36 rounded-full bg-white hover:bg-gray-100 shadow-2xl border-8 border-sky-400 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
                >
                    {processing ? (
                        <div className="animate-spin w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full" />
                    ) : (
                        <div className="w-28 h-28 rounded-full bg-sky-500" />
                    )}
                </button>
            </div>
        </div>
    );
}