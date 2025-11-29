import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Check, RotateCcw, Zap, Sun } from "lucide-react";

export default function QuickPhotoCapture({ onCapture, onClose }) {
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Erro ao acessar câmera:", err);
            alert("Não foi possível acessar a câmera. Verifique as permissões.");
        }
    }, [facingMode]);

    React.useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [facingMode]);

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const switchCamera = () => {
        stopCamera();
        setFacingMode(prev => prev === "environment" ? "user" : "environment");
    };

    // Aplicar filtros de melhoria na imagem
    const enhanceImage = (ctx, width, height) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Aumentar brilho e contraste
        const brightness = 15; // Aumento de brilho
        const contrast = 1.2; // Fator de contraste

        for (let i = 0; i < data.length; i += 4) {
            // Aplicar contraste
            data[i] = ((data[i] - 128) * contrast + 128) + brightness;     // R
            data[i + 1] = ((data[i + 1] - 128) * contrast + 128) + brightness; // G
            data[i + 2] = ((data[i + 2] - 128) * contrast + 128) + brightness; // B

            // Limitar valores entre 0 e 255
            data[i] = Math.max(0, Math.min(255, data[i]));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
        }

        // Aplicar nitidez (sharpening)
        ctx.putImageData(imageData, 0, 0);
        
        // Filtro de nitidez usando convolução simples
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(ctx.canvas, 0, 0);
        
        const sharpenedData = ctx.getImageData(0, 0, width, height);
        const origData = tempCtx.getImageData(0, 0, width, height);
        
        const sharpenAmount = 0.3;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                for (let c = 0; c < 3; c++) {
                    const center = origData.data[idx + c];
                    const top = origData.data[((y - 1) * width + x) * 4 + c];
                    const bottom = origData.data[((y + 1) * width + x) * 4 + c];
                    const left = origData.data[(y * width + (x - 1)) * 4 + c];
                    const right = origData.data[(y * width + (x + 1)) * 4 + c];
                    
                    const laplacian = 4 * center - top - bottom - left - right;
                    sharpenedData.data[idx + c] = Math.max(0, Math.min(255, center + laplacian * sharpenAmount));
                }
            }
        }
        
        ctx.putImageData(sharpenedData, 0, 0);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        setProcessing(true);
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Usar resolução alta
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Desenhar frame do vídeo
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Aplicar melhorias de imagem (mais claro e nítido)
        enhanceImage(ctx, canvas.width, canvas.height);

        // Converter para blob com alta qualidade
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            setCapturedImage({ url, blob });
            setProcessing(false);
        }, "image/jpeg", 0.95);
    };

    const confirmPhoto = async () => {
        if (!capturedImage) return;
        
        const file = new File([capturedImage.blob], `foto_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
        stopCamera();
    };

    const retakePhoto = () => {
        setCapturedImage(null);
    };

    const handleClose = () => {
        stopCamera();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
                    <X className="w-6 h-6" />
                </Button>
                <div className="flex items-center gap-2 text-white text-sm">
                    <Sun className="w-4 h-4" />
                    <span>Foto com melhoria automática</span>
                </div>
                <Button variant="ghost" size="icon" onClick={switchCamera} className="text-white hover:bg-white/20">
                    <RotateCcw className="w-6 h-6" />
                </Button>
            </div>

            {/* Camera View / Captured Image */}
            <div className="flex-1 flex items-center justify-center">
                {capturedImage ? (
                    <img 
                        src={capturedImage.url} 
                        alt="Captura" 
                        className="max-w-full max-h-full object-contain"
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
                        <Button 
                            onClick={retakePhoto}
                            variant="outline"
                            className="h-14 px-6 border-white text-white hover:bg-white/20"
                        >
                            <RotateCcw className="w-5 h-5 mr-2" />
                            Tirar Outra
                        </Button>
                        <Button 
                            onClick={confirmPhoto}
                            className="h-14 px-8 bg-green-500 hover:bg-green-600"
                        >
                            <Check className="w-5 h-5 mr-2" />
                            Usar Foto
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={capturePhoto}
                        disabled={processing}
                        className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 text-black shadow-lg"
                    >
                        {processing ? (
                            <div className="animate-spin w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full" />
                        ) : (
                            <Camera className="w-10 h-10" />
                        )}
                    </Button>
                )}
            </div>

            {/* Indicador de melhoria */}
            {processing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3">
                        <Zap className="w-8 h-8 text-yellow-500 animate-pulse" />
                        <span className="text-slate-700 font-medium">Melhorando imagem...</span>
                    </div>
                </div>
            )}
        </div>
    );
}