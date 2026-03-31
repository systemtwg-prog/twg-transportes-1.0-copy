import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2 } from "lucide-react";

const EMPTY_FORM = {
  nome: "", cnpj_cpf: "", email: "", telefone: "",
  frete_peso: "", percentual_ad_valorem: "", pedagio: "",
  despacho: "", frete_minimo: "", outros: "", observacoes: ""
};

export default function Bono() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["ClienteBono"],
    queryFn: () => base44.entities.ClienteBono.list("-created_date")
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editingId
        ? base44.entities.ClienteBono.update(editingId, data)
        : base44.entities.ClienteBono.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["ClienteBono"]);
      setOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClienteBono.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["ClienteBono"])
  });

  const handleEdit = (c) => {
    setForm({ ...EMPTY_FORM, ...c });
    setEditingId(c.id);
    setOpen(true);
  };

  const handleNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setOpen(true);
  };

  const handleSave = () => {
    const data = {
      ...form,
      frete_peso: parseFloat(form.frete_peso) || 0,
      percentual_ad_valorem: parseFloat(form.percentual_ad_valorem) || 0,
      pedagio: parseFloat(form.pedagio) || 0,
      despacho: parseFloat(form.despacho) || 0,
      frete_minimo: parseFloat(form.frete_minimo) || 0,
      outros: parseFloat(form.outros) || 0,
    };
    saveMutation.mutate(data);
  };

  const fmt = (v) => v > 0 ? `R$ ${Number(v).toFixed(2)}` : "-";
  const fmtPct = (v) => v > 0 ? `${Number(v).toFixed(2)}%` : "-";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bono</h1>
          <p className="text-slate-500 text-sm">Clientes e tabelas de preço</p>
        </div>
        <Button onClick={handleNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : clientes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">Nenhum cliente cadastrado</p>
          <p className="text-sm">Clique em "Novo Cliente" para começar</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">CNPJ/CPF</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-right">Frete Peso</th>
                <th className="px-4 py-3 text-right">Ad Valorem</th>
                <th className="px-4 py-3 text-right">Pedágio</th>
                <th className="px-4 py-3 text-right">Despacho</th>
                <th className="px-4 py-3 text-right">Frete Mín.</th>
                <th className="px-4 py-3 text-right">Outros</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c, i) => (
                <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{c.cnpj_cpf || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.telefone || "-"}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmt(c.frete_peso)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{fmtPct(c.percentual_ad_valorem)}</td>
                  <td className="px-4 py-3 text-right">{fmt(c.pedagio)}</td>
                  <td className="px-4 py-3 text-right">{fmt(c.despacho)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{fmt(c.frete_minimo)}</td>
                  <td className="px-4 py-3 text-right">{fmt(c.outros)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      <Button size="icon" variant="outline" onClick={() => handleEdit(c)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => deleteMutation.mutate(c.id)} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label>CNPJ/CPF</Label>
              <Input value={form.cnpj_cpf} onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
            </div>

            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-slate-700 border-b pb-1 mb-2 mt-2">Tabela de Preços</p>
            </div>

            <div>
              <Label>Frete Peso (R$/kg)</Label>
              <Input type="number" step="0.01" value={form.frete_peso} onChange={(e) => setForm({ ...form, frete_peso: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Ad Valorem (%)</Label>
              <Input type="number" step="0.01" value={form.percentual_ad_valorem} onChange={(e) => setForm({ ...form, percentual_ad_valorem: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Pedágio (R$)</Label>
              <Input type="number" step="0.01" value={form.pedagio} onChange={(e) => setForm({ ...form, pedagio: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Despacho (R$)</Label>
              <Input type="number" step="0.01" value={form.despacho} onChange={(e) => setForm({ ...form, despacho: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Frete Mínimo (R$)</Label>
              <Input type="number" step="0.01" value={form.frete_minimo} onChange={(e) => setForm({ ...form, frete_minimo: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Outros (R$)</Label>
              <Input type="number" step="0.01" value={form.outros} onChange={(e) => setForm({ ...form, outros: e.target.value })} placeholder="0.00" />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações gerais..." rows={3} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} disabled={!form.nome || saveMutation.isPending} className="flex-1">
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}