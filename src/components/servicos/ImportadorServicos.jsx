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
    FileSpreadsheet, Upload, Loader2, Save, Download, RefreshCw, AlertTriangle, CheckCircle
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

const CAMPOS_SERVICO = [
    { key: "numero", label: "Número", aliases: ["numero", "num", "nº", "código", "cod"] },
    { key: "data", label: "Data", aliases: ["data", "dt", "date"] },
    { key: "cliente", label: "Cliente", aliases: ["cliente", "razao social", "nome", "empresa"] },
    { key: "descricao", label: "Descrição", aliases: ["descricao", "descrição", "desc", "servico", "serviço"] },
    { key: "origem", label: "Origem", aliases: ["origem", "de", "from", "local origem"] },
    { key: "destino", label: "Destino", aliases: ["destino", "para", "to", "local destino"] },
    { key: "valor", label: "Valor", aliases: ["valor", "preco", "preço", "total", "vlr"] },
    { key: "motorista_nome", label: "Motorista", aliases: ["motorista", "mot", "condutor"] },
    { key: "veiculo_placa", label: "Placa", aliases: ["placa", "veiculo", "veículo"] },
    { key: "observacoes", label: "Observações", aliases: ["observacoes", "observações", "obs", "notas"] }
];

export default function ImportadorServicos({ open, onClose, onImportSuccess }) {
    const [step, setStep] = useState(1);
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
            for (const campo of CAMPOS_SERVICO) {
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
            const obj = { id: Date.now() + rowIndex, selected: true };
            Object.entries(columnMapping).forEach(([colIndex, fieldKey]) => {
                if (fieldKey && fieldKey !== "ignorar") {
                    obj[fieldKey] = row[parseInt(colIndex)] || "";
                }
            });
            return obj;
        });
        setMappedData(mapped);
        setSelectedRows(mapped.map(r => r.id));
        setStep(3);
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

    const handleSave = async () => {
        const rowsToSave = mappedData.filter(r => selectedRows.includes(r.id));
        if (rowsToSave.length === 0) {
            toast.error("Selecione ao menos uma linha");
            return;
        }

        setSaving(true);
        try {
            let importados = 0;
            
            for (const row of rowsToSave) {
                await base44.entities.ServicoSNF.create({
                    numero: row.numero || "",
                    data: row.data || format(new Date(), "yyyy-MM-dd"),
                    cliente: row.cliente || "",
                    descricao: row.descricao || "",
                    origem: row.origem || "",
                    destino: row.destino || "",
                    valor: parseFloat(row.valor?.replace(/[^\d.,]/g, "").replace(",", ".")) || 0,
                    motorista_nome: row.motorista_nome || "",
                    veiculo_placa: row.veiculo_placa || "",
                    status: "pendente",
                    observacoes: row.observacoes || ""
                });
                importados++;
            }
            
            toast.success(`${importados} serviço(s) importado(s) com sucesso!`);
            onImportSuccess();
            handleClose();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao salvar serviços");
        }
        setSaving(false);
    };

    const downloadModelo = () => {
        const headers = CAMPOS_SERVICO.map(c => c.label).join(",");
        const exemplo = "001,01/12/2024,Cliente Exemplo,Transporte de mercadorias,São Paulo,Rio de Janeiro,500.00,João Silva,ABC-1234,Observação";
        const csvContent = `${headers}\n${exemplo}`;
        
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "modelo_importacao_servicos.csv";
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Arquivo modelo baixado!");
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                        Importar Serviços S/NF - {step === 1 ? "Upload" : step === 2 ? "Mapeamento de Colunas" : "Revisão dos Dados"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {/* Step 1: Upload */}
                    {step === 1 && (
                        <div className="space-y-6 p-4">
                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Formatos Suportados
                                </h3>
                                <ul className="text-sm text-purple-700 space-y-1">
                                    <li>• Excel (.xlsx, .xls)</li>
                                    <li>• CSV (.csv)</li>
                                    <li>• PDF com tabela (.pdf)</li>
                                </ul>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <div className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center hover:border-purple-500 transition-colors w-full max-w-md">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv,.pdf"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="import-servicos-file"
                                    />
                                    <label htmlFor="import-servicos-file" className="cursor-pointer">
                                        {uploading ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                                <span className="text-purple-600 font-medium">Processando arquivo...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <Upload className="w-12 h-12 text-purple-400" />
                                                <span className="text-lg font-medium text-purple-600">Clique para selecionar arquivo</span>
                                                <span className="text-sm text-slate-500">ou arraste e solte aqui</span>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                <Button variant="outline" onClick={downloadModelo} className="border-purple-500 text-purple-600">
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar Arquivo Modelo
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Mapeamento */}
                    {step === 2 && (
                        <div className="space-y-4 p-4">
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <p className="text-sm text-purple-700">
                                    <strong>Mapeie as colunas:</strong> Associe cada coluna do seu arquivo ao campo correspondente.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                                                {CAMPOS_SERVICO.map(campo => (
                                                    <SelectItem key={campo.key} value={campo.key}>
                                                        {campo.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>

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
                                                            <Badge className="ml-1 bg-purple-100 text-purple-700 text-xs">
                                                                → {CAMPOS_SERVICO.find(c => c.key === columnMapping[i])?.label}
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
                                <Button onClick={applyMapping} className="bg-purple-600 hover:bg-purple-700">
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
                                    <Badge className="bg-purple-100 text-purple-700">
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
                                            <TableHead className="text-white w-10">
                                                <Checkbox 
                                                    checked={selectedRows.length === mappedData.length}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            {CAMPOS_SERVICO.slice(0, 8).map(campo => (
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
                                                className={selectedRows.includes(row.id) ? "bg-purple-50" : "bg-slate-50"}
                                            >
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={selectedRows.includes(row.id)}
                                                        onCheckedChange={() => toggleRowSelection(row.id)}
                                                    />
                                                </TableCell>
                                                {CAMPOS_SERVICO.slice(0, 8).map(campo => (
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
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Importar {selectedRows.length} Serviço(s)
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