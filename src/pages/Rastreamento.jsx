import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    MapPin, Truck, Clock, Navigation, RefreshCw,
    CheckCircle, Phone, Package, User, Circle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

const truckIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3097/3097180.png",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
});

export default function Rastreamento() {
    const queryClient = useQueryClient();
    const [selectedOrdem, setSelectedOrdem] = useState(null);

    const { data: ordensAtivas = [], isLoading, refetch } = useQuery({
        queryKey: ["ordens-ativas"],
        queryFn: () => base44.entities.OrdemColeta.filter({ 
            status: "em_andamento" 
        }),
        refetchInterval: 30000 // Atualiza a cada 30 segundos
    });

    // Buscar todos os usuários com localização recente (online)
    const { data: usuarios = [] } = useQuery({
        queryKey: ["usuarios-online"],
        queryFn: () => base44.entities.User.list(),
        refetchInterval: 30000
    });

    // Filtrar usuários que têm localização atualizada nos últimos 10 minutos
    const usuariosOnline = usuarios.filter(u => {
        if (!u.ultima_localizacao?.timestamp) return false;
        const lastUpdate = new Date(u.ultima_localizacao.timestamp);
        const agora = new Date();
        const diffMinutes = (agora - lastUpdate) / (1000 * 60);
        return diffMinutes < 10;
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
            queryClient.invalidateQueries({ queryKey: ["ordens-ativas"] });
        }
    });

    const sendNotificationMutation = useMutation({
        mutationFn: async (ordem) => {
            // Buscar cliente destinatário para pegar email
            const clientes = await base44.entities.Cliente.filter({ id: ordem.destinatario_id });
            const cliente = clientes[0];
            
            if (cliente?.email) {
                await base44.integrations.Core.SendEmail({
                    to: cliente.email,
                    subject: `Coleta #${ordem.numero} - Atualização de Status`,
                    body: `
                        <h2>Atualização da sua coleta</h2>
                        <p>Olá,</p>
                        <p>Informamos que a coleta <strong>#${ordem.numero}</strong> está em andamento.</p>
                        <p><strong>Motorista:</strong> ${ordem.motorista}</p>
                        <p><strong>Veículo:</strong> ${ordem.placa}</p>
                        <p>Em breve o motorista chegará ao local.</p>
                        <br>
                        <p>Atenciosamente,<br>Equipe de Transportes</p>
                    `
                });
                
                await base44.entities.OrdemColeta.update(ordem.id, {
                    notificacao_enviada: true
                });
            }
        }
    });

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM HH:mm", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    // Centro do mapa (São Paulo)
    const mapCenter = [-23.5505, -46.6333];

    // Ordens com localização
    const ordensComLocalizacao = ordensAtivas.filter(o => o.localizacao_latitude && o.localizacao_longitude);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                            <Navigation className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Rastreamento</h1>
                            <p className="text-slate-500">Acompanhe as coletas em tempo real</p>
                        </div>
                    </div>
                    <Button onClick={() => refetch()} variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Mapa */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white/80 border-0 shadow-xl overflow-hidden">
                            <CardHeader className="border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-green-600" />
                                    Mapa de Veículos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="h-[500px]">
                                    <MapContainer 
                                        center={mapCenter} 
                                        zoom={10} 
                                        style={{ height: "100%", width: "100%" }}
                                    >
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; OpenStreetMap'
                                        />
                                        {ordensComLocalizacao.map((ordem) => (
                                            <Marker 
                                                key={ordem.id}
                                                position={[ordem.localizacao_latitude, ordem.localizacao_longitude]}
                                                icon={truckIcon}
                                            >
                                                <Popup>
                                                    <div className="p-2">
                                                        <p className="font-bold text-blue-600">Ordem #{ordem.numero}</p>
                                                        <p className="text-sm"><strong>Motorista:</strong> {ordem.motorista}</p>
                                                        <p className="text-sm"><strong>Placa:</strong> {ordem.placa}</p>
                                                        <p className="text-sm"><strong>Destino:</strong> {ordem.destinatario_nome}</p>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            Atualizado: {formatDateTime(ordem.localizacao_atualizada_em)}
                                                        </p>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                        {/* Usuários online no mapa */}
                                        {usuariosOnline.map((usuario) => (
                                            <Marker 
                                                key={usuario.id}
                                                position={[usuario.ultima_localizacao.lat, usuario.ultima_localizacao.lng]}
                                            >
                                                <Popup>
                                                    <div className="p-2">
                                                        <p className="font-bold text-green-600">{usuario.full_name}</p>
                                                        <p className="text-sm text-slate-600">{usuario.email}</p>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            Atualizado: {formatDateTime(usuario.ultima_localizacao.timestamp)}
                                                        </p>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Lista de Coletas Ativas */}
                    <div>
                        <Card className="bg-white/80 border-0 shadow-xl">
                            <CardHeader className="border-b">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-5 h-5 text-blue-600" />
                                        Coletas Ativas
                                    </div>
                                    <Badge className="bg-blue-100 text-blue-800">
                                        {ordensAtivas.length}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[350px] overflow-y-auto">
                                {isLoading ? (
                                    <div className="p-8 text-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                                    </div>
                                ) : ordensAtivas.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                        Nenhuma coleta em andamento
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {ordensAtivas.map((ordem) => (
                                            <div 
                                                key={ordem.id}
                                                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                                                    selectedOrdem?.id === ordem.id ? "bg-blue-50" : ""
                                                }`}
                                                onClick={() => setSelectedOrdem(ordem)}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className="font-bold text-blue-600">#{ordem.numero}</span>
                                                    {ordem.localizacao_latitude ? (
                                                        <Badge className="bg-green-100 text-green-800">
                                                            <MapPin className="w-3 h-3 mr-1" />
                                                            GPS Ativo
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-gray-100 text-gray-600">
                                                            Sem GPS
                                                        </Badge>
                                                    )}
                                                </div>
                                                
                                                <p className="text-sm font-medium text-slate-800">
                                                    {ordem.motorista || "Sem motorista"}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {ordem.placa} • {ordem.destinatario_nome}
                                                </p>

                                                {ordem.localizacao_atualizada_em && (
                                                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Atualizado: {formatDateTime(ordem.localizacao_atualizada_em)}
                                                    </p>
                                                )}

                                                <div className="flex gap-2 mt-3">
                                                    {!ordem.notificacao_enviada && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                sendNotificationMutation.mutate(ordem);
                                                            }}
                                                            disabled={sendNotificationMutation.isPending}
                                                            className="text-xs"
                                                        >
                                                            <Phone className="w-3 h-3 mr-1" />
                                                            Notificar Cliente
                                                        </Button>
                                                    )}
                                                    {ordem.notificacao_enviada && (
                                                        <Badge className="bg-green-100 text-green-700 text-xs">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Notificado
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Usuários Online */}
                    <div>
                        <Card className="bg-white/80 border-0 shadow-xl">
                            <CardHeader className="border-b">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <User className="w-5 h-5 text-green-600" />
                                        Usuários Online
                                    </div>
                                    <Badge className="bg-green-100 text-green-800">
                                        {usuariosOnline.length}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[350px] overflow-y-auto">
                                {usuariosOnline.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <User className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                        Nenhum usuário online
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {usuariosOnline.map((usuario) => (
                                            <div key={usuario.id} className="p-4 hover:bg-slate-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                                                            {usuario.full_name?.[0]?.toUpperCase() || "U"}
                                                        </div>
                                                        <Circle className="w-3 h-3 text-green-500 fill-green-500 absolute -bottom-0.5 -right-0.5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800">{usuario.full_name}</p>
                                                        <p className="text-xs text-green-600 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            Online agora
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Link para Motorista */}
                <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold mb-1">Link para Motorista</h3>
                                <p className="text-blue-100">
                                    Compartilhe este link com o motorista para ele atualizar sua localização
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
                                <code className="text-sm">
                                    {window.location.origin}/AtualizarLocalizacao
                                </code>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}