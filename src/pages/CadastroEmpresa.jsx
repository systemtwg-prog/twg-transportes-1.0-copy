import React, { useState } from "react";
import { base44, rawBase44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { setTenantContext } from "@/lib/tenantContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return format(d, "yyyy-MM-dd");
}

export default function CadastroEmpresa() {
    const { user, checkAppState } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        razao_social: "",
        nome_fantasia: "",
        cnpj: "",
        telefone: "",
        email: "",
    });
    const [loading, setLoading] = useState(false);

    // Se já tem empresa, manda para a home
    React.useEffect(() => {
        if (user?.empresa_id) {
            navigate("/", { replace: true });
        }
    }, [user]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.razao_social.trim()) {
            toast.error("Informe a razão social da empresa.");
            return;
        }
        setLoading(true);
        try {
            const hoje = format(new Date(), "yyyy-MM-dd");
            // 1. Cria a empresa (raw, isenta de filtro de tenant)
            const empresa = await rawBase44.entities.Empresa.create({
                razao_social: form.razao_social.trim(),
                nome_fantasia: form.nome_fantasia.trim() || form.razao_social.trim(),
                cnpj: form.cnpj.trim(),
                telefone: form.telefone.trim(),
                email: form.email.trim() || user?.email,
                status: "trial",
                plano: "trial",
                data_inicio_trial: hoje,
                data_vencimento: addDays(new Date(), 15),
                ativo: true,
            });

            // 2. Define o contexto de tenant ANTES de criar configs/licença
            //    para que o filtro automático injete empresa_id.
            setTenantContext({ empresaId: empresa.id, isProprietario: false });

            // 3. Cria configurações e licença padrão (já com empresa_id)
            await base44.entities.Configuracoes.create({
                nome_empresa: form.nome_fantasia.trim() || form.razao_social.trim(),
                cor_primaria: "sky",
                cor_botoes: "blue",
                tema_escuro: false,
                modulos_ativos: [],
                modulos_usuario_comum: [],
                modulos_admin: [],
                botoes_home_mobile: [],
                botoes_home_pc: [],
            });

            await base44.entities.Licenca.create({
                status: "trial",
                modo_trial: true,
                prazo_trial_dias: 15,
                data_inicio_trial: hoje,
                data_vencimento: addDays(new Date(), 15),
            });

            // 4. Vincula o usuário à empresa como proprietário (dono) da empresa
            await base44.auth.updateMe({
                empresa_id: empresa.id,
                role: "proprietario",
                tipo_usuario: "proprietario",
                active_empresa_id: empresa.id,
            });

            toast.success("Empresa cadastrada! Seu trial de 15 dias começou.");
            // Recarrega o estado de auth para refletir empresa_id no usuário
            await checkAppState();
            navigate("/", { replace: true });
        } catch (err) {
            console.error("Erro ao cadastrar empresa:", err);
            toast.error("Não foi possível cadastrar a empresa. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg mb-3">
                        <Building2 className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Cadastro da Empresa</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Bem-vindo(a){user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}! Preencha os dados da
                        sua empresa para começar seu trial de 15 dias.
                    </p>
                </div>

                <Card className="border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-lg">Dados da Empresa</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="razao_social">Razão Social *</Label>
                                <Input
                                    id="razao_social"
                                    name="razao_social"
                                    value={form.razao_social}
                                    onChange={handleChange}
                                    placeholder="Ex: TWG Transportes Ltda"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                                <Input
                                    id="nome_fantasia"
                                    name="nome_fantasia"
                                    value={form.nome_fantasia}
                                    onChange={handleChange}
                                    placeholder="Ex: TWG"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cnpj">CNPJ</Label>
                                <Input
                                    id="cnpj"
                                    name="cnpj"
                                    value={form.cnpj}
                                    onChange={handleChange}
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="telefone">Telefone</Label>
                                    <Input
                                        id="telefone"
                                        name="telefone"
                                        value={form.telefone}
                                        onChange={handleChange}
                                        placeholder="(11) 0000-0000"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="contato@empresa.com"
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Cadastrando...
                                    </>
                                ) : (
                                    "Cadastrar Empresa e Iniciar Trial"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}