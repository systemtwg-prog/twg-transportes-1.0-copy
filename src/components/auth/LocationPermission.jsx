import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export default function LocationPermission({ onPermissionGranted }) {
    const [status, setStatus] = useState("checking"); // checking, denied, granted, requesting
    const [error, setError] = useState(null);

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        if (!navigator.geolocation) {
            setStatus("denied");
            setError("Seu navegador não suporta geolocalização");
            return;
        }

        try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            
            if (permission.state === 'granted') {
                setStatus("granted");
                getCurrentLocation();
            } else if (permission.state === 'denied') {
                setStatus("denied");
                setError("Permissão de localização foi negada. Habilite nas configurações do navegador.");
            } else {
                setStatus("requesting");
            }

            permission.onchange = () => {
                if (permission.state === 'granted') {
                    setStatus("granted");
                    getCurrentLocation();
                } else if (permission.state === 'denied') {
                    setStatus("denied");
                }
            };
        } catch {
            // Fallback for browsers that don't support permissions API
            requestLocation();
        }
    };

    const getCurrentLocation = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onPermissionGranted({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    timestamp: new Date().toISOString()
                });
            },
            (err) => {
                setStatus("denied");
                setError(err.message);
            }
        );
    };

    const requestLocation = () => {
        setStatus("requesting");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setStatus("granted");
                onPermissionGranted({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    timestamp: new Date().toISOString()
                });
            },
            (err) => {
                setStatus("denied");
                setError("Permissão de localização negada");
            }
        );
    };

    if (status === "granted") {
        return null;
    }

    if (status === "checking") {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <Card className="max-w-md mx-4 bg-white shadow-2xl">
                    <CardContent className="p-8 text-center">
                        <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
                        <h2 className="text-xl font-semibold text-slate-800">Verificando permissões...</h2>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="max-w-md mx-4 bg-white shadow-2xl">
                <CardContent className="p-8 text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 ${
                        status === "denied" ? "bg-red-100" : "bg-blue-100"
                    }`}>
                        {status === "denied" ? (
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        ) : (
                            <MapPin className="w-8 h-8 text-blue-600" />
                        )}
                    </div>

                    <h2 className="text-xl font-semibold text-slate-800 mb-2">
                        {status === "denied" ? "Localização Necessária" : "Permitir Localização"}
                    </h2>

                    <p className="text-slate-600 mb-6">
                        {status === "denied" 
                            ? error || "Precisamos da sua localização para o funcionamento do sistema. Por favor, habilite nas configurações do navegador."
                            : "Para o correto funcionamento do sistema de rastreamento, precisamos acessar sua localização."
                        }
                    </p>

                    {status === "requesting" && (
                        <Button 
                            onClick={requestLocation}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                            <MapPin className="w-4 h-4 mr-2" />
                            Permitir Localização
                        </Button>
                    )}

                    {status === "denied" && (
                        <div className="space-y-3">
                            <Button 
                                onClick={requestLocation}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            >
                                Tentar Novamente
                            </Button>
                            <p className="text-xs text-slate-500">
                                Se o problema persistir, verifique as configurações de privacidade do seu navegador.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}