import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
    Settings, LayoutGrid, Save, FileText, Users, Package, Car, 
    Navigation, Award, Bell, Truck, Search, Database, Printer, UserCheck, Home
} from "lucide-react";
import { toast } from "sonner";

const TODOS_MODULOS = [
    { id: "Home", nome: "Home", icon: Home, descricao: "Página inicial do sistema" },
    { id: "ComprovantesInternos", nome: "Comprovantes de Entrega", icon: FileText, descricao: "Gerenciar comprovantes de entrega" },
    { id: "ComprovantesCtes", nome: "Comprovantes CTEs", icon: FileText, descricao: "Gerenciar CTEs" },
    { id: "NotaDeposito", nome: "Nota Depósito", icon: FileText, descricao: "Notas de depósito" },
    { id: "ColetasDiarias", nome: "Coletas Diárias", icon: FileText, descricao: "Gerenciar coletas diárias" },
    { id: "AdicionarColetaDiaria", nome: "Adicionar Coletas", icon: Package, descricao: "Adicionar novas coletas" },
    { id: "Clientes", nome: "Clientes", icon: Users, descricao: "Cadastro de clientes" },
    { id: "Transportadoras", nome: "Transportadoras", icon: Package, descricao: "Cadastro de transportadoras" },
    { id: "ExtratorGoogle", nome: "Extrator Google", icon: Search, descricao: "Extrair dados do Google" },
    { id: "Motoristas", nome: "Colaboradores", icon: Users, descricao: "Cadastro de colaboradores" },
    { id: "Veiculos", nome: "Veículos", icon: Car, descricao: "Cadastro de veículos" },
    { id: "BuscaMultas", nome: "Busca de Multas", icon: Car, descricao: "Consultar multas de veículos" },
    { id: "Avisos", nome: "Avisos", icon: Bell, descricao: "Gerenciar avisos do sistema" },
    { id: "NotasFiscais", nome: "Notas Fiscais", icon: FileText, descricao: "Gerenciar notas fiscais" },
    { id: "ServicosSNF", nome: "Serviços S/NF", icon: FileText, descricao: "Serviços sem nota fiscal" },
    { id: "ClientesSNF", nome: "Clientes S/NF", icon: Users, descricao: "Clientes para serviços S/NF" },
    { id: "MascaraRomaneio", nome: "Máscara Romaneio", icon: FileText, descricao: "Gerar romaneios" },
    { id: "RomaneiosGerados", nome: "Romaneios Gerados", icon: Package, descricao: "Visualizar romaneios" },
    { id: "ImpressaoRelatorio", nome: "Impressão Relatório", icon: Printer, descricao: "Imprimir relatórios" },
    { id: "RotasGPS", nome: "Rotas GPS", icon: Navigation, descricao: "Gerenciar rotas" },
    { id: "OrdensColeta", nome: "Ordens de Coleta", icon: Package, descricao: "Gerenciar ordens de coleta" },
    { id: "Rastreamento", nome: "Rastreamento", icon: Navigation, descricao: "Rastrear entregas" },
    { id: "Relatorios", nome: "Relatórios", icon: FileText, descricao: "Relatórios gerais" },
    { id: "RelatorioMotoristas", nome: "Performance", icon: Award, descricao: "Performance de motoristas" },
    { id: "Configuracoes", nome: "Configurações", icon: Settings, descricao: "Configurações do sistema" },
    { id: "AprovacaoUsuarios", nome: "Gerenciar Usuários", icon: UserCheck, descricao: "Aprovar e gerenciar usuários" },
    { id: "Backup", nome: "Backup", icon: Database, descricao: "Backup de dados" },
    { id: "PersonalizarHome", nome: "Personalizar Home", icon: LayoutGrid, descricao: "Personalizar página inicial" },
    { id: "ImportacaoDocumentos", nome: "Importar Documentos", icon: FileText, descricao: "Importar documentos" },
    { id: "ConfiguracaoModulos", nome: "Configuração Módulos", icon: Settings, descricao: "Configurar módulos ativos" },
];

export default function ConfiguracaoModulos() {
    const [modulosAtivos, setModulosAtivos] = useState([]);
    const [saving, setSaving] = useState(false);
    const queryClient = useQueryClient();

    const { data: config } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    useEffect(() => {
        if (config && config.length > 0) {
            const modulosSalvos = config[0].modulos_ativos;
            if (modulosSalvos && Array.isArray(modulosSalvos)) {
                setModulosAtivos(modulosSalvos);
            } else {
                // Se não houver configuração, ativar todos por padrão
                setModulosAtivos(TODOS_MODULOS.map(m => m.id));
            }
        } else {
            setModulosAtivos(TODOS_MODULOS.map(m => m.id));
        }
    }, [config]);

    const toggleModulo = (moduloId) => {
        setModulosAtivos(prev => 
            prev.includes(moduloId) 
                ? prev.filter(id => id !== moduloId)
                : [...prev, moduloId]
        );
    };

    const selecionarTodos = () => {
        setModulosAtivos(TODOS_MODULOS.map(m => m.id));
    };

    const desmarcarTodos = () => {
        // Manter apenas os essenciais
        setModulosAtivos(["Home", "Configuracoes", "ConfiguracaoModulos"]);
    };

    const handleSalvar = async () => {
        setSaving(true);
        try {
            if (config && config.length > 0) {
                await base44.entities.Configuracoes.update(config[0].id, {
                    modulos_ativos: modulosAtivos
                });
            } else {
                await base44.entities.Configuracoes.create({
                    modulos_ativos: modulosAtivos
                });
            }
            queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
            toast.success("Configuração de módulos salva com sucesso!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar configuração");
        }
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                            <LayoutGrid className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Configuração de Módulos</h1>
                            <p className="text-slate-500">Ative ou desative módulos do sistema</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={selecionarTodos}>
                            Selecionar Todos
                        </Button>
                        <Button variant="outline" onClick={desmarcarTodos}>
                            Desmarcar Todos
                        </Button>
                        <Button 
                            onClick={handleSalvar}
                            disabled={saving}
                            className="bg-gradient-to-r from-indigo-500 to-purple-600"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? "Salvando..." : "Salvar Configuração"}
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <LayoutGrid className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Módulos Ativos</p>
                                <p className="text-2xl font-bold text-green-600">{modulosAtivos.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-slate-100 rounded-xl">
                                <LayoutGrid className="w-6 h-6 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Módulos Inativos</p>
                                <p className="text-2xl font-bold text-slate-600">{TODOS_MODULOS.length - modulosAtivos.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/60 border-0 shadow-md">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <LayoutGrid className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total de Módulos</p>
                                <p className="text-2xl font-bold text-blue-600">{TODOS_MODULOS.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Módulos Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TODOS_MODULOS.map((modulo) => {
                        const IconComponent = modulo.icon;
                        const isAtivo = modulosAtivos.includes(modulo.id);
                        
                        return (
                            <Card 
                                key={modulo.id} 
                                className={`border-2 transition-all cursor-pointer ${
                                    isAtivo 
                                        ? "border-green-500 bg-green-50/50" 
                                        : "border-slate-200 bg-white/60 opacity-60"
                                }`}
                                onClick={() => toggleModulo(modulo.id)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isAtivo ? "bg-green-100" : "bg-slate-100"}`}>
                                                <IconComponent className={`w-5 h-5 ${isAtivo ? "text-green-600" : "text-slate-400"}`} />
                                            </div>
                                            <div>
                                                <p className={`font-semibold ${isAtivo ? "text-slate-800" : "text-slate-500"}`}>
                                                    {modulo.nome}
                                                </p>
                                                <p className="text-xs text-slate-400">{modulo.descricao}</p>
                                            </div>
                                        </div>
                                        <Switch 
                                            checked={isAtivo}
                                            onCheckedChange={() => toggleModulo(modulo.id)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}