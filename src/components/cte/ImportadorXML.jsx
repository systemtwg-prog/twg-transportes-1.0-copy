import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
    FileCode, Upload, Loader2, Save, X, AlertTriangle, CheckCircle, Pencil
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ImportadorXML({ open, onClose, onImportSuccess }) {
    const [step, setStep] = useState(1); // 1 = upload, 2 = revisão
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [extractedData, setExtractedData] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [editingCell, setEditingCell] = useState(null);

    const resetState = () => {
        setStep(1);
        setExtractedData([]);
        setSelectedRows([]);
        setEditingCell(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        const allData = [];

        try {
            for (const file of files) {
                toast.info(`Processando ${file.name}...`);
                
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                
                // Ler conteúdo do XML
                const response = await fetch(file_url);
                const xmlText = await response.text();

                // Extrair dados usando LLM
                const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `Você é um assistente especializado em extrair dados de arquivos XML de CTEs (Conhecimento de Transporte Eletrônico).

Analise o XML abaixo e extraia TODOS os dados relevantes do CTE:

XML:
${xmlText}

IMPORTANTE: Extraia os seguintes campos (use string vazia "" se não encontrar):
- numero_cte: Número do CTE
- data: Data de emissão (formato YYYY-MM-DD)
- remetente: Nome do remetente/expedidor
- destinatario: Nome do destinatário
- nfe: Número da NFe vinculada
- valor_nf: Valor da nota fiscal
- volume: Quantidade de volumes
- peso: Peso da carga em KG
- frete_peso: Valor do frete peso
- coleta: Valor da coleta
- seguro: Valor do seguro
- pedagio: Valor do pedágio
- outros: Outros valores
- valor_cobrado: Valor total cobrado
- porcentagem: Porcentagem
- mdfe: Número do MDFe

Retorne um JSON com esses campos extraídos.`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            numero_cte: { type: "string" },
                            data: { type: "string" },
                            remetente: { type: "string" },
                            destinatario: { type: "string" },
                            nfe: { type: "string" },
                            valor_nf: { type: "string" },
                            volume: { type: "string" },
                            peso: { type: "string" },
                            frete_peso: { type: "string" },
                            coleta: { type: "string" },
                            seguro: { type: "string" },
                            pedagio: { type: "string" },
                            outros: { type: "string" },
                            valor_cobrado: { type: "string" },
                            porcentagem: { type: "string" },
                            mdfe: { type: "string" }
                        }
                    }
                });

                if (result && result.numero_cte) {
                    allData.push({
                        id: Date.now() + allData.length,
                        selected: true,
                        arquivo: file.name,
                        ...result
                    });
                }
            }

            if (allData.length > 0) {
                setExtractedData(allData);
                setSelectedRows(allData.map(d => d.id));
                setStep(2);
                toast.success(`${allData.length} CTE(s) extraído(s) dos XMLs!`);
            } else {
                toast.error("Nenhum dado válido encontrado nos XMLs");
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao processar arquivos XML");
        }
        setUploading(false);
        e.target.value = "";
    };

    const toggleRowSelection = (id) => {
        setSelectedRows(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedRows.length === extractedData.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(extractedData.map(r => r.id));
        }
    };

    const updateCellValue = (rowId, field, value) => {
        setExtractedData(prev => prev.map(row => 
            row.id === rowId ? { ...row, [field]: value } : row
        ));
        setEditingCell(null);
    };

    const parseDataBR = (dataStr) => {
        if (!dataStr) return format(new Date(), "yyyy-MM-dd");
        if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) return dataStr;
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
        const rowsToSave = extractedData.filter(r => selectedRows.includes(r.id));
        if (rowsToSave.length === 0) {
            toast.error("Selecione ao menos um registro");
            return;
        }

        setSaving(true);
        try {
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
                toast.warning(`Nenhum CTE importado. Todos os ${duplicados} registro(s) já existem.`);
            }

            onImportSuccess();
            handleClose();
        } catch (err) {
            console.error(err);
            toast.error("Erro ao salvar CTEs");
        }
        setSaving(false);
    };

    const CAMPOS_VISIVEIS = [
        { key: "numero_cte", label: "CTE" },
        { key: "data", label: "Data" },
        { key: "remetente", label: "Remetente" },
        { key: "destinatario", label: "Destinatário" },
        { key: "nfe", label: "NFE" },
        { key: "valor_nf", label: "Valor NF" },
        { key: "volume", label: "Vol" },
        { key: "peso", label: "Peso" },
        { key: "valor_cobrado", label: "Vl. Cobrado" }
    ];

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileCode className="w-5 h-5 text-purple-600" />
                        Importar XML - {step === 1 ? "Upload" : "Revisão dos Dados"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {/* Step 1: Upload */}
                    {step === 1 && (
                        <div className="space-y-6 p-4">
                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Importação de Arquivos XML de CTEs
                                </h3>
                                <ul className="text-sm text-purple-700 space-y-1">
                                    <li>• Selecione um ou mais arquivos XML de CTEs</li>
                                    <li>• O sistema extrairá automaticamente os dados</li>
                                    <li>• Você poderá revisar antes de salvar</li>
                                </ul>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <div className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center hover:border-purple-500 transition-colors w-full max-w-md">
                                    <input
                                        type="file"
                                        accept=".xml"
                                        multiple
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="import-xml"
                                    />
                                    <label htmlFor="import-xml" className="cursor-pointer">
                                        {uploading ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                                <span className="text-purple-600 font-medium">Processando XMLs...</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <Upload className="w-12 h-12 text-purple-400" />
                                                <span className="text-lg font-medium text-purple-600">Selecionar Arquivos XML</span>
                                                <span className="text-sm text-slate-500">Clique ou arraste arquivos</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Revisão */}
                    {step === 2 && (
                        <div className="space-y-4 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Badge className="bg-purple-100 text-purple-700">
                                        {selectedRows.length} de {extractedData.length} selecionado(s)
                                    </Badge>
                                    <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                                        {selectedRows.length === extractedData.length ? "Desmarcar Todos" : "Selecionar Todos"}
                                    </Button>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Clique em uma célula para editar
                                </p>
                            </div>

                            <div className="overflow-x-auto border rounded-lg max-h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-purple-700">
                                            <TableHead className="text-white w-10">
                                                <Checkbox 
                                                    checked={selectedRows.length === extractedData.length}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            {CAMPOS_VISIVEIS.map(campo => (
                                                <TableHead key={campo.key} className="text-white text-xs whitespace-nowrap">
                                                    {campo.label}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {extractedData.map((row) => (
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
                                                {CAMPOS_VISIVEIS.map(campo => (
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
                                <Button variant="outline" onClick={() => setStep(1)}>
                                    <X className="w-4 h-4 mr-2" />
                                    Voltar
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