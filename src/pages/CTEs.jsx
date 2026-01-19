import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Save, X, FileText, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CTEs() {
    const [fotos, setFotos] = useState([]);
    const [fotoAtual, setFotoAtual] = useState(null);
    const [mostrarCamera, setMostrarCamera] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");
    const [showFaltandoDialog, setShowFaltandoDialog] = useState(false);
    const [ctesFaltando, setCtesFaltando] = useState([]);
    const [loading, setLoading] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const navigate = useNavigate();



    const { data: currentUser } = useQuery({
        queryKey: ["current-user-ctes"],
        queryFn: () => base44.auth.me()
    });

    const { data: todosComprovantes = [] } = useQuery({
        queryKey: ["comprovantes-ctes-todos"],
        queryFn: () => base44.entities.ComprovanteCTE.list()
    });

    useEffect(() => {
        if (mostrarCamera) {
            startCamera();
        }
        return () => stopCamera();
    }, [mostrarCamera, facingMode]);

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
            toast.error("Não foi possível acessar a câmera");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capturarFoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = 1280;
        canvas.height = (video.videoHeight / video.videoWidth) * 1280;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                setFotoAtual({
                    blob,
                    url: imageUrl,
                    numeroCTE: ""
                });
                stopCamera();
                setMostrarCamera(false);
            }
        }, "image/jpeg", 0.85);
    };

    const confirmarFoto = () => {
        if (!fotoAtual.numeroCTE) {
            toast.error("Informe o número do CTE");
            return;
        }

        setFotos(prev => [...prev, { ...fotoAtual, id: Date.now() }]);
        setFotoAtual(null);
        toast.success("CTE adicionado!");
    };

    const cancelarFoto = () => {
        if (fotoAtual) {
            URL.revokeObjectURL(fotoAtual.url);
        }
        setFotoAtual(null);
    };

    const removerFoto = (id) => {
        setFotos(prev => {
            const foto = prev.find(f => f.id === id);
            if (foto) URL.revokeObjectURL(foto.url);
            return prev.filter(f => f.id !== id);
        });
        toast.info("CTE removido");
    };

    const verificarCTEsFaltando = async () => {
        setLoading(true);
        try {
            // Buscar todos os comprovantes CTE
            const ctes = todosComprovantes;

            if (ctes.length === 0) {
                toast.info("Nenhum CTE cadastrado para verificação");
                setLoading(false);
                return;
            }

            // Extrair apenas números dos CTEs
            const numerosCTEs = ctes
                .map(c => {
                    const numero = c.numero_cte?.match(/\d+/g)?.join('');
                    return numero ? parseInt(numero) : null;
                })
                .filter(n => n !== null)
                .sort((a, b) => a - b);

            if (numerosCTEs.length === 0) {
                toast.info("Nenhum número válido de CTE encontrado");
                setLoading(false);
                return;
            }

            // Identificar números faltando
            const faltando = [];
            const minNum = Math.min(...numerosCTEs);
            const maxNum = Math.max(...numerosCTEs);

            for (let i = minNum; i <= maxNum; i++) {
                if (!numerosCTEs.includes(i)) {
                    faltando.push(i);
                }
            }

            if (faltando.length === 0) {
                toast.success("Nenhum CTE faltando! Sequência completa.");
            } else {
                setCtesFaltando(faltando);
                setShowFaltandoDialog(true);
            }
        } catch (error) {
            console.error("Erro ao verificar CTEs:", error);
            toast.error("Erro ao verificar CTEs faltando");
        }
        setLoading(false);
    };

    const salvarCTEs = async () => {
        if (fotos.length === 0) {
            toast.error("Tire pelo menos uma foto");
            return;
        }

        setSalvando(true);

        try {
            for (let i = 0; i < fotos.length; i++) {
                const foto = fotos[i];
                toast.info(`Salvando CTE ${i + 1} de ${fotos.length}...`);

                const file = new File([foto.blob], `cte_${foto.id}.jpg`, { type: "image/jpeg" });
                const { file_url } = await base44.integrations.Core.UploadFile({ file });

                await base44.entities.ComprovanteCTE.create({
                    numero_cte: foto.numeroCTE,
                    data: new Date().toISOString().split('T')[0],
                    status: "pendente",
                    arquivos: [{
                        nome: `cte_${foto.numeroCTE}.jpg`,
                        url: file_url,
                        tipo: "image/jpeg"
                    }]
                });
            }

            fotos.forEach(f => URL.revokeObjectURL(f.url));
            toast.success(`${fotos.length} CTE(s) salvo(s) com sucesso!`);
            navigate(createPageUrl("ComprovantesCtes"));
        } catch (error) {
            console.error("Erro ao salvar CTEs:", error);
            toast.error("Erro ao salvar CTEs");
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">CTEs</h1>
                            <p className="text-slate-500">Fotografe os comprovantes de CTEs</p>
                        </div>
                    </div>
                    <Button
                        onClick={verificarCTEsFaltando}
                        disabled={loading}
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-50"
                    >
                        {loading ? (
                            <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full mr-2" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 mr-2" />
                        )}
                        CTEs Faltando
                    </Button>
                </div>

                {/* Botão Grande para Tirar Foto */}
                {!mostrarCamera && !fotoAtual && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardContent className="p-8">
                            <Button
                                onClick={() => setMostrarCamera(true)}
                                className="w-full h-32 text-2xl font-bold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-xl"
                            >
                                <Camera className="w-12 h-12 mr-4" />
                                Tirar Foto do CTE
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Câmera */}
                {mostrarCamera && (
                    <Card className="bg-black border-0 shadow-2xl overflow-hidden">
                        <CardContent className="p-0 relative">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-[60vh] object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                            
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
                                <div className="flex justify-center gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            stopCamera();
                                            setMostrarCamera(false);
                                        }}
                                        className="h-16 px-6 bg-white/90"
                                    >
                                        <X className="w-6 h-6 mr-2" />
                                        Cancelar
                                    </Button>
                                    <button
                                        onClick={capturarFoto}
                                        className="w-24 h-24 rounded-full bg-white hover:bg-gray-100 shadow-2xl border-[8px] border-purple-500 flex items-center justify-center active:scale-90 transition-all"
                                    >
                                        <Camera className="w-12 h-12 text-purple-600" />
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Card com Foto Capturada */}
                {fotoAtual && (
                    <Card className="bg-white border-2 border-purple-500 shadow-2xl">
                        <CardContent className="p-6 space-y-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-purple-600" />
                                Preencha os Dados do CTE
                            </h3>

                            <img 
                                src={fotoAtual.url} 
                                alt="Foto capturada" 
                                className="w-full h-64 object-cover rounded-xl border-4 border-slate-200" 
                            />

                            <div className="space-y-2">
                                <label className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Número do CTE
                                </label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Digite o número do CTE"
                                    value={fotoAtual.numeroCTE}
                                    onChange={(e) => setFotoAtual({ ...fotoAtual, numeroCTE: e.target.value })}
                                    className="h-16 text-xl font-bold bg-white border-2"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={cancelarFoto}
                                    className="flex-1 h-14 text-lg border-2"
                                >
                                    <X className="w-5 h-5 mr-2" />
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={confirmarFoto}
                                    className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
                                >
                                    OK
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Lista de CTEs Capturados */}
                {fotos.length > 0 && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-xl font-bold text-slate-800">
                                CTEs Capturados ({fotos.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {fotos.map(foto => (
                                    <div key={foto.id} className="relative bg-white rounded-xl border-2 border-slate-200 overflow-hidden group">
                                        <img 
                                            src={foto.url} 
                                            alt={`CTE ${foto.numeroCTE}`}
                                            className="w-full h-48 object-cover"
                                        />
                                        <div className="p-4">
                                            <p className="font-bold text-lg text-slate-800">CTE: {foto.numeroCTE}</p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => removerFoto(foto.id)}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Botão Salvar */}
                {fotos.length > 0 && (
                    <Card className="bg-gradient-to-r from-green-500 to-emerald-600 border-0 shadow-2xl sticky bottom-4">
                        <CardContent className="p-6">
                            <Button
                                onClick={salvarCTEs}
                                disabled={salvando}
                                className="w-full h-20 text-2xl font-bold bg-white text-green-700 hover:bg-slate-50 shadow-xl"
                            >
                                {salvando ? (
                                    <>
                                        <div className="animate-spin w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full mr-3" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-8 h-8 mr-3" />
                                        Salvar {fotos.length} CTE(s)
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Dialog CTEs Faltando */}
            <Dialog open={showFaltandoDialog} onOpenChange={setShowFaltandoDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                            CTEs Faltando na Sequência
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">
                                <strong>Total de CTEs faltando:</strong> {ctesFaltando.length}
                            </p>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {ctesFaltando.map(num => (
                                <Badge key={num} variant="destructive" className="justify-center py-2 text-base">
                                    {num}
                                </Badge>
                            ))}
                        </div>
                        <Button
                            onClick={() => setShowFaltandoDialog(false)}
                            className="w-full"
                        >
                            Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}