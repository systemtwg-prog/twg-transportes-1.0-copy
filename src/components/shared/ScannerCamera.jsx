import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check, ScanLine, ZoomIn, ZoomOut, FlipHorizontal } from "lucide-react";

export default function ScannerCamera({ onCapture, onClose }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [facingMode, setFacingMode] = useState("environment");
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [facingMode]);

    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Erro ao acessar câmera:", err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Aplicar zoom
        const zoomFactor = zoom;
        const zoomWidth = video.videoWidth / zoomFactor;
        const zoomHeight = video.videoHeight / zoomFactor;
        const zoomX = (video.videoWidth - zoomWidth) / 2;
        const zoomY = (video.videoHeight - zoomHeight) / 2;

        ctx.drawImage(video, zoomX, zoomY, zoomWidth, zoomHeight, 0, 0, canvas.width, canvas.height);

        // Aplicar filtros avançados de escaneamento de documento
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;
        
        // 1. Aumentar contraste e brilho para melhorar leitura
        const contrast = 1.4;
        const brightness = 15;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * contrast) + 128 + brightness));
            data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * contrast) + 128 + brightness));
            data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * contrast) + 128 + brightness));
        }
        ctx.putImageData(imageData, 0, 0);

        // 2. Aplicar nitidez (unsharp mask)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);
        
        // Blur suave
        ctx.filter = 'blur(1px)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
        
        const blurredData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const originalData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const sharpAmount = 0.6;
        
        for (let i = 0; i < data.length; i += 4) {
            for (let j = 0; j < 3; j++) {
                const diff = originalData.data[i + j] - blurredData.data[i + j];
                originalData.data[i + j] = Math.min(255, Math.max(0, originalData.data[i + j] + diff * sharpAmount));
            }
        }
        ctx.putImageData(originalData, 0, 0);

        // 3. Aumentar saturação levemente para cores mais vivas
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        data = imageData.data;
        const saturation = 1.15;
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = Math.min(255, Math.max(0, gray + (data[i] - gray) * saturation));
            data[i + 1] = Math.min(255, Math.max(0, gray + (data[i + 1] - gray) * saturation));
            data[i + 2] = Math.min(255, Math.max(0, gray + (data[i + 2] - gray) * saturation));
        }
        ctx.putImageData(imageData, 0, 0);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        setCapturedImage(dataUrl);
    };

    const confirmCapture = async () => {
        if (!capturedImage) return;
        
        // Converter dataURL para blob
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
        
        onCapture(file);
        stopCamera();
        onClose();
    };

    const retakePhoto = () => {
        setCapturedImage(null);
    };

    const toggleCamera = () => {
        setFacingMode(f => f === "environment" ? "user" : "environment");
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/80">
                <div className="flex items-center gap-2 text-white">
                    <ScanLine className="w-5 h-5 text-green-400" />
                    <span className="font-medium">Scanner de Documentos</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onClose(); }} className="text-white hover:bg-white/20">
                    <X className="w-6 h-6" />
                </Button>
            </div>

            {/* Camera/Preview */}
            <div className="flex-1 relative overflow-hidden">
                {capturedImage ? (
                    <img src={capturedImage} alt="Captura" className="w-full h-full object-contain" />
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ transform: `scale(${zoom})` }}
                        />
                        {/* Scanner overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-8 border-2 border-green-400 rounded-lg">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                            </div>
                            {/* Linha de escaneamento animada */}
                            <div className="absolute left-8 right-8 top-8 h-0.5 bg-green-400/80 animate-pulse" style={{ animation: "scanLine 2s ease-in-out infinite" }} />
                        </div>
                        <style>{`
                            @keyframes scanLine {
                                0%, 100% { top: 32px; }
                                50% { top: calc(100% - 32px); }
                            }
                        `}</style>
                    </>
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Controls */}
            <div className="p-4 bg-black/80">
                {capturedImage ? (
                    <div className="flex items-center justify-center gap-4">
                        <Button onClick={retakePhoto} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                            <RotateCcw className="w-5 h-5 mr-2" />
                            Tirar Novamente
                        </Button>
                        <Button onClick={confirmCapture} className="bg-green-600 hover:bg-green-700">
                            <Check className="w-5 h-5 mr-2" />
                            Usar Esta Foto
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(1, z - 0.5))} className="text-white hover:bg-white/20">
                                <ZoomOut className="w-5 h-5" />
                            </Button>
                            <span className="text-white text-sm w-12 text-center">{zoom}x</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.5))} className="text-white hover:bg-white/20">
                                <ZoomIn className="w-5 h-5" />
                            </Button>
                        </div>
                        
                        <Button 
                            onClick={capturePhoto} 
                            className="w-16 h-16 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center"
                        >
                            <div className="w-12 h-12 rounded-full border-4 border-green-500" />
                        </Button>

                        <Button variant="ghost" size="icon" onClick={toggleCamera} className="text-white hover:bg-white/20">
                            <FlipHorizontal className="w-5 h-5" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}