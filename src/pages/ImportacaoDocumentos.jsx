import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Upload, FileText, FileCode, Package, Loader2, Check, Navigation, 
    Route, Trash2, Eye, Plus, MapPin, Users, Building2, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ImportacaoDocumentos() {
    const [uploading, setUploading] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedMotorista, setSelectedMotorista] = useState("");
    const [selectedVeiculo, setSelectedVeiculo] = useState("");
    const queryClient = useQueryClient();

    const { data: romaneios = [], isLoading } = useQuery({
        queryKey: ["romaneios-importados"],
        queryFn: () => base44.entities.Romaneio.list("-created_date")
    });

    const { data: motoristas = [] } = useQuery({
        queryKey: ["motoristas"],
        queryFn: () => base44.entities.Motorista.filter({ status: "ativo" })
    });

    const { data: veiculos = [] } = useQuery({
        queryKey: ["veiculos"],
        queryFn: () => base44.entities.Veiculo.filter({ status: "disponivel" })
    });

    const createRomaneioMutation = useMutation({
        mutationFn: (data) => base44.entities.Romaneio.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["romaneios-importados"] });
            toast.success("Romaneio criado com sucesso!");
            setExtractedData(null);
            setShowPreview(false);
        }
    });

    const deleteRomaneioMutation = useMutation({
        mutationFn: (id) => base44.entities.Romaneio.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["romaneios-importados"] })
    });

    const createClienteMutation = useMutation({
        mutationFn: (data) => base44.entities.Cliente.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clientes"] });
            toast.success("Cliente cadastrado!");
        }
    });

    const createTransportadoraMutation = useMutation({
        mutationFn: (data) => base44.entities.Transportadora.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transportadoras"] });
            toast.success("Transportadora cadastrada!");
        }
    });

    const handleCadastrarCliente = (cliente, tipo) => {
        createClienteMutation.mutate({
            razao_social: cliente.nome || cliente.destinatario || cliente.remetente,
            cnpj_cpf: cliente.cnpj || cliente.destinatario_cnpj || cliente.remetente_cnpj || "",
            endereco: cliente.endereco || cliente.destinatario_endereco || cliente.remetente_endereco || "",
            cidade: cliente.cidade || cliente.destinatario_cidade || cliente.remetente_cidade || "",
            uf: cliente.uf || cliente.destinatario_uf || cliente.remetente_uf || "",
            telefone: cliente.telefone || cliente.destinatario_telefone || cliente.remetente_telefone || "",
            tipo: tipo
        });
    };

    const handleCadastrarTransportadora = () => {
        if (!extractedData?.transportadora_principal) {
            toast.error("Nenhuma transportadora encontrada");
            return;
        }
        createTransportadoraMutation.mutate({
            razao_social: extractedData.transportadora_principal,
            cnpj: extractedData.transportadora_cnpj || "",
            endereco: extractedData.transportadora_endereco || extractedData.endereco_transportadora || "",
            cidade: extractedData.transportadora_cidade || "",
            uf: extractedData.transportadora_uf || "",
            telefone: extractedData.transportadora_telefone || "",
            status: "ativo"
        });
    };

    const handleFileUpload = async (e, tipo) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });

            // Extrair dados do arquivo
            const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        notas_fiscais: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    numero_nf: { type: "string" },
                                    destinatario: { type: "string" },
                                    destinatario_cnpj: { type: "string" },
                                    destinatario_endereco: { type: "string" },
                                    destinatario_cidade: { type: "string" },
                                    destinatario_uf: { type: "string" },
                                    destinatario_telefone: { type: "string" },
                                    remetente: { type: "string" },
                                    remetente_cnpj: { type: "string" },
                                    remetente_endereco: { type: "string" },
                                    remetente_cidade: { type: "string" },
                                    remetente_uf: { type: "string" },
                                    volume: { type: "string" },
                                    endereco: { type: "string" },
                                    cidade: { type: "string" },
                                    transportadora: { type: "string" },
                                    valor: { type: "number" }
                                }
                            }
                        },
                        transportadora_principal: { type: "string" },
                        transportadora_cnpj: { type: "string" },
                        transportadora_endereco: { type: "string" },
                        transportadora_cidade: { type: "string" },
                        transportadora_uf: { type: "string" },
                        transportadora_telefone: { type: "string" },
                        endereco_transportadora: { type: "string" }
                    }
                }
            });

            if (result.status === "success" && result.output) {
                setExtractedData({
                    ...result.output,
                    origem: tipo,
                    arquivo_url: file_url
                });
                setShowPreview(true);
                toast.success(`${result.output.notas_fiscais?.length || 0} entregas encontradas!`);
            } else {
                toast.error("Não foi possível extrair dados do arquivo");
            }
        } catch (err) {
            console.error("Erro ao processar arquivo:", err);
            toast.error("Erro ao processar arquivo");
        }
        setUploading(false);
    };

    const handleSaveRomaneio = () => {
        if (!extractedData?.notas_fiscais?.length) {
            toast.error("Nenhuma entrega para salvar");
            return;
        }

        const motorista = motoristas.find(m => m.id === selectedMotorista);
        const veiculo = veiculos.find(v => v.id === selectedVeiculo);

        createRomaneioMutation.mutate({
            numero: `IMP-${Date.now()}`,
            data: new Date().toISOString().split("T")[0],
            motorista_id: selectedMotorista,
            motorista_nome: motorista?.nome || "",
            veiculo_id: selectedVeiculo,
            placa: veiculo?.placa || "",
            notas_fiscais: extractedData.notas_fiscais,
            origem_importacao: extractedData.origem,
            status: "pendente"
        });
    };

    const handleOptimizeRoute = async (romaneio) => {
        if (!romaneio.notas_fiscais?.length) {
            toast.error("Romaneio sem entregas");
            return;
        }

        toast.loading("Otimizando rota...");
        
        try {
            const enderecos = romaneio.notas_fiscais
                .map(nf => `${nf.endereco}, ${nf.cidade}`)
                .filter(Boolean);

            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Dado os seguintes endereços de entrega, ordene-os de forma a otimizar a rota considerando menor distância e tempo de percurso. Considere que o ponto de partida é São Paulo - SP.

Endereços:
${enderecos.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Retorne a ordem otimizada dos índices (começando em 0) e uma breve explicação da lógica usada.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        ordem_otimizada: { type: "array", items: { type: "number" } },
                        explicacao: { type: "string" }
                    }
                }
            });

            if (result.ordem_otimizada) {
                const notasOrdenadas = result.ordem_otimizada.map(i => romaneio.notas_fiscais[i]);
                
                await base44.entities.Romaneio.update(romaneio.id, {
                    notas_fiscais: notasOrdenadas,
                    rota_otimizada: true,
                    observacoes: (romaneio.observacoes || "") + `\n[Rota otimizada: ${result.explicacao}]`
                });

                queryClient.invalidateQueries({ queryKey: ["romaneios-importados"] });
                toast.dismiss();
                toast.success("Rota otimizada com sucesso!");
            }
        } catch (err) {
            toast.dismiss();
            toast.error("Erro ao otimizar rota");
            console.error(err);
        }
    };

    const handleNavigateRoute = (romaneio) => {
        if (!romaneio.notas_fiscais?.length) return;

        const waypoints = romaneio.notas_fiscais
            .map(nf => `${nf.endereco}, ${nf.cidade}`)
            .filter(Boolean)
            .map(e => encodeURIComponent(e))
            .join("/");

        const url = `https://www.google.com/maps/dir/${waypoints}`;
        window.open(url, "_blank");
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy");
        } catch {
            return dateStr;
        }
    };

    const romaneiosImportados = romaneios.filter(r => r.origem_importacao === "xml" || r.origem_importacao === "pdf");

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                        <Upload className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Importação de Documentos</h1>
                        <p className="text-slate-500">Importe XML ou PDF para criar romaneios</p>
                    </div>
                </div>

                <Tabs defaultValue="importar" className="space-y-6">
                    <TabsList className="bg-white/80 backdrop-blur shadow-md p-1">
                        <TabsTrigger value="importar" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                            <Upload className="w-4 h-4 mr-2" />
                            Importar
                        </TabsTrigger>
                        <TabsTrigger value="romaneios" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                            <Package className="w-4 h-4 mr-2" />
                            Romaneios ({romaneiosImportados.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="importar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Upload XML */}
                            <Card className="bg-white/90 border-0 shadow-lg">
                                <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                                    <CardTitle className="flex items-center gap-2">
                                        <FileCode className="w-5 h-5 text-green-600" />
                                        Importar XML (NFe)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="border-2 border-dashed border-green-300 rounded-xl p-8 text-center hover:border-green-500 transition-colors">
                                        <input
                                            type="file"
                                            accept=".xml"
                                            onChange={(e) => handleFileUpload(e, "xml")}
                                            className="hidden"
                                            id="xml-upload"
                                            disabled={uploading}
                                        />
                                        <label htmlFor="xml-upload" className="cursor-pointer">
                                            {uploading ? (
                                                <Loader2 className="w-12 h-12 text-green-400 mx-auto animate-spin" />
                                            ) : (
                                                <FileCode className="w-12 h-12 text-green-400 mx-auto" />
                                            )}
                                            <p className="mt-4 text-slate-600">Clique para selecionar arquivo XML</p>
                                            <p className="text-sm text-slate-400 mt-1">Arquivos NFe em formato XML</p>
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Upload PDF */}
                            <Card className="bg-white/90 border-0 shadow-lg">
                                <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-red-600" />
                                        Importar PDF
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="border-2 border-dashed border-red-300 rounded-xl p-8 text-center hover:border-red-500 transition-colors">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => handleFileUpload(e, "pdf")}
                                            className="hidden"
                                            id="pdf-upload"
                                            disabled={uploading}
                                        />
                                        <label htmlFor="pdf-upload" className="cursor-pointer">
                                            {uploading ? (
                                                <Loader2 className="w-12 h-12 text-red-400 mx-auto animate-spin" />
                                            ) : (
                                                <FileText className="w-12 h-12 text-red-400 mx-auto" />
                                            )}
                                            <p className="mt-4 text-slate-600">Clique para selecionar arquivo PDF</p>
                                            <p className="text-sm text-slate-400 mt-1">Romaneios ou listagens em PDF</p>
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="romaneios">
                        <Card className="bg-white/90 border-0 shadow-xl">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead>Número</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Origem</TableHead>
                                            <TableHead>Entregas</TableHead>
                                            <TableHead>Motorista</TableHead>
                                            <TableHead>Rota</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {romaneiosImportados.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                                                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                    Nenhum romaneio importado
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            romaneiosImportados.map(rom => (
                                                <TableRow key={rom.id} className="hover:bg-slate-50">
                                                    <TableCell className="font-bold text-indigo-600">{rom.numero}</TableCell>
                                                    <TableCell>{formatDate(rom.data)}</TableCell>
                                                    <TableCell>
                                                        <Badge className={rom.origem_importacao === "xml" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                                                            {rom.origem_importacao?.toUpperCase()}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{rom.notas_fiscais?.length || 0} NF(s)</Badge>
                                                    </TableCell>
                                                    <TableCell>{rom.motorista_nome || "-"}</TableCell>
                                                    <TableCell>
                                                        {rom.rota_otimizada ? (
                                                            <Badge className="bg-emerald-100 text-emerald-700">
                                                                <Check className="w-3 h-3 mr-1" /> Otimizada
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline">Não otimizada</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleOptimizeRoute(rom)}
                                                                className="text-purple-600 hover:bg-purple-50"
                                                                title="Otimizar Rota"
                                                            >
                                                                <Route className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleNavigateRoute(rom)}
                                                                className="text-green-600 hover:bg-green-50"
                                                                title="Navegar"
                                                            >
                                                                <Navigation className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (confirm("Excluir romaneio?")) deleteRomaneioMutation.mutate(rom.id);
                                                                }}
                                                                className="text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-600" />
                            Dados Extraídos - Romaneio
                        </DialogTitle>
                    </DialogHeader>

                    {extractedData && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Motorista</Label>
                                    <Select value={selectedMotorista} onValueChange={setSelectedMotorista}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o motorista..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {motoristas.map(m => (
                                                <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Veículo</Label>
                                    <Select value={selectedVeiculo} onValueChange={setSelectedVeiculo}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o veículo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {veiculos.map(v => (
                                                <SelectItem key={v.id} value={v.id}>{v.placa} - {v.modelo}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {extractedData.transportadora_principal && (
                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-blue-800">Transportadora: {extractedData.transportadora_principal}</p>
                                                {extractedData.transportadora_cnpj && (
                                                    <p className="text-sm text-blue-600">CNPJ: {extractedData.transportadora_cnpj}</p>
                                                )}
                                                {(extractedData.endereco_transportadora || extractedData.transportadora_endereco) && (
                                                    <p className="text-sm text-blue-600">{extractedData.transportadora_endereco || extractedData.endereco_transportadora}</p>
                                                )}
                                            </div>
                                            <Button 
                                                size="sm" 
                                                onClick={handleCadastrarTransportadora}
                                                className="bg-blue-600 hover:bg-blue-700"
                                                disabled={createTransportadoraMutation.isPending}
                                            >
                                                <Building2 className="w-4 h-4 mr-1" />
                                                Cadastrar
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <div>
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Entregas ({extractedData.notas_fiscais?.length || 0})
                                </h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>NF</TableHead>
                                            <TableHead>Destinatário</TableHead>
                                            <TableHead>Remetente</TableHead>
                                            <TableHead>Volume</TableHead>
                                            <TableHead>Cidade</TableHead>
                                            <TableHead>Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {extractedData.notas_fiscais?.map((nf, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-mono">{nf.numero_nf}</TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <p className="font-medium">{nf.destinatario}</p>
                                                        {nf.destinatario_cnpj && <p className="text-xs text-slate-500">{nf.destinatario_cnpj}</p>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <p className="font-medium">{nf.remetente || "-"}</p>
                                                        {nf.remetente_cnpj && <p className="text-xs text-slate-500">{nf.remetente_cnpj}</p>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{nf.volume}</TableCell>
                                                <TableCell>{nf.destinatario_cidade || nf.cidade}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        {nf.destinatario && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-xs"
                                                                onClick={() => handleCadastrarCliente({
                                                                    nome: nf.destinatario,
                                                                    cnpj: nf.destinatario_cnpj,
                                                                    endereco: nf.destinatario_endereco || nf.endereco,
                                                                    cidade: nf.destinatario_cidade || nf.cidade,
                                                                    uf: nf.destinatario_uf,
                                                                    telefone: nf.destinatario_telefone
                                                                }, "destinatario")}
                                                                disabled={createClienteMutation.isPending}
                                                            >
                                                                <UserPlus className="w-3 h-3 mr-1" />
                                                                Dest.
                                                            </Button>
                                                        )}
                                                        {nf.remetente && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-xs"
                                                                onClick={() => handleCadastrarCliente({
                                                                    nome: nf.remetente,
                                                                    cnpj: nf.remetente_cnpj,
                                                                    endereco: nf.remetente_endereco,
                                                                    cidade: nf.remetente_cidade,
                                                                    uf: nf.remetente_uf
                                                                }, "remetente")}
                                                                disabled={createClienteMutation.isPending}
                                                            >
                                                                <UserPlus className="w-3 h-3 mr-1" />
                                                                Rem.
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setShowPreview(false)}>
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={handleSaveRomaneio}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={createRomaneioMutation.isPending}
                                >
                                    {createRomaneioMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4 mr-2" />
                                    )}
                                    Criar Romaneio
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}