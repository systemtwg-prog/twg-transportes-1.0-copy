import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileCode, Upload, CheckCircle, X, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export default function ImportadorXML({ open, onClose, onSuccess }) {
    const [importando, setImportando] = useState(false);
    const [progresso, setProgresso] = useState({ atual: 0, total: 0, arquivo: "" });
    const [resultados, setResultados] = useState({ sucesso: 0, duplicados: 0, erros: 0, detalhes: [] });
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
        const cleanXml = xmlString
            .replace(/<(\/?)\w+:/g, "<$1")
            .replace(/xmlns[^=]*="[^"]*"/g, "")
            .replace(/xsi:schemaLocation="[^"]*"/g, "");
        const parser = new DOMParser();
        return parser.parseFromString(cleanXml, "text/xml");
    };

    const formatarData = (dataStr) => {
        if (!dataStr) return "";
        try {
            // dhEmi vem como ISO (2024-01-15T10:30:00-03:00), dEmi como AAAA-MM-DD
            return format(parseISO(dataStr), "yyyy-MM-dd");
        } catch {
            return dataStr.substring(0, 10);
        }
    };

    const parsearArquivo = async (file) => {
        const xmlString = await file.text();
        const xml = parsearXML(xmlString);

        const numero_nf = extrairTag(xml, "nNF");
        if (!numero_nf) throw new Error("Número NF não encontrado no XML");

        const emit = getElement(xml, "emit");
        const remetente_nome = extrairTag(emit, "xNome");
        const remetente_cnpj = extrairTag(emit, "CNPJ") || extrairTag(emit, "CPF");
        const uf_origem = extrairTag(emit, "UF");

        const dest = getElement(xml, "dest");
        const destinatario_nome = extrairTag(dest, "xNome");
        const destinatario_cnpj = extrairTag(dest, "CNPJ") || extrairTag(dest, "CPF");
        const uf_destino = extrairTag(dest, "UF");

        const cfop = extrairTag(xml, "CFOP");

        // Data de emissão (dhEmi = NFe 4.0, dEmi = modelo antigo)
        const dataEmRaw = extrairTag(xml, "dhEmi") || extrairTag(xml, "dEmi");
        const data_emissao = formatarData(dataEmRaw);

        const transporta = getElement(xml, "transporta");
        const transportadora_nome = extrairTag(transporta, "xNome");
        const transportadora_cnpj = extrairTag(transporta, "CNPJ");

        const valorStr = extrairTag(xml, "vNF");
        const valor_nfe = valorStr ? parseFloat(valorStr) : 0;

        const pesoB = extrairTag(xml, "pesoB");
        const pesoL = extrairTag(xml, "pesoL");
        const peso = pesoB || pesoL || "";
        const qVol = extrairTag(xml, "qVol");
        const volume = qVol || "";

        return { numero_nf, data_emissao, uf_origem, uf_destino, cfop, transportadora_nome, transportadora_cnpj, remetente_nome, remetente_cnpj, destinatario_nome, destinatario_cnpj, valor_nfe, peso: peso ? String(peso) : "", volume: volume ? String(volume) : "" };
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
        setResultados({ sucesso: 0, duplicados: 0, erros: 0, detalhes: [] });

        // 1. Buscar NFs já cadastradas (uma única chamada)
        const existentes = await base44.entities.XmlNFe.list("-created_date", 10000);
        const nfsExistentes = new Set(existentes.map(x => x.numero_nf?.trim()).filter(Boolean));

        // 2. Parsear todos os arquivos em paralelo
        setProgresso({ atual: 0, total: files.length, arquivo: "Analisando arquivos..." });
        const parseados = await Promise.all(
            files.map(async (file) => {
                try {
                    const dados = await parsearArquivo(file);
                    return { file, dados, erro: null };
                } catch (err) {
                    return { file, dados: null, erro: err.message || "Erro ao processar" };
                }
            })
        );

        // 3. Separar duplicados, erros e novos
        const novosRegistros = [];
        const uploadsPendentes = [];
        let sucesso = 0, duplicados = 0, erros = 0;
        const detalhes = [];
        const nfsNovasSet = new Set();

        for (const { file, dados, erro } of parseados) {
            if (erro) {
                erros++;
                detalhes.push({ arquivo: file.name, nf: "", status: "erro", msg: erro });
                continue;
            }
            if (nfsExistentes.has(dados.numero_nf) || nfsNovasSet.has(dados.numero_nf)) {
                duplicados++;
                detalhes.push({ arquivo: file.name, nf: dados.numero_nf, status: "duplicado" });
                continue;
            }
            nfsNovasSet.add(dados.numero_nf);
            novosRegistros.push({ ...dados, data_importacao: format(new Date(), "yyyy-MM-dd") });
            uploadsPendentes.push({ file, index: novosRegistros.length - 1 });
        }

        // 4. Upload dos arquivos em paralelo (lotes de 5)
        const LOTE = 5;
        for (let i = 0; i < uploadsPendentes.length; i += LOTE) {
            const lote = uploadsPendentes.slice(i, i + LOTE);
            setProgresso({ atual: i + lote.length, total: uploadsPendentes.length, arquivo: `Enviando arquivos ${i + 1}–${i + lote.length}...` });
            await Promise.all(lote.map(async ({ file, index }) => {
                try {
                    const uploadResult = await base44.integrations.Core.UploadFile({ file });
                    novosRegistros[index].file_url = uploadResult?.file_url || "";
                } catch {
                    // Continua sem file_url
                }
            }));
        }

        // 5. bulkCreate de todos os novos registros
        if (novosRegistros.length > 0) {
            setProgresso({ atual: novosRegistros.length, total: novosRegistros.length, arquivo: "Salvando no banco..." });
            try {
                await base44.entities.XmlNFe.bulkCreate(novosRegistros);
                sucesso = novosRegistros.length;
                novosRegistros.forEach((r, i) => {
                    detalhes.push({ arquivo: r.file_url ? `NF ${r.numero_nf}` : `NF ${r.numero_nf}`, nf: r.numero_nf, status: "ok" });
                });
            } catch (err) {
                erros += novosRegistros.length;
                detalhes.push({ arquivo: "Erro ao salvar lote", nf: "", status: "erro", msg: err.message || "Erro no bulkCreate" });
            }
        }

        setResultados({ sucesso, duplicados, erros, detalhes });
        setImportando(false);
        if (onSuccess) onSuccess();

        const msgParts = [];
        if (sucesso > 0) msgParts.push(`${sucesso} importado(s)`);
        if (duplicados > 0) msgParts.push(`${duplicados} duplicado(s) ignorado(s)`);
        if (erros > 0) msgParts.push(`${erros} com erro`);
        const msg = msgParts.join(", ");
        if (erros > 0 && sucesso === 0) toast.error(msg);
        else if (duplicados > 0 || erros > 0) toast.warning(msg);
        else toast.success(msg || "Nenhum arquivo processado");

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

                    {!importando && resultados.sucesso === 0 && resultados.erros === 0 && resultados.duplicados === 0 && (
                        <div className="text-center py-8">
                            <FileCode className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <p className="text-slate-600 mb-4">Selecione um ou mais arquivos XML de NFe</p>
                            <p className="text-xs text-slate-400 mb-4">Arquivos duplicados (mesmo número de NF) são ignorados automaticamente.</p>
                            <Button onClick={handleSelecionarArquivos} className="bg-blue-600 hover:bg-blue-700">
                                <Upload className="w-4 h-4 mr-2" />
                                Selecionar Arquivos XML
                            </Button>
                        </div>
                    )}

                    {importando && (
                        <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
                            <p className="font-semibold text-slate-700">{progresso.arquivo || "Processando..."}</p>
                            <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${progresso.total > 0 ? (progresso.atual / progresso.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {!importando && (resultados.sucesso > 0 || resultados.erros > 0 || resultados.duplicados > 0) && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <CheckCircle className="w-8 h-8 mx-auto mb-1 text-green-600" />
                                    <p className="text-2xl font-bold text-green-700">{resultados.sucesso}</p>
                                    <p className="text-sm text-green-600">Importados</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                                    <Copy className="w-8 h-8 mx-auto mb-1 text-amber-600" />
                                    <p className="text-2xl font-bold text-amber-700">{resultados.duplicados}</p>
                                    <p className="text-sm text-amber-600">Duplicados</p>
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
                                        <div key={i} className={`flex items-center justify-between p-2 text-sm border-b last:border-0 ${
                                            d.status === "ok" ? "bg-green-50" : d.status === "duplicado" ? "bg-amber-50" : "bg-red-50"
                                        }`}>
                                            <span className="truncate flex-1">{d.arquivo}</span>
                                            {d.status === "ok" && <span className="text-green-600 font-medium ml-2">NF: {d.nf}</span>}
                                            {d.status === "duplicado" && <span className="text-amber-600 font-medium ml-2">NF {d.nf} já existe</span>}
                                            {d.status === "erro" && <span className="text-red-600 ml-2 truncate">{d.msg}</span>}
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