import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function OrdemPrint({ ordem }) {
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

    return (
        <div className="bg-white p-8 max-w-4xl mx-auto print:p-4" id="ordem-print">
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    #ordem-print, #ordem-print * { visibility: visible; }
                    #ordem-print { position: absolute; left: 0; top: 0; width: 100%; }
                    .print-hide { display: none !important; }
                }
                `}
            </style>
            
            {/* Cabeçalho com Logo */}
            <div className="border-2 border-black">
                <div className="flex">
                    <div className="w-48 border-r-2 border-black p-4 flex items-center justify-center">
                        {config.logo_url ? (
                            <img src={config.logo_url} alt="Logo" className="max-w-full max-h-20 object-contain" />
                        ) : (
                            <div className="text-center text-gray-400 text-sm">
                                [LOGO]
                            </div>
                        )}
                    </div>
                    <div className="flex-1 border-r-2 border-black">
                        <div className="p-2 text-center border-b border-black">
                            <h1 className="text-xl font-bold">ORDEM DE COLETA</h1>
                        </div>
                        <div className="p-2 text-center">
                            <p className="font-bold text-lg">{config.nome_empresa || "TRANSPORTES"}</p>
                            <p className="text-sm">{config.endereco}</p>
                            <p className="text-sm">Telefone: {config.telefone}</p>
                        </div>
                    </div>
                    <div className="w-36">
                        <div className="border-b border-black p-2 flex justify-between">
                            <span className="font-bold">Nº:</span>
                            <span className="font-bold text-xl">{ordem.numero}</span>
                        </div>
                        <div className="p-2 flex justify-between">
                            <span className="font-bold">Data:</span>
                            <span>{formatDate(ordem.data_ordem)}</span>
                        </div>
                    </div>
                </div>

                {/* Dados Remetente */}
                <div className="border-t-2 border-black">
                    <div className="bg-amber-100 p-2 font-bold text-center border-b border-black">
                        DADOS REMETENTE
                    </div>
                    <div className="p-3 space-y-1 text-sm">
                        <div className="flex gap-4">
                            <div className="flex gap-1">
                                <span className="font-bold">Cod.:</span>
                                <span>{ordem.remetente_codigo}</span>
                            </div>
                            <span className="font-medium">{ordem.remetente_nome}</span>
                            <div className="flex gap-1 ml-auto">
                                <span className="font-bold">Contato:</span>
                                <span>{ordem.remetente_contato}</span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex gap-1">
                                <span className="font-bold">CEP:</span>
                                <span>{ordem.remetente_cep}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">End.:</span>
                                <span>{ordem.remetente_endereco}</span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <span className="font-bold">CNPJ:</span>
                            <span>{ordem.remetente_cnpj}</span>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex gap-1">
                                <span className="font-bold">Bairro:</span>
                                <span>{ordem.remetente_bairro}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">Cidade:</span>
                                <span>{ordem.remetente_cidade}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">Fone:</span>
                                <span>{ordem.remetente_telefone}</span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <span className="font-bold">Obs:</span>
                            <span>{ordem.remetente_obs}</span>
                        </div>
                    </div>
                </div>

                {/* Dados Destinatário */}
                <div className="border-t-2 border-black">
                    <div className="bg-emerald-100 p-2 font-bold text-center border-b border-black">
                        DADOS DESTINATÁRIO
                    </div>
                    <div className="p-3 space-y-1 text-sm">
                        <div className="flex gap-4">
                            <div className="flex gap-1">
                                <span className="font-bold">Cod.:</span>
                                <span>{ordem.destinatario_codigo}</span>
                            </div>
                            <span className="font-medium">{ordem.destinatario_nome}</span>
                            <div className="flex gap-1 ml-auto">
                                <span className="font-bold">Contato:</span>
                                <span>{ordem.destinatario_contato}</span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex gap-1">
                                <span className="font-bold">Fone:</span>
                                <span>{ordem.destinatario_telefone}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">CNPJ:</span>
                                <span>{ordem.destinatario_cnpj}</span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <span className="font-bold">Ref. Obs:</span>
                            <span>{ordem.destinatario_ref_obs}</span>
                        </div>
                    </div>
                </div>

                {/* Dados Transporte */}
                <div className="border-t-2 border-black">
                    <div className="bg-blue-100 p-2 font-bold text-center border-b border-black">
                        DADOS TRANSPORTE
                    </div>
                    <div className="p-3 space-y-1 text-sm">
                        <div className="flex gap-6">
                            <div className="flex gap-1">
                                <span className="font-bold">Peso:</span>
                                <span>{ordem.peso}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">Volume:</span>
                                <span>{ordem.volume}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">Espécie:</span>
                                <span>{ordem.especie}</span>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex gap-1">
                                <span className="font-bold">Data Coleta:</span>
                                <span>{formatDate(ordem.data_coleta)}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">NFe:</span>
                                <span>{ordem.nfe}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">Solicitante:</span>
                                <span>{ordem.solicitante}</span>
                            </div>
                        </div>
                        <div className="flex gap-6">
                            <div className="flex gap-1">
                                <span className="font-bold">Horário:</span>
                                <span>{ordem.horario}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">Almoço:</span>
                                <span>{ordem.almoco}</span>
                            </div>
                        </div>
                        <div className="flex gap-6 border-t pt-2 mt-2">
                            <div className="flex gap-1">
                                <span className="font-bold">Motorista:</span>
                                <span>{ordem.motorista}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">Placa:</span>
                                <span>{ordem.placa}</span>
                            </div>
                            <div className="flex gap-1">
                                <span className="font-bold">CPF:</span>
                                <span>{ordem.cpf_motorista}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assinaturas */}
                <div className="border-t-2 border-black p-4">
                    <div className="grid grid-cols-2 gap-8 mt-8">
                        <div className="text-center">
                            <div className="border-t border-black pt-2">
                                <p className="text-sm">Assinatura do Remetente</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t border-black pt-2">
                                <p className="text-sm">Assinatura do Motorista</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}