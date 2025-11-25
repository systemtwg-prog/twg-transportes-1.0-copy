import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    MapPin, Truck, Navigation, CheckCircle, Loader2,
    RefreshCw, Package
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AtualizarLocalizacao() {
    const queryClient = useQueryClient();
    const [selectedOrdemId, setSelectedOrdemId] = useState("");
    const [location, setLocation] = useState(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [autoUpdate, setAutoUpdate] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);

    const { data: ordensAtivas = [], isLoading } = useQuery({
        queryKey: ["minhas-ordens"],
        queryFn: () => base44.entities.OrdemColeta.filter({ 
            status: "em_andamento" 
        })
    });

    const updateLocationMutation = useMutation({
        mutationFn: async ({ ordemId, latitude, longitude }) => {
            return base44.entities.OrdemColeta.update(ordemId, {
                localizacao_latitude: latitude,
                localizacao_longitude: longitude,
                localizacao_atualizada_em: new Date().toISOString()
            });
        },
        onSuccess: () => {
            setLastUpdate(new Date());
            queryClient.invalidateQueries({ queryKey: ["minhas-ordens"] });
        }
    });

    const getLocation = () => {
        setIsGettingLocation(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    setLocation(newLocation);
                    setIsGettingLocation(false);
                    
                    // Se tem ordem selecionada, atualiza automaticamente
                    if (selectedOrdemId) {
                        updateLocationMutation.mutate({
                            ordemId: selectedOrdemId,
                            ...newLocation
                        });
                    }
                },
                (error) => {
                    console.error("Erro ao obter localização:", error);
                    setIsGettingLocation(false);
                    alert("Não foi possível obter sua localização. Verifique as permissões.");
                },
                { enableHighAccuracy: true }
            );
        } else {
            alert("Geolocalização não suportada neste dispositivo.");
            setIsGettingLocation(false);
        }
    };

    // Auto update a cada 2 minutos
    useEffect(() => {
        let interval;
        if (autoUpdate && selectedOrdemId) {
            interval = setInterval(() => {
                getLocation();
            }, 120000); // 2 minutos
        }
        return () => clearInterval(interval);
    }, [autoUpdate, selectedOrdemId]);

    const selectedOrdem = ordensAtivas.find(o => o.id === selectedOrdemId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4 flex items-center justify-center">
            <div className="w-full max-w-md space-y-6">
                {/* Header */}
                <div className="text-center text-white">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Truck className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold">Atualizar Localização</h1>
                    <p className="text-blue-100 mt-1">Selecione sua coleta e atualize sua posição</p>
                </div>

                {/* Seleção de Ordem */}
                <Card className="border-0 shadow-xl">
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            Selecione a Coleta
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {isLoading ? (
                            <div className="text-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                            </div>
                        ) : ordensAtivas.length === 0 ? (
                            <div className="text-center py-4 text-slate-500">
                                Nenhuma coleta em andamento
                            </div>
                        ) : (
                            <Select value={selectedOrdemId} onValueChange={setSelectedOrdemId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Escolha uma coleta..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {ordensAtivas.map((ordem) => (
                                        <SelectItem key={ordem.id} value={ordem.id}>
                                            #{ordem.numero} - {ordem.destinatario_nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {selectedOrdem && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                <p className="font-semibold text-blue-800">Ordem #{selectedOrdem.numero}</p>
                                <p className="text-sm text-slate-600 mt-1">
                                    <strong>Destino:</strong> {selectedOrdem.destinatario_nome}
                                </p>
                                <p className="text-sm text-slate-600">
                                    <strong>Endereço:</strong> {selectedOrdem.remetente_endereco}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Localização */}
                <Card className="border-0 shadow-xl">
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-green-600" />
                            Sua Localização
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {location && (
                            <div className="p-3 bg-green-50 rounded-lg">
                                <p className="text-sm text-green-800">
                                    <strong>Latitude:</strong> {location.latitude.toFixed(6)}
                                </p>
                                <p className="text-sm text-green-800">
                                    <strong>Longitude:</strong> {location.longitude.toFixed(6)}
                                </p>
                            </div>
                        )}

                        <Button
                            onClick={getLocation}
                            disabled={isGettingLocation || !selectedOrdemId}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 h-14 text-lg"
                        >
                            {isGettingLocation ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Navigation className="w-5 h-5 mr-2" />
                            )}
                            {isGettingLocation ? "Obtendo localização..." : "Atualizar Localização"}
                        </Button>

                        {lastUpdate && (
                            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                Última atualização: {format(lastUpdate, "HH:mm:ss", { locale: ptBR })}
                            </div>
                        )}

                        {/* Auto update toggle */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                                <p className="font-medium text-sm">Atualização Automática</p>
                                <p className="text-xs text-slate-500">A cada 2 minutos</p>
                            </div>
                            <Button
                                variant={autoUpdate ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAutoUpdate(!autoUpdate)}
                                disabled={!selectedOrdemId}
                            >
                                {autoUpdate ? (
                                    <>
                                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                        Ativo
                                    </>
                                ) : (
                                    "Ativar"
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Status */}
                {updateLocationMutation.isSuccess && (
                    <div className="bg-green-500 text-white rounded-xl p-4 text-center">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-semibold">Localização atualizada com sucesso!</p>
                    </div>
                )}
            </div>
        </div>
    );
}