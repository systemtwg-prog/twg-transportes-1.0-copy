import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileCode, FileSpreadsheet, FileText, Loader2, CheckCircle, X, AlertTriangle, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";

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
    const [linhas, setLinhas] = useState([]);
    const [processando, setProcessando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const fileInputRef = useRef(null);

    const reset = () => { setLinhas([]); if (fileInputRef.current) fileInputRef.current.value = ""; };

    const handleFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setProcessando(true);
        const novas = [];
        for (const file of files) {
            const ext = file.name.toLowerCase().split(".").pop();
            try {
                if (ext === "xml") {
                    const r = await parsearXML(file);
                    novas.push({ ...r, ok: true, incluir: true, origem: "XML", arquivo: file.name });
                } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
                    const arr = await parsearExcel(file);
                    arr.forEach(r => novas.push({ ...r, ok: true, incluir: true, origem: "Excel", arquivo: file.name }));
                } else {
                    novas.push({ numero_nf: "", remetente_nome: "", destinatario_nome: "", transportadora: "", peso: "", volume: "", data_coleta: hoje(), ok: false, incluir: false, origem: "PDF", arquivo: file.name });
                }
            } catch (err) {
                novas.push({ numero_nf: "", remetente_nome: "", destinatario_nome: "", transportadora: "", peso: "", volume: "", data_coleta: hoje(), ok: false, incluir: false, origem: ext.toUpperCase(), arquivo: file.name });
            }
        }
        setLinhas(prev => [...prev, ...novas]);
        setProcessando(false);
        const invalidos = novas.filter(n => !n.ok).length;
        if (invalidos > 0) {
            toast.warning(`${novas.length - invalidos} linha(s) lida(s). PDF sem IA requer biblioteca — use XML/Excel.`);
        } else {
            toast.success(`${novas.length} linha(s) lida(s). Revise e confirme.`);
        }
    };

    const atualizar = (i, campo, valor) => {
        setLinhas(prev => prev.map((l, idx) => idx === i ? { ...l, [campo]: valor } : l));
    };
    const toggleIncluir = (i) => {
        setLinhas(prev => prev.map((l, idx) => idx === i ? { ...l, incluir: !l.incluir, ok: true } : l));
    };
    const remover = (i) => setLinhas(prev => prev.filter((_, idx) => idx !== i));

    const salvar = async () => {
        const selecionados = linhas.filter(l => l.incluir && l.remetente_nome && l.destinatario_nome);
        if (selecionados.length === 0) {
            toast.error("Nenhuma linha válida para importar (remetente e destinatário obrigatórios).");
            return;
        }
        setSalvando(true);
        try {
            const registros = selecionados.map(l => ({
                data_coleta: l.data_coleta || hoje(),
                remetente_nome: l.remetente_nome,
                destinatario_nome: l.destinatario_nome,
                transportadora: l.transportadora || "",
                peso: l.peso ? String(l.peso) : "",
                volume: l.volume ? String(l.volume) : "",
                nfe: l.numero_nf ? String(l.numero_nf) : "",
                status: "pendente"
            }));
            await base44.entities.ColetaDiaria.bulkCreate(registros);
            toast.success(`${registros.length} coleta(s) importada(s) com sucesso!`);
            if (onSuccess) onSuccess();
            reset();
            onClose();
        } catch (err) {
            toast.error("Erro ao salvar: " + (err.message || "tente novamente"));
        } finally {
            setSalvando(false);
        }
    };

    const verificasValidas = (l) => l.remetente_nome && l.destinatario_nome;

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onClose(); }}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-sky-600" />
                        Importar Coletas (XML / Excel) — sem IA
                    </DialogTitle>
                </DialogHeader>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,.xlsx,.xls,.csv"
                    multiple
                    onChange={handleFiles}
                    className="hidden"
                />

                {linhas.length === 0 && !processando ? (
                    <div className="text-center py-10">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <FileCode className="w-12 h-12 text-blue-500" />
                            <FileSpreadsheet className="w-12 h-12 text-emerald-500" />
                        </div>
                        <p className="text-slate-700 font-medium mb-1">Selecione arquivos XML de NFe ou planilhas Excel</p>
                        <p className="text-xs text-slate-400 mb-4">
                            Leitura 100% local — sem IA e sem consumo de créditos. Campos lidos: remetente, destinatário, transportadora, peso, volume e nº da NF.
                        </p>
                        <p className="text-xs text-amber-500 mb-4">
                            PDFs não são lidos sem IA. Para PDF, use o Importador de Documentos Fiscais (consome créditos) ou converta para Excel/XML.
                        </p>
                        <Button onClick={() => fileInputRef.current?.click()} className="bg-sky-600 hover:bg-sky-700">
                            <Upload className="w-4 h-4 mr-2" />
                            Selecionar Arquivos
                        </Button>
                    </div>
                ) : processando ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-10 h-10 animate-spin text-sky-600 mx-auto mb-3" />
                        <p className="text-slate-600">Lendo arquivos...</p>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <p className="text-sm text-slate-600">
                                {linhas.filter(l => l.incluir && verificasValidas(l)).length} de {linhas.length} prontas para importar
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="w-4 h-4 mr-1" /> Adicionar mais
                                </Button>
                                <Button onClick={salvar} disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700">
                                    {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    Confirmar Importação
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-auto border rounded-lg flex-1">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-100 z-10">
                                    <tr>
                                        <th className="p-2 w-8"></th>
                                        <th className="p-2 text-left">NF</th>
                                        <th className="p-2 text-left">Remetente</th>
                                        <th className="p-2 text-left">Destinatário</th>
                                        <th className="p-2 text-left">Transportadora</th>
                                        <th className="p-2 text-left">Peso</th>
                                        <th className="p-2 text-left">Volume</th>
                                        <th className="p-2 text-left">Data</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {linhas.map((l, i) => {
                                        const valida = verificasValidas(l);
                                        return (
                                            <tr key={i} className={`border-t ${!valida ? "bg-amber-50" : ""}`}>
                                                <td className="p-2 text-center">
                                                    <Checkbox checked={l.incluir} onCheckedChange={() => toggleIncluir(i)} />
                                                </td>
                                                <td className="p-1">
                                                    <Input value={l.numero_nf} onChange={e => atualizar(i, "numero_nf", e.target.value)} className="h-8 text-xs min-w-[90px]" />
                                                </td>
                                                <td className="p-1">
                                                    {!valida && <AlertTriangle className="inline w-3 h-3 text-amber-500 mr-1" />}
                                                    <Input value={l.remetente_nome} onChange={e => atualizar(i, "remetente_nome", e.target.value)} className="h-8 text-xs min-w-[140px]" placeholder="Obrigatório" />
                                                </td>
                                                <td className="p-1">
                                                    <Input value={l.destinatario_nome} onChange={e => atualizar(i, "destinatario_nome", e.target.value)} className="h-8 text-xs min-w-[140px]" placeholder="Obrigatório" />
                                                </td>
                                                <td className="p-1">
                                                    <Input value={l.transportadora} onChange={e => atualizar(i, "transportadora", e.target.value)} className="h-8 text-xs min-w-[130px]" />
                                                </td>
                                                <td className="p-1">
                                                    <Input value={l.peso} onChange={e => atualizar(i, "peso", e.target.value)} className="h-8 text-xs w-20" />
                                                </td>
                                                <td className="p-1">
                                                    <Input value={l.volume} onChange={e => atualizar(i, "volume", e.target.value)} className="h-8 text-xs w-20" />
                                                </td>
                                                <td className="p-1">
                                                    <Input type="date" value={l.data_coleta} onChange={e => atualizar(i, "data_coleta", e.target.value)} className="h-8 text-xs w-36" />
                                                </td>
                                                <td className="p-1 text-center">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remover(i)}>
                                                        <Trash2 className="w-3 h-3 text-red-500" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}