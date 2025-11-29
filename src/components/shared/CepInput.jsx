import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function CepInput({ value, onChange, onAddressFound, className = "" }) {
    const [loading, setLoading] = useState(false);

    const buscarCep = async (cep) => {
        const cepLimpo = cep.replace(/\D/g, "");
        if (cepLimpo.length !== 8) return;

        setLoading(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await res.json();
            if (!data.erro && onAddressFound) {
                onAddressFound({
                    endereco: data.logradouro || "",
                    bairro: data.bairro || "",
                    cidade: data.localidade || "",
                    uf: data.uf || ""
                });
            }
        } catch (err) {
            console.error("Erro ao buscar CEP:", err);
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        const val = e.target.value.replace(/\D/g, "");
        onChange(val);
        if (val.length === 8) {
            buscarCep(val);
        }
    };

    return (
        <div className="relative">
            <Input
                value={value}
                onChange={handleChange}
                placeholder="00000-000"
                maxLength={8}
                className={className}
            />
            {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" />
            )}
        </div>
    );
}