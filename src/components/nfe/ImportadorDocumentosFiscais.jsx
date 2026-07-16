import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Loader2, Save, RefreshCw, CheckCircle, X, Image as ImageIcon, FileCode, FileSpreadsheet } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

// Campos extraídos na importação de documentos fiscais (remetente NÃO é importado — atribuído depois)
const CAMPOS = [
    { key: "numero_nf", label: "Nº NF" },
    { key: "destinatario", label: "Destinatário" },
    { key: "endereco_entrega", label: "Endereço de Entrega" },
    { key: "transportadora", label: "Transportadora" },
    { key: "peso", label: "Peso" },
    { key: "volume", label: "Volume" },
];

const ALIASES = {
    numero_nf: ["numero_nf", "nf", "nota fiscal", "nfe", "número nf", "num nf", "nº nf", "numero"],
    destinatario: ["destinatario", "destinatário", "dest", "cliente", "razao social", "nome"],
    endereco_entrega: ["endereco_entrega", "endereco", "endereço", "endereço de entrega", "local de entrega", "entrega", "logradouro"],
    transportadora: ["transportadora", "transp", "transportador"],
    peso: ["peso", "kg", "peso kg", "peso (kg)"],
    volume: ["volume", "vol", "volumes", "qtd vol", "quantidade"],
};

const autoMapColumns = (headers) => {
    const m = {};
    headers.forEach((h, i) => {
        const hl = (h?.toString() || "").toLowerCase().trim();
        for (const campo of CAMPOS) {
            if (ALIASES[campo.key].some((a) => hl.includes(a.toLowerCase()))) { m[i] = campo.key; break; }
        }
    });
    return m;
};

const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return { headers: [], rows: [] };
    let delim = ",";
    for (const d of [";", "\t", ","]) { if (lines[0].includes(d)) { delim = d; break; } }
    const rows = lines.map((line) => {
        const out = []; let cur = ""; let q = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') q = !q;
            else if (ch === delim && !q) { out.push(cur.trim()); cur = ""; }
            else cur += ch;
        }
        out.push(cur.trim());
        return out;
    });
    return { headers: rows[0] || [], rows: rows.slice(1) };
};

const parseExcel = (buf) => {
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!data?.length) return { headers: [], rows: [] };
    return { headers: (data[0] || []).map(String), rows: data.slice(1).map((r) => r.map((c) => String(c ?? ""))) };
};

const extrairTag = (parent, tag) => {
    if (!parent) return "";
    let el = parent.getElementsByTagName(tag);
    if (!el.length) el = parent.getElementsByTagNameNS("*", tag);
    return el[0]?.textContent?.trim() || "";
};
const getElement = (xml, tag) => {
    let el = xml.getElementsByTagName(tag);
    if (!el.length) el = xml.getElementsByTagNameNS("*", tag);
    return el[0] || null;
};

const parsearXML = async (file) => {
    const xmlString = await file.text();
    const clean = xmlString.replace(/<(\/?)\w+:/g, "<$1").replace(/xmlns[^=]*="[^"]*"/g, "").replace(/xsi:schemaLocation="[^"]*"/g, "");
    const xml = new DOMParser().parseFromString(clean, "text/xml");
    const numero_nf = extrairTag(xml, "nNF");
    const dest = getElement(xml, "dest");
    const destinatario = extrairTag(dest, "xNome");
    const endereco = [
        extrairTag(dest, "xLgr") + (extrairTag(dest, "xNro") ? ", " + extrairTag(dest, "xNro") : ""),
        extrairTag(dest, "xBairro"),
        [extrairTag(dest, "xMun"), extrairTag(dest, "UF")].filter(Boolean).join("/") || extrairTag(dest, "xMun"),
    ].filter(Boolean).join(" - ");
    const transportadora = extrairTag(getElement(xml, "transp") || getElement(xml, "transporta"), "xName") || extrairTag(getElement(xml, "transporta"), "xNome");
    const peso = extrairTag(xml, "pesoB") || extrairTag(xml, "pesoL");
    const volume = extrairTag(xml, "qVol");
    return { numero_nf, destinatario, endereco_entrega: endereco, transportadora, peso, volume };
};

export default function ImportadorDocumentosFiscais({ open, onClose, onImportSuccess }) {
    const [linhas, setLinhas] = useState([]);
    const [selecionadas, setSelecionadas] = useState([]);
    const [processando, setProcessando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [editCell, setEditCell] = useState(null);
    const fileRef = useRef(null);

    const reset = () => { setLinhas([]); setSelecionadas([]); setEditCell(null); };
    const handleClose = () => { reset(); onClose(); };

    const novaLinha = (dados = {}) => ({
        id: Date.now() + Math.random(),
        numero_nf: dados.numero_nf || "",
        destinatario: dados.destinatario || "",
        endereco_entrega: dados.endereco_entrega || "",
        transportadora: dados.transportadora || "",
        peso: dados.peso || "",
        volume: dados.volume || "",
        _origem: dados._origem || "",
    });

    const processarArquivos = async (files) => {
        if (!files.length) return;
        setProcessando(true);
        const novas = [];
        for (const file of files) {
            try {
                const ext = file.name.split(".").pop().toLowerCase();
                const tipo = file.type || "";
                if (ext === "xml") {
                    const d = await parsearXML(file);
                    novas.push(novaLinha({ ...d, _origem: "XML" }));
                } else if (ext === "xlsx" || ext === "xls") {
                    const buf = await file.arrayBuffer();
                    const { headers, rows } = parseExcel(buf);
                    const m = autoMapColumns(headers);
                    rows.forEach((row) => {
                        const obj = {};
                        Object.entries(m).forEach(([ci, key]) => { obj[key] = row[parseInt(ci)] || ""; });
                        novas.push(novaLinha({ ...obj, _origem: "Excel" }));
                    });
                } else if (ext === "csv") {
                    const text = await file.text();
                    const { headers, rows } = parseCSV(text);
                    const m = autoMapColumns(headers);
                    rows.forEach((row) => {
                        const obj = {};
                        Object.entries(m).forEach(([ci, key]) => { obj[key] = row[parseInt(ci)] || ""; });
                        novas.push(novaLinha({ ...obj, _origem: "CSV" }));
                    });
                } else if (ext === "pdf" || tipo.startsWith("image/")) {
                    const up = await base44.integrations.Core.UploadFile({ file });
                    const r = await base44.integrations.Core.InvokeLLM({
                        prompt: `Extraia as informações fiscais do documento em anexo. Retorne um array com todas as notas fiscais encontradas, contendo: numero_nf, destinatario, endereco_entrega (logradouro, número, bairro, cidade/UF de entrega), transportadora, peso e volume. Preencha apenas os campos encontrados, campos inexistentes deixe vazio.`,
                        file_urls: [up?.file_url],
                        response_json_schema: {
                            type: "object",
                            properties: {
                                notas: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            numero_nf: { type: "string" },
                                            destinatario: { type: "string" },
                                            endereco_entrega: { type: "string" },
                                            transportadora: { type: "string" },
                                            peso: { type: "string" },
                                            volume: { type: "string" },
                                        },
                                    },
                                },
                            },
                        },
                    });
                    (r?.notas || []).forEach((n) => novas.push(novaLinha({ ...n, _origem: ext === "pdf" ? "PDF" : "Imagem" })));
                } else {
                    toast.error(`Formato não suportado: ${file.name}`);
                }
            } catch (e) {
                console.error("Erro ao processar", file.name, e);
                toast.error(`Erro em ${file.name}`);
            }
        }
        setLinhas(novas);
        setSelecionadas(novas.map((l) => l.id));
        setProcessando(false);
        if (novas.length === 0) toast.warning("Nenhum documento fiscal identificado.");
        else toast.success(`${novas.length} documento(s) pronto(s) para revisão.`);
    };

    const handleFiles = (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = "";
        processarArquivos(files);
    };

    const toggleSel = (id) => setSelecionadas((p) => (p.includes(id) ? p.filter((i) => i !== id) : [...p, id]));
    const toggleAll = () => setSelecionadas(selecionadas.length === linhas.length ? [] : linhas.map((l) => l.id));
    const updateCell = (id, key, val) => setLinhas((p) => p.map((l) => (l.id === id ? { ...l, [key]: val } : l)));

    const handleSalvar = async () => {
        const sel = linhas.filter((l) => selecionadas.includes(l.id));
        if (!sel.length) { toast.error("Selecione ao menos uma linha"); return; }
        setSalvando(true);
        try {
            const existentes = await base44.entities.NotaFiscal.list("-created_date", 5000);
            const setEx = new Set(existentes.map((n) => (n.numero_nf || "").toLowerCase().trim()).filter(Boolean));
            const setLote = new Set();
            const paraInserir = [];
            let duplicadas = 0;
            for (const row of sel) {
                const num = (row.numero_nf || "").toLowerCase().trim();
                if (num && (setEx.has(num) || setLote.has(num))) { duplicadas++; continue; }
                if (num) setLote.add(num);
                paraInserir.push({
                    numero_nf: row.numero_nf || "",
                    destinatario: row.destinatario || "",
                    endereco_entrega: row.endereco_entrega || "",
                    transportadora: row.transportadora || "",
                    peso: row.peso || "",
                    volume: row.volume || "",
                    data: format(new Date(), "yyyy-MM-dd"),
                    remetente: "",
                });
            }
            if (!paraInserir.length) {
                toast.warning(`Todas as ${duplicadas} nota(s) já existem.`);
                setSalvando(false);
                return;
            }
            const criadas = await base44.entities.NotaFiscal.bulkCreate(paraInserir);
            await base44.entities.RegistroImportacao.create({
                data_importacao: new Date().toISOString(),
                quantidade_notas: criadas.length,
                origem: "arquivo",
                notas_ids: criadas.map((n) => n.id),
                status: "processado",
            });
            if (duplicadas > 0) toast.warning(`${criadas.length} importada(s). ${duplicadas} ignorada(s) (duplicadas).`);
            else toast.success(`${criadas.length} documento(s) fiscal(is) importado(s)!`);
            onImportSuccess?.();
            handleClose();
        } catch (e) {
            console.error(e);
            toast.error("Erro ao salvar notas fiscais.");
        } finally {
            setSalvando(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        Importar Documentos Fiscais
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                        Importe <strong>XML, PDF, imagem, Excel ou CSV</strong>. O sistema extrai: <strong>destinatário, endereço de entrega, transportadora, número da NF, peso e volume</strong>.
                        O remetente <strong>não</strong> é importado — é atribuído depois no romaneio ("Remetente aplica em todas" / individual).
                    </div>

                    {linhas.length === 0 ? (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <div className="border-2 border-dashed border-emerald-300 rounded-xl p-12 text-center hover:border-emerald-500 transition-colors w-full max-w-lg">
                                <input ref={fileRef} type="file" accept=".xml,.xlsx,.xls,.csv,.pdf,image/*" multiple onChange={handleFiles} className="hidden" id="imp-doc-fiscais" />
                                <label htmlFor="imp-doc-fiscais" className="cursor-pointer">
                                    {processando ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                                            <span className="text-emerald-600 font-medium">Processando documentos...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <Upload className="w-12 h-12 text-emerald-400" />
                                            <span className="text-lg font-medium text-emerald-600">Clique para selecionar os arquivos</span>
                                            <div className="flex items-center gap-4 text-slate-400 text-sm">
                                                <span className="flex items-center gap-1"><FileCode className="w-4 h-4" /> XML</span>
                                                <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> PDF</span>
                                                <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Imagem</span>
                                                <span className="flex items-center gap-1"><FileSpreadsheet className="w-4 h-4" /> Excel/CSV</span>
                                            </div>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <Badge className="bg-emerald-100 text-emerald-700">{selecionadas.length} de {linhas.length} selecionado(s)</Badge>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={toggleAll}>
                                        {selecionadas.length === linhas.length ? "Desmarcar todas" : "Selecionar todas"}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => { reset(); fileRef.current?.click(); }}>
                                        <RefreshCw className="w-4 h-4 mr-1" /> Novos arquivos
                                    </Button>
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-auto max-h-[50vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-700">
                                            <TableHead className="text-white w-10"><Checkbox checked={selecionadas.length === linhas.length && linhas.length > 0} onCheckedChange={toggleAll} /></TableHead>
                                            <TableHead className="text-white w-20">Origem</TableHead>
                                            {CAMPOS.map((c) => <TableHead key={c.key} className="text-white text-xs whitespace-nowrap">{c.label}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {linhas.map((row) => (
                                            <TableRow key={row.id} className={selecionadas.includes(row.id) ? "bg-emerald-50" : "bg-slate-50"}>
                                                <TableCell><Checkbox checked={selecionadas.includes(row.id)} onCheckedChange={() => toggleSel(row.id)} /></TableCell>
                                                <TableCell><Badge variant="outline" className="text-xs">{row._origem}</Badge></TableCell>
                                                {CAMPOS.map((c) => (
                                                    <TableCell key={c.key} className="p-1">
                                                        {editCell === `${row.id}-${c.key}` ? (
                                                            <Input
                                                                value={row[c.key] || ""}
                                                                onChange={(e) => updateCell(row.id, c.key, e.target.value)}
                                                                onBlur={() => setEditCell(null)}
                                                                onKeyDown={(e) => e.key === "Enter" && setEditCell(null)}
                                                                autoFocus
                                                                className="h-7 text-xs"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="text-xs p-1 min-h-[28px] cursor-pointer hover:bg-white rounded border border-transparent hover:border-slate-300 truncate max-w-[180px]"
                                                                onClick={() => setEditCell(`${row.id}-${c.key}`)}
                                                                title={row[c.key] || "Clique para editar"}
                                                            >
                                                                {row[c.key] || <span className="text-slate-400">-</span>}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={handleClose}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
                                <Button onClick={handleSalvar} disabled={salvando || selecionadas.length === 0} className="bg-emerald-600 hover:bg-emerald-700">
                                    {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />Importar {selecionadas.length} documento(s)</>}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}