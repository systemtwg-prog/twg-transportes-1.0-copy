import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Save, X, FileText, Trash2, AlertTriangle, Eye, Pencil, Share2, RotateCw, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function CTEs() {
    const [fotoAtual, setFotoAtual] = useState(null);
    const [mostrarCamera, setMostrarCamera] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");
    const [showFaltandoDialog, setShowFaltandoDialog] = useState(false);
    const [ctesFaltando, setCtesFaltando] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showVisualizarDialog, setShowVisualizarDialog] = useState(false);
    const [cteVisualizado, setCteVisualizado] = useState(null);
    const [showEditarDialog, setShowEditarDialog] = useState(false);
    const [cteEditando, setCteEditando] = useState(null);
    const [rotacao, setRotacao] = useState(0);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ["current-user-ctes"],
        queryFn: () => base44.auth.me()
    });

    const { data: ctesSalvos = [], refetch: refetchCTEs } = useQuery({
        queryKey: ["comprovantes-ctes"],
        queryFn: async () => {
            const todos = await base44.entities.ComprovanteInterno.list("-created_date");
            return todos.filter(c => 
                c.tipo_documento === "CTE" || 
                c.tipo_documento === "CTe"
            );
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ComprovanteInterno.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-ctes"] });
            toast.success("CTE excluído");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ComprovanteInterno.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-ctes"] });
            setShowEditarDialog(false);
            setCteEditando(null);
            toast.success("CTE atualizado");
        }
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

    const confirmarFoto = async () => {
        if (!fotoAtual.numeroCTE) {
            toast.error("Informe o número do CTE");
            return;
        }

        setLoading(true);
        try {
            const file = new File([fotoAtual.blob], `cte_${Date.now()}.jpg`, { type: "image/jpeg" });
            const { file_url } = await base44.integrations.Core.UploadFile({ file });

            await base44.entities.ComprovanteInterno.create({
                nota_fiscal: fotoAtual.numeroCTE,
                tipo_documento: "CTE",
                data: new Date().toISOString().split('T')[0],
                status: "pendente",
                usuario_foto: currentUser?.full_name || currentUser?.email || "Usuário",
                arquivos: [{
                    nome: `cte_${fotoAtual.numeroCTE}.jpg`,
                    url: file_url,
                    tipo: "image/jpeg"
                }]
            });

            URL.revokeObjectURL(fotoAtual.url);
            setFotoAtual(null);
            toast.success("CTE salvo com sucesso!");
            refetchCTEs();
        } catch (error) {
            console.error("Erro ao salvar CTE:", error);
            toast.error("Erro ao salvar CTE");
        } finally {
            setLoading(false);
        }
    };

    const cancelarFoto = () => {
        if (fotoAtual) {
            URL.revokeObjectURL(fotoAtual.url);
        }
        setFotoAtual(null);
    };

    const verificarCTEsFaltando = async () => {
        setLoading(true);
        try {
            if (ctesSalvos.length === 0) {
                toast.info("Nenhum CTE cadastrado para verificação");
                setLoading(false);
                return;
            }

            const numerosCTEs = ctesSalvos
                .map(c => {
                    const numero = c.nota_fiscal?.match(/\d+/g)?.join('');
                    return numero ? parseInt(numero) : null;
                })
                .filter(n => n !== null)
                .sort((a, b) => a - b);

            if (numerosCTEs.length === 0) {
                toast.info("Nenhum número válido de CTE encontrado");
                setLoading(false);
                return;
            }

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

    const visualizarCTE = (cte) => {
        setCteVisualizado(cte);
        setRotacao(0);
        setShowVisualizarDialog(true);
    };

    const editarCTE = (cte) => {
        setCteEditando({ ...cte });
        setShowEditarDialog(true);
    };

    const salvarEdicao = () => {
        if (!cteEditando.nota_fiscal) {
            toast.error("Número do CTE é obrigatório");
            return;
        }
        updateMutation.mutate({
            id: cteEditando.id,
            data: {
                nota_fiscal: cteEditando.nota_fiscal,
                observacoes: cteEditando.observacoes
            }
        });
    };

    const compartilharCTE = async (cte) => {
        const imageUrl = cte.arquivos?.[0]?.url;
        if (!imageUrl) {
            toast.error("Nenhuma imagem para compartilhar");
            return;
        }

        if (navigator.share) {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const file = new File([blob], `CTE_${cte.nota_fiscal}.jpg`, { type: "image/jpeg" });
                await navigator.share({
                    title: `CTE ${cte.nota_fiscal}`,
                    text: `Comprovante CTE: ${cte.nota_fiscal}`,
                    files: [file]
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    toast.error("Erro ao compartilhar");
                }
            }
        } else {
            navigator.clipboard.writeText(imageUrl);
            toast.success("Link copiado para área de transferência");
        }
    };

    const baixarCTE = (cte) => {
        const imageUrl = cte.arquivos?.[0]?.url;
        if (!imageUrl) {
            toast.error("Nenhuma imagem para baixar");
            return;
        }
        
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `CTE_${cte.nota_fiscal}.jpg`;
        a.click();
        toast.success("Download iniciado");
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
                            <p className="text-slate-500">Comprovantes de Conhecimento de Transporte</p>
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
                                Preencha o Número do CTE
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
                                    autoFocus
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
                                    disabled={loading}
                                    className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
                                >
                                    {loading ? (
                                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                                    ) : (
                                        <Save className="w-5 h-5 mr-2" />
                                    )}
                                    Salvar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Lista de CTEs Salvos */}
                {ctesSalvos.length > 0 && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-xl font-bold text-slate-800">
                                CTEs Cadastrados ({ctesSalvos.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ctesSalvos.map(cte => (
                                    <div key={cte.id} className="relative bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                                        {cte.arquivos?.[0]?.url && (
                                            <img 
                                                src={cte.arquivos[0].url} 
                                                alt={`CTE ${cte.nota_fiscal}`}
                                                className="w-full h-48 object-cover cursor-pointer"
                                                onClick={() => visualizarCTE(cte)}
                                            />
                                        )}
                                        <div className="p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-lg text-slate-800">CTE: {cte.nota_fiscal}</p>
                                                <Badge className={cte.status === "finalizado" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                                                    {cte.status === "finalizado" ? "Finalizado" : "Pendente"}
                                                </Badge>
                                            </div>
                                            {cte.observacoes && (
                                                <p className="text-sm text-slate-600">{cte.observacoes}</p>
                                            )}
                                            <p className="text-xs text-slate-400">
                                                Por: {cte.usuario_foto || "Sistema"} • {new Date(cte.data).toLocaleDateString('pt-BR')}
                                            </p>
                                            
                                            {/* Botões de Ação */}
                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => visualizarCTE(cte)}
                                                    className="flex-1"
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Ver
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => editarCTE(cte)}
                                                    className="flex-1"
                                                >
                                                    <Pencil className="w-4 h-4 mr-1" />
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => compartilharCTE(cte)}
                                                    className="flex-1"
                                                >
                                                    <Share2 className="w-4 h-4 mr-1" />
                                                    Enviar
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (confirm("Excluir este CTE?")) {
                                                            deleteMutation.mutate(cte.id);
                                                        }
                                                    }}
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

            {/* Dialog Visualizar CTE */}
            <Dialog open={showVisualizarDialog} onOpenChange={setShowVisualizarDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-600" />
                                CTE: {cteVisualizado?.nota_fiscal}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setRotacao((rotacao + 90) % 360)}
                                >
                                    <RotateCw className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => baixarCTE(cteVisualizado)}
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => compartilharCTE(cteVisualizado)}
                                >
                                    <Share2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {cteVisualizado?.arquivos?.[0]?.url && (
                            <div className="bg-slate-100 rounded-lg p-4 flex justify-center items-center min-h-[500px]">
                                <img 
                                    src={cteVisualizado.arquivos[0].url}
                                    alt={`CTE ${cteVisualizado.nota_fiscal}`}
                                    className="max-w-full max-h-[70vh] object-contain"
                                    style={{ transform: `rotate(${rotacao}deg)` }}
                                />
                            </div>
                        )}
                        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                            <p className="text-sm"><strong>Número:</strong> {cteVisualizado?.nota_fiscal}</p>
                            <p className="text-sm"><strong>Data:</strong> {new Date(cteVisualizado?.data).toLocaleDateString('pt-BR')}</p>
                            <p className="text-sm"><strong>Status:</strong> {cteVisualizado?.status === "finalizado" ? "Finalizado" : "Pendente"}</p>
                            {cteVisualizado?.observacoes && (
                                <p className="text-sm"><strong>Observações:</strong> {cteVisualizado.observacoes}</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Editar CTE */}
            <Dialog open={showEditarDialog} onOpenChange={setShowEditarDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-purple-600" />
                            Editar CTE
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Número do CTE</label>
                            <Input
                                value={cteEditando?.nota_fiscal || ""}
                                onChange={(e) => setCteEditando({ ...cteEditando, nota_fiscal: e.target.value })}
                                placeholder="Número do CTE"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Observações</label>
                            <Input
                                value={cteEditando?.observacoes || ""}
                                onChange={(e) => setCteEditando({ ...cteEditando, observacoes: e.target.value })}
                                placeholder="Observações..."
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowEditarDialog(false)}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={salvarEdicao}
                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Salvar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}