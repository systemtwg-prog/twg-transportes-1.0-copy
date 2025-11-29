import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
    LayoutGrid, Package, Users, FileText, TrendingUp,
    Clock, Truck, CheckCircle, Navigation, Car, Award,
    Settings, Save, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const WIDGETS_DISPONIVEIS = [
    { id: "stats", nome: "Estatísticas Rápidas", descricao: "Pendentes, Em Andamento, Entregues, Total", icon: TrendingUp },
    { id: "menu", nome: "Menu de Acesso Rápido", descricao: "Cards de acesso às páginas", icon: LayoutGrid },
    { id: "ultimas_ordens", nome: "Últimas Ordens", descricao: "Lista das ordens mais recentes", icon: Package },
    { id: "clientes", nome: "Clientes Favoritos", descricao: "Lista de clientes favoritos para acesso rápido", icon: Users },
    { id: "colaboradores", nome: "Colaboradores Ativos", descricao: "Lista de motoristas/colaboradores ativos", icon: Truck },
    { id: "calendario", nome: "Coletas do Dia", descricao: "Coletas programadas para hoje", icon: Clock },
];

export default function PersonalizarHome() {
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState(false);

    const { data: user, isLoading } = useQuery({
        queryKey: ["current-user-personalize"],
        queryFn: async () => {
            try {
                return await base44.auth.me();
            } catch (e) {
                console.log("Erro ao carregar usuário:", e);
                return null;
            }
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const [widgets, setWidgets] = useState(["stats", "menu", "ultimas_ordens"]);

    useEffect(() => {
        if (user?.widgets_home?.length > 0) {
            setWidgets(user.widgets_home);
        }
    }, [user]);

    const handleToggleWidget = (widgetId) => {
        if (widgets.includes(widgetId)) {
            setWidgets(widgets.filter(w => w !== widgetId));
        } else {
            setWidgets([...widgets, widgetId]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        await base44.auth.updateMe({ widgets_home: widgets });
        queryClient.invalidateQueries({ queryKey: ["current-user"] });
        toast.success("Preferências salvas!");
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
                            <LayoutGrid className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Personalizar Home</h1>
                            <p className="text-slate-500">Escolha quais widgets exibir na sua página inicial</p>
                        </div>
                    </div>
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "Salvando..." : "Salvar Preferências"}
                    </Button>
                </div>

                {/* Widgets */}
                <div className="grid gap-4">
                    {WIDGETS_DISPONIVEIS.map((widget, index) => (
                        <motion.div
                            key={widget.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card className={`bg-white/90 backdrop-blur border-0 shadow-md transition-all ${
                                widgets.includes(widget.id) ? "ring-2 ring-violet-500" : ""
                            }`}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${
                                                widgets.includes(widget.id) 
                                                    ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                                                    : "bg-slate-100 text-slate-400"
                                            }`}>
                                                <widget.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-800">{widget.nome}</h3>
                                                <p className="text-sm text-slate-500">{widget.descricao}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {widgets.includes(widget.id) ? (
                                                <Eye className="w-5 h-5 text-violet-600" />
                                            ) : (
                                                <EyeOff className="w-5 h-5 text-slate-400" />
                                            )}
                                            <Switch
                                                checked={widgets.includes(widget.id)}
                                                onCheckedChange={() => handleToggleWidget(widget.id)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Preview */}
                <Card className="bg-white/90 backdrop-blur border-0 shadow-lg">
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Eye className="w-5 h-5 text-violet-600" />
                            Pré-visualização
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {widgets.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">
                                    Nenhum widget selecionado
                                </p>
                            ) : (
                                widgets.map(widgetId => {
                                    const widget = WIDGETS_DISPONIVEIS.find(w => w.id === widgetId);
                                    return widget ? (
                                        <div key={widgetId} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-3">
                                                <widget.icon className="w-5 h-5 text-violet-600" />
                                                <span className="font-medium text-slate-700">{widget.nome}</span>
                                            </div>
                                        </div>
                                    ) : null;
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}