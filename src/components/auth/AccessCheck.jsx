import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, XCircle, Home, Loader2 } from "lucide-react";

export default function AccessCheck({ user, isLoading, pageName }) {
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
        );
    }

    // User não aprovado
    if (user?.status === "pendente" || !user?.status) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="max-w-md w-full bg-white shadow-2xl">
                    <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-6">
                            <Clock className="w-10 h-10 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Aguardando Aprovação</h2>
                        <p className="text-slate-600 mb-6">
                            Seu acesso está sendo analisado. Assim que um administrador aprovar, você poderá utilizar o sistema.
                        </p>
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <p className="text-sm text-amber-800">
                                Você receberá uma notificação quando seu acesso for liberado.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // User rejeitado
    if (user?.status === "rejeitado") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="max-w-md w-full bg-white shadow-2xl">
                    <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
                        <p className="text-slate-600 mb-6">
                            Infelizmente seu acesso foi negado. Entre em contato com o administrador para mais informações.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // User aprovado mas sem permissão para a página
    const paginasPermitidas = user?.paginas_permitidas || [];
    const isAdmin = user?.tipo_usuario === "admin" || user?.role === "admin";
    
    if (!isAdmin && pageName && pageName !== "Home" && !paginasPermitidas.includes(pageName)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="max-w-md w-full bg-white shadow-2xl">
                    <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-6">
                            <XCircle className="w-10 h-10 text-orange-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Sem Permissão</h2>
                        <p className="text-slate-600 mb-6">
                            Você não tem permissão para acessar esta página. Entre em contato com o administrador.
                        </p>
                        <Link to={createPageUrl("Home")}>
                            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                                <Home className="w-4 h-4 mr-2" />
                                Voltar para Home
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}