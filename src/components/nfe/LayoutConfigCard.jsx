import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Settings } from "lucide-react";

export default function LayoutConfigCard({ 
    layoutConfig, 
    setLayoutConfig, 
    onShowPrintConfig 
}) {
    const [showConfig, setShowConfig] = React.useState(false);

    return (
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-0 shadow-lg">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Printer className="w-5 h-5 text-purple-600" />
                        Layout da Impressão (%)
                    </h3>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowConfig(!showConfig)}
                        className="border-purple-500 text-purple-700 hover:bg-purple-50"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        {showConfig ? "Ocultar" : "Configurar"}
                    </Button>
                </div>
                
                {showConfig && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Remetente (%)</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="50"
                                    value={layoutConfig.colRemetente}
                                    onChange={(e) => setLayoutConfig({ ...layoutConfig, colRemetente: parseInt(e.target.value) || 18 })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Destinatário (%)</Label>
                                <Input
                                    type="number"
                                    min="10"
                                    max="60"
                                    value={layoutConfig.colDestinatario}
                                    onChange={(e) => setLayoutConfig({ ...layoutConfig, colDestinatario: parseInt(e.target.value) || 42 })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">NFE (%)</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="30"
                                    value={layoutConfig.colNfe}
                                    onChange={(e) => setLayoutConfig({ ...layoutConfig, colNfe: parseInt(e.target.value) || 15 })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Carimbo (%)</Label>
                                <Input
                                    type="number"
                                    min="10"
                                    max="40"
                                    value={layoutConfig.colCarimbo}
                                    onChange={(e) => setLayoutConfig({ ...layoutConfig, colCarimbo: parseInt(e.target.value) || 25 })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Altura Linha (px)</Label>
                                <Input
                                    type="number"
                                    min="30"
                                    max="80"
                                    value={layoutConfig.alturaLinha}
                                    onChange={(e) => setLayoutConfig({ ...layoutConfig, alturaLinha: parseInt(e.target.value) || 45 })}
                                    className="bg-white"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            Total: {layoutConfig.colRemetente + layoutConfig.colDestinatario + layoutConfig.colNfe + layoutConfig.colCarimbo}% (ideal: 100%)
                        </p>
                        
                        {/* Configurações de Margem e Espaçamento */}
                        <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                            <div className="space-y-2">
                                <Label className="text-xs">Margem Topo (mm)</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="30"
                                    value={layoutConfig.margemTopo}
                                    onChange={(e) => setLayoutConfig({ ...layoutConfig, margemTopo: parseInt(e.target.value) || 10 })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Margem Lateral (mm)</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="30"
                                    value={layoutConfig.margemLateral}
                                    onChange={(e) => setLayoutConfig({ ...layoutConfig, margemLateral: parseInt(e.target.value) || 10 })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Espaço Entre Blocos (px)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={layoutConfig.espacamentoEntreLinhas}
                                    onChange={(e) => setLayoutConfig({ ...layoutConfig, espacamentoEntreLinhas: parseInt(e.target.value) || 0 })}
                                    className="bg-white"
                                />
                            </div>
                        </div>
                        
                        {/* Configurações de Fonte */}
                        <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                            <div className="space-y-2">
                                <Label className="text-xs">Fonte Cabeçalhos (px)</Label>
                                <Input
                                    type="number"
                                    min="10"
                                    max="20"
                                    value={layoutConfig.fonteSizeCampos}
                                    onChange={(e) => setLayoutConfig({ ...layoutConfig, fonteSizeCampos: parseInt(e.target.value) || 13 })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Fonte Dados (px)</Label>
                                <Input
                                    type="number"
                                    min="10"
                                    max="24"
                                    value={layoutConfig.fonteSizeDados}
                                    onChange={(e) => setLayoutConfig({ ...layoutConfig, fonteSizeDados: parseInt(e.target.value) || 15 })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Alinhamento Dados</Label>
                                <Select 
                                    value={layoutConfig.alinhamentoDados} 
                                    onValueChange={(v) => setLayoutConfig({ ...layoutConfig, alinhamentoDados: v })}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="left">Esquerda</SelectItem>
                                        <SelectItem value="center">Centro</SelectItem>
                                        <SelectItem value="right">Direita</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {/* Botão de Configuração de Impressão NFE */}
                        <div className="pt-4 border-t mt-4">
                            <Button
                                onClick={onShowPrintConfig}
                                variant="outline"
                                className="w-full border-indigo-500 text-indigo-700 hover:bg-indigo-50"
                            >
                                <Settings className="w-5 h-5 mr-2" />
                                Configurar Impressão de Importações
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}