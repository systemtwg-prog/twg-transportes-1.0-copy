import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function CrachaMotorista({ motorista, config, onClose }) {
    const crachaRef = useRef();

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            const [year, month, day] = dateStr.split("-");
            return `${day}/${month}/${year}`;
        } catch {
            return dateStr;
        }
    };

    const logoScale = (config?.logo_tamanho || 100) / 100;

    // Gerar vCard para QR Code
    const generateVCard = () => {
        const vcard = `BEGIN:VCARD
VERSION:3.0
N:${motorista.nome}
FN:${motorista.nome}
ORG:${config?.nome_empresa || ""}
TITLE:${motorista.funcao || "Motorista"}
TEL;TYPE=WORK:${config?.telefone || ""}
EMAIL:${config?.email || ""}
ADR;TYPE=WORK:;;${config?.endereco || ""}
NOTE:CPF: ${motorista.cpf || ""} | CNH: ${motorista.cnh || ""} | RG: ${motorista.rg || ""}
END:VCARD`;
        return encodeURIComponent(vcard);
    };

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${generateVCard()}`;

    const handlePrint = () => {
        const winPrint = window.open('', '', 'width=500,height=800');
        if (!winPrint) {
            alert("Por favor, permita pop-ups para imprimir.");
            return;
        }

        const logoHeight = 15 * logoScale;

        winPrint.document.write(`
            <html>
            <head>
                <title>Crachá - ${motorista.nome}</title>
                <style>
                    @media print {
                        @page { margin: 5mm; size: 85mm 140mm; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { 
                        font-family: Arial, sans-serif; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        min-height: 100vh;
                        background: #f0f0f0;
                    }
                    .cracha {
                        width: 85mm;
                        height: 140mm;
                        background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
                        border-radius: 10px;
                        padding: 6mm;
                        color: white;
                        position: relative;
                        overflow: hidden;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    }
                    .header {
                        text-align: center;
                        padding-bottom: 3mm;
                        border-bottom: 2px solid rgba(255,255,255,0.3);
                        margin-bottom: 3mm;
                    }
                    .logo {
                        max-height: ${logoHeight}mm;
                        max-width: ${50 * logoScale}mm;
                        margin-bottom: 1mm;
                    }
                    .empresa {
                        font-size: 11px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .empresa-info {
                        font-size: 7px;
                        opacity: 0.85;
                        margin-top: 1mm;
                        line-height: 1.4;
                    }
                    .content {
                        display: flex;
                        gap: 3mm;
                        margin-bottom: 3mm;
                    }
                    .foto {
                        width: 25mm;
                        height: 30mm;
                        border-radius: 4px;
                        object-fit: cover;
                        border: 2px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    }
                    .foto-placeholder {
                        width: 25mm;
                        height: 30mm;
                        border-radius: 4px;
                        background: rgba(255,255,255,0.2);
                        border: 2px solid white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 8px;
                    }
                    .info-principal {
                        flex: 1;
                    }
                    .nome {
                        font-size: 12px;
                        font-weight: bold;
                        text-transform: uppercase;
                        margin-bottom: 1mm;
                    }
                    .funcao {
                        font-size: 9px;
                        background: rgba(255,255,255,0.2);
                        padding: 1mm 2mm;
                        border-radius: 10px;
                        display: inline-block;
                        margin-bottom: 2mm;
                    }
                    .dados {
                        font-size: 8px;
                        background: rgba(255,255,255,0.15);
                        padding: 2mm;
                        border-radius: 4px;
                        margin-bottom: 2mm;
                    }
                    .dado-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 1mm;
                        padding-bottom: 0.5mm;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }
                    .dado-row:last-child {
                        border-bottom: none;
                        margin-bottom: 0;
                    }
                    .dado-label {
                        font-weight: bold;
                        opacity: 0.8;
                    }
                    .dado-value {
                        text-align: right;
                        max-width: 55%;
                    }
                    .qr-section {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 3mm;
                        background: white;
                        border-radius: 4px;
                        padding: 2mm;
                    }
                    .qr-code {
                        width: 22mm;
                        height: 22mm;
                    }
                    .qr-text {
                        color: #0369a1;
                        font-size: 7px;
                        text-align: center;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="cracha">
                    <div class="header">
                        ${config?.logo_url ? `<img src="${config.logo_url}" class="logo" />` : ''}
                        <div class="empresa">${config?.nome_empresa || "TWG TRANSPORTES"}</div>
                        <div class="empresa-info">
                            ${config?.cnpj ? `CNPJ: ${config.cnpj}` : ''}<br/>
                            ${config?.endereco || ''}<br/>
                            ${config?.telefone ? `Tel: ${config.telefone}` : ''} ${config?.email ? `| ${config.email}` : ''}
                        </div>
                    </div>
                    
                    <div class="content">
                        ${motorista.foto_url 
                            ? `<img src="${motorista.foto_url}" class="foto" />`
                            : `<div class="foto-placeholder">SEM FOTO</div>`
                        }
                        <div class="info-principal">
                            <div class="nome">${motorista.nome}</div>
                            <div class="funcao">${motorista.funcao || "MOTORISTA"}</div>
                        </div>
                    </div>
                    
                    <div class="dados">
                        <div class="dado-row">
                            <span class="dado-label">RG:</span>
                            <span class="dado-value">${motorista.rg || "-"}</span>
                        </div>
                        <div class="dado-row">
                            <span class="dado-label">CPF:</span>
                            <span class="dado-value">${motorista.cpf || "-"}</span>
                        </div>
                        <div class="dado-row">
                            <span class="dado-label">CNH:</span>
                            <span class="dado-value">${motorista.cnh || "-"} (${motorista.categoria_cnh || "-"})</span>
                        </div>
                        <div class="dado-row">
                            <span class="dado-label">NASCIMENTO:</span>
                            <span class="dado-value">${formatDate(motorista.data_nascimento)}</span>
                        </div>
                        <div class="dado-row">
                            <span class="dado-label">ENDEREÇO:</span>
                            <span class="dado-value" style="font-size: 7px;">${motorista.endereco || "-"}</span>
                        </div>
                    </div>
                    
                    <div class="qr-section">
                        <img src="${qrCodeUrl}" class="qr-code" />
                        <div class="qr-text">
                            Escaneie para<br/>salvar contato
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
        
        winPrint.document.close();
        setTimeout(() => {
            winPrint.print();
        }, 500);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">Crachá de Identificação</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
                </div>

                {/* Preview do Crachá */}
                <div 
                    ref={crachaRef}
                    className="mx-auto w-[85mm] bg-gradient-to-br from-sky-500 to-sky-700 rounded-xl p-3 text-white relative overflow-hidden shadow-xl"
                    style={{ transform: "scale(0.75)", transformOrigin: "top center" }}
                >
                    {/* Header */}
                    <div className="text-center pb-2 border-b border-white/30 mb-2">
                        {config?.logo_url && (
                            <img 
                                src={config.logo_url} 
                                alt="Logo" 
                                className="mx-auto mb-1 object-contain" 
                                style={{ height: `${10 * logoScale}mm`, maxWidth: `${40 * logoScale}mm` }}
                            />
                        )}
                        <p className="text-xs font-bold tracking-wider">{config?.nome_empresa || "TWG TRANSPORTES"}</p>
                        <div className="text-[8px] opacity-85 mt-1 leading-tight">
                            {config?.cnpj && <span>CNPJ: {config.cnpj}<br/></span>}
                            {config?.endereco && <span>{config.endereco}<br/></span>}
                            {(config?.telefone || config?.email) && (
                                <span>
                                    {config?.telefone && `Tel: ${config.telefone}`}
                                    {config?.telefone && config?.email && " | "}
                                    {config?.email}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Conteúdo Principal */}
                    <div className="flex gap-2 mb-2">
                        {/* Foto */}
                        {motorista.foto_url ? (
                            <img 
                                src={motorista.foto_url} 
                                alt="Foto" 
                                className="w-16 h-20 rounded-lg object-cover border-2 border-white shadow-lg"
                            />
                        ) : (
                            <div className="w-16 h-20 rounded-lg bg-white/20 border-2 border-white flex items-center justify-center text-[8px]">
                                SEM FOTO
                            </div>
                        )}
                        
                        {/* Info */}
                        <div className="flex-1">
                            <p className="font-bold text-xs uppercase">{motorista.nome}</p>
                            <p className="text-[10px] bg-white/20 rounded-full py-0.5 px-2 inline-block mt-1">
                                {motorista.funcao || "MOTORISTA"}
                            </p>
                        </div>
                    </div>

                    {/* Dados */}
                    <div className="bg-white/15 rounded-lg p-2 text-[9px] space-y-0.5 mb-2">
                        <div className="flex justify-between">
                            <span className="opacity-80">RG:</span>
                            <span>{motorista.rg || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="opacity-80">CPF:</span>
                            <span>{motorista.cpf || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="opacity-80">CNH:</span>
                            <span>{motorista.cnh} ({motorista.categoria_cnh})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="opacity-80">Nasc:</span>
                            <span>{formatDate(motorista.data_nascimento)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="opacity-80">End:</span>
                            <span className="text-right text-[8px] max-w-[60%]">{motorista.endereco || "-"}</span>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white rounded-lg p-2 flex items-center justify-center gap-2">
                        <img src={qrCodeUrl} alt="QR Code" className="w-14 h-14" />
                        <div className="text-sky-700 text-[8px] text-center font-bold">
                            Escaneie para<br/>salvar contato
                        </div>
                    </div>
                </div>

                {/* Botões */}
                <div className="flex gap-2">
                    <Button onClick={handlePrint} className="flex-1 bg-sky-600 hover:bg-sky-700">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir Crachá
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
}