import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Save, X } from "lucide-react";
import { toast } from "sonner";

// Modal que pergunta, para cada nota fiscal do romaneio, qual empresa (remetente) atribuir.
// Usado quando o remetente está em modo "individual" (não "aplica em todas").
export default function AtribuirRemetenteRomaneioDialog({ open, notas = [], empresas = [], onConfirm, onCancel }) {
    const [mapa, setMapa] = useState({});
    const [aplicarTodas, setAplicarTodas] = useState("");

    useEffect(() => {
        if (open) {
            const ini = {};
            notas.forEach((n) => { ini[n.id] = n.remetente || ""; });
            setMapa(ini);
            setAplicarTodas("");
        }
    }, [open, notas]);

    const setEmpresaNota = (notaId, nome) => setMapa((p) => ({ ...p, [notaId]: nome }));

    const aplicarParaTodas = (nome) => {
        if (!nome) return;
        setAplicarTodas(nome);
        const ini = {};
        notas.forEach((n) => { ini[n.id] = nome; });
        setMapa(ini);
    };

    const pendentes = notas.filter((n) => !mapa[n.id]);

    const confirmar = () => {
        if (pendentes.length > 0) {
            toast.error(`Atribua uma empresa a ${pendentes.length} nota(s) pendente(s).`);
            return;
        }
        onConfirm(mapa);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-green-600" />
                        Atribuir Empresa ao Romaneio (individual)
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        O remetente está em modo <strong>individual</strong>. Selecione a empresa (remetente) de cada nota fiscal do romaneio.
                        Para usar a mesma empresa para todas, use o seletor abaixo.
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-600 whitespace-nowrap">Aplicar a todas:</span>
                        <Select value={aplicarTodas} onValueChange={aplicarParaTodas}>
                            <SelectTrigger className="bg-white flex-1">
                                <SelectValue placeholder="Selecione uma empresa..." />
                            </SelectTrigger>
                            <SelectContent>
                                {empresas.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.nome}>{emp.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100">
                                    <TableHead className="w-24">Nº NF</TableHead>
                                    <TableHead>Destinatário</TableHead>
                                    <TableHead className="w-64">Empresa / Remetente</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-slate-500 py-6">
                                            Nenhuma nota selecionada.
                                        </TableCell>
                                    </TableRow>
                                ) : notas.map((n) => (
                                    <TableRow key={n.id}>
                                        <TableCell className="font-bold text-blue-600">{n.numero_nf || "-"}</TableCell>
                                        <TableCell className="text-sm">{n.destinatario || "-"}</TableCell>
                                        <TableCell>
                                            <Select value={mapa[n.id] || ""} onValueChange={(v) => setEmpresaNota(n.id, v)}>
                                                <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Selecione a empresa..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {empresas.map((emp) => (
                                                        <SelectItem key={emp.id} value={emp.nome}>{emp.nome}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {pendentes.length > 0 && (
                        <p className="text-xs text-red-600">{pendentes.length} nota(s) sem empresa atribuída.</p>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" onClick={onCancel}>
                            <X className="w-4 h-4 mr-1" /> Cancelar
                        </Button>
                        <Button onClick={confirmar} className="bg-green-600 hover:bg-green-700">
                            <Save className="w-4 h-4 mr-1" /> Imprimir Romaneio
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}