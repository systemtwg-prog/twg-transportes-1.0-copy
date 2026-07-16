import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Save, ListPlus, X } from "lucide-react";

const CORES = [
    { nome: "Azul", valor: "#3b82f6" },
    { nome: "Verde", valor: "#22c55e" },
    { nome: "Amarelo", valor: "#eab308" },
    { nome: "Vermelho", valor: "#ef4444" },
    { nome: "Roxo", valor: "#a855f7" },
    { nome: "Laranja", valor: "#f97316" }
];

export default function CadastrarListasDialog({ open, onClose }) {
    const qc = useQueryClient();
    const [novoNome, setNovoNome] = useState("");
    const [novaCor, setNovaCor] = useState(CORES[0].valor);
    const [editId, setEditId] = useState(null);
    const [editNome, setEditNome] = useState("");
    const [editCor, setEditCor] = useState("");

    const { data: listas = [] } = useQuery({
        queryKey: ["listas-coleta"],
        queryFn: () => base44.entities.ListaColeta.list("ordem")
    });

    const criar = useMutation({
        mutationFn: (dados) => base44.entities.ListaColeta.create(dados),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["listas-coleta"] }); toast.success("Lista criada!"); setNovoNome(""); }
    });

    const atualizar = useMutation({
        mutationFn: ({ id, dados }) => base44.entities.ListaColeta.update(id, dados),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["listas-coleta"] }); toast.success("Lista atualizada!"); setEditId(null); }
    });

    const remover = useMutation({
        mutationFn: (id) => base44.entities.ListaColeta.delete(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["listas-coleta"] }); toast.success("Lista removida."); }
    });

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ListPlus className="w-5 h-5 text-sky-600" /> Cadastrar Listas
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="border rounded-lg p-3 bg-sky-50">
                        <p className="text-sm font-medium mb-2">Nova lista</p>
                        <Input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex.: Transportadora, Carro Próprio, Retira..." className="mb-2" />
                        <div className="flex gap-2 mb-3">
                            {CORES.map(c => (
                                <button key={c.valor} onClick={() => setNovaCor(c.valor)} className={`w-7 h-7 rounded-full border-2 ${novaCor === c.valor ? "border-slate-800" : "border-white"}`} style={{ background: c.valor }} title={c.nome} />
                            ))}
                        </div>
                        <Button size="sm" disabled={!novoNome.trim()} onClick={() => criar.mutate({ nome: novoNome.trim(), cor: novaCor, ordem: listas.length, ativo: true })} className="bg-sky-600 hover:bg-sky-700 w-full">
                            <Plus className="w-4 h-4 mr-1" /> Criar Lista
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-auto">
                        {listas.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Nenhuma lista cadastrada.</p>}
                        {listas.map(l => (
                            <div key={l.id} className="flex items-center gap-2 border rounded-lg p-2">
                                {editId === l.id ? (
                                    <>
                                        <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="h-8 flex-1" />
                                        <div className="flex gap-1">
                                            {CORES.map(c => (
                                                <button key={c.valor} onClick={() => setEditCor(c.valor)} className={`w-5 h-5 rounded-full border ${editCor === c.valor ? "border-slate-800" : "border-white"}`} style={{ background: c.valor }} />
                                            ))}
                                        </div>
                                        <Button size="icon" className="h-8 w-8" onClick={() => atualizar.mutate({ id: l.id, dados: { nome: editNome.trim() || l.nome, cor: editCor } })}><Save className="w-3 h-3" /></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}><X className="w-3 h-3" /></Button>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-3 h-3 rounded-full" style={{ background: l.cor || "#94a3b8" }} />
                                        <span className="flex-1 text-sm font-medium">{l.nome}</span>
                                        <Button size="sm" variant="outline" onClick={() => { setEditId(l.id); setEditNome(l.nome); setEditCor(l.cor || CORES[0].valor); }}>Editar</Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { if (confirm(`Remover a lista "${l.nome}"? As coletas vinculadas ficarão sem lista.`)) remover.mutate(l.id); }}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}