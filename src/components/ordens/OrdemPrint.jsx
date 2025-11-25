import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, Share2 } from "lucide-react";

export default function OrdemPrint({ ordem, showActions = true }) {
    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });

    const config = configs[0] || {};

    if (!ordem) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const handleWhatsApp = () => {
        const texto = `*ORDEM DE COLETA Nº ${ordem.numero}*
Data: ${formatDate(ordem.data_ordem)}

*REMETENTE:*
${ordem.remetente_nome}
${ordem.remetente_endereco || ""} - ${ordem.remetente_bairro || ""} - ${ordem.remetente_cidade || ""}
CEP: ${ordem.remetente_cep || ""} - Tel: ${ordem.remetente_telefone || ""}
CNPJ: ${ordem.remetente_cnpj || ""}

*DESTINATÁRIO:*
${ordem.destinatario_nome}
Tel: ${ordem.destinatario_telefone || ""}
CNPJ: ${ordem.destinatario_cnpj || ""}

*DADOS TRANSPORTE:*
Peso: ${ordem.peso || "-"} | Volume: ${ordem.volume || "-"}
NFe: ${ordem.nfe || "-"}
Data Coleta: ${formatDate(ordem.data_coleta)}
Horário: ${ordem.horario || "-"} | Almoço: ${ordem.almoco || "-"}

*MOTORISTA:*
${ordem.motorista || "-"} | Placa: ${ordem.placa || "-"}

${config.nome_empresa || "Sistema de Coletas"}
${config.telefone || ""}`;

        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, "_blank");
    };

    return (
        <div className="bg-white" id="ordem-print">
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    #ordem-print, #ordem-print * { visibility: visible; }
                    #ordem-print { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%;
                        padding: 10mm;
                        font-size: 11pt;
                    }
                    .no-print { display: none !important; }
                    @page { 
                        size: A4; 
                        margin: 10mm; 
                    }
                }
                `}
            </style>

            {/* Botões de Ação */}
            {showActions && (
                <div className="flex justify-end gap-2 mb-4 no-print">
                    <Button onClick={handleWhatsApp} variant="outline" className="bg-green-50 border-green-500 text-green-700 hover:bg-green-100">
                        <Share2 className="w-4 h-4 mr-2" />
                        Enviar WhatsApp
                    </Button>
                    <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>
                </div>
            )}
            
            {/* Documento */}
            <div className="border-2 border-black text-sm">
                {/* Cabeçalho */}
                <div className="flex border-b-2 border-black">
                    <div className="w-40 border-r-2 border-black p-3 flex items-center justify-center bg-white">
                        {config.logo_url ? (
                            <img src={config.logo_url} alt="Logo" className="max-w-full max-h-16 object-contain" />
                        ) : (
                            <div className="text-center text-gray-400 text-xs font-bold">
                                {config.nome_empresa || "LOGO"}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 border-r-2 border-black">
                        <div className="p-2 text-center border-b border-black bg-gray-100">
                            <h1 className="text-lg font-bold">ORDEM DE COLETA</h1>
                        </div>
                        <div className="p-2 text-center text-xs">
                            <p className="font-bold">{config.nome_empresa || "TRANSPORTES"}</p>
                            <p>{config.endereco}</p>
                            <p>Tel: {config.telefone}</p>
                        </div>
                    </div>
                    <div className="w-28">
                        <div className="border-b border-black p-2 text-center">
                            <span className="text-xs">Nº:</span>
                            <span className="font-bold text-lg ml-1">{ordem.numero}</span>
                        </div>
                        <div className="p-2 text-center text-xs">
                            <span>Data:</span>
                            <p className="font-bold">{formatDate(ordem.data_ordem)}</p>
                        </div>
                    </div>
                </div>

                {/* Remetente */}
                <div className="border-b-2 border-black">
                    <div className="bg-amber-100 p-1 font-bold text-center text-xs border-b border-black">
                        DADOS REMETENTE
                    </div>
                    <div className="p-2 text-xs space-y-0.5">
                        <div className="flex flex-wrap gap-x-4">
                            <span><strong>Cod:</strong> {ordem.remetente_codigo || "-"}</span>
                            <span><strong>Nome:</strong> {ordem.remetente_nome}</span>
                            <span className="ml-auto"><strong>Contato:</strong> {ordem.remetente_contato || "-"}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4">
                            <span><strong>CEP:</strong> {ordem.remetente_cep || "-"}</span>
                            <span><strong>End:</strong> {ordem.remetente_endereco || "-"}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4">
                            <span><strong>CNPJ:</strong> {ordem.remetente_cnpj || "-"}</span>
                            <span><strong>Bairro:</strong> {ordem.remetente_bairro || "-"}</span>
                            <span><strong>Cidade:</strong> {ordem.remetente_cidade || "-"}</span>
                            <span><strong>Fone:</strong> {ordem.remetente_telefone || "-"}</span>
                        </div>
                        {ordem.remetente_obs && <div><strong>Obs:</strong> {ordem.remetente_obs}</div>}
                    </div>
                </div>

                {/* Destinatário */}
                <div className="border-b-2 border-black">
                    <div className="bg-emerald-100 p-1 font-bold text-center text-xs border-b border-black">
                        DADOS DESTINATÁRIO
                    </div>
                    <div className="p-2 text-xs space-y-0.5">
                        <div className="flex flex-wrap gap-x-4">
                            <span><strong>Cod:</strong> {ordem.destinatario_codigo || "-"}</span>
                            <span><strong>Nome:</strong> {ordem.destinatario_nome}</span>
                            <span className="ml-auto"><strong>Contato:</strong> {ordem.destinatario_contato || "-"}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4">
                            <span><strong>Fone:</strong> {ordem.destinatario_telefone || "-"}</span>
                            <span><strong>CNPJ:</strong> {ordem.destinatario_cnpj || "-"}</span>
                        </div>
                        {ordem.destinatario_ref_obs && <div><strong>Ref/Obs:</strong> {ordem.destinatario_ref_obs}</div>}
                    </div>
                </div>

                {/* Transporte */}
                <div className="border-b-2 border-black">
                    <div className="bg-blue-100 p-1 font-bold text-center text-xs border-b border-black">
                        DADOS TRANSPORTE
                    </div>
                    <div className="p-2 text-xs">
                        <div className="flex flex-wrap gap-x-6 mb-1">
                            <span><strong>Peso:</strong> {ordem.peso || "-"}</span>
                            <span><strong>Volume:</strong> {ordem.volume || "-"}</span>
                            <span><strong>Espécie:</strong> {ordem.especie || "-"}</span>
                            <span><strong>NFe:</strong> {ordem.nfe || "-"}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 mb-1">
                            <span><strong>Data Coleta:</strong> {formatDate(ordem.data_coleta)}</span>
                            <span><strong>Horário:</strong> {ordem.horario || "-"}</span>
                            <span><strong>Almoço:</strong> {ordem.almoco || "-"}</span>
                            <span><strong>Solicitante:</strong> {ordem.solicitante || "-"}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 pt-1 border-t border-gray-300">
                            <span><strong>Motorista:</strong> {ordem.motorista || "-"}</span>
                            <span><strong>Placa:</strong> {ordem.placa || "-"}</span>
                            <span><strong>CPF:</strong> {ordem.cpf_motorista || "-"}</span>
                        </div>
                    </div>
                </div>

                {/* Assinaturas */}
                <div className="p-3">
                    <div className="grid grid-cols-2 gap-8 mt-8">
                        <div className="text-center">
                            <div className="border-t border-black pt-1">
                                <p className="text-xs">Assinatura do Remetente</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t border-black pt-1">
                                <p className="text-xs">Assinatura do Motorista</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}