import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    UserCheck, UserX, Users, Shield, Search, 
    Settings, Check, X, Clock, Mail
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const TODAS_PAGINAS = [
    { id: "Home", nome: "Home" },
    { id: "OrdensColeta", nome: "Ordens de Coleta" },
    { id: "AdicionarColetaDiaria", nome: "Adicionar Coletas" },
    { id: "ColetasDiarias", nome: "Coletas Diárias" },
    { id: "ComprovantesInternos", nome: "Comprovantes Internos" },
    { id: "NotaDeposito", nome: "Nota Depósito" },
    { id: "Romaneios", nome: "Romaneios/Entregas" },
    { id: "RotasGPS", nome: "Rotas GPS" },
    { id: "Clientes", nome: "Clientes" },
    { id: "Motoristas", nome: "Colaboradores" },
    { id: "Veiculos", nome: "Veículos" },
    { id: "Rastreamento", nome: "Rastreamento" },
    { id: "Comprovantes", nome: "Comprovantes" },
    { id: "Avisos", nome: "Avisos" },
    { id: "Relatorios", nome: "Relatórios" },
    { id: "RelatorioMotoristas", nome: "Performance" },
    { id: "Configuracoes", nome: "Configurações" },
    { id: "AprovacaoUsuarios", nome: "Aprovação de Usuários" },
    { id: "PersonalizarHome", nome: "Personalizar Home" },
    { id: "Backup", nome: "Backup" }
];

export default function AprovacaoUsuarios() {
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [showPermissions, setShowPermissions] = useState(false);
    const queryClient = useQueryClient();

    const { data: usuarios = [], isLoading } = useQuery({
        queryKey: ["usuarios"],
        queryFn: () => base44.entities.User.list("-created_date")
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["usuarios"] });
            toast.success("Usuário atualizado!");
            setShowPermissions(false);
        }
    });

    const handleAprovar = (user) => {
        updateMutation.mutate({
            id: user.id,
            data: { 
                status: "aprovado",
                paginas_permitidas: user.paginas_permitidas?.length > 0 
                    ? user.paginas_permitidas 
                    : ["Home", "OrdensColeta", "Clientes"]
            }
        });
    };

    const handleRejeitar = (user) => {
        updateMutation.mutate({
            id: user.id,
            data: { status: "rejeitado" }
        });
    };

    const handleTogglePagina = (pagina) => {
        if (!selectedUser) return;
        const atuais = selectedUser.paginas_permitidas || [];
        const novas = atuais.includes(pagina)
            ? atuais.filter(p => p !== pagina)
            : [...atuais, pagina];
        setSelectedUser({ ...selectedUser, paginas_permitidas: novas });
    };

    const handleSavePermissions = () => {
        updateMutation.mutate({
            id: selectedUser.id,
            data: {
                tipo_usuario: selectedUser.tipo_usuario,
                role: selectedUser.tipo_usuario === "admin" ? "admin" : "user",
                paginas_permitidas: selectedUser.paginas_permitidas
            }
        });
    };

    const handleSetAdmin = (user, isAdmin) => {
        updateMutation.mutate({
            id: user.id,
            data: { 
                tipo_usuario: isAdmin ? "admin" : "usuario",
                paginas_permitidas: isAdmin 
                    ? TODAS_PAGINAS.map(p => p.id) 
                    : user.paginas_permitidas
            }
        });
    };

    const pendentes = usuarios.filter(u => u.status === "pendente" || !u.status);
    const aprovados = usuarios.filter(u => u.status === "aprovado");
    const rejeitados = usuarios.filter(u => u.status === "rejeitado");

    const filteredUsers = (list) => list.filter(u =>
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    );

    const statusColors = {
        pendente: "bg-amber-100 text-amber-800 border-amber-200",
        aprovado: "bg-emerald-100 text-emerald-800 border-emerald-200",
        rejeitado: "bg-red-100 text-red-800 border-red-200"
    };

    const UserCard = ({ user }) => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
        >
            <Card className="bg-white/90 backdrop-blur border-0 shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                {user.full_name?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800">{user.full_name || "Sem nome"}</h3>
                                <p className="text-sm text-slate-500 flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {user.email}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge className={`${statusColors[user.status || "pendente"]} border`}>
                                        {user.status === "aprovado" ? "Aprovado" : 
                                         user.status === "rejeitado" ? "Rejeitado" : "Pendente"}
                                    </Badge>
                                    {(user.tipo_usuario === "admin" || user.role === "admin") && (
                                        <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
                                            <Shield className="w-3 h-3 mr-1" />
                                            Admin
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {(user.status === "pendente" || !user.status) && (
                                <>
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleAprovar(user)}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <Check className="w-4 h-4 mr-1" />
                                        Aprovar
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleRejeitar(user)}
                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                    >
                                        <X className="w-4 h-4 mr-1" />
                                        Rejeitar
                                    </Button>
                                </>
                            )}
                            {user.status === "aprovado" && (
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => { setSelectedUser(user); setShowPermissions(true); }}
                                >
                                    <Settings className="w-4 h-4 mr-1" />
                                    Permissões
                                </Button>
                            )}
                            {user.status === "rejeitado" && (
                                <Button 
                                    size="sm" 
                                    onClick={() => handleAprovar(user)}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <Check className="w-4 h-4 mr-1" />
                                    Aprovar
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                            <UserCheck className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Aprovação de Usuários</h1>
                            <p className="text-slate-500">Gerencie acessos e permissões</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Clock className="w-8 h-8 text-amber-600" />
                            <div>
                                <p className="text-2xl font-bold text-amber-800">{pendentes.length}</p>
                                <p className="text-sm text-amber-600">Pendentes</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <UserCheck className="w-8 h-8 text-emerald-600" />
                            <div>
                                <p className="text-2xl font-bold text-emerald-800">{aprovados.length}</p>
                                <p className="text-sm text-emerald-600">Aprovados</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-red-50 border-red-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <UserX className="w-8 h-8 text-red-600" />
                            <div>
                                <p className="text-2xl font-bold text-red-800">{rejeitados.length}</p>
                                <p className="text-sm text-red-600">Rejeitados</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <Card className="bg-white/60 backdrop-blur border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Buscar por nome ou email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 bg-white"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="pendentes" className="space-y-4">
                    <TabsList className="bg-white/80 backdrop-blur shadow-md p-1">
                        <TabsTrigger value="pendentes" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                            Pendentes ({pendentes.length})
                        </TabsTrigger>
                        <TabsTrigger value="aprovados" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                            Aprovados ({aprovados.length})
                        </TabsTrigger>
                        <TabsTrigger value="rejeitados" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                            Rejeitados ({rejeitados.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pendentes" className="space-y-3">
                        <AnimatePresence>
                            {filteredUsers(pendentes).length === 0 ? (
                                <Card className="bg-white/60">
                                    <CardContent className="p-12 text-center text-slate-500">
                                        Nenhum usuário pendente
                                    </CardContent>
                                </Card>
                            ) : (
                                filteredUsers(pendentes).map(user => (
                                    <UserCard key={user.id} user={user} />
                                ))
                            )}
                        </AnimatePresence>
                    </TabsContent>

                    <TabsContent value="aprovados" className="space-y-3">
                        <AnimatePresence>
                            {filteredUsers(aprovados).length === 0 ? (
                                <Card className="bg-white/60">
                                    <CardContent className="p-12 text-center text-slate-500">
                                        Nenhum usuário aprovado
                                    </CardContent>
                                </Card>
                            ) : (
                                filteredUsers(aprovados).map(user => (
                                    <UserCard key={user.id} user={user} />
                                ))
                            )}
                        </AnimatePresence>
                    </TabsContent>

                    <TabsContent value="rejeitados" className="space-y-3">
                        <AnimatePresence>
                            {filteredUsers(rejeitados).length === 0 ? (
                                <Card className="bg-white/60">
                                    <CardContent className="p-12 text-center text-slate-500">
                                        Nenhum usuário rejeitado
                                    </CardContent>
                                </Card>
                            ) : (
                                filteredUsers(rejeitados).map(user => (
                                    <UserCard key={user.id} user={user} />
                                ))
                            )}
                        </AnimatePresence>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Permissions Dialog */}
            <Dialog open={showPermissions} onOpenChange={setShowPermissions}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            Permissões de {selectedUser?.full_name}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-6 py-4">
                            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-200">
                                <div>
                                    <Label className="font-semibold text-purple-800">Administrador</Label>
                                    <p className="text-sm text-purple-600">Acesso total ao sistema</p>
                                </div>
                                <Switch
                                    checked={selectedUser.tipo_usuario === "admin" || selectedUser.role === "admin"}
                                    onCheckedChange={(v) => {
                                        const novoUser = {
                                            ...selectedUser, 
                                            tipo_usuario: v ? "admin" : "usuario",
                                            role: v ? "admin" : "user",
                                            paginas_permitidas: v ? TODAS_PAGINAS.map(p => p.id) : selectedUser.paginas_permitidas
                                        };
                                        setSelectedUser(novoUser);
                                    }}
                                />
                            </div>

                            {selectedUser.tipo_usuario !== "admin" && selectedUser.role !== "admin" && (
                                <div className="space-y-3">
                                    <Label className="font-semibold">Páginas Permitidas</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TODAS_PAGINAS.map(pagina => (
                                            <div 
                                                key={pagina.id}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                    (selectedUser.paginas_permitidas || []).includes(pagina.id)
                                                        ? "bg-blue-50 border-blue-300 text-blue-800"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                }`}
                                                onClick={() => handleTogglePagina(pagina.id)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                                        (selectedUser.paginas_permitidas || []).includes(pagina.id)
                                                            ? "bg-blue-500 border-blue-500"
                                                            : "border-slate-300"
                                                    }`}>
                                                        {(selectedUser.paginas_permitidas || []).includes(pagina.id) && (
                                                            <Check className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm">{pagina.nome}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button variant="outline" onClick={() => setShowPermissions(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSavePermissions} className="bg-indigo-600 hover:bg-indigo-700">
                                    Salvar Permissões
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}