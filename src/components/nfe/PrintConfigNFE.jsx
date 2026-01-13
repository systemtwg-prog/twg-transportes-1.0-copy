import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function PrintConfigNFE({ open, onOpenChange, onPrint, configKey = "nfePrintConfig" }) {
    const defaultConfig = {
        fontSize: 10,
        fontWeight: "normal",
        colNotaFiscal: 12,
        colPlaca: 8,
        colCliente: 35,
        colVolume: 12,
        colPeso: 12,
        colTransportadora: 21,
        alturaLinha: 25,
        alturaCabecalho: 35,
        alturaTitulo: 40,
        simbolosPlaca: true,
        orientation: "landscape"
    };

    const [config, setConfig] = useState(defaultConfig);

    useEffect(() => {
        const saved = localStorage.getItem(configKey);
        if (saved) {
            try {
                setConfig({ ...defaultConfig, ...JSON.parse(saved) });
            } catch (e) {
                console.error("Erro ao carregar config:", e);
            }
        }
    }, [configKey]);

    const handleSaveAndPrint = () => {
        const somaPercentual = 
            config.colNotaFiscal + 
            config.colPlaca + 
            config.colCliente + 
            config.colVolume + 
            config.colPeso + 
            config.colTransportadora;

        if (somaPercentual !== 100) {
            toast.error(`A soma das colunas deve ser 100% (atual: ${somaPercentual}%)`);
            return;
        }

        localStorage.setItem(configKey, JSON.stringify(config));
        toast.success("Configurações salvas!");
        
        onOpenChange(false);
        onPrint(config);
    };

    const handleReset = () => {
        setConfig(defaultConfig);
        localStorage.removeItem(configKey);
        toast.info("Configurações resetadas");
    };

    const somaPercentual = 
        config.colNotaFiscal + 
        config.colPlaca + 
        config.colCliente + 
        config.colVolume + 
        config.colPeso + 
        config.colTransportadora;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="w-5 h-5 text-indigo-600" />
                        Configuração de Impressão
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="p-4 bg-slate-50 rounded-lg space-y-4">
                        <h4 className="font-semibold text-slate-700">Fonte e Orientação</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Tamanho da Fonte</Label>
                                <Input
                                    type="number"
                                    min="8"
                                    max="16"
                                    value={config.fontSize}
                                    onChange={(e) => setConfig({ ...config, fontSize: parseInt(e.target.value) || 10 })}
                                />
                                <p className="text-xs text-slate-500">Atual: {config.fontSize}px</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Peso da Fonte</Label>
                                <Select value={config.fontWeight} onValueChange={(v) => setConfig({ ...config, fontWeight: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="bold">Negrito</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Orientação da Página</Label>
                                <Select value={config.orientation} onValueChange={(v) => setConfig({ ...config, orientation: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="portrait">Retrato</SelectItem>
                                        <SelectItem value="landscape">Paisagem</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-blue-800">Largura das Colunas (%)</h4>
                            <div className={`text-sm font-semibold ${somaPercentual === 100 ? "text-green-600" : "text-red-600"}`}>
                                Total: {somaPercentual}% {somaPercentual === 100 ? "✓" : "⚠ Deve ser 100%"}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Nota Fiscal</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="30"
                                    value={config.colNotaFiscal}
                                    onChange={(e) => setConfig({ ...config, colNotaFiscal: parseInt(e.target.value) || 12 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Placa</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="20"
                                    value={config.colPlaca}
                                    onChange={(e) => setConfig({ ...config, colPlaca: parseInt(e.target.value) || 8 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nome do Cliente</Label>
                                <Input
                                    type="number"
                                    min="15"
                                    max="50"
                                    value={config.colCliente}
                                    onChange={(e) => setConfig({ ...config, colCliente: parseInt(e.target.value) || 35 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Qtde. Volume</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="20"
                                    value={config.colVolume}
                                    onChange={(e) => setConfig({ ...config, colVolume: parseInt(e.target.value) || 12 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Peso</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="20"
                                    value={config.colPeso}
                                    onChange={(e) => setConfig({ ...config, colPeso: parseInt(e.target.value) || 12 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Transportadora</Label>
                                <Input
                                    type="number"
                                    min="10"
                                    max="40"
                                    value={config.colTransportadora}
                                    onChange={(e) => setConfig({ ...config, colTransportadora: parseInt(e.target.value) || 21 })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg space-y-4">
                        <h4 className="font-semibold text-purple-800">Altura dos Elementos (px)</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Altura das Linhas</Label>
                                <Input
                                    type="number"
                                    min="20"
                                    max="60"
                                    value={config.alturaLinha}
                                    onChange={(e) => setConfig({ ...config, alturaLinha: parseInt(e.target.value) || 25 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Altura do Cabeçalho</Label>
                                <Input
                                    type="number"
                                    min="25"
                                    max="60"
                                    value={config.alturaCabecalho}
                                    onChange={(e) => setConfig({ ...config, alturaCabecalho: parseInt(e.target.value) || 35 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Altura do Título</Label>
                                <Input
                                    type="number"
                                    min="30"
                                    max="80"
                                    value={config.alturaTitulo}
                                    onChange={(e) => setConfig({ ...config, alturaTitulo: parseInt(e.target.value) || 40 })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg space-y-3">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                checked={config.simbolosPlaca}
                                onCheckedChange={(v) => setConfig({ ...config, simbolosPlaca: v })}
                            />
                            <div>
                                <h4 className="font-semibold text-green-800">Símbolos Diferentes por Placa</h4>
                                <p className="text-xs text-slate-600">
                                    Adiciona símbolos diferentes (▲, ●, ■, etc) na frente de cada placa para facilitar identificação
                                </p>
                            </div>
                        </div>
                        {config.simbolosPlaca && (
                            <div className="bg-white p-3 rounded border border-green-200">
                                <p className="text-xs text-slate-600 mb-2">Símbolos que serão usados:</p>
                                <div className="flex gap-2 flex-wrap text-lg">
                                    <span>▲</span>
                                    <span>●</span>
                                    <span>■</span>
                                    <span>◆</span>
                                    <span>★</span>
                                    <span>▼</span>
                                    <span>◉</span>
                                    <span>◈</span>
                                    <span>♦</span>
                                    <span>✦</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                            className="border-orange-500 text-orange-600"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Resetar
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveAndPrint}
                            disabled={somaPercentual !== 100}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Salvar e Imprimir
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}