import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Fingerprint, Unlock, KeyRound, AlertCircle, Smartphone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function BiometricLock({ onUnlock }) {
    const [showPinInput, setShowPinInput] = useState(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [authenticating, setAuthenticating] = useState(false);
    const [ready, setReady] = useState(false);

    const { data: configs = [], isLoading: loadingConfig } = useQuery({
        queryKey: ["configuracoes-lock"],
        queryFn: async () => {
            try {
                return await base44.entities.Configuracoes.list();
            } catch (e) {
                console.log("Erro ao carregar config:", e);
                return [];
            }
        }
    });
    const config = configs[0] || {};

    // Verificar se biometria está disponível
    useEffect(() => {
        checkBiometricAvailability();
        // Garantir que o componente está pronto após 1 segundo
        const timer = setTimeout(() => setReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const checkBiometricAvailability = async () => {
        try {
            if (window.PublicKeyCredential) {
                const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                setBiometricAvailable(available);
                // Não autenticar automaticamente para evitar problemas
            }
        } catch (e) {
            console.log("Biometria não suportada:", e);
            setBiometricAvailable(false);
        }
    };

    const handleBiometricAuth = async () => {
        if (authenticating) return;
        setAuthenticating(true);
        setError("");

        try {
            // Criar um challenge simples para verificação
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: {
                        name: "TWG Transportes",
                        id: window.location.hostname
                    },
                    user: {
                        id: new Uint8Array(16),
                        name: "user@app.com",
                        displayName: "Usuário"
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: "public-key" },
                        { alg: -257, type: "public-key" }
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000
                }
            });

            if (credential) {
                onUnlock();
            }
        } catch (e) {
            console.log("Erro na autenticação biométrica:", e);
            
            // Se erro for de cancelamento pelo usuário, tentar método alternativo
            if (e.name === "NotAllowedError" || e.name === "AbortError") {
                setError("Autenticação cancelada. Use o PIN ou tente novamente.");
            } else {
                // Tentar autenticação simples via prompt do sistema
                try {
                    await trySimpleAuth();
                } catch (e2) {
                    setError("Use o PIN para desbloquear");
                    setShowPinInput(true);
                }
            }
        }
        setAuthenticating(false);
    };

    const trySimpleAuth = async () => {
        // Método alternativo: usar credenciais existentes
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: challenge,
                timeout: 60000,
                userVerification: "required",
                rpId: window.location.hostname
            }
        });

        if (assertion) {
            onUnlock();
        }
    };

    const handlePinSubmit = () => {
        // PIN padrão ou configurado
        const correctPin = config.pin_acesso || "1234";
        
        if (pin === correctPin) {
            onUnlock();
        } else {
            setError("PIN incorreto");
            setPin("");
        }
    };

    const handleSkip = () => {
        // Permitir entrada sem biometria (apenas para primeiro acesso)
        onUnlock();
    };

    // Mostrar loading enquanto não está pronto
    if (!ready && loadingConfig) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
                <div className="animate-spin w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
                <CardContent className="p-8 text-center space-y-6">
                    {/* Logo */}
                    {config.logo_url && (
                        <img 
                            src={config.logo_url} 
                            alt="Logo" 
                            className="h-20 object-contain mx-auto mb-4"
                        />
                    )}

                    {/* Ícone principal */}
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
                            {showPinInput ? (
                                <KeyRound className="w-12 h-12 text-white" />
                            ) : (
                                <Fingerprint className="w-12 h-12 text-white" />
                            )}
                        </div>
                    </div>

                    {/* Título */}
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            {config.nome_empresa || "TWG Transportes"}
                        </h1>
                        <p className="text-blue-200 text-sm">
                            {showPinInput ? "Digite seu PIN de acesso" : "Desbloqueie para continuar"}
                        </p>
                    </div>

                    {/* Erro */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <span className="text-sm text-red-300">{error}</span>
                        </div>
                    )}

                    {/* Input PIN */}
                    {showPinInput ? (
                        <div className="space-y-4">
                            <Input
                                type="password"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="Digite o PIN"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                                className="text-center text-2xl tracking-widest bg-white/10 border-white/30 text-white placeholder:text-white/50"
                            />
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => { setShowPinInput(false); setPin(""); setError(""); }}
                                    className="flex-1 border-white/30 text-white hover:bg-white/10"
                                >
                                    Voltar
                                </Button>
                                <Button
                                    onClick={handlePinSubmit}
                                    disabled={pin.length < 4}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    <Unlock className="w-4 h-4 mr-2" />
                                    Desbloquear
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Botão Biometria */}
                            {biometricAvailable && (
                                <Button
                                    onClick={handleBiometricAuth}
                                    disabled={authenticating}
                                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg"
                                >
                                    {authenticating ? (
                                        <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        <>
                                            <Fingerprint className="w-6 h-6 mr-2" />
                                            Usar Biometria
                                        </>
                                    )}
                                </Button>
                            )}

                            {/* Botão PIN */}
                            <Button
                                variant="outline"
                                onClick={() => setShowPinInput(true)}
                                className="w-full h-12 border-white/30 text-white hover:bg-white/10"
                            >
                                <KeyRound className="w-5 h-5 mr-2" />
                                Usar PIN
                            </Button>

                            {/* Botão Entrar sem biometria */}
                            <Button
                                variant="ghost"
                                onClick={handleSkip}
                                className="w-full text-blue-300 hover:text-white hover:bg-white/10"
                            >
                                <Smartphone className="w-4 h-4 mr-2" />
                                Entrar sem bloqueio
                            </Button>
                        </div>
                    )}

                    {/* Info */}
                    <p className="text-xs text-blue-300/60">
                        {biometricAvailable 
                            ? "Use impressão digital, Face ID ou PIN"
                            : "Use o PIN para desbloquear o app"
                        }
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}