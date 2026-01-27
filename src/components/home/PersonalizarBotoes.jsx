import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Smartphone, Monitor } from "lucide-react";

export default function PersonalizarBotoes({ todosBotoes, mobileAtivos, pcAtivos, onSalvar }) {
    const [mobileIds, setMobileIds] = useState(mobileAtivos || []);
    const [pcIds, setPcIds] = useState(pcAtivos || []);

    const handleToggleMobile = (id) => {
        setMobileIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleTogglePC = (id) => {
        setPcIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelecionarTodosMobile = () => {
        setMobileIds(todosBotoes.map(b => b.id));
    };

    const handleDesmarcarTodosMobile = () => {
        setMobileIds([]);
    };

    const handleSelecionarTodosPC = () => {
        setPcIds(todosBotoes.map(b => b.id));
    };

    const handleDesmarcarTodosPC = () => {
        setPcIds([]);
    };

    const agrupadosPorSecao = {
        "Principais": todosBotoes.filter(b => b.secao === "principais"),
        "Botões Grandes": todosBotoes.filter(b => b.secao === "grande"),
        "Rápidos": todosBotoes.filter(b => b.secao === "rapidos"),
        "Secundários": todosBotoes.filter(b => b.secao === "secundario")
    };

    return (
        <div className="space-y-4">
            <Tabs defaultValue="mobile" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mobile" className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        Mobile
                    </TabsTrigger>
                    <TabsTrigger value="pc" className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        PC / Desktop
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="mobile" className="space-y-4">
                    <div className="flex gap-2 justify-end">
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={handleSelecionarTodosMobile}
                        >
                            Selecionar Todos
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={handleDesmarcarTodosMobile}
                        >
                            Desmarcar Todos
                        </Button>
                    </div>

                    {Object.entries(agrupadosPorSecao).map(([secao, botoes]) => (
                        botoes.length > 0 && (
                            <Card key={secao}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold text-gray-700">{secao}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {botoes.map((botao) => {
                                        const isVisible = mobileIds.includes(botao.id);
                                        return (
                                            <div key={botao.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${botao.color ? `bg-gradient-to-br ${botao.color}` : 'bg-gray-200'}`}>
                                                        <botao.icon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <Label htmlFor={`mobile-${botao.id}`} className="cursor-pointer font-medium">
                                                        {botao.name}
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isVisible ? (
                                                        <Eye className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <EyeOff className="w-4 h-4 text-gray-400" />
                                                    )}
                                                    <Checkbox
                                                        id={`mobile-${botao.id}`}
                                                        checked={isVisible}
                                                        onCheckedChange={() => handleToggleMobile(botao.id)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        )
                    ))}
                </TabsContent>

                <TabsContent value="pc" className="space-y-4">
                    <div className="flex gap-2 justify-end">
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={handleSelecionarTodosPC}
                        >
                            Selecionar Todos
                        </Button>
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={handleDesmarcarTodosPC}
                        >
                            Desmarcar Todos
                        </Button>
                    </div>

                    {Object.entries(agrupadosPorSecao).map(([secao, botoes]) => (
                        botoes.length > 0 && (
                            <Card key={secao}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold text-gray-700">{secao}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {botoes.map((botao) => {
                                        const isVisible = pcIds.includes(botao.id);
                                        return (
                                            <div key={botao.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${botao.color ? `bg-gradient-to-br ${botao.color}` : 'bg-gray-200'}`}>
                                                        <botao.icon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <Label htmlFor={`pc-${botao.id}`} className="cursor-pointer font-medium">
                                                        {botao.name}
                                                    </Label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isVisible ? (
                                                        <Eye className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <EyeOff className="w-4 h-4 text-gray-400" />
                                                    )}
                                                    <Checkbox
                                                        id={`pc-${botao.id}`}
                                                        checked={isVisible}
                                                        onCheckedChange={() => handleTogglePC(botao.id)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        )
                    ))}
                </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                    onClick={() => onSalvar(mobileIds, pcIds)}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    Salvar Personalização
                </Button>
            </div>
        </div>
    );
}