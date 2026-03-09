import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Edit2, Plus, Check, X, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PagadorDialog({ open, onOpenChange }) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ nome: "", cnpj_cpf: "", email: "", telefone: "" });

    const { data: pagadores = [] } = useQuery({
        queryKey: ['pagadores'],
        queryFn: () => base44.entities.Pagador.list('nome')
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Pagador.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['pagadores']);
            setFormData({ nome: "", cnpj_cpf: "", email: "", telefone: "" });
            setShowForm(false);
            toast({ title: "Pagador criado!", duration: 2000 });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Pagador.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['pagadores']);
            setEditing(null);
            toast({ title: "Pagador atualizado!", duration: 2000 });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Pagador.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['pagadores']);
            toast({ title: "Pagador excluído!", duration: 2000 });
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600" />
                        Cadastro de Pagadores
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Button
                        onClick={() => setShowForm(true)}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={showForm}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Pagador
                    </Button>

                    {showForm && (
                        <div className="border rounded-lg p-4 space-y-3 bg-green-50">
                            <div>
                                <Label>Nome *</Label>
                                <Input
                                    value={formData.nome}
                                    onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))}
                                    placeholder="Nome da empresa ou pessoa"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label>CNPJ/CPF</Label>
                                    <Input
                                        value={formData.cnpj_cpf}
                                        onChange={(e) => setFormData(p => ({ ...p, cnpj_cpf: e.target.value }))}
                                        placeholder="Opcional"
                                    />
                                </div>
                                <div>
                                    <Label>Telefone</Label>
                                    <Input
                                        value={formData.telefone}
                                        onChange={(e) => setFormData(p => ({ ...p, telefone: e.target.value }))}
                                        placeholder="Opcional"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => createMutation.mutate(formData)}
                                    disabled={!formData.nome.trim()}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                    <Check className="w-4 h-4 mr-1" /> Salvar
                                </Button>
                                <Button variant="outline" onClick={() => { setShowForm(false); setFormData({ nome: "", cnpj_cpf: "", email: "", telefone: "" }); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {pagadores.map(p => (
                            <div key={p.id} className="flex items-center justify-between border rounded-lg p-3 bg-white shadow-sm">
                                {editing?.id === p.id ? (
                                    <div className="flex-1 mr-2 space-y-2">
                                        <Input
                                            value={editing.nome}
                                            onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                                            autoFocus
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                value={editing.cnpj_cpf || ""}
                                                onChange={(e) => setEditing({ ...editing, cnpj_cpf: e.target.value })}
                                                placeholder="CNPJ/CPF"
                                            />
                                            <Input
                                                value={editing.telefone || ""}
                                                onChange={(e) => setEditing({ ...editing, telefone: e.target.value })}
                                                placeholder="Telefone"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{p.nome}</p>
                                        {(p.cnpj_cpf || p.telefone) && (
                                            <p className="text-xs text-gray-500">{[p.cnpj_cpf, p.telefone].filter(Boolean).join(' | ')}</p>
                                        )}
                                    </div>
                                )}
                                <div className="flex gap-1 ml-2">
                                    {editing?.id === p.id ? (
                                        <>
                                            <Button size="icon" variant="outline" onClick={() => updateMutation.mutate({ id: p.id, data: { nome: editing.nome, cnpj_cpf: editing.cnpj_cpf, telefone: editing.telefone } })}>
                                                <Check className="w-4 h-4 text-green-600" />
                                            </Button>
                                            <Button size="icon" variant="outline" onClick={() => setEditing(null)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button size="icon" variant="outline" onClick={() => setEditing({ ...p })}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="outline" onClick={() => deleteMutation.mutate(p.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                        {pagadores.length === 0 && (
                            <p className="text-center text-gray-500 py-6">Nenhum pagador cadastrado</p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}