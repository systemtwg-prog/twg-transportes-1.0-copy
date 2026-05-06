import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Building2, Car, X, Save } from "lucide-react";
import CnpjSearch from "@/components/nfe/CnpjSearch";

export default function NotaFiscalForm({
    open, onOpenChange,
    form, setForm,
    editing,
    onSubmit,
    onCancel,
    veiculos,
    transportadoras,
    destinatarios,
    onCadastrarDestinatario
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        {editing ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Número NF *</Label>
                            <Input
                                value={form.numero_nf}
                                onChange={(e) => setForm({ ...form, numero_nf: e.target.value })}
                                required
                                placeholder="Ex: 123456"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data</Label>
                            <Input
                                type="date"
                                value={form.data}
                                onChange={(e) => setForm({ ...form, data: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Busca por CNPJ */}
                    <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Label className="text-blue-800 font-semibold flex items-center gap-1">
                            🔍 Buscar Destinatário por CNPJ
                        </Label>
                        <CnpjSearch
                            onResult={({ razao_social }) => {
                                setForm(prev => ({ ...prev, destinatario: razao_social }));
                            }}
                        />
                        <p className="text-xs text-blue-600">Busca gratuita via API pública — sem uso de créditos</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                            <span>Destinatário *</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onCadastrarDestinatario}
                                className="text-blue-600 hover:text-blue-700 h-auto p-0"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Cadastrar Novo
                            </Button>
                        </Label>
                        <div className="space-y-2">
                            <Input
                                value={form.destinatario}
                                onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                                required
                                placeholder="Digite o nome do destinatário..."
                                className="bg-white"
                                list="destinatarios-list"
                            />
                            <datalist id="destinatarios-list">
                                {destinatarios
                                    .sort((a, b) => a.nome.localeCompare(b.nome))
                                    .filter((d) => d.nome.toLowerCase().includes(form.destinatario.toLowerCase()))
                                    .map((d) => (
                                        <option key={d.id} value={d.nome}>
                                            {d.cidade && `${d.nome} (${d.cidade})`}
                                        </option>
                                    ))}
                            </datalist>
                            {form.destinatario && (
                                <div className="text-xs text-slate-500">
                                    {destinatarios.filter(d => d.nome.toLowerCase().includes(form.destinatario.toLowerCase())).length} destinatário(s) encontrado(s)
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Peso</Label>
                            <Input
                                value={form.peso}
                                onChange={(e) => setForm({ ...form, peso: e.target.value })}
                                placeholder="Ex: 100kg"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Volume</Label>
                            <Input
                                value={form.volume}
                                onChange={(e) => setForm({ ...form, volume: e.target.value })}
                                placeholder="Ex: 5"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Transportadora</Label>
                            <Input
                                value={form.transportadora}
                                onChange={(e) => setForm({ ...form, transportadora: e.target.value })}
                                placeholder="Nome da transportadora"
                                className="bg-white"
                                list="transportadoras-list"
                            />
                            <datalist id="transportadoras-list">
                                {transportadoras
                                    .sort((a, b) => (a.razao_social || "").localeCompare(b.razao_social || ""))
                                    .filter((t) => (t.razao_social || t.nome_fantasia || "").toLowerCase().includes((form.transportadora || "").toLowerCase()))
                                    .map((t) => (
                                        <option key={t.id} value={t.razao_social || t.nome_fantasia}>
                                            {t.cidade && `${t.razao_social || t.nome_fantasia} (${t.cidade})`}
                                        </option>
                                    ))}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Filial
                            </Label>
                            <Input
                                value={form.filial}
                                onChange={(e) => setForm({ ...form, filial: e.target.value })}
                                placeholder="Ex: SP, RJ, MG..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Car className="w-4 h-4" /> Placa do Veículo
                        </Label>
                        <Select value={form.placa} onValueChange={(v) => setForm({ ...form, placa: v })}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Selecione a placa..." />
                            </SelectTrigger>
                            <SelectContent>
                                {veiculos.map((v) => (
                                    <SelectItem key={v.id} value={v.placa}>
                                        {v.placa} - {v.modelo}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            <X className="w-4 h-4 mr-1" /> Cancelar
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                            <Save className="w-4 h-4 mr-1" /> Salvar
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}