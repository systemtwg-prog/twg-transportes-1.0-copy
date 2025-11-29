import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Printer, Settings, RotateCcw } from "lucide-react";

const DEFAULT_CONFIG = {
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 5,
    marginRight: 5,
    showHeader: true,
    showFooter: true,
    showLogo: true,
    showDate: true,
    showCompanyInfo: true,
    fontSize: 9,
    columns: 2,
    headerHeight: 50,
    footerHeight: 20,
    cardPadding: 4,
    cardGap: 4
};

export default function PrintConfigDialog({ open, onOpenChange, onPrint, configKey = "dashboardPrint" }) {
    const [config, setConfig] = useState(DEFAULT_CONFIG);

    useEffect(() => {
        const saved = localStorage.getItem(configKey);
        if (saved) {
            setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
        }
    }, [configKey]);

    const saveConfig = (newConfig) => {
        setConfig(newConfig);
        localStorage.setItem(configKey, JSON.stringify(newConfig));
    };

    const resetConfig = () => {
        saveConfig(DEFAULT_CONFIG);
    };

    const handlePrint = () => {
        onPrint(config);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-600" />
                        Configurar Impressão
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Margens */}
                    <div className="space-y-3">
                        <Label className="font-semibold">Margens (mm)</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Superior</Label>
                                <Input
                                    type="number"
                                    value={config.marginTop}
                                    onChange={(e) => saveConfig({ ...config, marginTop: parseInt(e.target.value) || 0 })}
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Inferior</Label>
                                <Input
                                    type="number"
                                    value={config.marginBottom}
                                    onChange={(e) => saveConfig({ ...config, marginBottom: parseInt(e.target.value) || 0 })}
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Esquerda</Label>
                                <Input
                                    type="number"
                                    value={config.marginLeft}
                                    onChange={(e) => saveConfig({ ...config, marginLeft: parseInt(e.target.value) || 0 })}
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Direita</Label>
                                <Input
                                    type="number"
                                    value={config.marginRight}
                                    onChange={(e) => saveConfig({ ...config, marginRight: parseInt(e.target.value) || 0 })}
                                    min={0}
                                    max={50}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cabeçalho e Rodapé */}
                    <div className="space-y-3">
                        <Label className="font-semibold">Cabeçalho e Rodapé</Label>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div>
                                    <Label>Mostrar Cabeçalho</Label>
                                    <p className="text-xs text-slate-500">Logo e informações da empresa</p>
                                </div>
                                <Switch
                                    checked={config.showHeader}
                                    onCheckedChange={(v) => saveConfig({ ...config, showHeader: v })}
                                />
                            </div>
                            {config.showHeader && (
                                <div className="ml-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">Mostrar Logo</Label>
                                        <Switch
                                            checked={config.showLogo}
                                            onCheckedChange={(v) => saveConfig({ ...config, showLogo: v })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">Mostrar Data</Label>
                                        <Switch
                                            checked={config.showDate}
                                            onCheckedChange={(v) => saveConfig({ ...config, showDate: v })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">Mostrar Dados da Empresa</Label>
                                        <Switch
                                            checked={config.showCompanyInfo}
                                            onCheckedChange={(v) => saveConfig({ ...config, showCompanyInfo: v })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500">Altura do Cabeçalho (px)</Label>
                                        <Input
                                            type="number"
                                            value={config.headerHeight}
                                            onChange={(e) => saveConfig({ ...config, headerHeight: parseInt(e.target.value) || 50 })}
                                            min={30}
                                            max={150}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div>
                                    <Label>Mostrar Rodapé</Label>
                                    <p className="text-xs text-slate-500">Data/hora de impressão</p>
                                </div>
                                <Switch
                                    checked={config.showFooter}
                                    onCheckedChange={(v) => saveConfig({ ...config, showFooter: v })}
                                />
                            </div>
                            {config.showFooter && (
                                <div className="ml-4 space-y-1">
                                    <Label className="text-xs text-slate-500">Altura do Rodapé (px)</Label>
                                    <Input
                                        type="number"
                                        value={config.footerHeight}
                                        onChange={(e) => saveConfig({ ...config, footerHeight: parseInt(e.target.value) || 20 })}
                                        min={10}
                                        max={50}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Proporção e Layout */}
                    <div className="space-y-3">
                        <Label className="font-semibold">Layout</Label>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">Colunas: {config.columns}</Label>
                                </div>
                                <Slider
                                    value={[config.columns]}
                                    onValueChange={([v]) => saveConfig({ ...config, columns: v })}
                                    min={1}
                                    max={4}
                                    step={1}
                                    className="w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">Tamanho da Fonte: {config.fontSize}px</Label>
                                </div>
                                <Slider
                                    value={[config.fontSize]}
                                    onValueChange={([v]) => saveConfig({ ...config, fontSize: v })}
                                    min={6}
                                    max={14}
                                    step={1}
                                    className="w-full"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Padding dos Cards (px)</Label>
                                    <Input
                                        type="number"
                                        value={config.cardPadding}
                                        onChange={(e) => saveConfig({ ...config, cardPadding: parseInt(e.target.value) || 4 })}
                                        min={0}
                                        max={20}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Espaço entre Cards (px)</Label>
                                    <Input
                                        type="number"
                                        value={config.cardGap}
                                        onChange={(e) => saveConfig({ ...config, cardGap: parseInt(e.target.value) || 4 })}
                                        min={0}
                                        max={20}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botões */}
                    <div className="flex gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={resetConfig} className="flex-1">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Restaurar Padrão
                        </Button>
                        <Button onClick={handlePrint} className="flex-1 bg-blue-600 hover:bg-blue-700">
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}