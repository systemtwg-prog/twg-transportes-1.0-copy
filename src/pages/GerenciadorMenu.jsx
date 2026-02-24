import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
    Home, Package, FileText, Users, User, Car, Navigation, Award, Settings, 
    LayoutGrid, UserCheck, Bell, Search, Database, Printer, Truck, Building2,
    Camera, ClipboardList, AlertTriangle, Upload, Mail, DollarSign, Eye, EyeOff,
    Save, ChevronDown, ChevronUp, Monitor, Smartphone
} from "lucide-react";
import { toast } from "sonner";

// Lista completa de todas as páginas do sistema
const TODAS_PAGINAS = [
    // Principal
    { id: "HomeDesktop", nome: "Início (Desktop)", icon: Home, categoria: "principal", tipo: "menu" },
    { id: "Home", nome: "Início (Mobile)", icon: Home, categoria: "principal", tipo: "menu" },
    
    // Operacional
    { id: "NotaDeposito", nome: "Nota Depósito", icon: Camera, categoria: "operacional", tipo: "ambos" },
    { id: "ComprovantesEntrega", nome: "Comprovantes Entrega", icon: Upload, categoria: "operacional", tipo: "ambos" },
    { id: "CTEs", nome: "CTEs", icon: FileText, categoria: "operacional", tipo: "ambos" },
    { id: "ColetasDiarias", nome: "Coletas Diárias", icon: Package, categoria: "operacional", tipo: "ambos" },
    { id: "AdicionarColetaDiaria", nome: "Adicionar Coletas", icon: Package, categoria: "operacional", tipo: "menu" },
    { id: "OrdensColeta", nome: "Ordens de Coleta", icon: ClipboardList, categoria: "operacional", tipo: "ambos" },
    
    // Documentos
    { id: "ComprovantesCtes", nome: "Conhecimento de Transportes", icon: FileText, categoria: "documentos", tipo: "menu" },
    { id: "Documentos", nome: "Documentos", icon: FileText, categoria: "documentos", tipo: "ambos" },
    { id: "NotasFiscais", nome: "Notas Fiscais", icon: FileText, categoria: "documentos", tipo: "ambos" },
    { id: "ConsultaSEFAZ", nome: "Consulta SEFAZ", icon: Search, categoria: "documentos", tipo: "menu" },
    { id: "MascaraRomaneio", nome: "Máscara Romaneio", icon: Truck, categoria: "documentos", tipo: "ambos" },
    { id: "RomaneiosGerados", nome: "Romaneios Gerados", icon: Package, categoria: "documentos", tipo: "ambos" },
    { id: "ImpressaoRelatorio", nome: "Impressão Relatório", icon: Printer, categoria: "documentos", tipo: "menu" },
    { id: "ServicosSNF", nome: "Serviços S/NF", icon: FileText, categoria: "documentos", tipo: "menu" },
    
    // Cadastros
    { id: "Clientes", nome: "Clientes", icon: Users, categoria: "cadastros", tipo: "ambos" },
    { id: "ClientesSNF", nome: "Clientes S/NF", icon: Users, categoria: "cadastros", tipo: "menu" },
    { id: "Destinatarios", nome: "Destinatários", icon: Users, categoria: "cadastros", tipo: "menu" },
    { id: "Transportadoras", nome: "Transportadoras", icon: Building2, categoria: "cadastros", tipo: "ambos" },
    { id: "Motoristas", nome: "Colaboradores", icon: User, categoria: "cadastros", tipo: "ambos" },
    { id: "Veiculos", nome: "Veículos", icon: Car, categoria: "cadastros", tipo: "ambos" },
    
    // Monitoramento
    { id: "RotasGPS", nome: "Rotas GPS", icon: Navigation, categoria: "monitoramento", tipo: "menu" },
    { id: "Rastreamento", nome: "Rastreamento", icon: Navigation, categoria: "monitoramento", tipo: "ambos" },
    { id: "BuscaMultas", nome: "Busca Multas", icon: AlertTriangle, categoria: "monitoramento", tipo: "menu" },
    
    // Ferramentas
    { id: "ExtratorGoogle", nome: "Extrator Google", icon: Search, categoria: "ferramentas", tipo: "menu" },
    { id: "ImportacaoDocumentos", nome: "Importar Documentos", icon: Upload, categoria: "ferramentas", tipo: "menu" },
    { id: "EmailManager", nome: "Emails", icon: Mail, categoria: "ferramentas", tipo: "menu" },
    { id: "Precificacao", nome: "Precificação", icon: DollarSign, categoria: "ferramentas", tipo: "ambos" },
    
    // Relatórios
    { id: "Relatorios", nome: "Relatórios", icon: FileText, categoria: "relatorios", tipo: "ambos" },
    { id: "RelatorioMotoristas", nome: "Performance", icon: Award, categoria: "relatorios", tipo: "menu" },
    
    // Admin
    { id: "Avisos", nome: "Avisos", icon: Bell, categoria: "admin", tipo: "menu" },
    { id: "Configuracoes", nome: "Configurações", icon: Settings, categoria: "admin", tipo: "ambos" },
    { id: "AprovacaoUsuarios", nome: "Gerenciar Usuários", icon: UserCheck, categoria: "admin", tipo: "menu" },
    { id: "Backup", nome: "Backup", icon: Database, categoria: "admin", tipo: "menu" },
    { id: "PersonalizarHome", nome: "Personalizar Home", icon: LayoutGrid, categoria: "admin", tipo: "menu" },
    { id: "ConfiguracaoModulos", nome: "Config. Módulos", icon: LayoutGrid, categoria: "admin", tipo: "menu" },
    { id: "GerenciadorMenu", nome: "Gerenciar Menu", icon: LayoutGrid, categoria: "admin", tipo: "menu" },
];

const CATEGORIAS = [
    { id: "principal", nome: "Principal" },
    { id: "operacional", nome: "Operacional" },
    { id: "documentos", nome: "Documentos" },
    { id: "cadastros", nome: "Cadastros" },
    { id: "monitoramento", nome: "Monitoramento" },
    { id: "ferramentas", nome: "Ferramentas" },
    { id: "relatorios", nome: "Relatórios" },
    { id: "admin", nome: "Administração" },
];

export default function GerenciadorMenu() {
    const queryClient = useQueryClient();
    const [expandedCategories, setExpandedCategories] = useState(["principal"]);
    
    // Estados de configuração
    const [paginasMenuVisiveis, setPaginasMenuVisiveis] = useState([]);
    const [botoesHomeVisiveis, setBotoesHomeVisiveis] = useState([]);
    const [botoesHomeMobileVisiveis, setBotoesHomeMobileVisiveis] = useState([]);
    
    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes-menu"],
        queryFn: () => base44.entities.Configuracoes.list()
    });
    
    const config = configs[0] || {};
    
    useEffect(() => {
        // Carregar configurações salvas
        if (config.modulos_ativos) {
            setPaginasMenuVisiveis(config.modulos_ativos);
        } else {
            // Por padrão, todas visíveis
            setPaginasMenuVisiveis(TODAS_PAGINAS.map(p => p.id));
        }
        
        if (config.botoes_home_pc) {
            setBotoesHomeVisiveis(config.botoes_home_pc);
        } else {
            // Padrão: botões principais
            const padrao = TODAS_PAGINAS.filter(p => p.tipo === "ambos" || p.tipo === "home").map(p => p.id);
            setBotoesHomeVisiveis(padrao);
        }
        
        if (config.botoes_home_mobile) {
            setBotoesHomeMobileVisiveis(config.botoes_home_mobile);
        } else {
            const padrao = TODAS_PAGINAS.filter(p => p.tipo === "ambos" || p.tipo === "home").map(p => p.id);
            setBotoesHomeMobileVisiveis(padrao);
        }
    }, [config]);
    
    const updateConfigMutation = useMutation({
        mutationFn: async (data) => {
            if (config.id) {
                return await base44.entities.Configuracoes.update(config.id, data);
            } else {
                return await base44.entities.Configuracoes.create(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["configuracoes-menu"] });
            queryClient.invalidateQueries({ queryKey: ["configuracoes"] });
            toast.success("Configurações salvas com sucesso!");
        }
    });
    
    const handleSalvar = () => {
        updateConfigMutation.mutate({
            modulos_ativos: paginasMenuVisiveis,
            botoes_home_pc: botoesHomeVisiveis,
            botoes_home_mobile: botoesHomeMobileVisiveis
        });
    };
    
    const toggleCategoria = (catId) => {
        if (expandedCategories.includes(catId)) {
            setExpandedCategories(expandedCategories.filter(c => c !== catId));
        } else {
            setExpandedCategories([...expandedCategories, catId]);
        }
    };
    
    const togglePaginaMenu = (pageId) => {
        if (paginasMenuVisiveis.includes(pageId)) {
            setPaginasMenuVisiveis(paginasMenuVisiveis.filter(p => p !== pageId));
        } else {
            setPaginasMenuVisiveis([...paginasMenuVisiveis, pageId]);
        }
    };
    
    const toggleBotaoHome = (pageId, tipo) => {
        if (tipo === "pc") {
            if (botoesHomeVisiveis.includes(pageId)) {
                setBotoesHomeVisiveis(botoesHomeVisiveis.filter(p => p !== pageId));
            } else {
                setBotoesHomeVisiveis([...botoesHomeVisiveis, pageId]);
            }
        } else {
            if (botoesHomeMobileVisiveis.includes(pageId)) {
                setBotoesHomeMobileVisiveis(botoesHomeMobileVisiveis.filter(p => p !== pageId));
            } else {
                setBotoesHomeMobileVisiveis([...botoesHomeMobileVisiveis, pageId]);
            }
        }
    };
    
    const selecionarTodosMenu = () => {
        setPaginasMenuVisiveis(TODAS_PAGINAS.map(p => p.id));
    };
    
    const desmarcarTodosMenu = () => {
        setPaginasMenuVisiveis([]);
    };
    
    const selecionarTodosHome = (tipo) => {
        const todas = TODAS_PAGINAS.map(p => p.id);
        if (tipo === "pc") {
            setBotoesHomeVisiveis(todas);
        } else {
            setBotoesHomeMobileVisiveis(todas);
        }
    };
    
    const desmarcarTodosHome = (tipo) => {
        if (tipo === "pc") {
            setBotoesHomeVisiveis([]);
        } else {
            setBotoesHomeMobileVisiveis([]);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                            <LayoutGrid className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Gerenciador de Menu</h1>
                            <p className="text-slate-500">Controle a visibilidade de páginas no menu e na Home</p>
                        </div>
                    </div>
                    <Button 
                        onClick={handleSalvar}
                        disabled={updateConfigMutation.isPending}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        {updateConfigMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                </div>

                <Tabs defaultValue="menu" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-12">
                        <TabsTrigger value="menu" className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4" />
                            Menu Principal
                        </TabsTrigger>
                        <TabsTrigger value="home-pc" className="flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            Botões Home (PC)
                        </TabsTrigger>
                        <TabsTrigger value="home-mobile" className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4" />
                            Botões Home (Mobile)
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab Menu Principal */}
                    <TabsContent value="menu" className="space-y-4 mt-4">
                        <Card className="bg-white/90 backdrop-blur border-0 shadow-lg">
                            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <LayoutGrid className="w-5 h-5 text-blue-600" />
                                        Páginas no Menu Principal
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={selecionarTodosMenu}>
                                            Selecionar Todas
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={desmarcarTodosMenu}>
                                            Desmarcar Todas
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                    {paginasMenuVisiveis.length} de {TODAS_PAGINAS.length} páginas visíveis no menu
                                </p>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-3">
                                    {CATEGORIAS.map((categoria) => {
                                        const paginas = TODAS_PAGINAS.filter(p => p.categoria === categoria.id);
                                        if (paginas.length === 0) return null;
                                        
                                        const expanded = expandedCategories.includes(categoria.id);
                                        const visiveis = paginas.filter(p => paginasMenuVisiveis.includes(p.id)).length;
                                        
                                        return (
                                            <div key={categoria.id} className="border rounded-lg overflow-hidden">
                                                <button
                                                    onClick={() => toggleCategoria(categoria.id)}
                                                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        <span className="font-semibold text-slate-800">{categoria.nome}</span>
                                                        <Badge variant="outline">{visiveis}/{paginas.length}</Badge>
                                                    </div>
                                                </button>
                                                
                                                {expanded && (
                                                    <div className="p-4 space-y-2 bg-white">
                                                        {paginas.map((pagina) => {
                                                            const visivel = paginasMenuVisiveis.includes(pagina.id);
                                                            return (
                                                                <div 
                                                                    key={pagina.id}
                                                                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                                                        visivel ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <pagina.icon className={`w-5 h-5 ${visivel ? "text-blue-600" : "text-slate-400"}`} />
                                                                        <span className={`font-medium ${visivel ? "text-slate-800" : "text-slate-500"}`}>
                                                                            {pagina.nome}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {visivel ? <Eye className="w-4 h-4 text-blue-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                                                                        <Switch
                                                                            checked={visivel}
                                                                            onCheckedChange={() => togglePaginaMenu(pagina.id)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Botões Home PC */}
                    <TabsContent value="home-pc" className="space-y-4 mt-4">
                        <Card className="bg-white/90 backdrop-blur border-0 shadow-lg">
                            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-violet-50">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Monitor className="w-5 h-5 text-purple-600" />
                                        Botões da Home (Versão Desktop)
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => selecionarTodosHome("pc")}>
                                            Selecionar Todas
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => desmarcarTodosHome("pc")}>
                                            Desmarcar Todas
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                    {botoesHomeVisiveis.length} de {TODAS_PAGINAS.length} páginas visíveis na Home (Desktop)
                                </p>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-3">
                                    {CATEGORIAS.map((categoria) => {
                                        const paginas = TODAS_PAGINAS.filter(p => p.categoria === categoria.id);
                                        if (paginas.length === 0) return null;
                                        
                                        const visiveis = paginas.filter(p => botoesHomeVisiveis.includes(p.id)).length;
                                        
                                        return (
                                            <div key={categoria.id} className="border rounded-lg p-4 bg-slate-50">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="font-semibold text-slate-700">{categoria.nome}</span>
                                                    <Badge variant="outline">{visiveis}/{paginas.length}</Badge>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {paginas.map((pagina) => {
                                                        const visivel = botoesHomeVisiveis.includes(pagina.id);
                                                        return (
                                                            <div 
                                                                key={pagina.id}
                                                                className={`flex items-center justify-between p-2 rounded border transition-all ${
                                                                    visivel ? "border-purple-500 bg-purple-50" : "border-slate-200 bg-white"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <pagina.icon className={`w-4 h-4 ${visivel ? "text-purple-600" : "text-slate-400"}`} />
                                                                    <span className={`text-sm ${visivel ? "text-slate-800" : "text-slate-500"}`}>
                                                                        {pagina.nome}
                                                                    </span>
                                                                </div>
                                                                <Switch
                                                                    checked={visivel}
                                                                    onCheckedChange={() => toggleBotaoHome(pagina.id, "pc")}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab Botões Home Mobile */}
                    <TabsContent value="home-mobile" className="space-y-4 mt-4">
                        <Card className="bg-white/90 backdrop-blur border-0 shadow-lg">
                            <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Smartphone className="w-5 h-5 text-green-600" />
                                        Botões da Home (Versão Mobile)
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => selecionarTodosHome("mobile")}>
                                            Selecionar Todas
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => desmarcarTodosHome("mobile")}>
                                            Desmarcar Todas
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                    {botoesHomeMobileVisiveis.length} de {TODAS_PAGINAS.length} páginas visíveis na Home (Mobile)
                                </p>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-3">
                                    {CATEGORIAS.map((categoria) => {
                                        const paginas = TODAS_PAGINAS.filter(p => p.categoria === categoria.id);
                                        if (paginas.length === 0) return null;
                                        
                                        const visiveis = paginas.filter(p => botoesHomeMobileVisiveis.includes(p.id)).length;
                                        
                                        return (
                                            <div key={categoria.id} className="border rounded-lg p-4 bg-slate-50">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="font-semibold text-slate-700">{categoria.nome}</span>
                                                    <Badge variant="outline">{visiveis}/{paginas.length}</Badge>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {paginas.map((pagina) => {
                                                        const visivel = botoesHomeMobileVisiveis.includes(pagina.id);
                                                        return (
                                                            <div 
                                                                key={pagina.id}
                                                                className={`flex items-center justify-between p-2 rounded border transition-all ${
                                                                    visivel ? "border-green-500 bg-green-50" : "border-slate-200 bg-white"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <pagina.icon className={`w-4 h-4 ${visivel ? "text-green-600" : "text-slate-400"}`} />
                                                                    <span className={`text-sm ${visivel ? "text-slate-800" : "text-slate-500"}`}>
                                                                        {pagina.nome}
                                                                    </span>
                                                                </div>
                                                                <Switch
                                                                    checked={visivel}
                                                                    onCheckedChange={() => toggleBotaoHome(pagina.id, "mobile")}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Resumo */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0 shadow-lg">
                    <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-4 text-slate-800">Resumo das Configurações</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                <p className="text-sm text-slate-500 mb-1">Menu Principal</p>
                                <p className="text-3xl font-bold text-blue-600">{paginasMenuVisiveis.length}</p>
                                <p className="text-xs text-slate-400">páginas visíveis</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                <p className="text-sm text-slate-500 mb-1">Home Desktop</p>
                                <p className="text-3xl font-bold text-purple-600">{botoesHomeVisiveis.length}</p>
                                <p className="text-xs text-slate-400">botões visíveis</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                <p className="text-sm text-slate-500 mb-1">Home Mobile</p>
                                <p className="text-3xl font-bold text-green-600">{botoesHomeMobileVisiveis.length}</p>
                                <p className="text-xs text-slate-400">botões visíveis</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}