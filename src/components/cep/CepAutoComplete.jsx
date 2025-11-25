import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Check } from "lucide-react";
import { toast } from "sonner";

export default function CepAutoComplete({ value, onChange, onAddressFound }) {
    const [loading, setLoading] = useState(false);
    const [found, setFound] = useState(false);

    const formatCep = (cep) => {
        const cleaned = cep.replace(/\D/g, '');
        if (cleaned.length <= 5) return cleaned;
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
    };

    const handleCepChange = async (e) => {
        const rawValue = e.target.value;
        const formatted = formatCep(rawValue);
        onChange(formatted);
        setFound(false);

        // Remove non-digits for API call
        const cepNumerico = formatted.replace(/\D/g, '');

        if (cepNumerico.length === 8) {
            setLoading(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cepNumerico}/json/`);
                const data = await response.json();

                if (data.erro) {
                    toast.error("CEP não encontrado");
                } else {
                    setFound(true);
                    onAddressFound({
                        endereco: data.logradouro || "",
                        bairro: data.bairro || "",
                        cidade: data.localidade || "",
                        uf: data.uf || ""
                    });
                    toast.success("Endereço encontrado!");
                }
            } catch (error) {
                toast.error("Erro ao buscar CEP");
            }
            setLoading(false);
        }
    };

    return (
        <div className="space-y-2">
            <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                CEP
            </Label>
            <div className="relative">
                <Input
                    value={value}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    maxLength={9}
                    className={`pr-10 ${found ? "border-green-500 bg-green-50" : ""}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                    {found && !loading && <Check className="w-4 h-4 text-green-600" />}
                </div>
            </div>
            {loading && (
                <p className="text-xs text-blue-600">Buscando endereço...</p>
            )}
        </div>
    );
}