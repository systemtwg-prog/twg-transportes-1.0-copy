import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Lock, Unlock, Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Ban, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS = {
  trial: "bg-blue-100 text-blue-800 border-blue-200",
  ativa: "bg-emerald-100 text-emerald-800 border-emerald-200",
  suspensa: "bg-amber-100 text-amber-800 border-amber-200",
  bloqueada: "bg-red-100 text-red-800 border-red-200",
  cancelada: "bg-slate-100 text-slate-800 border-slate-200",
};

const STATUS_LABELS = {
  trial: "Trial",
  ativa: "Ativa",
  suspensa: "Suspensa",
  bloqueada: "Bloqueada",
  cancelada: "Cancelada",
};

export default function ConfiguracoesProprietario() {
  const queryClient = useQueryClient();

  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ["current-user-proprietario"],
    queryFn: async () => {
      try { return await base44.auth.me(); }
      catch { return null; }
    }
  });

  const { data: licencas = [], isLoading } = useQuery({
    queryKey: ["licencas"],
    queryFn: () => base44.entities.Licenca.list("-created_date", 1),
  });

  const licenca = licencas[0] || {};

  const [form, setForm] = useState({
    status: "trial",
    data_vencimento: "",
    modo_trial: true,
    prazo_trial_dias: 15,
    data_inicio_trial: "",
    observacoes: ""
  });

  useEffect(() => {
    if (licenca.id) {
      setForm({
        status: licenca.status || "trial",
        data_vencimento: licenca.data_vencimento || "",
        modo_trial: licenca.modo_trial !== false,
        prazo_trial_dias: licenca.prazo_trial_dias || 15,
        data_inicio_trial: licenca.data_inicio_trial || "",
        observacoes: licenca.observacoes || ""
      });
    }
  }, [licenca.id]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (licenca.id) {
        return base44.entities.Licenca.update(licenca.id, data);
      } else {
        return base44.entities.Licenca.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licencas"] });
      toast.success("Licença atualizada com sucesso!");
    }
  });

  const formatDate = (d) => {
    if (!d) return "-";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); }
    catch { return d; }
  };

  const isProprietario = currentUser?.role === "proprietario" || currentUser?.tipo_usuario === "proprietario";
  const isAdmin = currentUser?.role === "admin";
  const temAcesso = isProprietario || isAdmin;

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!temAcesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <Card className="max-w-md bg-white/90 border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
            <p className="text-slate-500">Apenas o Proprietário ou Administrador Master podem acessar estas configurações.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = () => saveMutation.mutate(form);
  const handleAtivar = () => saveMutation.mutate({ ...form, status: "ativa" });
  const handleBloquear = () => saveMutation.mutate({ ...form, status: "bloqueada", bloqueada_em: new Date().toISOString().split("T")[0] });
  const handleCancelar = () => saveMutation.mutate({ ...form, status: "cancelada" });
  const handleLiberar = () => saveMutation.mutate({ ...form, status: "ativa" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg">
            <Key className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Configurações do Proprietário</h1>
            <p className="text-slate-500">Gerencie a licença e o acesso ao sistema</p>
          </div>
        </div>

        {/* Situação da Licença */}
        <Card className="bg-white/90 backdrop-blur border-0 shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Situação da Licença
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <Badge className={`${STATUS_COLORS[form.status] || ""} border text-sm px-3 py-1`}>
                  {STATUS_LABELS[form.status] || form.status}
                </Badge>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1">Vencimento</p>
                <p className="text-lg font-bold text-slate-800">{formatDate(form.data_vencimento)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1">Modo Trial</p>
                <p className="text-lg font-bold text-slate-800">{form.modo_trial ? "Sim" : "Não"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl text-center">
                <p className="text-xs text-slate-500 mb-1">Prazo Trial</p>
                <p className="text-lg font-bold text-slate-800">{form.prazo_trial_dias} dias</p>
              </div>
            </div>

            {/* Status bloqueada/cancelada - aviso */}
            {(form.status === "bloqueada" || form.status === "cancelada") && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">
                      {form.status === "bloqueada" ? "Licença Bloqueada" : "Licença Cancelada"}
                    </p>
                    <p className="text-sm text-red-700">
                      O acesso às funcionalidades operacionais está restrito. 
                      Regularize a situação para liberar o sistema.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ações rápidas */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAtivar} disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4 mr-1" /> Ativar Licença
              </Button>
              <Button onClick={handleBloquear} disabled={saveMutation.isPending} className="bg-red-600 hover:bg-red-700">
                <Ban className="w-4 h-4 mr-1" /> Bloquear Licença
              </Button>
              <Button onClick={handleLiberar} disabled={saveMutation.isPending} variant="outline" className="border-emerald-500 text-emerald-700">
                <Unlock className="w-4 h-4 mr-1" /> Liberar Sistema
              </Button>
              <Button onClick={handleCancelar} disabled={saveMutation.isPending} variant="outline" className="border-slate-400 text-slate-700">
                <XCircle className="w-4 h-4 mr-1" /> Cancelar Licença
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card className="bg-white/90 backdrop-blur border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              Configurações da Licença
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={form.data_vencimento}
                  onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo do Trial (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={form.prazo_trial_dias}
                  onChange={(e) => setForm({ ...form, prazo_trial_dias: parseInt(e.target.value) || 15 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <Label>Ativar Modo Trial</Label>
                <p className="text-sm text-slate-500">Permitir acesso em modo de avaliação</p>
              </div>
              <Switch
                checked={form.modo_trial}
                onCheckedChange={(v) => setForm({ ...form, modo_trial: v })}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Observações sobre a licença..."
              />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {saveMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}