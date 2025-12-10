import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
    FileSpreadsheet, Upload, Loader2, Save, X, Download, RefreshCw, AlertTriangle, CheckCircle, Pencil
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

const CAMPOS_CTE = [
    { key: "data", label: "Data", aliases: ["data", "dt", "date"] },
    { key: "numero_cte", label: "CTE", aliases: ["cte", "numero_cte", "num_cte", "nº cte", "n cte"] },
    { key: "remetente", label: "Fornecedor", aliases: ["fornecedor", "remetente", "forn", "rem"] },
    { key: "destinatario", label: "Cliente", aliases: ["cliente", "destinatario", "dest", "cli"] },
    { key: "nfe", label: "NFE", aliases: ["nfe", "nf-e", "nota fiscal", "nf", "numero nf"] },
    { key: "valor_nf", label: "Valor NF", aliases: ["valor nf", "vl nf", "valor_nf", "vlr nf"] },
    { key: "volume", label: "Volume", aliases: ["volume", "vol", "volumes", "qtd vol"] },
    { key: "peso", label: "Peso", aliases: ["peso", "kg", "peso kg"] },
    { key: "frete_peso", label: "Frete Peso", aliases: ["frete peso", "frete_peso", "frt peso"] },
    { key: "coleta", label: "Coleta", aliases: ["coleta", "col"] },
    { key: "seguro", label: "Seguro", aliases: ["seguro", "seg"] },
    { key: "pedagio", label: "Pedágio", aliases: ["pedagio", "pedágio", "ped"] },
    { key: "outros", label: "Outros", aliases: ["outros", "out"] },
    { key: "valor_cobrado", label: "Valor Cobrado", aliases: ["valor cobrado", "vl cobrado", "vlr cobrado", "valor_cobrado"] },
    { key: "porcentagem", label: "%", aliases: ["%", "porcentagem", "porc", "percent"] },
    { key: "mdfe", label: "MDFE", aliases: ["mdfe", "mdf-e", "manifesto"] }
];

export default function ImportadorCTE({ open, onClose, onImportSuccess }) {
    const [step, setStep] = useState(1); // 1 = upload, 2 = mapeamento, 3 = revisão
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [rawData, setRawData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [columnMapping, setColumnMapping] = useState({});
    const [mappedData, setMappedData] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [editingCell, setEditingCell] = useState(null);

    const resetState = () => {
        setStep(1);
        setRawData([]);
        setHeaders([]);
        setColumnMapping({});
        setMappedData([]);
        setSelectedRows([]);
        setEditingCell(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const autoMapColumns = (headerRow) => {
        const mapping = {};
        headerRow.forEach((header, index) => {
            const headerLower = header?.toString().toLowerCase().trim() || "";
            for (const campo of CAMPOS_CTE) {
                if (campo.aliases.some(alias => headerLower.includes(alias.toLowerCase()))) {
                    mapping[index] = campo.key;
                    break;
                }
            }
        });
        return mapping;
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            
            // Extrair dados do arquivo
            const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                file_url,
                json_schema: {
                    type: "object",
                    properties: {
                        headers: { 
                            type: "array", 
                            items: { type: "string" },
                            description: "Nomes das colunas do arquivo (primeira linha)"
                        },
                        rows: { 
                            type: "array", 
                            items: { 
                                type: "array",
                                items: { type: "string" }
                            },
                            description: "Dados de cada linha do arquivo (sem o cabeçalho)"
                        }
                    }
                }
            });

            if (result?.status === "success" && result.output) {
                const { headers: extractedHeaders, rows } = result.output;
                
                if (!extractedHeaders || !rows || rows.length === 0) {
                    toast.error("Arquivo vazio ou sem dados válidos");
                    setUploading(false);
                    return;
                }

                setHeaders(extractedHeaders);
                setRawData(rows);
                
                // Auto mapear colunas
                const autoMapping = autoMapColumns(extractedHeaders);
                setColumnMapping(autoMapping);
                
                setStep(2);
                toast.success(`${rows.length} linha(s) encontrada(s)!`);
            } else {
                toast.error("Erro ao processar arquivo: " + (result?.details || "Formato não suportado"));
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao processar arquivo");
        }
        setUploading(false);
        e.target.value = "";
    };

    const applyMapping = () => {
        const mapped = rawData.map((row, rowIndex) => {
            const obj = { 
                id: `${Date.now()}-${rowIndex}-${Math.random().toString(36).substr(2, 9)}`, 
                selected: true 
            };
            
            // Garantir que todas as colunas mapeadas sejam aplicadas corretamente
            headers.forEach((header, colIndex) => {
                const fieldKey = columnMapping[colIndex];
                if (fieldKey && fieldKey !== "ignorar") {
                    const cellValue = row[colIndex];
                    obj[fieldKey] = cellValue !== undefined && cellValue !== null ? String(cellValue).trim() : "";
                }
            });
            
            return obj;
        });
        
        setMappedData(mapped);
        setSelectedRows(mapped.map(r => r.id));
        setStep(3);
        
        console.log("Dados mapeados:", mapped);
    };

    const toggleRowSelection = (id) => {
        setSelectedRows(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedRows.length === mappedData.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(mappedData.map(r => r.id));
        }
    };

    const updateCellValue = (rowId, field, value) => {
        setMappedData(prev => prev.map(row => 
            row.id === rowId ? { ...row, [field]: value } : row
        ));
        setEditingCell(null);
    };

    // Função para converter data DD/MM/YYYY para YYYY-MM-DD
    const parseDataBR = (dataStr) => {
        if (!dataStr) return format(new Date(), "yyyy-MM-dd");
        // Se já está no formato YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return dataStr;
        // Se está no formato DD/MM/YYYY ou DD/MM/YY
        const match = dataStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (match) {
            const dia = match[1].padStart(2, '0');
            const mes = match[2].padStart(2, '0');
            let ano = match[3];
            if (ano.length === 2) ano = '20' + ano;
            return `${ano}-${mes}-${dia}`;
        }
        return format(new Date(), "yyyy-MM-dd");
    };

    const handleSave = async () => {
        const rowsToSave = mappedData.filter(r => selectedRows.includes(r.id));
        if (rowsToSave.length === 0) {
            toast.error("Selecione ao menos uma linha");
            return;
        }

        setSaving(true);
        try {
            // Buscar todos os CTEs existentes
            const existingCTEs = await base44.entities.ComprovanteCTE.list();
            const existingNumbers = new Set(
                existingCTEs
                    .filter(c => c.numero_cte)
                    .map(c => c.numero_cte.trim().toLowerCase())
            );

            let importados = 0;
            let duplicados = 0;

            for (const row of rowsToSave) {
                const numeroCte = (row.numero_cte || "").trim();
                
                // Verificar se é duplicado
                if (numeroCte && existingNumbers.has(numeroCte.toLowerCase())) {
                    duplicados++;
                    continue;
                }

                await base44.entities.ComprovanteCTE.create({
                    numero_cte: row.numero_cte || "",
                    remetente: row.remetente || "",
                    destinatario: row.destinatario || "",
                    nfe: row.nfe || "",
                    valor_nf: row.valor_nf || "",
                    volume: row.volume || "",
                    peso: row.peso || "",
                    frete_peso: row.frete_peso || "",
                    coleta: row.coleta || "",
                    seguro: row.seguro || "",
                    pedagio: row.pedagio || "",
                    outros: row.outros || "",
                    valor_cobrado: row.valor_cobrado || "",
                    porcentagem: row.porcentagem || "",
                    mdfe: row.mdfe || "",
                    data: parseDataBR(row.data),
                    status: "pendente",
                    arquivos: []
                });
                importados++;
            }

            if (importados > 0 && duplicados > 0) {
                toast.success(`${importados} CTE(s) importado(s). ${duplicados} duplicado(s) ignorado(s).`);
            } else if (importados > 0) {
                toast.success(`${importados} CTE(s) importado(s) com sucesso!`);
            } else if (duplicados > 0) {
                toast.warning(`Nenhum CTE importado. Todos os ${duplicados} registro(s) já existem no sistema.`);
            }

            onImportSuccess();
            handleClose();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao salvar CTEs");
        }
        setSaving(false);
    };

    const downloadModelo = () => {
        const headers = CAMPOS_CTE.map(c => c.label).join(",");
        const exemplo = "01/12/2024,CTE123456,Fornecedor Exemplo,Cliente Exemplo,NFE789012,1500.00,10,250,120.00,50.00,30.00,15.00,5.00,220.00,15,MDFE456";
        const csvContent = `${headers}\n${exemplo}`;
        
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "modelo_importacao_cte.csv";
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Arquivo modelo baixado!");
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        Importar CTEs - {step === 1 ? "Upload" : step === 2 ? "Mapeamento de Colunas" : "Revisão dos Dados"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {/* Step 1: Upload */}
                    {step === 1 && (
                        <div className="space-y-6 p-4">
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Formatos Suportados
                                </h3>
                                <ul className="text-sm text-amber-700 space-y-1">
                                    <li>• Excel 97-2003 (.xls)</li>
                                    <li>• Excel (.xlsx)</li>
                                    <li>• CSV separado por vírgula (.csv)</li>
                                    <li>• PDF com tabela (.pdf)</li>
                                </ul>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <div className="border-2 border-dashed border-emerald-300 rounded-xl p-12 text-center hover:border-emerald-500 transition-colors w-full max-w-md">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv,.pdf"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="import-file"
                                    />
                                    <label htmlFor="import-file" className="cursor-pointer">
                                        {uploading ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                                                <span className="text-emerald-600 font-medium">Processando arquivo...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <Upload className="w-12 h-12 text-emerald-400" />
                                                <span className="text-lg font-medium text-emerald-600">Clique para selecionar arquivo</span>
                                                <span className="text-sm text-slate-500">ou arraste e solte aqui</span>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                <Button variant="outline" onClick={downloadModelo} className="border-blue-500 text-blue-600">
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar Arquivo Modelo
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Mapeamento */}
                    {step === 2 && (
                        <div className="space-y-4 p-4">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    <strong>Mapeie as colunas:</strong> Associe cada coluna do seu arquivo ao campo correspondente do CTE. Colunas não mapeadas serão ignoradas.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {headers.map((header, index) => (
                                    <div key={index} className="space-y-1">
                                        <Label className="text-xs text-slate-500 truncate block" title={header}>
                                            Coluna: {header || `(vazia ${index + 1})`}
                                        </Label>
                                        <Select 
                                            value={columnMapping[index] || ""} 
                                            onValueChange={(v) => setColumnMapping(prev => ({ ...prev, [index]: v }))}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ignorar">❌ Ignorar</SelectItem>
                                                {CAMPOS_CTE.map(campo => (
                                                    <SelectItem key={campo.key} value={campo.key}>
                                                        {campo.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>

                            {/* Preview dos primeiros dados */}
                            <div className="mt-4">
                                <h4 className="font-medium text-sm text-slate-600 mb-2">Prévia dos dados (3 primeiras linhas):</h4>
                                <div className="overflow-x-auto border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-100">
                                                {headers.map((h, i) => (
                                                    <TableHead key={i} className="text-xs whitespace-nowrap">
                                                        {h || `-`}
                                                        {columnMapping[i] && columnMapping[i] !== "ignorar" && (
                                                            <Badge className="ml-1 bg-emerald-100 text-emerald-700 text-xs">
                                                                → {CAMPOS_CTE.find(c => c.key === columnMapping[i])?.label}
                                                            </Badge>
                                                        )}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rawData.slice(0, 3).map((row, rowIndex) => (
                                                <TableRow key={rowIndex}>
                                                    {row.map((cell, cellIndex) => (
                                                        <TableCell key={cellIndex} className="text-xs whitespace-nowrap">
                                                            {cell || "-"}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setStep(1)}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Voltar
                                </Button>
                                <Button onClick={applyMapping} className="bg-emerald-600 hover:bg-emerald-700">
                                    Aplicar Mapeamento
                                    <CheckCircle className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Revisão */}
                    {step === 3 && (
                        <div className="space-y-4 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Badge className="bg-emerald-100 text-emerald-700">
                                        {selectedRows.length} de {mappedData.length} selecionado(s)
                                    </Badge>
                                    <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                                        {selectedRows.length === mappedData.length ? "Desmarcar Todos" : "Selecionar Todos"}
                                    </Button>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Clique em uma célula para editar
                                </p>
                            </div>

                            <div className="overflow-x-auto border rounded-lg max-h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-700">
                                            <TableHead className="text-white w-10 sticky left-0 z-10 bg-slate-700">
                                                <Checkbox 
                                                    checked={selectedRows.length === mappedData.length}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            {CAMPOS_CTE.map(campo => (
                                                <TableHead key={campo.key} className="text-white text-xs whitespace-nowrap">
                                                    {campo.label}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mappedData.map((row) => (
                                            <TableRow 
                                                key={row.id} 
                                                className={selectedRows.includes(row.id) ? "bg-emerald-50" : "bg-slate-50"}
                                            >
                                                <TableCell className="sticky left-0 z-10 bg-inherit">
                                                    <Checkbox 
                                                        checked={selectedRows.includes(row.id)}
                                                        onCheckedChange={() => toggleRowSelection(row.id)}
                                                    />
                                                </TableCell>
                                                {CAMPOS_CTE.map(campo => (
                                                    <TableCell key={campo.key} className="p-1">
                                                        {editingCell === `${row.id}-${campo.key}` ? (
                                                            <Input
                                                                value={row[campo.key] || ""}
                                                                onChange={(e) => updateCellValue(row.id, campo.key, e.target.value)}
                                                                onBlur={() => setEditingCell(null)}
                                                                onKeyDown={(e) => e.key === "Enter" && setEditingCell(null)}
                                                                autoFocus
                                                                className="h-7 text-xs"
                                                            />
                                                        ) : (
                                                            <div 
                                                                className="text-xs p-1 min-h-[28px] cursor-pointer hover:bg-white rounded border border-transparent hover:border-slate-300 truncate max-w-[120px]"
                                                                onClick={() => setEditingCell(`${row.id}-${campo.key}`)}
                                                                title={row[campo.key] || "Clique para editar"}
                                                            >
                                                                {row[campo.key] || <span className="text-slate-400">-</span>}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setStep(2)}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Voltar ao Mapeamento
                                </Button>
                                <Button 
                                    onClick={handleSave} 
                                    disabled={saving || selectedRows.length === 0}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Importar {selectedRows.length} CTE(s)
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}