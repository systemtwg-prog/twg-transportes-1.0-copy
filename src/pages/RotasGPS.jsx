import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
    Navigation, MapPin, Truck, Package, ExternalLink, 
    Trash2, Plus, Route
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function RotasGPS() {
    const [selectedRomaneio, setSelectedRomaneio] = useState(null);
    const [showAddDestino, setShowAddDestino] = useState(false);
    const [sourceType, setSourceType] = useState("coleta");
    const queryClient = useQueryClient();

    const { data: currentUser } = useQuery({
        queryKey: ["current-user"],
        queryFn: () => base44.auth.me()
    });

    const { data: colaboradorVinculado } = useQuery({
        queryKey: ["colaborador-vinculado", currentUser?.id],
        queryFn: async () => {
            if (!currentUser?.id) return null;
            const colaboradores = await base44.entities.Motorista.filter({ usuario_vinculado: currentUser.id });
            return colaboradores[0] || null;
        },
        enabled: !!currentUser?.id
    });

    const isAdmin = currentUser?.role === "admin";

    const { data: romaneios = [], isLoading } = useQuery({
        queryKey: ["romaneios-rotas"],
        queryFn: () => base44.entities.Romaneio.list("-created_date")
    });

    const { data: clientes = [] } = useQuery({
        queryKey: ["clientes"],
        queryFn: () => base44.entities.Cliente.list()
    });

    const { data: coletasDiarias = [] } = useQuery({
        queryKey: ["coletas-diarias-rotas"],
        queryFn: () => base44.entities.ColetaDiaria.filter({ status: "pendente" })
    });

    const deleteRomaneioMutation = useMutation({
        mutationFn: (id) => base44.entities.Romaneio.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["romaneios-rotas"] });
            setSelectedRomaneio(null);
            toast.success("Romaneio excluído");
        }
    });

    const updateRomaneioMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Romaneio.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["romaneios-rotas"] });
            toast.success("Destino adicionado");
        }
    });

    // Filtrar romaneios para o colaborador
    let romaneiosFiltrados = romaneios;
    if (!isAdmin && colaboradorVinculado) {
        romaneiosFiltrados = romaneios.filter(r => r.motorista_id === colaboradorVinculado.id);
    }

    // Filtrar apenas romaneios pendentes ou em andamento
    const romaneiosAtivos = romaneiosFiltrados.filter(r => 
        r.status === "pendente" || r.status === "coletado"
    );

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    // Buscar endereços dos destinatários nas notas fiscais
    const getDestinatariosComEndereco = (romaneio) => {
        if (!romaneio?.notas_fiscais) return [];
        
        return romaneio.notas_fiscais.map(nf => {
            const cliente = clientes.find(c => 
                c.razao_social?.toLowerCase().includes(nf.destinatario?.toLowerCase()) ||
                nf.destinatario?.toLowerCase().includes(c.razao_social?.toLowerCase())
            );
            
            return {
                ...nf,
                endereco: nf.endereco || cliente?.endereco || "",
                cidade: nf.cidade || cliente?.cidade || "",
                bairro: cliente?.bairro || "",
                cep: cliente?.cep || ""
            };
        });
    };

    const abrirRotaWaze = (destinos) => {
        if (destinos.length === 0) return;
        
        const destinoComEndereco = destinos.find(d => d.endereco || d.cidade);
        if (destinoComEndereco) {
            const enderecoCompleto = [
                destinoComEndereco.endereco,
                destinoComEndereco.bairro,
                destinoComEndereco.cidade
            ].filter(Boolean).join(", ");
            
            window.open(`https://waze.com/ul?q=${encodeURIComponent(enderecoCompleto)}&navigate=yes`, "_blank");
        }
    };

    const abrirRotaGoogleMaps = (destinos) => {
        if (destinos.length === 0) return;
        
        const destinosComEndereco = destinos.filter(d => d.endereco || d.cidade);
        if (destinosComEndereco.length === 0) return;

        const enderecos = destinosComEndereco.map(d => 
            encodeURIComponent([d.endereco, d.bairro, d.cidade].filter(Boolean).join(", "))
        );

        if (enderecos.length === 1) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${enderecos[0]}`, "_blank");
        } else {
            const destino = enderecos.pop();
            const waypoints = enderecos.join("|");
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${destino}&waypoints=${waypoints}`, "_blank");
        }
    };

    const handleDeleteRomaneio = (romaneio) => {
        if (confirm(`Excluir romaneio de ${formatDate(romaneio.data)}?`)) {
            deleteRomaneioMutation.mutate(romaneio.id);
        }
    };

    const handleAddDestino = (item) => {
        if (!selectedRomaneio) return;

        let novaNotaFiscal;
        if (sourceType === "coleta") {
            novaNotaFiscal = {
                numero_nf: item.nfe || "",
                destinatario: item.destinatario_nome || "",
                volume: item.volume || "",
                endereco: item.remetente_endereco || "",
                cidade: item.remetente_cidade || ""
            };
        } else {
            // Do romaneio
            novaNotaFiscal = {
                numero_nf: item.numero_nf || "",
                destinatario: item.destinatario || "",
                volume: item.volume || "",
                endereco: item.endereco || "",
                cidade: item.cidade || ""
            };
        }

        const notasAtuais = selectedRomaneio.notas_fiscais || [];
        updateRomaneioMutation.mutate({
            id: selectedRomaneio.id,
            data: { notas_fiscais: [...notasAtuais, novaNotaFiscal] }
        });

        // Atualizar estado local
        setSelectedRomaneio({
            ...selectedRomaneio,
            notas_fiscais: [...notasAtuais, novaNotaFiscal]
        });
        
        setShowAddDestino(false);
    };

    const statusColors = {
        pendente: "bg-yellow-100 text-yellow-800",
        coletado: "bg-purple-100 text-purple-800",
        entregue: "bg-green-100 text-green-800"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                        <Navigation className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Rotas GPS</h1>
                        <p className="text-slate-500">Navegue para os destinos do romaneio</p>
                    </div>
                </div>

                {/* Seletor de Romaneio */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Route className="w-5 h-5 text-green-600" />
                            Selecione o Romaneio
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select 
                            value={selectedRomaneio?.id || ""} 
                            onValueChange={(id) => setSelectedRomaneio(romaneiosAtivos.find(r => r.id === id))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Escolha um romaneio para navegar..." />
                            </SelectTrigger>
                            <SelectContent>
                                {romaneiosAtivos.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500">
                                        Nenhum romaneio ativo
                                    </div>
                                ) : (
                                    romaneiosAtivos.map(r => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {formatDate(r.data)} - {r.motorista_nome} ({r.notas_fiscais?.length || 0} entregas)
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {/* Detalhes do Romaneio Selecionado */}
                {selectedRomaneio && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardHeader className="border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Truck className="w-5 h-5 text-blue-600" />
                                        Romaneio - {formatDate(selectedRomaneio.data)}
                                    </CardTitle>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {selectedRomaneio.motorista_nome} • {selectedRomaneio.placa}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={statusColors[selectedRomaneio.status]}>
                                        {selectedRomaneio.status === "pendente" ? "Pendente" : 
                                         selectedRomaneio.status === "coletado" ? "Coletado" : "Entregue"}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteRomaneio(selectedRomaneio)}
                                        className="text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {/* Botões de Navegação */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                                <Button 
                                    onClick={() => abrirRotaWaze(getDestinatariosComEndereco(selectedRomaneio))}
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                                >
                                    <Navigation className="w-5 h-5 mr-2" />
                                    Abrir no Waze
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                                <Button 
                                    onClick={() => abrirRotaGoogleMaps(getDestinatariosComEndereco(selectedRomaneio))}
                                    variant="outline"
                                    className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                                >
                                    <MapPin className="w-5 h-5 mr-2" />
                                    Abrir no Google Maps
                                    <ExternalLink className="w-4 h-4 ml-2" />
                                </Button>
                            </div>

                            {/* Adicionar Destino */}
                            <Button 
                                onClick={() => setShowAddDestino(true)}
                                variant="outline"
                                className="w-full mb-4 border-dashed border-green-400 text-green-600 hover:bg-green-50"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Endereço
                            </Button>

                            {/* Lista de Destinos */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Destinos ({selectedRomaneio.notas_fiscais?.length || 0})
                                </h3>
                                {getDestinatariosComEndereco(selectedRomaneio).map((dest, index) => (
                                    <div 
                                        key={index} 
                                        className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{dest.destinatario || "Sem nome"}</p>
                                                    <p className="text-sm text-slate-500">NF: {dest.numero_nf}</p>
                                                    {dest.endereco && (
                                                        <p className="text-sm text-slate-600 mt-1">
                                                            <MapPin className="w-3 h-3 inline mr-1" />
                                                            {[dest.endereco, dest.bairro, dest.cidade].filter(Boolean).join(", ")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {dest.endereco && (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost"
                                                    onClick={() => {
                                                        const endereco = [dest.endereco, dest.bairro, dest.cidade].filter(Boolean).join(", ");
                                                        window.open(`https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`, "_blank");
                                                    }}
                                                >
                                                    <Navigation className="w-4 h-4 text-blue-600" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {(!selectedRomaneio.notas_fiscais || selectedRomaneio.notas_fiscais.length === 0) && (
                                    <div className="text-center py-8 text-slate-500">
                                        <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                        Nenhum destino cadastrado neste romaneio
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Lista de Romaneios Ativos */}
                {!selectedRomaneio && (
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Romaneios Ativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto" />
                                </div>
                            ) : romaneiosAtivos.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <Truck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                    Nenhum romaneio ativo no momento
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {romaneiosAtivos.map((r) => (
                                        <div 
                                            key={r.id}
                                            className="p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-green-500 hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div onClick={() => setSelectedRomaneio(r)} className="flex-1">
                                                    <p className="font-medium text-slate-800">{formatDate(r.data)}</p>
                                                    <p className="text-sm text-slate-500">
                                                        {r.motorista_nome} • {r.placa}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline">
                                                        {r.notas_fiscais?.length || 0} entregas
                                                    </Badge>
                                                    <Badge className={statusColors[r.status]}>
                                                        {r.status === "pendente" ? "Pendente" : "Coletado"}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteRomaneio(r);
                                                        }}
                                                        className="text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Dialog para adicionar destino */}
            <Dialog open={showAddDestino} onOpenChange={setShowAddDestino}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Adicionar Endereço</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Button
                                variant={sourceType === "coleta" ? "default" : "outline"}
                                onClick={() => setSourceType("coleta")}
                                className="flex-1"
                            >
                                Coletas Ativas
                            </Button>
                            <Button
                                variant={sourceType === "romaneio" ? "default" : "outline"}
                                onClick={() => setSourceType("romaneio")}
                                className="flex-1"
                            >
                                Romaneios
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {sourceType === "coleta" ? (
                                coletasDiarias.length === 0 ? (
                                    <p className="text-center text-slate-500 py-4">Nenhuma coleta ativa</p>
                                ) : (
                                    coletasDiarias.map((coleta) => (
                                        <div
                                            key={coleta.id}
                                            onClick={() => handleAddDestino(coleta)}
                                            className="p-3 bg-slate-50 rounded-lg border hover:border-green-500 cursor-pointer"
                                        >
                                            <p className="font-medium">{coleta.remetente_nome}</p>
                                            <p className="text-sm text-slate-500">
                                                {coleta.remetente_endereco} - {coleta.remetente_cidade}
                                            </p>
                                        </div>
                                    ))
                                )
                            ) : (
                                romaneios.flatMap(r => r.notas_fiscais || []).length === 0 ? (
                                    <p className="text-center text-slate-500 py-4">Nenhuma nota fiscal</p>
                                ) : (
                                    romaneios.flatMap((r, ri) => 
                                        (r.notas_fiscais || []).map((nf, ni) => (
                                            <div
                                                key={`${ri}-${ni}`}
                                                onClick={() => handleAddDestino(nf)}
                                                className="p-3 bg-slate-50 rounded-lg border hover:border-green-500 cursor-pointer"
                                            >
                                                <p className="font-medium">{nf.destinatario}</p>
                                                <p className="text-sm text-slate-500">
                                                    NF: {nf.numero_nf} - {nf.endereco || nf.cidade}
                                                </p>
                                            </div>
                                        ))
                                    )
                                )
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}