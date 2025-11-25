import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { X, Save, Star, Clock } from "lucide-react";

export default function ClienteForm({ cliente, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        codigo: "",
        tipo: "remetente",
        razao_social: "",
        cnpj_cpf: "",
        contato: "",
        telefone: "",
        email: "",
        cep: "",
        endereco: "",
        bairro: "",
        cidade: "",
        uf: "",
        horario_funcionamento_inicio: "",
        horario_funcionamento_fim: "",
        horario_almoco_inicio: "",
        horario_almoco_fim: "",
        favorito: false,
        observacoes: ""
    });

    useEffect(() => {
        if (cliente) {
            setForm({
                codigo: cliente.codigo || "",
                tipo: cliente.tipo || "remetente",
                razao_social: cliente.razao_social || "",
                cnpj_cpf: cliente.cnpj_cpf || "",
                contato: cliente.contato || "",
                telefone: cliente.telefone || "",
                email: cliente.email || "",
                cep: cliente.cep || "",
                endereco: cliente.endereco || "",
                bairro: cliente.bairro || "",
                cidade: cliente.cidade || "",
                uf: cliente.uf || "",
                horario_funcionamento_inicio: cliente.horario_funcionamento_inicio || "",
                horario_funcionamento_fim: cliente.horario_funcionamento_fim || "",
                horario_almoco_inicio: cliente.horario_almoco_inicio || "",
                horario_almoco_fim: cliente.horario_almoco_fim || "",
                favorito: cliente.favorito || false,
                observacoes: cliente.observacoes || ""
            });
        }
    }, [cliente]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
                <CardTitle className="flex items-center justify-between text-slate-800">
                    <span>{cliente ? "Editar Cliente" : "Novo Cliente"}</span>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Código</Label>
                            <Input
                                value={form.codigo}
                                onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                                placeholder="Ex: 2123"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo *</Label>
                            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="remetente">Remetente</SelectItem>
                                    <SelectItem value="destinatario">Destinatário</SelectItem>
                                    <SelectItem value="ambos">Ambos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>CNPJ/CPF</Label>
                            <Input
                                value={form.cnpj_cpf}
                                onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })}
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                        <div className="flex items-center gap-3 pt-6">
                            <Switch
                                checked={form.favorito}
                                onCheckedChange={(v) => setForm({ ...form, favorito: v })}
                            />
                            <Label className="flex items-center gap-2 cursor-pointer">
                                <Star className={`w-4 h-4 ${form.favorito ? "text-yellow-500 fill-yellow-500" : "text-slate-400"}`} />
                                Favorito
                            </Label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Razão Social / Nome *</Label>
                        <Input
                            value={form.razao_social}
                            onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                            placeholder="Nome completo ou razão social"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Contato</Label>
                            <Input
                                value={form.contato}
                                onChange={(e) => setForm({ ...form, contato: e.target.value })}
                                placeholder="Nome do contato"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input
                                value={form.telefone}
                                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                                placeholder="(00) 0000-0000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="email@exemplo.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>CEP</Label>
                            <Input
                                value={form.cep}
                                onChange={(e) => setForm({ ...form, cep: e.target.value })}
                                placeholder="00000-000"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label>Endereço</Label>
                            <Input
                                value={form.endereco}
                                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                                placeholder="Rua, número, complemento"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Bairro</Label>
                            <Input
                                value={form.bairro}
                                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                                placeholder="Bairro"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Cidade</Label>
                            <Input
                                value={form.cidade}
                                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                                placeholder="Cidade"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>UF</Label>
                            <Input
                                value={form.uf}
                                onChange={(e) => setForm({ ...form, uf: e.target.value })}
                                placeholder="SP"
                                maxLength={2}
                            />
                        </div>
                    </div>

                    {/* Horários */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Horários de Funcionamento
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Abre às</Label>
                                <Input
                                    type="time"
                                    value={form.horario_funcionamento_inicio}
                                    onChange={(e) => setForm({ ...form, horario_funcionamento_inicio: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha às</Label>
                                <Input
                                    type="time"
                                    value={form.horario_funcionamento_fim}
                                    onChange={(e) => setForm({ ...form, horario_funcionamento_fim: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Almoço de</Label>
                                <Input
                                    type="time"
                                    value={form.horario_almoco_inicio}
                                    onChange={(e) => setForm({ ...form, horario_almoco_inicio: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Até</Label>
                                <Input
                                    type="time"
                                    value={form.horario_almoco_fim}
                                    onChange={(e) => setForm({ ...form, horario_almoco_fim: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Observações</Label>
                        <Textarea
                            value={form.observacoes}
                            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                            placeholder="Observações adicionais..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                            <Save className="w-4 h-4 mr-2" />
                            Salvar
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}