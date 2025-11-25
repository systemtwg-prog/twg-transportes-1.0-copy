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

    const handlePrint = () => {
        const winPrint = window.open('', '', 'width=800,height=600');
        
        winPrint.document.write(`
            <html>
            <head>
                <title>Ordem de Coleta ${ordem.numero}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; }
                    .container { border: 2px solid #000; }
                    .header { display: flex; border-bottom: 2px solid #000; }
                    .logo { width: 120px; border-right: 2px solid #000; padding: 10px; display: flex; align-items: center; justify-content: center; }
                    .logo img { max-width: 100%; max-height: 50px; }
                    .title-section { flex: 1; border-right: 2px solid #000; }
                    .title { text-align: center; font-size: 16px; font-weight: bold; padding: 8px; border-bottom: 1px solid #000; background: #f0f0f0; }
                    .company { text-align: center; padding: 8px; font-size: 10px; }
                    .numero { width: 100px; }
                    .numero-row { padding: 8px; border-bottom: 1px solid #000; }
                    .section-title { background: #e0e0e0; padding: 5px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; }
                    .section-title.rem { background: #fef3c7; }
                    .section-title.dest { background: #d1fae5; }
                    .section-title.trans { background: #dbeafe; }
                    .section-content { padding: 8px; }
                    .row { margin-bottom: 3px; }
                    .section { border-bottom: 2px solid #000; }
                    .signatures { padding: 20px; display: flex; justify-content: space-around; margin-top: 30px; }
                    .signature { text-align: center; width: 200px; }
                    .signature-line { border-top: 1px solid #000; padding-top: 5px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">
                            ${config.logo_url ? `<img src="${config.logo_url}" alt="Logo">` : '<strong>LOGO</strong>'}
                        </div>
                        <div class="title-section">
                            <div class="title">ORDEM DE COLETA</div>
                            <div class="company">
                                <strong>${config.nome_empresa || "TRANSPORTES"}</strong><br>
                                ${config.endereco || ""}<br>
                                Tel: ${config.telefone || ""}
                            </div>
                        </div>
                        <div class="numero">
                            <div class="numero-row"><strong>Nº:</strong> ${ordem.numero}</div>
                            <div class="numero-row"><strong>Data:</strong> ${formatDate(ordem.data_ordem)}</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title rem">DADOS REMETENTE</div>
                        <div class="section-content">
                            <div class="row"><strong>Cod:</strong> ${ordem.remetente_codigo || "-"} | <strong>Nome:</strong> ${ordem.remetente_nome} | <strong>Contato:</strong> ${ordem.remetente_contato || "-"}</div>
                            <div class="row"><strong>CEP:</strong> ${ordem.remetente_cep || "-"} | <strong>End:</strong> ${ordem.remetente_endereco || "-"}</div>
                            <div class="row"><strong>CNPJ:</strong> ${ordem.remetente_cnpj || "-"} | <strong>Bairro:</strong> ${ordem.remetente_bairro || "-"} | <strong>Cidade:</strong> ${ordem.remetente_cidade || "-"} | <strong>Fone:</strong> ${ordem.remetente_telefone || "-"}</div>
                            ${ordem.remetente_obs ? `<div class="row"><strong>Obs:</strong> ${ordem.remetente_obs}</div>` : ""}
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title dest">DADOS DESTINATÁRIO</div>
                        <div class="section-content">
                            <div class="row"><strong>Cod:</strong> ${ordem.destinatario_codigo || "-"} | <strong>Nome:</strong> ${ordem.destinatario_nome} | <strong>Contato:</strong> ${ordem.destinatario_contato || "-"}</div>
                            <div class="row"><strong>Fone:</strong> ${ordem.destinatario_telefone || "-"} | <strong>CNPJ:</strong> ${ordem.destinatario_cnpj || "-"}</div>
                            ${ordem.destinatario_ref_obs ? `<div class="row"><strong>Ref/Obs:</strong> ${ordem.destinatario_ref_obs}</div>` : ""}
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title trans">DADOS TRANSPORTE</div>
                        <div class="section-content">
                            <div class="row"><strong>Peso:</strong> ${ordem.peso || "-"} | <strong>Volume:</strong> ${ordem.volume || "-"} | <strong>Espécie:</strong> ${ordem.especie || "-"} | <strong>NFe:</strong> ${ordem.nfe || "-"}</div>
                            <div class="row"><strong>Data Coleta:</strong> ${formatDate(ordem.data_coleta)} | <strong>Horário:</strong> ${ordem.horario || "-"} | <strong>Almoço:</strong> ${ordem.almoco || "-"} | <strong>Solicitante:</strong> ${ordem.solicitante || "-"}</div>
                            <div class="row" style="border-top: 1px solid #ccc; padding-top: 5px; margin-top: 5px;"><strong>Motorista:</strong> ${ordem.motorista || "-"} | <strong>Placa:</strong> ${ordem.placa || "-"} | <strong>CPF:</strong> ${ordem.cpf_motorista || "-"}</div>
                        </div>
                    </div>
                    
                    <div class="signatures">
                        <div class="signature">
                            <div class="signature-line">Assinatura do Remetente</div>
                        </div>
                        <div class="signature">
                            <div class="signature-line">Assinatura do Motorista</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
        
        winPrint.document.close();
        winPrint.focus();
        setTimeout(() => {
            winPrint.print();
            winPrint.close();
        }, 250);
    };

    return (
        <div className="bg-white p-4">
            {/* Botões de Ação */}
            {showActions && (
                <div className="flex justify-end gap-2 mb-4">
                    <Button onClick={handleWhatsApp} variant="outline" className="bg-green-50 border-green-500 text-green-700 hover:bg-green-100">
                        <Share2 className="w-4 h-4 mr-2" />
                        Enviar WhatsApp
                    </Button>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir
                    </Button>
                </div>
            )}
            
            {/* Preview do Documento */}
            <div className="border-2 border-black text-xs">
                {/* Cabeçalho */}
                <div className="flex border-b-2 border-black">
                    <div className="w-32 border-r-2 border-black p-2 flex items-center justify-center bg-white">
                        {config.logo_url ? (
                            <img src={config.logo_url} alt="Logo" className="max-w-full max-h-12 object-contain" />
                        ) : (
                            <span className="text-gray-400 text-xs font-bold">{config.nome_empresa || "LOGO"}</span>
                        )}
                    </div>
                    <div className="flex-1 border-r-2 border-black">
                        <div className="p-1 text-center border-b border-black bg-gray-100">
                            <h1 className="text-sm font-bold">ORDEM DE COLETA</h1>
                        </div>
                        <div className="p-1 text-center text-[10px]">
                            <p className="font-bold">{config.nome_empresa || "TRANSPORTES"}</p>
                            <p>{config.endereco}</p>
                            <p>Tel: {config.telefone}</p>
                        </div>
                    </div>
                    <div className="w-24">
                        <div className="border-b border-black p-1 text-center">
                            <span className="text-[10px]">Nº:</span>
                            <span className="font-bold text-sm ml-1">{ordem.numero}</span>
                        </div>
                        <div className="p-1 text-center text-[10px]">
                            <span>Data:</span>
                            <p className="font-bold">{formatDate(ordem.data_ordem)}</p>
                        </div>
                    </div>
                </div>

                {/* Remetente */}
                <div className="border-b-2 border-black">
                    <div className="bg-amber-100 p-1 font-bold text-center text-[10px] border-b border-black">
                        DADOS REMETENTE
                    </div>
                    <div className="p-1 text-[10px]">
                        <div><strong>Cod:</strong> {ordem.remetente_codigo || "-"} | <strong>Nome:</strong> {ordem.remetente_nome} | <strong>Contato:</strong> {ordem.remetente_contato || "-"}</div>
                        <div><strong>CEP:</strong> {ordem.remetente_cep || "-"} | <strong>End:</strong> {ordem.remetente_endereco || "-"}</div>
                        <div><strong>CNPJ:</strong> {ordem.remetente_cnpj || "-"} | <strong>Bairro:</strong> {ordem.remetente_bairro || "-"} | <strong>Cidade:</strong> {ordem.remetente_cidade || "-"} | <strong>Fone:</strong> {ordem.remetente_telefone || "-"}</div>
                    </div>
                </div>

                {/* Destinatário */}
                <div className="border-b-2 border-black">
                    <div className="bg-emerald-100 p-1 font-bold text-center text-[10px] border-b border-black">
                        DADOS DESTINATÁRIO
                    </div>
                    <div className="p-1 text-[10px]">
                        <div><strong>Cod:</strong> {ordem.destinatario_codigo || "-"} | <strong>Nome:</strong> {ordem.destinatario_nome} | <strong>Contato:</strong> {ordem.destinatario_contato || "-"}</div>
                        <div><strong>Fone:</strong> {ordem.destinatario_telefone || "-"} | <strong>CNPJ:</strong> {ordem.destinatario_cnpj || "-"}</div>
                    </div>
                </div>

                {/* Transporte */}
                <div className="border-b border-black">
                    <div className="bg-blue-100 p-1 font-bold text-center text-[10px] border-b border-black">
                        DADOS TRANSPORTE
                    </div>
                    <div className="p-1 text-[10px]">
                        <div><strong>Peso:</strong> {ordem.peso || "-"} | <strong>Volume:</strong> {ordem.volume || "-"} | <strong>Espécie:</strong> {ordem.especie || "-"} | <strong>NFe:</strong> {ordem.nfe || "-"}</div>
                        <div><strong>Data Coleta:</strong> {formatDate(ordem.data_coleta)} | <strong>Horário:</strong> {ordem.horario || "-"} | <strong>Almoço:</strong> {ordem.almoco || "-"}</div>
                        <div className="border-t border-gray-300 pt-1 mt-1"><strong>Motorista:</strong> {ordem.motorista || "-"} | <strong>Placa:</strong> {ordem.placa || "-"} | <strong>CPF:</strong> {ordem.cpf_motorista || "-"}</div>
                    </div>
                </div>

                {/* Assinaturas */}
                <div className="p-2">
                    <div className="grid grid-cols-2 gap-8 mt-6">
                        <div className="text-center">
                            <div className="border-t border-black pt-1 text-[10px]">Assinatura do Remetente</div>
                        </div>
                        <div className="text-center">
                            <div className="border-t border-black pt-1 text-[10px]">Assinatura do Motorista</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}