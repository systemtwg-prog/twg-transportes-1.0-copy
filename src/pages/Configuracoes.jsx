import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Upload, Save, Building2, Image } from "lucide-react";
import { toast } from "sonner";

export default function Configuracoes() {
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState(false);

    const { data: configs = [], isLoading } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    const [form, setForm] = useState({
        nome_empresa: "",
        logo_url: "",
        endereco: "",
        telefone: "",
        cnpj: "",
        email: "",
        ultimo_numero_ordem: 0
    });

    useEffect(() => {
        if (config.id) {
            setForm({
                nome_empresa: config.nome_empresa || "",
                logo_url: config.logo_url || "",
                endereco: config.endereco || "",
                telefone: config.telefone || "",
                cnpj: config.cnpj || "",
                email: config.email || "",
                ultimo_numero_ordem: config.ultimo_numero_ordem || 0
            });
        }
    }, [config.id]);

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (config.id) {
                return base44.entities.Configuracoes.update(config.id, data);
            } else {
                return base44.entities.Configuracoes.create(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
            toast.success("Configurações salvas com sucesso!");
        }
    });

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setForm({ ...form, logo_url: file_url });
        setUploading(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveMutation.mutate(form);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl shadow-lg">
                        <Settings className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>
                        <p className="text-slate-500">Personalize o sistema e dados da empresa</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Logo */}
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Image className="w-5 h-5 text-blue-600" />
                                Logotipo da Empresa
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-start gap-6">
                                <div className="w-48 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden">
                                    {form.logo_url ? (
                                        <img src={form.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <Image className="w-10 h-10 mx-auto mb-2" />
                                            <p className="text-sm">Sem logo</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <Label>Upload do Logo</Label>
                                        <p className="text-sm text-slate-500 mb-2">
                                            Recomendado: PNG ou JPG, fundo transparente, 300x100px
                                        </p>
                                        <div className="flex gap-3">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                disabled={uploading}
                                                className="flex-1"
                                            />
                                            {uploading && (
                                                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Ou cole a URL do logo</Label>
                                        <Input
                                            value={form.logo_url}
                                            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dados da Empresa */}
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="w-5 h-5 text-emerald-600" />
                                Dados da Empresa
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome da Empresa</Label>
                                    <Input
                                        value={form.nome_empresa}
                                        onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })}
                                        placeholder="TWG Transportes"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CNPJ</Label>
                                    <Input
                                        value={form.cnpj}
                                        onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                                        placeholder="00.000.000/0000-00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Endereço</Label>
                                <Input
                                    value={form.endereco}
                                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                                    placeholder="Rua, número, bairro, cidade/UF, CEP"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        placeholder="contato@empresa.com"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Numeração */}
                    <Card className="bg-white/80 border-0 shadow-lg">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                Numeração Automática
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-2">
                                <Label>Último Número de Ordem Gerado</Label>
                                <p className="text-sm text-slate-500 mb-2">
                                    A próxima ordem será: <strong>{(form.ultimo_numero_ordem || 0) + 1}</strong>
                                </p>
                                <Input
                                    type="number"
                                    value={form.ultimo_numero_ordem}
                                    onChange={(e) => setForm({ ...form, ultimo_numero_ordem: parseInt(e.target.value) || 0 })}
                                    className="w-48"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button 
                            type="submit" 
                            className="bg-gradient-to-r from-blue-600 to-indigo-600"
                            disabled={saveMutation.isPending}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}