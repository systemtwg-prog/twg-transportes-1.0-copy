import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Save, X, FileText, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Canhoto() {
    const [fotos, setFotos] = useState([]);
    const [fotoAtual, setFotoAtual] = useState(null);
    const [mostrarCamera, setMostrarCamera] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const navigate = useNavigate();

    const { data: empresasCadastradas = [] } = useQuery({
        queryKey: ["empresas-comprovante"],
        queryFn: () => base44.entities.EmpresaComprovante.list()
    });

    const { data: currentUser } = useQuery({
        queryKey: ["current-user-canhoto"],
        queryFn: () => base44.auth.me()
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
                    notaFiscal: "",
                    empresa: ""
                });
                stopCamera();
                setMostrarCamera(false);
            }
        }, "image/jpeg", 0.85);
    };

    const confirmarFoto = () => {
        if (!fotoAtual.notaFiscal) {
            toast.error("Informe o número da nota fiscal");
            return;
        }
        if (!fotoAtual.empresa) {
            toast.error("Selecione a empresa");
            return;
        }

        setFotos(prev => [...prev, { ...fotoAtual, id: Date.now() }]);
        setFotoAtual(null);
        toast.success("Canhoto adicionado!");
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
        toast.info("Canhoto removido");
    };

    const salvarCanhotos = async () => {
        if (fotos.length === 0) {
            toast.error("Tire pelo menos uma foto");
            return;
        }

        setSalvando(true);

        try {
            // 1. Salvar comprovantes
            for (let i = 0; i < fotos.length; i++) {
                const foto = fotos[i];
                toast.info(`Salvando canhoto ${i + 1} de ${fotos.length}...`);

                const file = new File([foto.blob], `canhoto_${foto.id}.jpg`, { type: "image/jpeg" });
                const { file_url } = await base44.integrations.Core.UploadFile({ file });

                await base44.entities.ComprovanteInterno.create({
                    nota_fiscal: foto.notaFiscal,
                    tipo_documento: "Comprovante",
                    empresa: foto.empresa,
                    data: new Date().toISOString().split('T')[0],
                    status: "pendente",
                    usuario_foto: currentUser?.full_name || currentUser?.email || "Usuário",
                    arquivos: [{
                        nome: `canhoto_${foto.notaFiscal}.jpg`,
                        url: file_url,
                        tipo: "image/jpeg"
                    }]
                });
            }

            // 2. Verificar e atualizar status dos romaneios
            const notasFiscaisComComprovante = fotos.map(f => f.notaFiscal);
            
            // Buscar todos os romaneios gerados
            const romaneiosGerados = await base44.entities.RomaneioGerado.list();
            
            for (const romaneio of romaneiosGerados) {
                if (romaneio.status === "gerado" && romaneio.notas_ids) {
                    // Buscar as notas fiscais do romaneio
                    const notasDoRomaneio = await Promise.all(
                        romaneio.notas_ids.map(id => base44.entities.NotaFiscal.filter({ id }))
                    );
                    
                    const numerosNotasRomaneio = notasDoRomaneio
                        .flat()
                        .map(n => n.numero_nf)
                        .filter(Boolean);
                    
                    // Buscar todos os comprovantes dessas notas
                    const todosComprovantes = await base44.entities.ComprovanteInterno.list();
                    const numerosComComprovante = new Set(todosComprovantes.map(c => c.nota_fiscal));
                    
                    // Verificar se todas as notas do romaneio têm comprovante
                    const todasNotasComComprovante = numerosNotasRomaneio.every(numero => 
                        numerosComComprovante.has(numero)
                    );
                    
                    if (todasNotasComComprovante && numerosNotasRomaneio.length > 0) {
                        // Atualizar status do romaneio para "entregue"
                        await base44.entities.RomaneioGerado.update(romaneio.id, {
                            status: "entregue"
                        });
                        toast.success(`Romaneio ${romaneio.nome} marcado como entregue!`);
                    }
                }
            }

            fotos.forEach(f => URL.revokeObjectURL(f.url));
            toast.success(`${fotos.length} canhoto(s) salvos com sucesso!`);
            navigate(createPageUrl("ComprovantesInternos"));
        } catch (error) {
            console.error("Erro ao salvar canhotos:", error);
            toast.error("Erro ao salvar canhotos");
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
                        <FileText className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Canhotos</h1>
                        <p className="text-slate-500">Fotografe os canhotos de entrega</p>
                    </div>
                </div>

                {/* Botão Grande para Tirar Foto */}
                {!mostrarCamera && !fotoAtual && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardContent className="p-8">
                            <Button
                                onClick={() => setMostrarCamera(true)}
                                className="w-full h-32 text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-xl"
                            >
                                <Camera className="w-12 h-12 mr-4" />
                                Tirar Foto do Canhoto
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
                                        className="w-24 h-24 rounded-full bg-white hover:bg-gray-100 shadow-2xl border-[8px] border-red-500 flex items-center justify-center active:scale-90 transition-all"
                                    >
                                        <Camera className="w-12 h-12 text-red-600" />
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Card com Foto Capturada */}
                {fotoAtual && (
                    <Card className="bg-white border-2 border-orange-500 shadow-2xl">
                        <CardContent className="p-6 space-y-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-orange-600" />
                                Preencha os Dados do Canhoto
                            </h3>

                            {/* Preview da Foto */}
                            <img 
                                src={fotoAtual.url} 
                                alt="Foto capturada" 
                                className="w-full h-64 object-cover rounded-xl border-4 border-slate-200" 
                            />

                            {/* Campo Número da Nota Fiscal */}
                            <div className="space-y-2">
                                <label className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Número da Nota Fiscal
                                </label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Digite o número da nota fiscal"
                                    value={fotoAtual.notaFiscal}
                                    onChange={(e) => setFotoAtual({ ...fotoAtual, notaFiscal: e.target.value })}
                                    className="h-16 text-xl font-bold bg-white border-2"
                                />
                            </div>

                            {/* Seleção de Empresa */}
                            <div className="space-y-2">
                                <label className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                                    <Building2 className="w-5 h-5" />
                                    Empresa
                                </label>
                                <Select value={fotoAtual.empresa} onValueChange={(v) => setFotoAtual({ ...fotoAtual, empresa: v })}>
                                    <SelectTrigger className="h-16 bg-white text-lg border-2">
                                        <SelectValue placeholder="Selecione a empresa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {empresasCadastradas.map(emp => (
                                            <SelectItem key={emp.id} value={emp.nome}>
                                                <div className="flex items-center gap-2">
                                                    {emp.logo_url && <img src={emp.logo_url} alt="" className="w-6 h-6 object-contain" />}
                                                    <span className="text-base">{emp.nome}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Botões */}
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

                {/* Lista de Canhotos Capturados */}
                {fotos.length > 0 && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-xl font-bold text-slate-800">
                                Canhotos Capturados ({fotos.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {fotos.map(foto => (
                                    <div key={foto.id} className="relative bg-white rounded-xl border-2 border-slate-200 overflow-hidden group">
                                        <img 
                                            src={foto.url} 
                                            alt={`Canhoto ${foto.notaFiscal}`}
                                            className="w-full h-48 object-cover"
                                        />
                                        <div className="p-4 space-y-2">
                                            <p className="font-bold text-lg text-slate-800">NF: {foto.notaFiscal}</p>
                                            <p className="text-sm text-slate-600">{foto.empresa}</p>
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
                                onClick={salvarCanhotos}
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
                                        Salvar {fotos.length} Canhoto(s)
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}