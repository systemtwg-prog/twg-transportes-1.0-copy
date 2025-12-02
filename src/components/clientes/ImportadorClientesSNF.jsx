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

const CAMPOS_CLIENTE = [
    { key: "razao_social", label: "Razão Social", aliases: ["razao social", "razão social", "nome", "empresa", "razao", "razão"] },
    { key: "nome_fantasia", label: "Nome Fantasia", aliases: ["nome fantasia", "fantasia", "nome comercial"] },
    { key: "cnpj", label: "CNPJ", aliases: ["cnpj", "cnpj/cpf", "documento"] },
    { key: "endereco", label: "Endereço", aliases: ["endereco", "endereço", "end", "logradouro"] },
    { key: "cidade", label: "Cidade", aliases: ["cidade", "municipio", "município"] },
    { key: "uf", label: "UF", aliases: ["uf", "estado", "sigla"] },
    { key: "telefone", label: "Telefone", aliases: ["telefone", "tel", "fone", "contato"] },
    { key: "email", label: "Email", aliases: ["email", "e-mail", "correio"] },
    { key: "contato", label: "Contato", aliases: ["contato", "responsavel", "responsável"] },
    { key: "observacoes", label: "Observações", aliases: ["observacoes", "observações", "obs"] }
];

export default function ImportadorClientesSNF({ open, onClose, onImportSuccess, clientesExistentes = [] }) {
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
            for (const campo of CAMPOS_CLIENTE) {
                if (campo.aliases.some(alias => headerLower.includes(alias.toLowerCase()))) {
                    if (!Object.values(mapping).includes(campo.key)) {
                        mapping[index] = campo.key;
                        break;
                    }
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
            const cnpjsExistentes = new Set(clientesExistentes.map(c => c.cnpj?.replace(/\D/g, "")));
            let importados = 0;
            let duplicados = 0;
            
            for (const row of rowsToSave) {
                const cnpjLimpo = row.cnpj?.replace(/\D/g, "") || "";
                
                if (cnpjLimpo && cnpjsExistentes.has(cnpjLimpo)) {
                    duplicados++;
                    continue;
                }

                await base44.entities.ClienteSNF.create({
                    razao_social: row.razao_social || "",
                    nome_fantasia: row.nome_fantasia || "",
                    cnpj: row.cnpj || "",
                    endereco: row.endereco || "",
                    cidade: row.cidade || "",
                    uf: row.uf || "",
                    telefone: row.telefone || "",
                    email: row.email || "",
                    contato: row.contato || "",
                    observacoes: row.observacoes || ""
                });
                importados++;
                
                if (cnpjLimpo) cnpjsExistentes.add(cnpjLimpo);
            }
            
            if (duplicados > 0) {
                toast.warning(`${importados} cliente(s) importado(s). ${duplicados} ignorado(s) (duplicados).`);
            } else {
                toast.success(`${importados} cliente(s) importado(s) com sucesso!`);
            }
            onImportSuccess();
            handleClose();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao salvar clientes");
        }
        setSaving(false);
    };

    const downloadModelo = () => {
        const headers = CAMPOS_CLIENTE.map(c => c.label).join(",");
        const exemplo = "Empresa Exemplo Ltda,Exemplo,12.345.678/0001-90,Rua Exemplo 123,São Paulo,SP,(11) 99999-9999,exemplo@email.com,João Silva,Cliente preferencial";
        const csvContent = `${headers}\n${exemplo}`;
        
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "modelo_importacao_clientes_snf.csv";
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Arquivo modelo baixado!");
    };

    const camposVisiveis = CAMPOS_CLIENTE.slice(0, 7);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                        Importar Clientes S/NF - {step === 1 ? "Upload" : step === 2 ? "Mapeamento" : "Revisão"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-6 p-4">
                            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <h3 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Formatos Suportados
                                </h3>
                                <ul className="text-sm text-indigo-700 space-y-1">
                                    <li>• Excel (.xlsx, .xls)</li>
                                    <li>• CSV (.csv)</li>
                                    <li>• PDF com tabela (.pdf)</li>
                                </ul>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <div className="border-2 border-dashed border-indigo-300 rounded-xl p-12 text-center hover:border-indigo-500 transition-colors w-full max-w-md">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv,.pdf"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="import-clientes-snf-file"
                                    />
                                    <label htmlFor="import-clientes-snf-file" className="cursor-pointer">
                                        {uploading ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                                                <span className="text-indigo-600 font-medium">Processando...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <Upload className="w-12 h-12 text-indigo-400" />
                                                <span className="text-lg font-medium text-indigo-600">Clique para selecionar</span>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                <Button variant="outline" onClick={downloadModelo} className="border-indigo-500 text-indigo-600">
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar Modelo
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {headers.map((header, index) => (
                                    <div key={index} className="space-y-1">
                                        <Label className="text-xs text-slate-500 truncate block" title={header}>
                                            {header || `Col ${index + 1}`}
                                        </Label>
                                        <Select 
                                            value={columnMapping[index] || ""} 
                                            onValueChange={(v) => setColumnMapping(prev => ({ ...prev, [index]: v }))}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ignorar">❌ Ignorar</SelectItem>
                                                {CAMPOS_CLIENTE.map(campo => (
                                                    <SelectItem key={campo.key} value={campo.key}>
                                                        {campo.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button variant="outline" onClick={() => setStep(1)}>
                                    <RefreshCw className="w-4 h-4 mr-2" /> Voltar
                                </Button>
                                <Button onClick={applyMapping} className="bg-indigo-600 hover:bg-indigo-700">
                                    Aplicar <CheckCircle className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 p-4">
                            <div className="flex items-center justify-between">
                                <Badge className="bg-indigo-100 text-indigo-700">
                                    {selectedRows.length} de {mappedData.length} selecionado(s)
                                </Badge>
                                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                                    {selectedRows.length === mappedData.length ? "Desmarcar" : "Selecionar"} Todos
                                </Button>
                            </div>

                            <div className="overflow-x-auto border rounded-lg max-h-80">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-700">
                                            <TableHead className="text-white w-10">
                                                <Checkbox 
                                                    checked={selectedRows.length === mappedData.length}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            {camposVisiveis.map(campo => (
                                                <TableHead key={campo.key} className="text-white text-xs whitespace-nowrap">
                                                    {campo.label}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mappedData.map((row) => (
                                            <TableRow key={row.id} className={selectedRows.includes(row.id) ? "bg-indigo-50" : ""}>
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={selectedRows.includes(row.id)}
                                                        onCheckedChange={() => toggleRowSelection(row.id)}
                                                    />
                                                </TableCell>
                                                {camposVisiveis.map(campo => (
                                                    <TableCell key={campo.key} className="p-1">
                                                        {editingCell === `${row.id}-${campo.key}` ? (
                                                            <Input
                                                                value={row[campo.key] || ""}
                                                                onChange={(e) => updateCellValue(row.id, campo.key, e.target.value)}
                                                                onBlur={() => setEditingCell(null)}
                                                                autoFocus
                                                                className="h-7 text-xs"
                                                            />
                                                        ) : (
                                                            <div 
                                                                className="text-xs p-1 cursor-pointer hover:bg-white rounded truncate max-w-[120px]"
                                                                onClick={() => setEditingCell(`${row.id}-${campo.key}`)}
                                                                title={row[campo.key] || ""}
                                                            >
                                                                {row[campo.key] || "-"}
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
                                    <RefreshCw className="w-4 h-4 mr-2" /> Voltar
                                </Button>
                                <Button 
                                    onClick={handleSave} 
                                    disabled={saving || selectedRows.length === 0}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Importar {selectedRows.length}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}