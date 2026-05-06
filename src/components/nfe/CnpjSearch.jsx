import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Formata CNPJ: 00.000.000/0000-00
const formatCNPJ = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 14);
    return digits
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
};

export default function CnpjSearch({ onResult }) {
    const [cnpj, setCnpj] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // "ok" | "error"

    const buscar = async () => {
        const digits = cnpj.replace(/\D/g, "");
        if (digits.length !== 14) {
            toast.error("CNPJ deve ter 14 dígitos");
            return;
        }
        setLoading(true);
        setStatus(null);

        // API pública da ReceitaWS — gratuita, sem créditos
        const res = await fetch(`https://receitaws.com.br/v1/cnpj/${digits}`, {
            headers: { "Accept": "application/json" }
        });

        if (!res.ok) {
            // Tenta CNPJ.ws como fallback também gratuito
            const res2 = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`);
            if (!res2.ok) {
                toast.error("CNPJ não encontrado ou API indisponível.");
                setStatus("error");
                setLoading(false);
                return;
            }
            const data2 = await res2.json();
            const razaoSocial = data2.razao_social || data2.nome_fantasia || "";
            if (razaoSocial) {
                onResult({ cnpj: digits, razao_social: razaoSocial });
                // Salvar no cadastro de Destinatarios se não existir
                salvarDestinatario(razaoSocial, digits);
                setStatus("ok");
            } else {
                setStatus("error");
                toast.error("Empresa não encontrada.");
            }
            setLoading(false);
            return;
        }

        const data = await res.json();
        if (data.status === "ERROR" || !data.nome) {
            toast.error(data.message || "CNPJ não encontrado.");
            setStatus("error");
            setLoading(false);
            return;
        }

        const razaoSocial = data.nome || "";
        onResult({ cnpj: digits, razao_social: razaoSocial, fantasia: data.fantasia, municipio: data.municipio, uf: data.uf });
        salvarDestinatario(razaoSocial, digits);
        setStatus("ok");
        setLoading(false);
    };

    const salvarDestinatario = async (nome, cnpjDigits) => {
        const existentes = await base44.entities.Destinatario.list();
        const jaExiste = existentes.some(d =>
            d.cnpj?.replace(/\D/g, "") === cnpjDigits ||
            d.nome?.toLowerCase() === nome.toLowerCase()
        );
        if (!jaExiste) {
            await base44.entities.Destinatario.create({ nome, cnpj: cnpjDigits });
            toast.success("Destinatário salvo no cadastro!");
        }
    };

    return (
        <div className="flex gap-2 items-end">
            <div className="flex-1">
                <Input
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => {
                        setCnpj(formatCNPJ(e.target.value));
                        setStatus(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && buscar()}
                    className={
                        status === "ok" ? "border-green-500" :
                        status === "error" ? "border-red-500" : ""
                    }
                />
            </div>
            <Button
                type="button"
                onClick={buscar}
                disabled={loading || cnpj.replace(/\D/g, "").length !== 14}
                className="bg-blue-600 hover:bg-blue-700 shrink-0"
                size="sm"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
            {status === "ok" && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
            {status === "error" && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
        </div>
    );
}