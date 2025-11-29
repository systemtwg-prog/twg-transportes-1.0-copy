import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Search, Building2, Phone, MapPin, Globe, Mail, 
    Loader2, Plus, Check, X, RefreshCw, Download
} from "lucide-react";
import { toast } from "sonner";

export default function ExtratorGoogle() {
    const [segmento, setSegmento] = useState("");
    const [cidade, setCidade] = useState("");
    const [resultados, setResultados] = useState([]);
    const [selecionados, setSelecionados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [destino, setDestino] = useState("cliente");
    const [salvando, setSalvando] = useState(false);
    const queryClient = useQueryClient();

    const buscarEmpresas = async () => {
        if (!segmento.trim() || !cidade.trim()) {
            toast.error("Informe o segmento e a cidade");
            return;
        }

        setBuscando(true);
        setResultados([]);
        setSelecionados([]);

        try {
            const resultado = await base44.integrations.Core.InvokeLLM({
                prompt: `Busque empresas do segmento "${segmento}" na cidade de "${cidade}", Brasil.

Para cada empresa encontrada, retorne as seguintes informações:
- nome: Nome da empresa/estabelecimento
- nome_fantasia: Nome fantasia (se diferente)
- endereco: Endereço completo
- bairro: Bairro
- cidade: Cidade
- uf: Estado (sigla)
- cep: CEP
- telefone: Telefone principal
- email: Email (se disponível)
- site: Website (se disponível)
- cnpj: CNPJ (se disponível)
- segmento: Tipo de negócio/segmento

Retorne de 5 a 15 empresas REAIS e ATUAIS com dados verdadeiros encontrados na internet.
Priorize empresas com mais informações disponíveis.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        empresas: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    nome: { type: "string" },
                                    nome_fantasia: { type: "string" },
                                    endereco: { type: "string" },
                                    bairro: { type: "string" },
                                    cidade: { type: "string" },
                                    uf: { type: "string" },
                                    cep: { type: "string" },
                                    telefone: { type: "string" },
                                    email: { type: "string" },
                                    site: { type: "string" },
                                    cnpj: { type: "string" },
                                    segmento: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            const empresas = resultado?.empresas || [];
            setResultados(empresas);
            
            if (empresas.length === 0) {
                toast.info("Nenhuma empresa encontrada. Tente outro segmento ou cidade.");
            } else {
                toast.success(`${empresas.length} empresa(s) encontrada(s)!`);
            }
        } catch (error) {
            console.error("Erro na busca:", error);
            toast.error("Erro ao buscar empresas. Tente novamente.");
        }

        setBuscando(false);
    };

    const toggleSelecionado = (index) => {
        setSelecionados(prev => 
            prev.includes(index) 
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const selecionarTodos = () => {
        if (selecionados.length === resultados.length) {
            setSelecionados([]);
        } else {
            setSelecionados(resultados.map((_, i) => i));
        }
    };

    const salvarSelecionados = async () => {
        if (selecionados.length === 0) {
            toast.error("Selecione pelo menos uma empresa");
            return;
        }

        setSalvando(true);
        const empresasParaSalvar = selecionados.map(i => resultados[i]);
        let salvos = 0;

        try {
            for (const empresa of empresasParaSalvar) {
                if (destino === "cliente") {
                    await base44.entities.Cliente.create({
                        razao_social: empresa.nome || "",
                        nome_fantasia: empresa.nome_fantasia || empresa.nome || "",
                        cnpj_cpf: empresa.cnpj || "",
                        tipo: "ambos",
                        telefone: empresa.telefone || "",
                        email: empresa.email || "",
                        endereco: empresa.endereco || "",
                        bairro: empresa.bairro || "",
                        cidade: empresa.cidade || "",
                        uf: empresa.uf || "",
                        cep: empresa.cep || "",
                        observacoes: `Segmento: ${empresa.segmento || segmento}\nSite: ${empresa.site || ""}`
                    });
                } else if (destino === "transportadora") {
                    await base44.entities.Transportadora.create({
                        razao_social: empresa.nome || "",
                        nome_fantasia: empresa.nome_fantasia || empresa.nome || "",
                        cnpj: empresa.cnpj || "",
                        telefone: empresa.telefone || "",
                        email: empresa.email || "",
                        endereco: empresa.endereco || "",
                        bairro: empresa.bairro || "",
                        cidade: empresa.cidade || "",
                        uf: empresa.uf || "",
                        cep: empresa.cep || "",
                        status: "ativo",
                        observacoes: `Site: ${empresa.site || ""}`
                    });
                }
                salvos++;
            }

            queryClient.invalidateQueries({ queryKey: [destino === "cliente" ? "clientes" : "transportadoras"] });
            toast.success(`${salvos} empresa(s) cadastrada(s) com sucesso!`);
            
            // Limpar seleção após salvar
            setSelecionados([]);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao salvar algumas empresas");
        }

        setSalvando(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                        <Search className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Extrator de Dados</h1>
                        <p className="text-slate-500">Busque empresas por segmento e cidade</p>
                    </div>
                </div>

                {/* Formulário de Busca */}
                <Card className="bg-white/90 border-0 shadow-xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Globe className="w-5 h-5 text-blue-600" />
                            Buscar no Google
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Segmento / Tipo de Empresa</Label>
                                <Input
                                    value={segmento}
                                    onChange={(e) => setSegmento(e.target.value)}
                                    placeholder="Ex: Transportadora, Restaurante, Loja de Roupas..."
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cidade</Label>
                                <Input
                                    value={cidade}
                                    onChange={(e) => setCidade(e.target.value)}
                                    placeholder="Ex: São Paulo, Curitiba, Belo Horizonte..."
                                    className="bg-white"
                                    onKeyDown={(e) => e.key === "Enter" && buscarEmpresas()}
                                />
                            </div>
                            <div className="flex items-end">
                                <Button 
                                    onClick={buscarEmpresas}
                                    disabled={buscando}
                                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 h-10"
                                >
                                    {buscando ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Buscando...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-4 h-4 mr-2" />
                                            Buscar Empresas
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Resultados */}
                {resultados.length > 0 && (
                    <Card className="bg-white/90 border-0 shadow-xl">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Building2 className="w-5 h-5 text-emerald-600" />
                                    Resultados ({resultados.length})
                                </CardTitle>
                                <div className="flex items-center gap-3">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={selecionarTodos}
                                    >
                                        {selecionados.length === resultados.length ? "Desmarcar Todos" : "Selecionar Todos"}
                                    </Button>
                                    
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm whitespace-nowrap">Salvar como:</Label>
                                        <Select value={destino} onValueChange={setDestino}>
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cliente">Cliente</SelectItem>
                                                <SelectItem value="transportadora">Transportadora</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button 
                                        onClick={salvarSelecionados}
                                        disabled={selecionados.length === 0 || salvando}
                                        className="bg-emerald-500 hover:bg-emerald-600"
                                    >
                                        {salvando ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4 mr-2" />
                                        )}
                                        Cadastrar ({selecionados.length})
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="space-y-3">
                                {resultados.map((empresa, index) => (
                                    <div 
                                        key={index}
                                        onClick={() => toggleSelecionado(index)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            selecionados.includes(index)
                                                ? "border-emerald-500 bg-emerald-50"
                                                : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="pt-1">
                                                <Checkbox 
                                                    checked={selecionados.includes(index)}
                                                    onCheckedChange={() => toggleSelecionado(index)}
                                                />
                                            </div>
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-lg">{empresa.nome}</p>
                                                    {empresa.nome_fantasia && empresa.nome_fantasia !== empresa.nome && (
                                                        <p className="text-sm text-slate-500">{empresa.nome_fantasia}</p>
                                                    )}
                                                    {empresa.segmento && (
                                                        <Badge className="mt-1 bg-blue-100 text-blue-700">{empresa.segmento}</Badge>
                                                    )}
                                                </div>
                                                
                                                <div className="space-y-1">
                                                    {empresa.endereco && (
                                                        <p className="text-sm flex items-start gap-1">
                                                            <MapPin className="w-3 h-3 mt-1 text-slate-400 flex-shrink-0" />
                                                            <span>{empresa.endereco}{empresa.bairro ? `, ${empresa.bairro}` : ""}</span>
                                                        </p>
                                                    )}
                                                    {empresa.cidade && (
                                                        <p className="text-sm text-slate-500 ml-4">
                                                            {empresa.cidade}{empresa.uf ? `/${empresa.uf}` : ""} {empresa.cep ? `- ${empresa.cep}` : ""}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    {empresa.telefone && (
                                                        <p className="text-sm flex items-center gap-1">
                                                            <Phone className="w-3 h-3 text-emerald-500" />
                                                            <span className="text-emerald-700 font-medium">{empresa.telefone}</span>
                                                        </p>
                                                    )}
                                                    {empresa.email && (
                                                        <p className="text-sm flex items-center gap-1">
                                                            <Mail className="w-3 h-3 text-blue-500" />
                                                            <span className="text-blue-600">{empresa.email}</span>
                                                        </p>
                                                    )}
                                                    {empresa.site && (
                                                        <p className="text-sm flex items-center gap-1">
                                                            <Globe className="w-3 h-3 text-purple-500" />
                                                            <a 
                                                                href={empresa.site.startsWith("http") ? empresa.site : `https://${empresa.site}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-purple-600 hover:underline"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {empresa.site}
                                                            </a>
                                                        </p>
                                                    )}
                                                    {empresa.cnpj && (
                                                        <p className="text-xs text-slate-400">CNPJ: {empresa.cnpj}</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {selecionados.includes(index) && (
                                                <div className="p-2 bg-emerald-500 rounded-full">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Estado vazio */}
                {!buscando && resultados.length === 0 && (
                    <Card className="bg-white/60 border-0 shadow-lg">
                        <CardContent className="py-16 text-center">
                            <Search className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-600 mb-2">Faça uma busca</h3>
                            <p className="text-slate-400">
                                Digite o segmento (ex: "Transportadora", "Restaurante") e a cidade para buscar empresas
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}