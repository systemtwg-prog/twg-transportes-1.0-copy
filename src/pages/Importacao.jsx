import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { format } from "date-fns";

const CAMPOS_NFE = [
    { key: "numero_nf", label: "Nº NF", aliases: ["numero_nf", "nf", "nota fiscal", "nfe", "número nf", "num nf", "nº nf"] },
    { key: "destinatario", label: "Destinatário", aliases: ["destinatario", "destinatário", "dest", "cliente", "razao social", "nome"] },
    { key: "remetente", label: "Remetente", aliases: ["remetente", "rem", "fornecedor", "forn"] },
    { key: "peso", label: "Peso", aliases: ["peso", "kg", "peso kg", "peso (kg)"] },
    { key: "volume", label: "Volume", aliases: ["volume", "vol", "volumes", "qtd vol", "quantidade"] },
    { key: "transportadora", label: "Transportadora", aliases: ["transportadora", "transp", "transportador"] },
    { key: "filial", label: "Filial", aliases: ["filial", "fil", "unidade"] },
    { key: "placa", label: "Placa", aliases: ["placa", "veículo", "veiculo"] },
    { key: "data", label: "Data", aliases: ["data", "dt", "date", "data nf"] },
    { key: "observacoes", label: "Observações", aliases: ["observacoes", "observações", "obs", "observação"] }
];

export default function Importacao() {
    const [step, setStep] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [rawData, setRawData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [columnMapping, setColumnMapping] = useState({});
    const [mappedData, setMappedData] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [editingCell, setEditingCell] = useState(null);
    const queryClient = useQueryClient();

    const resetState = () => {
        setStep(1);
        setRawData([]);
        setHeaders([]);
        setColumnMapping({});
        setMappedData([]);
        setSelectedRows([]);
        setEditingCell(null);
    };

    const autoMapColumns = (headerRow) => {
        const mapping = {};
        headerRow.forEach((header, index) => {
            const headerLower = header?.toString().toLowerCase().trim() || "";
            for (const campo of CAMPOS_NFE) {
                if (campo.aliases.some(alias => headerLower.includes(alias.toLowerCase()))) {
                    mapping[index] = campo.key;
                    break;
                }
            }
        });
        return mapping;
    };

    const parseCSV = (text) => {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return null;

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            return values;
        });

        return { headers, rows };
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            if (file.name.endsWith('.csv')) {
                const text = await file.text();
                const parsed = parseCSV(text);
                
                if (!parsed || parsed.rows.length === 0) {
                    toast.error("Arquivo vazio ou formato inválido");
                    setUploading(false);
                    return;
                }

                setHeaders(parsed.headers);
                setRawData(parsed.rows);
                const autoMapping = autoMapColumns(parsed.headers);
                setColumnMapping(autoMapping);
                setStep(2);
                toast.success(`${parsed.rows.length} linha(s) encontrada(s)!`);
            } else {
                toast.error("Apenas arquivos CSV são suportados no momento");
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
            const notasExistentes = await base44.entities.NotaFiscal.list("-created_date", 1000);
            const numerosExistentes = new Set(notasExistentes.map(n => n.numero_nf?.toLowerCase().trim()).filter(Boolean));
            
            const destinatariosExistentes = await base44.entities.Destinatario.list();
            const destinatariosSet = new Set(destinatariosExistentes.map(d => d.nome?.toLowerCase().trim()).filter(Boolean));
            
            const novosDestinatarios = new Set();
            let importadas = 0;
            let duplicadas = 0;
            
            for (const row of rowsToSave) {
                const numeroNf = (row.numero_nf || "").toLowerCase().trim();
                
                if (numeroNf && numerosExistentes.has(numeroNf)) {
                    duplicadas++;
                    continue;
                }
                
                const nomeDestinatario = (row.destinatario || "").trim();
                if (nomeDestinatario && !destinatariosSet.has(nomeDestinatario.toLowerCase())) {
                    novosDestinatarios.add(nomeDestinatario);
                    destinatariosSet.add(nomeDestinatario.toLowerCase());
                }
                
                await base44.entities.NotaFiscal.create({
                    numero_nf: row.numero_nf || "",
                    destinatario: row.destinatario || "",
                    remetente: row.remetente || "",
                    peso: row.peso || "",
                    volume: row.volume || "",
                    transportadora: row.transportadora || "",
                    filial: row.filial || "",
                    placa: row.placa || "",
                    data: row.data || format(new Date(), "yyyy-MM-dd"),
                    observacoes: row.observacoes || ""
                });
                importadas++;
                
                if (numeroNf) numerosExistentes.add(numeroNf);
            }
            
            let destinatariosCadastrados = 0;
            for (const nomeDestinatario of novosDestinatarios) {
                await base44.entities.Destinatario.create({ nome: nomeDestinatario });
                destinatariosCadastrados++;
            }
            
            if (duplicadas > 0) {
                toast.warning(`${importadas} nota(s) importada(s). ${duplicadas} ignorada(s) (duplicadas).`);
            } else {
                toast.success(`${importadas} nota(s) fiscal(is) importada(s) com sucesso!`);
            }
            
            if (destinatariosCadastrados > 0) {
                toast.success(`${destinatariosCadastrados} destinatário(s) cadastrado(s)!`);
            }
            
            queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
            resetState();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao salvar notas fiscais");
        }
        setSaving(false);
    };

    const downloadModelo = () => {
        const headers = CAMPOS_NFE.map(c => c.label).join(",");
        const exemplo = "123456,Cliente Exemplo Ltda,Fornecedor ABC,150.5,10,Transportadora XYZ,São Paulo,ABC-1234,01/12/2024,Observação teste";
        const csvContent = `${headers}\n${exemplo}`;
        
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "modelo_importacao_nfe.csv";
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Arquivo modelo baixado!");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <FileSpreadsheet className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Importação de Notas Fiscais</h1>
                            <p className="text-slate-500">Importe notas fiscais em lote via CSV</p>
                        </div>
                    </div>
                </div>

                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardContent className="p-8">
                        {/* Step 1: Upload */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Formatos Suportados
                                    </h3>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• CSV separado por vírgula (.csv)</li>
                                    </ul>
                                </div>

                                <div className="flex flex-col items-center gap-4">
                                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors w-full max-w-md">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="import-file"
                                        />
                                        <label htmlFor="import-file" className="cursor-pointer">
                                            {uploading ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                                    <span className="text-blue-600 font-medium">Processando arquivo...</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-3">
                                                    <Upload className="w-12 h-12 text-blue-400" />
                                                    <span className="text-lg font-medium text-blue-600">Clique para selecionar arquivo</span>
                                                    <span className="text-sm text-slate-500">ou arraste e solte aqui</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>

                                    <Button variant="outline" onClick={downloadModelo} className="border-indigo-500 text-indigo-600">
                                        <Download className="w-4 h-4 mr-2" />
                                        Baixar Arquivo Modelo
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Mapeamento */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                    <p className="text-sm text-indigo-700">
                                        <strong>Mapeie as colunas:</strong> Associe cada coluna do seu arquivo ao campo correspondente da Nota Fiscal.
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
                                                    {CAMPOS_NFE.map(campo => (
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
                                                                <Badge className="ml-1 bg-blue-100 text-blue-700 text-xs">
                                                                    → {CAMPOS_NFE.find(c => c.key === columnMapping[i])?.label}
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
                                    <Button onClick={applyMapping} className="bg-blue-600 hover:bg-blue-700">
                                        Aplicar Mapeamento
                                        <CheckCircle className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Revisão */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-blue-100 text-blue-700">
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
                                                {CAMPOS_NFE.slice(0, 8).map(campo => (
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
                                                    className={selectedRows.includes(row.id) ? "bg-blue-50" : "bg-slate-50"}
                                                >
                                                    <TableCell>
                                                        <Checkbox 
                                                            checked={selectedRows.includes(row.id)}
                                                            onCheckedChange={() => toggleRowSelection(row.id)}
                                                        />
                                                    </TableCell>
                                                    {CAMPOS_NFE.slice(0, 8).map(campo => (
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
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Importar {selectedRows.length} Nota(s)
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}