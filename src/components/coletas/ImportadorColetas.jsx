import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileCode, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import PdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfjsWorker();

const hoje = () => format(new Date(), "yyyy-MM-dd");

const extrairTag = (parent, tag) => {
    if (!parent) return "";
    let els = parent.getElementsByTagName(tag);
    if (els.length === 0) els = parent.getElementsByTagNameNS("*", tag);
    return els[0]?.textContent?.trim() || "";
};
const getElement = (xml, tag) => {
    let el = xml.getElementsByTagName(tag);
    if (el.length === 0) el = xml.getElementsByTagNameNS("*", tag);
    return el[0] || null;
};
const parsearXml = (xmlString) => {
    const clean = xmlString
        .replace(/<(\/?)\w+:/g, "<$1")
        .replace(/xmlns[^=]*="[^"]*"/g, "")
        .replace(/xsi:schemaLocation="[^"]*"/g, "");
    return new DOMParser().parseFromString(clean, "text/xml");
};
const formatarData = (s) => {
    if (!s) return "";
    try { return format(new Date(s), "yyyy-MM-dd"); } catch { return s.substring(0, 10); }
};

const parsearXML = async (file) => {
    const xml = parsearXml(await file.text());
    const numero_nf = extrairTag(xml, "nNF");
    const emit = getElement(xml, "emit");
    const dest = getElement(xml, "dest");
    const transp = getElement(xml, "transporta");
    const dataRaw = extrairTag(xml, "dhEmi") || extrairTag(xml, "dEmi");
    return {
        numero_nf,
        remetente_nome: extrairTag(emit, "xNome"),
        destinatario_nome: extrairTag(dest, "xNome"),
        transportadora: extrairTag(transp, "xNome"),
        peso: extrairTag(xml, "pesoB") || extrairTag(xml, "pesoL"),
        volume: extrairTag(xml, "qVol"),
        data_coleta: formatarData(dataRaw) || hoje()
    };
};

const firstMatch = (text, regexes) => {
    for (const re of regexes) {
        const m = text.match(re);
        if (m && m[1] && String(m[1]).trim()) return String(m[1]).trim();
    }
    return "";
};

const parsearPDF = async (file) => {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let texto = "";
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        texto += content.items.map((it) => it.str).join(" ") + "\n";
    }
    const t = texto.replace(/\s+/g, " ");
    // Normaliza quebras de linha relevantes para capturas multiline antes de unificar
    const dataMatch = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const data_coleta = dataMatch ? `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}` : hoje();
    const firstLineMatch = (text, regexes) => {
        for (const re of regexes) {
            const m = text.match(re);
            if (m && m[1] && String(m[1]).trim()) return String(m[1]).trim();
        }
        return "";
    };
    return {
        numero_nf: firstMatch(t, [
            /N[UÚ]MERO DA NOTA[\s:A-Z]*0*(\d{6,9})/i,
            /N[UÚ]MERO DA NF-?E[\s:]*0*(\d{6,9})/i,
            /N[UÚ]MERO[\s:]*0*(\d{6,9})/i,
            /NF-?E[\s:]*0*(\d{6,9})/i,
            /\b0*(\d{6,9})\b/
        ]),
        remetente_nome: firstMatch(t, [
            /EMITENTE[:\s]+([A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9 .,/&\-'"]{2,60})/i,
            /REMETENTE[:\s]+([A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9 .,/&\-'"]{2,60})/i,
            /FORNECEDOR[:\s]+([A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9 .,/&\-'"]{2,60})/i
        ]),
        destinatario_nome: firstMatch(t, [
            /DESTINAT[ÁA]RIO[:\s/]+([A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9 .,/&\-'"]{2,60})/i,
            /CLIENTE[:\s]+([A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9 .,/&\-'"]{2,60})/i,
            /CONSIGNAT[ÁA]RIO[:\s]+([A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9 .,/&\-'"]{2,60})/i
        ]),
        transportadora: firstMatch(t, [
            /TRANSPORTADOR(?:A)?[\/\s:]*VOLUMES TRANSPORTADOS?\s+([A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9 .,/&\-'"]{2,60})/i,
            /TRANSPORTADOR(?:A)?[:\s]+([A-Za-zÀ-ú0-9][A-Za-zÀ-ú0-9 .,/&\-'"]{2,60})/i
        ]),
        peso: firstMatch(t, [
            /PESO BRUTO[\s:]*([\d.,]+)/i,
            /PESO L[IÍ]QUIDO[\s:]*([\d.,]+)/i,
            /PESO[\s:]*([\d.,]+)/i
        ]),
        volume: firstMatch(t, [
            /QTD\.? VOLUMES?[\s:]*([\d]+(?:[.,]\d+)?)/i,
            /VOLUMES?[\s:]*([\d]+(?:[.,]\d+)?)/i
        ]),
        data_coleta
    };
};

const pickField = (row, patterns) => {
    const keys = Object.keys(row);
    for (const p of patterns) {
        const k = keys.find(k => String(k).toLowerCase().includes(p));
        if (k !== undefined && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
    }
    return "";
};

const parsearExcel = async (file) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    return rows.map(row => ({
        numero_nf: pickField(row, ["numero", "nf", "nota", "nfe"]),
        remetente_nome: pickField(row, ["remetente", "fornecedor", "emitente"]),
        destinatario_nome: pickField(row, ["destinatario", "cliente", "consignatario"]),
        transportadora: pickField(row, ["transportadora", "transportador"]),
        peso: pickField(row, ["peso"]),
        volume: pickField(row, ["volume", "volumes", "vol"]),
        data_coleta: formatarData(pickField(row, ["data", "emissao"])) || hoje()
    }));
};

export default function ImportadorColetas({ open, onClose, onSuccess }) {
    const [processando, setProcessando] = useState(false);
    const fileInputRef = useRef(null);

    const reset = () => { if (fileInputRef.current) fileInputRef.current.value = ""; };

    const handleFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setProcessando(true);

        const lidas = [];
        const ignoradas = [];
        for (const file of files) {
            const ext = file.name.toLowerCase().split(".").pop();
            try {
                let resultados = [];
                if (ext === "xml") {
                    resultados = [await parsearXML(file)];
                } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
                    resultados = await parsearExcel(file);
                } else if (ext === "pdf") {
                    resultados = [await parsearPDF(file)];
                } else {
                    ignoradas.push(`${file.name} (formato não suportado)`);
                    continue;
                }
                const baseNome = file.name.replace(/\.[^.]+$/, "").slice(0, 40);
                resultados.forEach((r) => {
                    const temAlgumDado = r.remetente_nome || r.destinatario_nome || r.numero_nf || r.transportadora || r.peso || r.volume;
                    if (!temAlgumDado) {
                        ignoradas.push(`${file.name} (nenhum dado identificado)`);
                        return;
                    }
                    lidas.push({
                        data_coleta: r.data_coleta || hoje(),
                        remetente_nome: r.remetente_nome || `Importado — ${baseNome}`,
                        destinatario_nome: r.destinatario_nome || `Importado — ${baseNome}`,
                        transportadora: r.transportadora || "",
                        peso: r.peso ? String(r.peso) : "",
                        volume: r.volume ? String(r.volume) : "",
                        nfe: r.numero_nf ? String(r.numero_nf) : "",
                        status: "pendente"
                    });
                });
            } catch (err) {
                ignoradas.push(`${file.name} (erro ao ler)`);
            }
        }

        try {
            if (lidas.length > 0) {
                await base44.entities.ColetaDiaria.bulkCreate(lidas);
            }
            if (lidas.length > 0) {
                toast.success(`${lidas.length} coleta(s) adicionada(s) à lista!`);
            }
            if (ignoradas.length > 0) {
                toast.warning(`${ignoradas.length} arquivo(s) ignorado(s): ${ignoradas.slice(0, 3).join(", ")}${ignoradas.length > 3 ? "..." : ""}`);
            }
            if (lidas.length === 0 && ignoradas.length > 0) {
                toast.error("Nenhuma coleta válida encontrada nos arquivos.");
            }
            if (onSuccess) onSuccess();
            reset();
            onClose();
        } catch (err) {
            toast.error("Erro ao salvar: " + (err.message || "tente novamente"));
        } finally {
            setProcessando(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-sky-600" />
                        Importar Coletas (XML / Excel / PDF) — sem IA
                    </DialogTitle>
                </DialogHeader>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,.xlsx,.xls,.csv,.pdf"
                    multiple
                    onChange={handleFiles}
                    className="hidden"
                />

                {processando ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 animate-spin text-sky-600 mx-auto mb-3" />
                        <p className="text-slate-600">Lendo arquivos e adicionando coletas...</p>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <FileCode className="w-12 h-12 text-blue-500" />
                            <FileSpreadsheet className="w-12 h-12 text-emerald-500" />
                            <FileText className="w-12 h-12 text-red-400" />
                        </div>
                        <p className="text-slate-700 font-medium mb-1">Selecione arquivos XML, Excel ou PDF (DANFE)</p>
                        <p className="text-xs text-slate-400 mb-6 px-4">
                            As coletas são adicionadas automaticamente à lista de Coletas Diárias (status Pendente),
            com todas as funções disponíveis: editar, clonar, ordem de coleta, compartilhar, imprimir e mudar status.
            Leitura 100% local — sem IA e sem créditos.
                        </p>
                        <Button onClick={() => fileInputRef.current?.click()} className="bg-sky-600 hover:bg-sky-700">
                            <Upload className="w-4 h-4 mr-2" />
                            Selecionar Arquivos
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}