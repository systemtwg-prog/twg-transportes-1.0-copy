import React, { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Clock } from "lucide-react";

export default function WeatherClock() {
    const [time, setTime] = useState(new Date());
    const [weather, setWeather] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Buscar localização e tempo
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
                    );
                    const data = await response.json();
                    if (data.current) {
                        setWeather({
                            temp: Math.round(data.current.temperature_2m),
                            code: data.current.weather_code
                        });
                    }
                } catch (err) {
                    console.log("Erro ao buscar previsão:", err);
                }
            });
        }
    }, []);

    const getWeatherIcon = (code) => {
        if (!code && code !== 0) return <Cloud className="w-8 h-8 text-slate-400" />;
        if (code === 0 || code === 1) return <Sun className="w-8 h-8 text-amber-500" />;
        if (code >= 2 && code <= 3) return <Cloud className="w-8 h-8 text-slate-500" />;
        if (code >= 45 && code <= 48) return <Cloud className="w-8 h-8 text-slate-400" />;
        if (code >= 51 && code <= 67) return <CloudRain className="w-8 h-8 text-sky-500" />;
        if (code >= 71 && code <= 77) return <CloudSnow className="w-8 h-8 text-sky-300" />;
        if (code >= 80 && code <= 82) return <CloudRain className="w-8 h-8 text-sky-600" />;
        if (code >= 95 && code <= 99) return <CloudLightning className="w-8 h-8 text-yellow-500" />;
        return <Cloud className="w-8 h-8 text-slate-400" />;
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    };

    return (
        <div className="flex items-center gap-4 bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3">
            {/* Relógio */}
            <div className="text-white text-center">
                <div className="text-2xl md:text-3xl font-bold tabular-nums">
                    {formatTime(time)}
                </div>
                <div className="text-xs text-sky-100 capitalize">
                    {formatDate(time)}
                </div>
            </div>

            {/* Separador */}
            <div className="w-px h-12 bg-white/30" />

            {/* Tempo */}
            <div className="flex items-center gap-2">
                {getWeatherIcon(weather?.code)}
                {weather ? (
                    <span className="text-2xl md:text-3xl font-bold text-white">
                        {weather.temp}°C
                    </span>
                ) : (
                    <span className="text-sm text-sky-100">Carregando...</span>
                )}
            </div>
        </div>
    );
}