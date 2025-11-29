import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Printer, IdCard } from "lucide-react";
import CrachaMotorista from "@/components/motorista/CrachaMotorista";

export default function CrachaIdentificacao() {
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("ativo");
    const [motoristaSelecionado, setMotoristaSelecionado] = useState(null);

    const { data: motoristas = [], isLoading } = useQuery({
        queryKey: ["motoristas-cracha"],
        queryFn: () => base44.entities.Motorista.list("-created_date")
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    const filtered = motoristas.filter(m => {
        const matchSearch = m.nome?.toLowerCase().includes(search.toLowerCase()) ||
            m.cpf?.includes(search);
        const matchStatus = filterStatus === "all" || m.status === filterStatus;
        return matchSearch && matchStatus;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                        <IdCard className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Crachá de Identificação</h1>
                        <p className="text-slate-500">Gere crachás para os colaboradores</p>
                    </div>
                </div>

                {/* Filtros */}
                <Card className="bg-white/80 border-0 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    placeholder="Buscar por nome ou CPF..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-40 bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="ativo">Ativos</SelectItem>
                                    <SelectItem value="inativo">Inativos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Motoristas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full text-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            Nenhum colaborador encontrado
                        </div>
                    ) : (
                        filtered.map((motorista) => (
                            <Card 
                                key={motorista.id} 
                                className="bg-white/90 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                                onClick={() => setMotoristaSelecionado(motorista)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        {motorista.foto_url ? (
                                            <img 
                                                src={motorista.foto_url} 
                                                alt={motorista.nome}
                                                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                                <span className="text-white text-xl font-bold">
                                                    {motorista.nome?.charAt(0) || "?"}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800">{motorista.nome}</h3>
                                            <p className="text-sm text-slate-500">{motorista.funcao || "Motorista"}</p>
                                            <div className="flex gap-2 mt-1">
                                                <Badge className={motorista.status === "ativo" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
                                                    {motorista.status || "ativo"}
                                                </Badge>
                                                {motorista.categoria_cnh && (
                                                    <Badge className="bg-blue-100 text-blue-700">
                                                        CNH {motorista.categoria_cnh}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <Button 
                                            size="icon" 
                                            className="bg-emerald-500 hover:bg-emerald-600"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMotoristaSelecionado(motorista);
                                            }}
                                        >
                                            <Printer className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Modal Crachá */}
            {motoristaSelecionado && (
                <CrachaMotorista
                    motorista={motoristaSelecionado}
                    config={config}
                    onClose={() => setMotoristaSelecionado(null)}
                />
            )}
        </div>
    );
}