import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, X, Save, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

export default function ImportadorRelatorio({ open, onClose, onImportSuccess }) {
    const [notaManual, setNotaManual] = useState({ numero_nf: "", destinatario: "", transportadora: "" });

    const handleClose = () => {
        setNotaManual({ numero_nf: "", destinatario: "", transportadora: "" });
        onClose();
    };

    const handleSave = async () => {
        if (!notaManual.numero_nf) {
            toast.error("Informe o número da NF");
            return;
        }

        const notasParaAdicionar = [{
            id: `manual_${Date.now()}`,
            numero_nf: notaManual.numero_nf,
            destinatario: notaManual.destinatario,
            transportadora: notaManual.transportadora
        }];

        toast.success("Nota adicionada com sucesso!");
        onImportSuccess(notasParaAdicionar);
        handleClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5 text-indigo-600" />
                        Adicionar Nota para Conferência
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                            Adicione as informações da nota fiscal manualmente.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Número da NF *</Label>
                            <Input
                                value={notaManual.numero_nf}
                                onChange={(e) => setNotaManual({ ...notaManual, numero_nf: e.target.value })}
                                placeholder="Ex: 123456"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Destinatário</Label>
                            <Input
                                value={notaManual.destinatario}
                                onChange={(e) => setNotaManual({ ...notaManual, destinatario: e.target.value })}
                                placeholder="Nome do destinatário"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Transportadora</Label>
                            <Input
                                value={notaManual.transportadora}
                                onChange={(e) => setNotaManual({ ...notaManual, transportadora: e.target.value })}
                                placeholder="Nome da transportadora"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={handleClose}>
                            <X className="w-4 h-4 mr-2" />
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={!notaManual.numero_nf}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Adicionar Nota
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}