import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Info, Database, FileText, Scale, Download, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Sobre() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg">
            <Info className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Sobre o Sistema</h1>
            <p className="text-slate-500">Informações legais e da licença</p>
          </div>
        </div>

        {/* LOGO e Identificação */}
        <Card className="bg-white/90 backdrop-blur border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <img 
                src="https://media.base44.com/images/public/695fa57f97d202e8a22b02c0/1858ed22e_WhatsAppImage2026-03-20at125657.jpg" 
                alt="Loggxy" 
                className="h-20 mx-auto object-contain" 
              />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">LOGGXY SISTEMA DE GESTÃO</h2>
            <p className="text-sm text-slate-500 mb-4">CNPJ 63.700.987/0001-77</p>
            <p className="text-slate-600 max-w-lg mx-auto">
              Este software é de propriedade exclusiva da <strong>LOGGXY SISTEMA DE GESTÃO</strong>, 
              CNPJ 63.700.987/0001-77.
            </p>
          </CardContent>
        </Card>

        {/* Licenciamento */}
        <Card className="bg-white/90 backdrop-blur border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              Licenciamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-slate-600">
              O uso deste sistema é <strong>licenciado</strong> e restrito às empresas contratantes 
              mediante contrato vigente e pagamento das respectivas mensalidades.
            </p>
            <p className="text-slate-600">
              É proibida a reprodução, cópia, cessão, engenharia reversa, comercialização 
              ou utilização sem autorização expressa da titular.
            </p>
            <p className="text-slate-600 font-semibold text-amber-700">
              Licenciado para uso, não vendido.
            </p>
            <p className="text-sm text-slate-500">
              Ao utilizar este sistema, o usuário concorda com os Termos de Uso, 
              Política de Privacidade e Contrato de Licenciamento de Software (SaaS).
            </p>
          </CardContent>
        </Card>

        {/* Versão */}
        <Card className="bg-white/90 backdrop-blur border-0 shadow-lg">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Versão do Sistema</p>
                <p className="text-2xl font-bold text-slate-800">1.0.0</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">© 2026 Loggxy Sistema de Gestão</p>
          </CardContent>
        </Card>

        {/* Portabilidade e Exclusão de Dados */}
        <Card className="bg-white/90 backdrop-blur border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              Portabilidade e Exclusão de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-slate-600">
              Caso a empresa contratante opte por não utilizar mais o sistema, 
              estão disponíveis na aba <strong>"Backup"</strong> as funcionalidades de:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-emerald-50 rounded-xl text-center">
                <Download className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-semibold text-emerald-800">Exportação de Dados</h3>
                <p className="text-sm text-emerald-600">Baixe todos os dados em JSON</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-center">
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-800">Download das Informações</h3>
                <p className="text-sm text-blue-600">Dados cadastrados e registros</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl text-center">
                <Scale className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-800">Solicitação de Exclusão</h3>
                <p className="text-sm text-purple-600">Remoção dos dados do sistema</p>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800">
                Essas funcionalidades são disponibilizadas em conformidade com a 
                <strong> Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018)</strong>.
              </p>
            </div>
            <Link to={createPageUrl("Backup")}>
              <Button variant="outline" className="border-emerald-500 text-emerald-700 hover:bg-emerald-50">
                <ExternalLink className="w-4 h-4 mr-2" />
                Acessar Backup
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card className="bg-white/90 backdrop-blur border-0 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-red-50 to-rose-50">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              Segurança e Propriedade Intelectual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-slate-600">
              O código-fonte, estrutura, layouts, banco de dados, regras de negócio 
              e demais componentes do sistema são de <strong>propriedade exclusiva</strong> da 
              LOGGXY SISTEMA DE GESTÃO e não podem ser copiados, reproduzidos ou 
              distribuídos sem autorização expressa.
            </p>
            <p className="text-slate-600">
              A funcionalidade de clonagem do sistema não está disponível. 
              O sistema é <strong>licenciado para uso</strong> — o contratante utiliza 
              o software como serviço (SaaS) e não adquire sua propriedade.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}