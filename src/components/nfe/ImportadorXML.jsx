import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileCode, Upload, CheckCircle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ImportadorXML({ open, onClose, onSuccess }) {
    const [importando, setImportando] = useState(false);
    const [progresso, setProgresso] = useState({ atual: 0, total: 0, arquivo: "" });
    const [resultados, setResultados] = useState({ sucesso: 0, erros: 0, detalhes: [] });
    const fileInputRef = useRef(null);

    const extrairTag = (parent, tag) => {
        if (!parent) return "";
        let elements = parent.getElementsByTagName(tag);
        if (elements.length === 0) {
            elements = parent.getElementsByTagNameNS("*", tag);
        }
        return elements[0]?.textContent?.trim() || "";
    };

    const getElement = (xml, tag) => {
        let el = xml.getElementsByTagName(tag);
        if (el.length === 0) {
            el = xml.getElementsByTagNameNS("*", tag);
        }
        return el[0] || null;
    };

    const parsearXML = (xmlString) => {
        // Remove namespaces e prefixes para facilitar o parse
        const cleanXml = xmlString
            .replace(/<(\/?)\w+:/g, "<$1")
            .replace(/xmlns[^=]*="[^"]*"/g, "")
            .replace(/xsi:schemaLocation="[^"]*"/g, "");
        const parser = new DOMParser();
        return parser.parseFromString(cleanXml, "text/xml");
    };

    const processarArquivo = async (file) => {
        const xmlString = await file.text();
        const xml = parsearXML(xmlString);

        const numero_nf = extrairTag(xml, "nNF");
        if (!numero_nf) throw new Error("Número NF não encontrado no XML");

        // Emitente / Remetente
        const emit = getElement(xml, "emit");
        const remetente_nome = extrairTag(emit, "xNome");
        const remetente_cnpj = extrairTag(emit, "CNPJ") || extrairTag(emit, "CPF");
        const uf_origem = extrairTag(emit, "UF");

        // Destinatário
        const dest = getElement(xml, "dest");
        const destinatario_nome = extrairTag(dest, "xNome");
        const destinatario_cnpj = extrairTag(dest, "CNPJ") || extrairTag(dest, "CPF");
        const uf_destino = extrairTag(dest, "UF");

        // CFOP (primeiro item)
        const cfop = extrairTag(xml, "CFOP");

        // Transportadora
        const transporta = getElement(xml, "transporta");
        const transportadora_nome = extrairTag(transporta, "xNome");
        const transportadora_cnpj = extrairTag(transporta, "CNPJ");

        // Valor total
        const valorStr = extrairTag(xml, "vNF");
        const valor_nfe = valorStr ? parseFloat(valorStr) : 0;

        // Peso e volume
        const pesoB = extrairTag(xml, "pesoB");
        const pesoL = extrairTag(xml, "pesoL");
        const peso = pesoB || pesoL || "";
        const qVol = extrairTag(xml, "qVol");
        const volume = qVol || "";

        // Upload do arquivo XML
        let file_url = "";
        try {
            const uploadResult = await base44.integrations.Core.UploadFile({ file });
            file_url = uploadResult?.file_url || "";
        } catch (e) {
            // Se falhar o upload, continua sem file_url
        }

        // Salvar no banco
        await base44.entities.XmlNFe.create({
            numero_nf,
            uf_origem,
            uf_destino,
            cfop,
            transportadora_nome,
            transportadora_cnpj,
            remetente_nome,
            remetente_cnpj,
            destinatario_nome,
            destinatario_cnpj,
            valor_nfe,
            peso: peso ? String(peso) : "",
            volume: volume ? String(volume) : "",
            file_url,
            data_importacao: format(new Date(), "yyyy-MM-dd")
        });

        return numero_nf;
    };

    const handleSelecionarArquivos = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith(".xml"));
        if (files.length === 0) {
            toast.error("Selecione arquivos XML válidos");
            return;
        }

        setImportando(true);
        setResultados({ sucesso: 0, erros: 0, detalhes: [] });

        let sucesso = 0;
        let erros = 0;
        const detalhes = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setProgresso({ atual: i + 1, total: files.length, arquivo: file.name });
            try {
                const numero = await processarArquivo(file);
                sucesso++;
                detalhes.push({ arquivo: file.name, nf: numero, status: "ok" });
            } catch (error) {
                erros++;
                detalhes.push({ arquivo: file.name, nf: "", status: "erro", msg: error.message || "Erro ao processar" });
            }
        }

        setResultados({ sucesso, erros, detalhes });
        setImportando(false);
        if (onSuccess) onSuccess();

        if (erros > 0) {
            toast.warning(`${sucesso} XML(s) importado(s). ${erros} com erro.`);
        } else {
            toast.success(`${sucesso} XML(s) importado(s) com sucesso!`);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-blue-600" />
                        Importar XML
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xml"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {!importando && resultados.sucesso === 0 && resultados.erros === 0 && (
                        <div className="text-center py-8">
                            <FileCode className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <p className="text-slate-600 mb-4">Selecione um ou mais arquivos XML de NFe</p>
                            <Button onClick={handleSelecionarArquivos} className="bg-blue-600 hover:bg-blue-700">
                                <Upload className="w-4 h-4 mr-2" />
                                Selecionar Arquivos XML
                            </Button>
                        </div>
                    )}

                    {importando && (
                        <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
                            <p className="font-semibold text-slate-700">Importando XML {progresso.atual} de {progresso.total}</p>
                            <p className="text-sm text-slate-500 truncate mt-1">{progresso.arquivo}</p>
                            <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${progresso.total > 0 ? (progresso.atual / progresso.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {!importando && (resultados.sucesso > 0 || resultados.erros > 0) && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <CheckCircle className="w-8 h-8 mx-auto mb-1 text-green-600" />
                                    <p className="text-2xl font-bold text-green-700">{resultados.sucesso}</p>
                                    <p className="text-sm text-green-600">Importados</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                    <X className="w-8 h-8 mx-auto mb-1 text-red-600" />
                                    <p className="text-2xl font-bold text-red-700">{resultados.erros}</p>
                                    <p className="text-sm text-red-600">Erros</p>
                                </div>
                            </div>
                            {resultados.detalhes.length > 0 && (
                                <div className="max-h-48 overflow-y-auto border rounded-lg">
                                    {resultados.detalhes.map((d, i) => (
                                        <div key={i} className={`flex items-center justify-between p-2 text-sm border-b last:border-0 ${d.status === "ok" ? "bg-green-50" : "bg-red-50"}`}>
                                            <span className="truncate flex-1">{d.arquivo}</span>
                                            {d.status === "ok" ? (
                                                <span className="text-green-600 font-medium ml-2">NF: {d.nf}</span>
                                            ) : (
                                                <span className="text-red-600 ml-2 truncate">{d.msg}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Button onClick={handleSelecionarArquivos} className="w-full bg-blue-600 hover:bg-blue-700">
                                <Upload className="w-4 h-4 mr-2" />
                                Importar Mais XMLs
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}