import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ConsultaSEFAZ({ open, onClose, onDadosEncontrados, tipo = "cte" }) {
    const [chaveAcesso, setChaveAcesso] = useState("");
    const [consultando, setConsultando] = useState(false);

    const handleConsultar = async () => {
        if (!chaveAcesso || chaveAcesso.length !== 44) {
            toast.error("Digite uma chave de acesso válida (44 dígitos)");
            return;
        }

        if (!/^\d{44}$/.test(chaveAcesso)) {
            toast.error("A chave deve conter apenas números");
            return;
        }

        setConsultando(true);

        try {
            const funcao = tipo === "cte" ? "consultarCTE" : "consultarNFE";
            const { data } = await base44.functions.invoke(funcao, { chaveAcesso });

            if (data.success && data.data) {
                toast.success(`${tipo.toUpperCase()} encontrado na SEFAZ!`);
                onDadosEncontrados(data.data);
                onClose();
            } else {
                toast.error(data.error || "Documento não encontrado");
            }
        } catch (error) {
            console.error("Erro na consulta:", error);
            toast.error("Erro ao consultar SEFAZ. Verifique sua conexão.");
        }

        setConsultando(false);
    };

    const handleChaveChange = (value) => {
        // Permitir apenas números
        const numeros = value.replace(/\D/g, '').slice(0, 44);
        setChaveAcesso(numeros);
    };

    const formatarChave = (chave) => {
        // Formatar visualmente: 1234 5678 9012 3456 7890 1234 5678 9012 3456 7890 1234
        return chave.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-600" />
                        Consultar {tipo.toUpperCase()} na SEFAZ
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Como funciona?
                        </h3>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Digite a chave de acesso do {tipo.toUpperCase()} (44 dígitos)</li>
                            <li>• O sistema consultará automaticamente a SEFAZ</li>
                            <li>• Os dados serão preenchidos automaticamente no formulário</li>
                            <li>• Você economiza tempo e evita erros de digitação</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Chave de Acesso (44 dígitos)</Label>
                        <Input
                            value={formatarChave(chaveAcesso)}
                            onChange={(e) => handleChaveChange(e.target.value)}
                            placeholder="1234 5678 9012 3456 7890 1234 5678 9012 3456 7890 1234"
                            className="h-14 text-lg font-mono tracking-wider"
                            maxLength={55}
                        />
                        <p className="text-xs text-slate-500">
                            {chaveAcesso.length}/44 dígitos
                        </p>
                    </div>

                    {chaveAcesso.length === 44 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-700 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Chave válida! Clique em consultar para buscar os dados.
                            </p>
                        </div>
                    )}

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>
                                <strong>Atenção:</strong> A consulta pública SEFAZ pode ser lenta e está sujeita a limitações. 
                                Para melhor performance, configure uma API de serviço fiscal nas configurações do sistema.
                            </span>
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={onClose} disabled={consultando}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleConsultar}
                            disabled={consultando || chaveAcesso.length !== 44}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {consultando ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Consultando SEFAZ...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4 mr-2" />
                                    Consultar na SEFAZ
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}