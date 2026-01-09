import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RastreamentoGPS() {
    const [ordensComLocalizacao, setOrdensComLocalizacao] = useState([]);

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos-rastreamento"],
        queryFn: () => base44.functions.invoke('firebaseSync', { action: 'getVehicles' }).then(r => r.data?.veiculos || []),
        refetchInterval: 10000 // Atualiza a cada 10 segundos
    });

    const { data: ordensAtuais = [] } = useQuery({
        queryKey: ["ordens-em-andamento"],
        queryFn: () => base44.entities.OrdemColeta.filter({ status: 'em_andamento' }),
        refetchInterval: 10000
    });

    useEffect(() => {
        const ordensComDados = ordensAtuais.map(ordem => {
            const veiculo = veiculos.find(v => v.id === ordem.veiculo_id);
            return {
                ...ordem,
                veiculo
            };
        });
        setOrdensComLocalizacao(ordensComDados);
    }, [ordensAtuais, veiculos]);

    const formatarTempo = (dataStr) => {
        if (!dataStr) return "-";
        try {
            return format(new Date(dataStr), "HH:mm", { locale: ptBR });
        } catch {
            return "-";
        }
    };

    const calcularDistancia = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return (R * c).toFixed(1);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-6 h-6 text-red-500" />
                <h2 className="text-2xl font-bold text-slate-800">Rastreamento GPS em Tempo Real</h2>
                <Badge className="bg-green-100 text-green-700">Ao vivo</Badge>
            </div>

            {ordensComLocalizacao.length === 0 ? (
                <Card className="bg-slate-50">
                    <CardContent className="p-8 text-center text-slate-500">
                        <Truck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        Nenhum veículo em trânsito
                    </CardContent>
                </Card>
            ) : (
                ordensComLocalizacao.map((ordem) => (
                    <Card key={ordem.id} className="border-l-4 border-l-red-500">
                        <CardContent className="p-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-600">Motorista</p>
                                    <p className="font-semibold text-slate-800">{ordem.motorista}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600">Placa</p>
                                    <p className="font-bold text-blue-600 text-lg">{ordem.placa}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 flex items-center gap-1">
                                        <MapPin className="w-4 h-4" /> Localização
                                    </p>
                                    <p className="font-mono text-sm">
                                        {ordem.localizacao_latitude?.toFixed(4)}, {ordem.localizacao_longitude?.toFixed(4)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 flex items-center gap-1">
                                        <Clock className="w-4 h-4" /> Atualizado
                                    </p>
                                    <p className="font-semibold text-green-600">
                                        {formatarTempo(ordem.localizacao_atualizada_em)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}