import React, { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog, Wind } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function WeatherWidget() {
    const [time, setTime] = useState(new Date());
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(async (position) => {
                        const { latitude, longitude } = position.coords;
                        const response = await fetch(
                            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=America/Sao_Paulo`
                        );
                        const data = await response.json();
                        setWeather({
                            temp: Math.round(data.current.temperature_2m),
                            code: data.current.weather_code,
                            wind: Math.round(data.current.wind_speed_10m)
                        });
                        setLoading(false);
                    }, () => setLoading(false));
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Erro ao buscar clima:", error);
                setLoading(false);
            }
        };
        fetchWeather();
    }, []);

    const getWeatherIcon = (code) => {
        if (code === 0 || code === 1) return <Sun className="w-6 h-6 text-amber-500" />;
        if (code >= 2 && code <= 3) return <Cloud className="w-6 h-6 text-slate-400" />;
        if (code >= 45 && code <= 48) return <CloudFog className="w-6 h-6 text-slate-400" />;
        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain className="w-6 h-6 text-blue-500" />;
        if (code >= 71 && code <= 77) return <CloudSnow className="w-6 h-6 text-sky-400" />;
        if (code >= 95 && code <= 99) return <CloudLightning className="w-6 h-6 text-yellow-500" />;
        return <Cloud className="w-6 h-6 text-slate-400" />;
    };

    const getWeatherDesc = (code) => {
        if (code === 0) return "Céu limpo";
        if (code === 1) return "Poucas nuvens";
        if (code >= 2 && code <= 3) return "Nublado";
        if (code >= 45 && code <= 48) return "Neblina";
        if (code >= 51 && code <= 55) return "Garoa";
        if (code >= 61 && code <= 67) return "Chuva";
        if (code >= 71 && code <= 77) return "Neve";
        if (code >= 80 && code <= 82) return "Pancadas";
        if (code >= 95 && code <= 99) return "Tempestade";
        return "Parcial";
    };

    return (
        <div className="flex items-center gap-4">
            {/* Data */}
            <div className="text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                    {format(time, "EEEE", { locale: ptBR })}
                </p>
                <p className="text-lg font-bold text-slate-800">
                    {format(time, "dd MMM", { locale: ptBR })}
                </p>
            </div>

            <div className="w-px h-10 bg-slate-300" />

            {/* Hora */}
            <div className="text-center">
                <p className="text-2xl font-bold text-slate-800 tabular-nums">
                    {format(time, "HH:mm")}
                </p>
                <p className="text-xs text-slate-500">
                    {format(time, "ss")}s
                </p>
            </div>

            {/* Clima */}
            {weather && (
                <>
                    <div className="w-px h-10 bg-slate-300" />
                    <div className="flex items-center gap-2">
                        {getWeatherIcon(weather.code)}
                        <div>
                            <p className="text-lg font-bold text-slate-800">{weather.temp}°C</p>
                            <p className="text-xs text-slate-500">{getWeatherDesc(weather.code)}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}