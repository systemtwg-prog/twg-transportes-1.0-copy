import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tag, CheckCircle } from "lucide-react";

export default function AtribuirListaDialog({ coleta, onClose }) {
    const qc = useQueryClient();
    const [listaId, setListaId] = useState("");

    const { data: listas = [] } = useQuery({
        queryKey: ["listas-coleta"],
        queryFn: () => base44.entities.ListaColeta.list("ordem")
    });

    useEffect(() => {
        if (coleta) setListaId(coleta.lista_id || "");
    }, [coleta]);

    const atribuir = useMutation({
        mutationFn: ({ id, dados }) => base44.entities.ColetaDiaria.update(id, dados),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["coletas-diarias"] });
            qc.invalidateQueries({ queryKey: ["coletas-diarias-home"] });
            toast.success("Coleta atribuída à lista!");
            onClose();
        }
    });

    const salvar = () => {
        const lista = listas.find(l => l.id === listaId);
        atribuir.mutate({
            id: coleta.id,
            dados: lista ? { lista_id: lista.id, lista_nome: lista.nome } : { lista_id: "", lista_nome: "" }
        });
    };

    return (
        <Dialog open={!!coleta} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="w-5 h-5 text-indigo-600" /> Atribuir à Lista
                    </DialogTitle>
                </DialogHeader>
                {coleta && (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-500">{coleta.remetente_nome} / {coleta.destinatario_nome}</p>
                        <div className="space-y-2 max-h-72 overflow-auto">
                            <button onClick={() => setListaId("")} className={`w-full text-left p-2 rounded-lg border ${listaId === "" ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}>
                                Sem lista
                            </button>
                            {listas.map(l => (
                                <button key={l.id} onClick={() => setListaId(l.id)} className={`w-full text-left p-2 rounded-lg border flex items-center gap-2 ${listaId === l.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}>
                                    <span className="w-3 h-3 rounded-full" style={{ background: l.cor || "#94a3b8" }} />
                                    {l.nome}
                                </button>
                            ))}
                        </div>
                        <Button onClick={salvar} disabled={atribuir.isPending} className="bg-indigo-600 hover:bg-indigo-700 w-full">
                            <CheckCircle className="w-4 h-4 mr-1" /> Atribuir
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}