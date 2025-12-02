import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Plus, FileText, Upload, Trash2, Pencil, Eye, 
    Camera, File, ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download, Search, 
    Save, Share2, Building2, Calendar, RotateCw, ClipboardPaste, AlertTriangle,
    CheckCircle, Package, Loader2, Printer, Car, Calculator, FileSpreadsheet
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import ScannerCamera from "@/components/shared/ScannerCamera";
import ImportadorCTE from "@/components/cte/ImportadorCTE";

function FlipbookViewer({ files, onClose }) {
    const [currentPage, setCurrentPage] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    if (!files || files.length === 0) return null;

    const currentFile = files[currentPage];
    const isPdf = currentFile?.tipo === "application/pdf" || currentFile?.url?.endsWith(".pdf");

    const rotateImage = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 bg-black/50">
                <div className="text-white">
                    <span className="font-medium">{currentFile?.nome}</span>
                    <span className="text-white/60 ml-2">({currentPage + 1} de {files.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="text-white hover:bg-white/20">
                        <ZoomOut className="w-5 h-5" />
                    </Button>
                    <span className="text-white px-2">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="text-white hover:bg-white/20">
                        <ZoomIn className="w-5 h-5" />
                    </Button>
                    {!isPdf && (
                        <Button variant="ghost" size="icon" onClick={rotateImage} className="text-white hover:bg-white/20" title="Girar imagem">
                            <RotateCw className="w-5 h-5" />
                        </Button>
                    )}
                    <a href={currentFile?.url} download target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <Download className="w-5 h-5" />
                        </Button>
                    </a>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center overflow-auto p-4">
                {isPdf ? (
                    <iframe 
                        src={currentFile?.url} 
                        className="w-full h-full bg-white rounded-lg"
                        style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                    />
                ) : (
                    <img 
                        src={currentFile?.url} 
                        alt={currentFile?.nome}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform"
                        style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                    />
                )}
            </div>

            {files.length > 1 && (
                <div className="flex items-center justify-center gap-4 p-4 bg-black/50">
                    <Button 
                        variant="ghost" 
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="text-white hover:bg-white/20"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <div className="flex gap-2">
                        {files.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`w-3 h-3 rounded-full transition-colors ${i === currentPage ? "bg-white" : "bg-white/40 hover:bg-white/60"}`}
                            />
                        ))}
                    </div>
                    <Button 
                        variant="ghost" 
                        onClick={() => setCurrentPage(p => Math.min(files.length - 1, p + 1))}
                        disabled={currentPage === files.length - 1}
                        className="text-white hover:bg-white/20"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function ComprovantesCtes() {
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [filterData, setFilterData] = useState("");
    const [filterAno, setFilterAno] = useState("");
    const [filterCTE, setFilterCTE] = useState("");
    const [filterFornecedor, setFilterFornecedor] = useState("");
    const [filterCliente, setFilterCliente] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [viewFiles, setViewFiles] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selecionados, setSelecionados] = useState([]);
    const [showPasteDialog, setShowPasteDialog] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [extractedCTEs, setExtractedCTEs] = useState([]);
    const [extracting, setExtracting] = useState(false);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadingCTE, setUploadingCTE] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [statusForm, setStatusForm] = useState({ nome: "", cor: "bg-gray-100 text-gray-700", ordem: 0 });
    const [editingStatus, setEditingStatus] = useState(null);
    const [showEditMassa, setShowEditMassa] = useState(false);
    const [editMassaField, setEditMassaField] = useState("");
    const [editMassaValue, setEditMassaValue] = useState("");
    const [showVeiculoNotas, setShowVeiculoNotas] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [scannerTarget, setScannerTarget] = useState(null); // 'form' ou 'upload'
    const [showCalculadora, setShowCalculadora] = useState(false);
    const [calcInput, setCalcInput] = useState("");
    const [calcResult, setCalcResult] = useState("");
    const [showImportador, setShowImportador] = useState(false);
    const [showTomadorDialog, setShowTomadorDialog] = useState(false);
    const [tomadorForm, setTomadorForm] = useState({ nome: "", cnpj: "", endereco: "", cidade: "", uf: "", telefone: "" });
    const [editingTomador, setEditingTomador] = useState(null);
    const queryClient = useQueryClient();

    const { data: comprovantes = [], isLoading } = useQuery({
        queryKey: ["comprovantes-ctes"],
        queryFn: () => base44.entities.ComprovanteCTE.list("-created_date")
    });

    const { data: configs = [] } = useQuery({
        queryKey: ["configuracoes"],
        queryFn: () => base44.entities.Configuracoes.list()
    });
    const config = configs[0] || {};

    const { data: statusList = [] } = useQuery({
        queryKey: ["status-cte"],
        queryFn: () => base44.entities.StatusCTE.list("ordem")
    });

    const { data: tomadores = [] } = useQuery({
        queryKey: ["tomadores-cte"],
        queryFn: () => base44.entities.TomadorCTE.list()
    });

    const createTomadorMutation = useMutation({
        mutationFn: (data) => base44.entities.TomadorCTE.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tomadores-cte"] });
            setTomadorForm({ nome: "", cnpj: "", endereco: "", cidade: "", uf: "", telefone: "" });
            setEditingTomador(null);
            toast.success("Tomador cadastrado!");
        }
    });

    const updateTomadorMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.TomadorCTE.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tomadores-cte"] });
            setTomadorForm({ nome: "", cnpj: "", endereco: "", cidade: "", uf: "", telefone: "" });
            setEditingTomador(null);
            toast.success("Tomador atualizado!");
        }
    });

    const deleteTomadorMutation = useMutation({
        mutationFn: (id) => base44.entities.TomadorCTE.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tomadores-cte"] });
            toast.success("Tomador excluído!");
        }
    });

    const createStatusMutation = useMutation({
        mutationFn: (data) => base44.entities.StatusCTE.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["status-cte"] });
            setStatusForm({ nome: "", cor: "bg-gray-100 text-gray-700", ordem: 0 });
            setEditingStatus(null);
            toast.success("Status criado!");
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.StatusCTE.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["status-cte"] });
            setStatusForm({ nome: "", cor: "bg-gray-100 text-gray-700", ordem: 0 });
            setEditingStatus(null);
            toast.success("Status atualizado!");
        }
    });

    const deleteStatusMutation = useMutation({
        mutationFn: (id) => base44.entities.StatusCTE.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["status-cte"] });
            toast.success("Status excluído!");
        }
    });

    const getStatusColor = (statusNome) => {
        const status = statusList.find(s => s.nome === statusNome);
        return status?.cor || "bg-gray-100 text-gray-700";
    };

    const [form, setForm] = useState({
        numero_cte: "",
        remetente: "",
        destinatario: "",
        tomador: "",
        tomador_id: "",
        nfe: "",
        valor_nf: "",
        volume: "",
        peso: "",
        frete_peso: "",
        coleta: "",
        seguro: "",
        pedagio: "",
        outros: "",
        valor_cobrado: "",
        porcentagem: "",
        mdfe: "",
        data: format(new Date(), "yyyy-MM-dd"),
        arquivos: [],
        observacoes: "",
        status: "pendente"
    });

    // Dashboard de pendências
    const dashboard = useMemo(() => {
        const total = comprovantes.length;
        const comComprovante = comprovantes.filter(c => c.arquivos && c.arquivos.length > 0).length;
        const semComprovante = total - comComprovante;
        const pendentes = comprovantes.filter(c => c.status === "pendente" || !c.status).length;
        const finalizados = comprovantes.filter(c => c.status === "finalizado").length;
        
        return { total, comComprovante, semComprovante, pendentes, finalizados };
    }, [comprovantes]);

    const empresasUnicas = [...new Set(comprovantes.map(c => c.empresa).filter(Boolean))];

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ComprovanteCTE.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-ctes"] });
            setShowForm(false);
            resetForm();
            toast.success("CTE cadastrado com sucesso!");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ComprovanteCTE.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-ctes"] });
            setShowForm(false);
            resetForm();
            toast.success("CTE atualizado!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ComprovanteCTE.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-ctes"] });
            toast.success("CTE excluído!");
        }
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids) => {
            for (const id of ids) {
                await base44.entities.ComprovanteCTE.delete(id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-ctes"] });
            setSelecionados([]);
            toast.success("CTEs excluídos!");
        }
    });

    const resetForm = () => {
        setForm({
            numero_cte: "",
            remetente: "",
            destinatario: "",
            tomador: "",
            tomador_id: "",
            nfe: "",
            valor_nf: "",
            volume: "",
            peso: "",
            frete_peso: "",
            coleta: "",
            seguro: "",
            pedagio: "",
            outros: "",
            valor_cobrado: "",
            porcentagem: "",
            mdfe: "",
            data: format(new Date(), "yyyy-MM-dd"),
            arquivos: [],
            observacoes: "",
            status: "pendente"
        });
        setEditing(null);
    };

    const bulkEditMutation = useMutation({
        mutationFn: async ({ ids, field, value }) => {
            for (const id of ids) {
                await base44.entities.ComprovanteCTE.update(id, { [field]: value });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comprovantes-ctes"] });
            setSelecionados([]);
            setShowEditMassa(false);
            setEditMassaField("");
            setEditMassaValue("");
            toast.success("CTEs atualizados!");
        }
    });

    const handlePrint = () => {
        const selectedCTEs = comprovantes.filter(c => selecionados.includes(c.id));
        if (selectedCTEs.length === 0) return;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Comprovantes CTEs</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                    .logo { max-height: 80px; margin-bottom: 10px; }
                    .company-name { font-size: 24px; font-weight: bold; }
                    .company-info { font-size: 12px; color: #666; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                    th { background: #333; color: white; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    ${config.logo_url ? `<img src="${config.logo_url}" class="logo" />` : ''}
                    <div class="company-name">${config.nome_empresa || 'Empresa'}</div>
                    <div class="company-info">
                        ${config.endereco || ''}<br/>
                        ${config.telefone ? `Tel: ${config.telefone}` : ''} ${config.email ? `| ${config.email}` : ''}
                        ${config.cnpj ? `<br/>CNPJ: ${config.cnpj}` : ''}
                    </div>
                </div>
                <h2 style="text-align:center;">Relatório de CTEs</h2>
                <p style="text-align:center; color:#666;">Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Fornecedor</th>
                            <th>Cliente</th>
                            <th class="text-center">NFE</th>
                            <th class="text-center">CTE</th>
                            <th class="text-center">Vol</th>
                            <th class="text-center">Peso</th>
                            <th class="text-right">Frete Peso</th>
                            <th class="text-right">Coleta</th>
                            <th class="text-right">Seguro</th>
                            <th class="text-right">Pedágio</th>
                            <th class="text-right">Outros</th>
                            <th class="text-right">Vl Cobrado</th>
                            <th class="text-center">%</th>
                            <th class="text-center">MDFE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${selectedCTEs.map(cte => `
                            <tr>
                                <td>${cte.data ? format(new Date(cte.data), "dd/MM/yy") : '-'}</td>
                                <td>${cte.remetente || '-'}</td>
                                <td>${cte.destinatario || '-'}</td>
                                <td class="text-center">${cte.nfe || '-'}</td>
                                <td class="text-center">${cte.numero_cte || '-'}</td>
                                <td class="text-center">${cte.volume || '-'}</td>
                                <td class="text-center">${cte.peso || '-'}</td>
                                <td class="text-right">${cte.frete_peso || '-'}</td>
                                <td class="text-right">${cte.coleta || '-'}</td>
                                <td class="text-right">${cte.seguro || '-'}</td>
                                <td class="text-right">${cte.pedagio || '-'}</td>
                                <td class="text-right">${cte.outros || '-'}</td>
                                <td class="text-right">${cte.valor_cobrado || '-'}</td>
                                <td class="text-center">${cte.porcentagem ? cte.porcentagem + '%' : '-'}</td>
                                <td class="text-center">${cte.mdfe || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="margin-top:20px; font-size:12px;">Total de registros: ${selectedCTEs.length}</p>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const handleEdit = (comprovante) => {
        setForm({
            numero_cte: comprovante.numero_cte || "",
            remetente: comprovante.remetente || "",
            destinatario: comprovante.destinatario || "",
            tomador: comprovante.tomador || "",
            tomador_id: comprovante.tomador_id || "",
            nfe: comprovante.nfe || "",
            valor_nf: comprovante.valor_nf || "",
            volume: comprovante.volume || "",
            peso: comprovante.peso || "",
            frete_peso: comprovante.frete_peso || "",
            coleta: comprovante.coleta || "",
            seguro: comprovante.seguro || "",
            pedagio: comprovante.pedagio || "",
            outros: comprovante.outros || "",
            valor_cobrado: comprovante.valor_cobrado || "",
            porcentagem: comprovante.porcentagem || "",
            mdfe: comprovante.mdfe || "",
            data: comprovante.data || format(new Date(), "yyyy-MM-dd"),
            arquivos: comprovante.arquivos || [],
            observacoes: comprovante.observacoes || "",
            status: comprovante.status || "pendente"
        });
        setEditing(comprovante);
        setShowForm(true);
    };

    const handleUploadFiles = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        const novosArquivos = [];

        for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            novosArquivos.push({
                nome: file.name,
                url: file_url,
                tipo: file.type
            });
        }

        setForm(prev => ({
            ...prev,
            arquivos: [...prev.arquivos, ...novosArquivos]
        }));
        setUploading(false);
    };

    const handleUploadComprovante = async (cte, files) => {
        setUploadingFile(true);
        const novosArquivos = [...(cte.arquivos || [])];

        for (const file of files) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            novosArquivos.push({
                nome: file.name,
                url: file_url,
                tipo: file.type
            });
        }

        await updateMutation.mutateAsync({
            id: cte.id,
            data: { arquivos: novosArquivos, status: "finalizado" }
        });

        setUploadingFile(false);
        setShowUploadDialog(false);
        setUploadingCTE(null);
    };

    const removeArquivo = (index) => {
        setForm(prev => ({
            ...prev,
            arquivos: prev.arquivos.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const handlePasteExtract = async () => {
        if (!pasteText.trim()) return;
        setExtracting(true);

        try {
            console.log("Texto colado:", pasteText);
            const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `Extraia os dados de CTEs do texto abaixo. O texto está em formato de tabela com colunas separadas por | ou espaços.

            IMPORTANTE - Mapeamento correto das colunas:
            - DATA: data do CTE (formato DD/MM/YYYY)
            - FORNECEDOR: nome do fornecedor/remetente (campo remetente)
            - CLIENTE: nome do cliente/destinatário (campo destinatario)
            - NFE: número da nota fiscal (campo nfe)
            - CTE: número do CTE (campo numero_cte)
            - VL NF ou VALOR NF: valor da nota fiscal (campo valor_nf)
            - VOL: quantidade de volumes (campo volume)
            - PESO: peso em KG (campo peso)
            - FRETE PESO: valor do frete peso (campo frete_peso)
            - COLETA: valor da coleta (campo coleta)
            - SEGURO: valor do seguro (campo seguro)
            - PEDÁGIO: valor do pedágio (campo pedagio)
            - OUTROS: outros valores (campo outros)
            - VL COBRADO ou VALOR COBRADO: valor cobrado (campo valor_cobrado)
            - %: porcentagem (campo porcentagem)
            - MDFE: número do MDFE (campo mdfe)

            Para cada linha do texto, extraia os valores correspondentes às colunas acima.

            Texto:
            ${pasteText}`,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            registros: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        data: { type: "string" },
                                        numero_cte: { type: "string" },
                                        remetente: { type: "string" },
                                        destinatario: { type: "string" },
                                        nfe: { type: "string" },
                                        volume: { type: "string" },
                                        peso: { type: "string" },
                                        valor_nf: { type: "string" },
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
                            }
                        }
                    }
                });

            console.log("Resultado LLM:", result);
            if (result?.registros && result.registros.length > 0) {
                setExtractedCTEs(result.registros.map((r, i) => ({ ...r, id: Date.now() + i, selected: true })));
                toast.success(`${result.registros.length} CTE(s) encontrado(s)!`);
            } else {
                toast.error("Nenhum CTE encontrado no texto");
            }
        } catch (error) {
            console.error("Erro ao extrair:", error);
            toast.error("Erro ao processar o texto");
        }

        setExtracting(false);
    };

    const handleSaveExtractedCTEs = async () => {
        const ctesToSave = extractedCTEs.filter(c => c.selected);
        if (ctesToSave.length === 0) {
            toast.error("Selecione ao menos um CTE");
            return;
        }

        setExtracting(true);
        try {
            for (const cte of ctesToSave) {
                console.log("Salvando CTE:", cte);
                await base44.entities.ComprovanteCTE.create({
                    numero_cte: cte.numero_cte || "",
                    remetente: cte.remetente || "",
                    destinatario: cte.destinatario || "",
                    nfe: cte.nfe || "",
                    volume: cte.volume || "",
                    peso: cte.peso || "",
                    valor_nf: cte.valor_nf || "",
                    frete_peso: cte.frete_peso || "",
                    coleta: cte.coleta || "",
                    seguro: cte.seguro || "",
                    pedagio: cte.pedagio || "",
                    outros: cte.outros || "",
                    valor_cobrado: cte.valor_cobrado || "",
                    porcentagem: cte.porcentagem || "",
                    mdfe: cte.mdfe || "",
                    data: format(new Date(), "yyyy-MM-dd"),
                    status: "pendente",
                    arquivos: []
                });
            }

            await queryClient.invalidateQueries({ queryKey: ["comprovantes-ctes"] });
            toast.success(`${ctesToSave.length} CTE(s) cadastrado(s)!`);
            setShowPasteDialog(false);
            setPasteText("");
            setExtractedCTEs([]);
        } catch (error) {
            console.error("Erro ao salvar CTEs:", error);
            toast.error("Erro ao salvar CTEs");
        }
        setExtracting(false);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        try {
            return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return dateStr;
        }
    };

    const toggleSelecionado = (id) => {
        setSelecionados(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selecionarTodos = () => {
        if (selecionados.length === filtered.length) {
            setSelecionados([]);
        } else {
            setSelecionados(filtered.map(c => c.id));
        }
    };

    const filtered = comprovantes.filter(c => {
        const matchData = !filterData || c.data === filterData;
        const matchAno = !filterAno || (c.data && c.data.startsWith(filterAno));
        const matchCTE = !filterCTE || 
            c.numero_cte?.toLowerCase().includes(filterCTE.toLowerCase()) ||
            c.nfe?.toLowerCase().includes(filterCTE.toLowerCase());
        const matchFornecedor = !filterFornecedor || 
            c.remetente?.toLowerCase().includes(filterFornecedor.toLowerCase());
        const matchCliente = !filterCliente || 
            c.destinatario?.toLowerCase().includes(filterCliente.toLowerCase());
        const matchStatus = !filterStatus || filterStatus === "all" || 
            (filterStatus === "pendente" && (!c.status || c.status === "pendente")) ||
            (filterStatus === "finalizado" && c.status === "finalizado") ||
            (filterStatus === "sem_comprovante" && (!c.arquivos || c.arquivos.length === 0));
        return matchData && matchAno && matchCTE && matchFornecedor && matchCliente && matchStatus;
    });

    // Anos disponíveis
    const anosDisponiveis = [...new Set(comprovantes.map(c => c.data?.substring(0, 4)).filter(Boolean))].sort((a, b) => b - a);

    const statusColors = {
        pendente: "bg-amber-100 text-amber-700",
        finalizado: "bg-emerald-100 text-emerald-700"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                            <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Comprovantes CTEs</h1>
                            <p className="text-slate-500">Gerencie comprovantes de CTEs</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button 
                            onClick={() => setShowTomadorDialog(true)}
                            variant="outline"
                            className="border-teal-500 text-teal-600 hover:bg-teal-50"
                        >
                            <Building2 className="w-4 h-4 mr-2" />
                            Cadastro Tomador
                        </Button>
                        <Button 
                            onClick={() => setShowStatusDialog(true)}
                            variant="outline"
                            className="border-blue-500 text-blue-600 hover:bg-blue-50"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Cadastro Status
                        </Button>
                        <Button 
                            onClick={() => setShowCalculadora(true)}
                            variant="outline"
                            className="border-green-500 text-green-600 hover:bg-green-50"
                        >
                            <Calculator className="w-4 h-4 mr-2" />
                            Calculadora
                        </Button>
                        <Button 
                            onClick={() => setShowImportador(true)}
                            variant="outline"
                            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Importar Arquivo
                        </Button>
                        <Button 
                            onClick={() => { setPasteText(""); setExtractedCTEs([]); setShowPasteDialog(true); }}
                            variant="outline"
                            className="border-purple-500 text-purple-600 hover:bg-purple-50"
                        >
                            <ClipboardPaste className="w-4 h-4 mr-2" />
                            Colar Texto
                        </Button>
                        <Button 
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="bg-gradient-to-r from-amber-500 to-orange-600 h-12 px-6"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Novo CTE
                        </Button>
                    </div>
                </div>

                {/* Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Package className="w-4 h-4" />
                                Total
                            </div>
                            <p className="text-2xl font-bold text-slate-700">{dashboard.total}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-amber-500 text-sm mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                Pendentes
                            </div>
                            <p className="text-2xl font-bold text-amber-600">{dashboard.pendentes}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
                                <FileText className="w-4 h-4" />
                                Sem Comprovante
                            </div>
                            <p className="text-2xl font-bold text-red-600">{dashboard.semComprovante}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-emerald-500 text-sm mb-1">
                                <CheckCircle className="w-4 h-4" />
                                Com Comprovante
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">{dashboard.comComprovante}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
                                <CheckCircle className="w-4 h-4" />
                                Finalizados
                            </div>
                            <p className="text-2xl font-bold text-blue-600">{dashboard.finalizados}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtros */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Ano
                                </Label>
                                <Select value={filterAno} onValueChange={setFilterAno}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os Anos</SelectItem>
                                        {anosDisponiveis.map(ano => (
                                            <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                                        ))}
                                        <SelectItem value="2024">2024</SelectItem>
                                        <SelectItem value="2023">2023</SelectItem>
                                        <SelectItem value="2022">2022</SelectItem>
                                        <SelectItem value="2021">2021</SelectItem>
                                        <SelectItem value="2020">2020</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Data
                                </Label>
                                <div className="flex gap-1">
                                    <Input
                                        type="date"
                                        value={filterData}
                                        onChange={(e) => setFilterData(e.target.value)}
                                        className="bg-white"
                                    />
                                    {filterData && (
                                        <Button variant="ghost" size="icon" onClick={() => setFilterData("")}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Search className="w-3 h-3" /> CTE/NFE
                                </Label>
                                <Input
                                    placeholder="Buscar CTE ou NFE..."
                                    value={filterCTE}
                                    onChange={(e) => setFilterCTE(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> Fornecedor
                                </Label>
                                <Input
                                    placeholder="Buscar fornecedor..."
                                    value={filterFornecedor}
                                    onChange={(e) => setFilterFornecedor(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" /> Cliente
                                </Label>
                                <Input
                                    placeholder="Buscar cliente..."
                                    value={filterCliente}
                                    onChange={(e) => setFilterCliente(e.target.value)}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Status</Label>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                        <SelectItem value="finalizado">Finalizado</SelectItem>
                                        <SelectItem value="sem_comprovante">Sem Comprovante</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end gap-2 flex-wrap">
                                <Button variant="outline" size="sm" onClick={selecionarTodos}>
                                    {selecionados.length === filtered.length && filtered.length > 0 ? "Desmarcar" : "Selecionar Tudo"}
                                </Button>
                                {selecionados.length > 0 && (
                                    <>
                                        <Button 
                                            variant="outline"
                                            className="border-blue-500 text-blue-600"
                                            onClick={handlePrint}
                                        >
                                            <Printer className="w-4 h-4 mr-1" />
                                            Imprimir ({selecionados.length})
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            className="border-orange-500 text-orange-600"
                                            onClick={() => setShowEditMassa(true)}
                                        >
                                            <Pencil className="w-4 h-4 mr-1" />
                                            Editar em Massa
                                        </Button>
                                        <Button 
                                            variant="destructive" 
                                            onClick={() => {
                                                if (confirm(`Excluir ${selecionados.length} CTE(s)?`)) {
                                                    bulkDeleteMutation.mutate(selecionados);
                                                }
                                            }}
                                            disabled={bulkDeleteMutation.isPending}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Excluir ({selecionados.length})
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabela */}
                <Card className="bg-white/90 border-0 shadow-lg overflow-hidden">
                    <CardContent className="p-0">
                        {/* Container com scroll horizontal e vertical */}
                        <div 
                            className="overflow-x-auto overflow-y-auto" 
                            style={{ 
                                maxHeight: '65vh',
                                scrollbarWidth: 'auto',
                                scrollbarColor: '#94a3b8 #e2e8f0'
                            }}
                        >
                            <Table style={{ minWidth: '2400px', tableLayout: 'fixed' }}>
                                <TableHeader className="sticky top-0 z-10">
                                    <TableRow className="bg-slate-700 hover:bg-slate-700">
                                        <TableHead style={{ width: '50px' }} className="text-white text-center">
                                            <Checkbox 
                                                checked={selecionados.length === filtered.length && filtered.length > 0}
                                                onCheckedChange={selecionarTodos}
                                            />
                                        </TableHead>
                                        <TableHead style={{ width: '95px' }} className="text-white font-bold text-xs">DATA</TableHead>
                                        <TableHead style={{ width: '180px' }} className="text-white font-bold text-xs">FORNECEDOR</TableHead>
                                        <TableHead style={{ width: '180px' }} className="text-white font-bold text-xs">CLIENTE</TableHead>
                                        <TableHead style={{ width: '100px' }} className="text-white font-bold text-xs text-center">NFE</TableHead>
                                        <TableHead style={{ width: '90px' }} className="text-white font-bold text-xs text-center">CTE</TableHead>
                                        <TableHead style={{ width: '110px' }} className="text-white font-bold text-xs text-center">VALOR NF</TableHead>
                                        <TableHead style={{ width: '60px' }} className="text-white font-bold text-xs text-center">VOL</TableHead>
                                        <TableHead style={{ width: '80px' }} className="text-white font-bold text-xs text-center">PESO</TableHead>
                                        <TableHead style={{ width: '100px' }} className="text-white font-bold text-xs text-center">FRETE/PESO</TableHead>
                                        <TableHead style={{ width: '90px' }} className="text-white font-bold text-xs text-center">COLETA</TableHead>
                                        <TableHead style={{ width: '90px' }} className="text-white font-bold text-xs text-center">SEGURO</TableHead>
                                        <TableHead style={{ width: '90px' }} className="text-white font-bold text-xs text-center">PEDÁGIO</TableHead>
                                        <TableHead style={{ width: '90px' }} className="text-white font-bold text-xs text-center">OUTROS</TableHead>
                                        <TableHead style={{ width: '100px' }} className="text-white font-bold text-xs text-center">TOTAL</TableHead>
                                        <TableHead style={{ width: '60px' }} className="text-white font-bold text-xs text-center">%</TableHead>
                                        <TableHead style={{ width: '100px' }} className="text-white font-bold text-xs text-center">MDFE</TableHead>
                                        <TableHead style={{ width: '120px' }} className="text-white font-bold text-xs text-center">STATUS</TableHead>
                                        <TableHead style={{ width: '130px' }} className="text-white font-bold text-xs text-center">AÇÕES</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={19} className="text-center py-12">
                                                <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={18} className="text-center py-12 text-slate-500">
                                                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                                Nenhum CTE encontrado
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((cte) => (
                                            <TableRow key={cte.id} className="border-b border-slate-200 hover:bg-slate-50">
                                                <TableCell className="text-center p-2">
                                                    <Checkbox 
                                                        checked={selecionados.includes(cte.id)}
                                                        onCheckedChange={() => toggleSelecionado(cte.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-xs p-2">
                                                    {formatDate(cte.data)}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-800 text-xs p-2 truncate" title={cte.remetente || cte.empresa}>
                                                    {cte.remetente || cte.empresa || "-"}
                                                </TableCell>
                                                <TableCell className="text-slate-600 text-xs p-2 truncate" title={cte.destinatario}>
                                                    {cte.destinatario || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2">
                                                    {cte.nfe || "-"}
                                                </TableCell>
                                                <TableCell className="text-center font-medium text-amber-600 text-xs p-2">
                                                    {cte.numero_cte || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2 font-medium">
                                                    {cte.valor_nf || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2">
                                                    {cte.volume || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2">
                                                    {cte.peso || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2">
                                                    {cte.frete_peso || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2">
                                                    {cte.coleta || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2">
                                                    {cte.seguro || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2">
                                                    {cte.pedagio || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2">
                                                    {cte.outros || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2 font-medium text-green-600">
                                                    {cte.valor_cobrado || "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2">
                                                    {cte.porcentagem ? `${cte.porcentagem}%` : "-"}
                                                </TableCell>
                                                <TableCell className="text-center text-xs p-2">
                                                    {cte.mdfe || "-"}
                                                </TableCell>
                                                <TableCell className="text-center p-2">
                                                    <Select 
                                                        value={cte.status || "pendente"} 
                                                        onValueChange={(v) => updateMutation.mutate({ id: cte.id, data: { status: v } })}
                                                    >
                                                        <SelectTrigger className={`h-6 w-full text-xs ${getStatusColor(cte.status)}`}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {statusList.length > 0 ? (
                                                                statusList.map(s => (
                                                                    <SelectItem key={s.id} value={s.nome}>
                                                                        <span className={`px-2 py-0.5 rounded ${s.cor}`}>{s.nome}</span>
                                                                    </SelectItem>
                                                                ))
                                                            ) : (
                                                                <>
                                                                    <SelectItem value="pendente">Pendente</SelectItem>
                                                                    <SelectItem value="finalizado">Finalizado</SelectItem>
                                                                </>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <div className="flex justify-center gap-1">
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon"
                                                            className="h-6 w-6 border-amber-500 text-amber-600 hover:bg-amber-50"
                                                            onClick={() => {
                                                                setUploadingCTE(cte);
                                                                setShowUploadDialog(true);
                                                            }}
                                                        >
                                                            <Upload className="w-3 h-3" />
                                                        </Button>
                                                        {cte.arquivos?.length > 0 && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => setViewFiles(cte.arquivos)}
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(cte)}>
                                                            <Pencil className="w-3 h-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                                            if (confirm("Excluir este CTE?")) deleteMutation.mutate(cte.id);
                                                        }}>
                                                            <Trash2 className="w-3 h-3 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {viewFiles && (
                <FlipbookViewer files={viewFiles} onClose={() => setViewFiles(null)} />
            )}

            {/* Importador de Arquivos */}
            <ImportadorCTE 
                open={showImportador} 
                onClose={() => setShowImportador(false)}
                onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["comprovantes-ctes"] })}
            />

            {/* Scanner Camera */}
            {showScanner && (
                <ScannerCamera
                    onCapture={async (file) => {
                        const { file_url } = await base44.integrations.Core.UploadFile({ file });
                        if (scannerTarget === 'form') {
                            setForm(prev => ({
                                ...prev,
                                arquivos: [...prev.arquivos, { nome: file.name, url: file_url, tipo: file.type }]
                            }));
                        } else if (scannerTarget === 'upload' && uploadingCTE) {
                            const novosArquivos = [...(uploadingCTE.arquivos || []), { nome: file.name, url: file_url, tipo: file.type }];
                            await updateMutation.mutateAsync({
                                id: uploadingCTE.id,
                                data: { arquivos: novosArquivos, status: "finalizado" }
                            });
                            setShowUploadDialog(false);
                            setUploadingCTE(null);
                        }
                        setShowScanner(false);
                        toast.success("Foto capturada!");
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Dialog Upload Comprovante */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5 text-amber-600" />
                            Upload de Comprovante
                        </DialogTitle>
                    </DialogHeader>
                    {uploadingCTE && (
                        <div className="space-y-4">
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <p className="font-semibold text-amber-800">CTE: {uploadingCTE.numero_cte || uploadingCTE.nfe}</p>
                                <p className="text-sm text-amber-600">{uploadingCTE.remetente} → {uploadingCTE.destinatario}</p>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1 border-2 border-dashed border-amber-300 rounded-lg p-6 text-center hover:border-amber-500 transition-colors">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files);
                                            if (files.length > 0) {
                                                handleUploadComprovante(uploadingCTE, files);
                                            }
                                        }}
                                        className="hidden"
                                        id="upload-comprovante"
                                    />
                                    <label htmlFor="upload-comprovante" className="cursor-pointer">
                                        {uploadingFile ? (
                                            <Loader2 className="w-8 h-8 mx-auto text-amber-500 animate-spin" />
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 mx-auto text-amber-400" />
                                                <span className="text-sm text-amber-600 block mt-2">Selecionar Arquivo</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                <div 
                                    className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center hover:border-amber-500 transition-colors cursor-pointer"
                                    onClick={() => { setScannerTarget('upload'); setShowScanner(true); }}
                                >
                                    <Camera className="w-8 h-8 mx-auto text-amber-400" />
                                    <span className="text-sm text-amber-600 block mt-2">Scanner</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog Colar Texto */}
            <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardPaste className="w-5 h-5 text-purple-600" />
                            Colar Texto para Cadastro Automático
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Cole o texto com os dados dos CTEs</Label>
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-2">
                                <p className="font-semibold mb-1">Formato esperado das colunas:</p>
                                <p>DATA | FORNECEDOR | CLIENTE | NFE | CTE | VL NF | VOL | PESO | FRETE PESO | COLETA | SEGURO | PEDÁGIO | OUTROS | VL COBRADO | % | MDFE</p>
                            </div>
                            <Textarea
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                rows={6}
                                placeholder="Cole aqui o texto copiado da planilha ou tabela..."
                                className="font-mono text-sm"
                            />
                        </div>

                        <Button 
                            onClick={handlePasteExtract}
                            disabled={extracting || !pasteText.trim()}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                            {extracting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Extraindo...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4 mr-2" />
                                    Extrair CTEs
                                </>
                            )}
                        </Button>

                        {extractedCTEs.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">CTEs Encontrados ({extractedCTEs.length})</h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {extractedCTEs.map((cte, index) => (
                                        <div 
                                            key={cte.id}
                                            className={`p-3 rounded-lg border-2 ${cte.selected ? "border-purple-500 bg-purple-50" : "border-slate-200 bg-slate-50"}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Checkbox 
                                                    checked={cte.selected}
                                                    onCheckedChange={(checked) => {
                                                        const novos = [...extractedCTEs];
                                                        novos[index].selected = checked;
                                                        setExtractedCTEs(novos);
                                                    }}
                                                />
                                                <div className="flex-1 text-xs">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-indigo-700">CTE: {cte.numero_cte || "-"}</span>
                                                        <span className="text-slate-500">NFE: {cte.nfe || "-"}</span>
                                                    </div>
                                                    <p className="text-slate-600">
                                                        <strong>Forn:</strong> {cte.remetente || "-"} → <strong>Cli:</strong> {cte.destinatario || "-"}
                                                    </p>
                                                    <div className="grid grid-cols-4 gap-1 mt-1 text-slate-500">
                                                        <span>Vol: {cte.volume || "-"}</span>
                                                        <span>Peso: {cte.peso || "-"}</span>
                                                        <span>VlNF: {cte.valor_nf || "-"}</span>
                                                        <span>VlCob: {cte.valor_cobrado || "-"}</span>
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-1 mt-1 text-slate-400">
                                                        <span>FrtPeso: {cte.frete_peso || "-"}</span>
                                                        <span>Coleta: {cte.coleta || "-"}</span>
                                                        <span>Seguro: {cte.seguro || "-"}</span>
                                                        <span>Pedág: {cte.pedagio || "-"}</span>
                                                        <span>MDFE: {cte.mdfe || "-"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button 
                                    onClick={handleSaveExtractedCTEs}
                                    disabled={extracting || extractedCTEs.filter(c => c.selected).length === 0}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {extracting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Salvar {extractedCTEs.filter(c => c.selected).length} CTE(s)
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Cadastro de Status */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                            Cadastro de Status
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Lista de status cadastrados */}
                        {statusList.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                <Label className="text-xs text-slate-500">Status Cadastrados</Label>
                                {statusList.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Badge className={s.cor}>{s.nome}</Badge>
                                            <span className="text-xs text-slate-400">Ordem: {s.ordem}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => { 
                                                    setStatusForm({ nome: s.nome, cor: s.cor, ordem: s.ordem || 0 }); 
                                                    setEditingStatus(s); 
                                                }}
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => { if(confirm("Excluir este status?")) deleteStatusMutation.mutate(s.id); }}
                                            >
                                                <Trash2 className="w-3 h-3 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Formulário */}
                        <div className="border-t pt-4 space-y-4">
                            <h4 className="font-medium text-sm">{editingStatus ? "Editar Status" : "Novo Status"}</h4>
                            <div className="space-y-2">
                                <Label>Nome do Status *</Label>
                                <Input
                                    value={statusForm.nome}
                                    onChange={(e) => setStatusForm({ ...statusForm, nome: e.target.value })}
                                    placeholder="Ex: Pendente, Finalizado, Em análise..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cor</Label>
                                <Select value={statusForm.cor} onValueChange={(v) => setStatusForm({ ...statusForm, cor: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bg-gray-100 text-gray-700">
                                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">Cinza</span>
                                        </SelectItem>
                                        <SelectItem value="bg-amber-100 text-amber-700">
                                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">Amarelo</span>
                                        </SelectItem>
                                        <SelectItem value="bg-emerald-100 text-emerald-700">
                                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Verde</span>
                                        </SelectItem>
                                        <SelectItem value="bg-blue-100 text-blue-700">
                                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">Azul</span>
                                        </SelectItem>
                                        <SelectItem value="bg-red-100 text-red-700">
                                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">Vermelho</span>
                                        </SelectItem>
                                        <SelectItem value="bg-purple-100 text-purple-700">
                                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700">Roxo</span>
                                        </SelectItem>
                                        <SelectItem value="bg-orange-100 text-orange-700">
                                            <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700">Laranja</span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Ordem</Label>
                                <Input
                                    type="number"
                                    value={statusForm.ordem}
                                    onChange={(e) => setStatusForm({ ...statusForm, ordem: parseInt(e.target.value) || 0 })}
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                {editingStatus && (
                                    <Button variant="ghost" onClick={() => { setEditingStatus(null); setStatusForm({ nome: "", cor: "bg-gray-100 text-gray-700", ordem: 0 }); }}>
                                        Cancelar
                                    </Button>
                                )}
                                <Button 
                                    onClick={() => {
                                        if (editingStatus) {
                                            updateStatusMutation.mutate({ id: editingStatus.id, data: statusForm });
                                        } else {
                                            createStatusMutation.mutate(statusForm);
                                        }
                                    }}
                                    disabled={!statusForm.nome}
                                    className="bg-blue-500 hover:bg-blue-600"
                                >
                                    <Save className="w-4 h-4 mr-1" />
                                    {editingStatus ? "Atualizar" : "Cadastrar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Editar em Massa */}
            <Dialog open={showEditMassa} onOpenChange={setShowEditMassa}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-orange-600" />
                            Editar em Massa ({selecionados.length} selecionados)
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Campo a Editar</Label>
                            <Select value={editMassaField} onValueChange={setEditMassaField}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o campo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="remetente">Fornecedor</SelectItem>
                                    <SelectItem value="destinatario">Cliente</SelectItem>
                                    <SelectItem value="tomador">Tomador</SelectItem>
                                    <SelectItem value="frete_peso">Frete Peso</SelectItem>
                                    <SelectItem value="coleta">Coleta</SelectItem>
                                    <SelectItem value="seguro">Seguro</SelectItem>
                                    <SelectItem value="pedagio">Pedágio</SelectItem>
                                    <SelectItem value="outros">Outros</SelectItem>
                                    <SelectItem value="valor_cobrado">Valor Cobrado</SelectItem>
                                    <SelectItem value="porcentagem">Porcentagem</SelectItem>
                                    <SelectItem value="mdfe">MDFE</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {editMassaField && (
                            <div className="space-y-2">
                                <Label>Novo Valor</Label>
                                {editMassaField === "status" ? (
                                    <Select value={editMassaValue} onValueChange={setEditMassaValue}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusList.length > 0 ? (
                                                statusList.map(s => (
                                                    <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                                                ))
                                            ) : (
                                                <>
                                                    <SelectItem value="pendente">Pendente</SelectItem>
                                                    <SelectItem value="finalizado">Finalizado</SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                ) : editMassaField === "tomador" ? (
                                    <Select value={editMassaValue} onValueChange={setEditMassaValue}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tomador..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tomadores.map(t => (
                                                <SelectItem key={t.id} value={t.nome}>{t.nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        value={editMassaValue}
                                        onChange={(e) => setEditMassaValue(e.target.value)}
                                        placeholder="Digite o valor..."
                                    />
                                )}
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowEditMassa(false)}>
                                Cancelar
                            </Button>
                            <Button 
                                onClick={() => bulkEditMutation.mutate({ ids: selecionados, field: editMassaField, value: editMassaValue })}
                                disabled={!editMassaField || !editMassaValue || bulkEditMutation.isPending}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                {bulkEditMutation.isPending ? "Salvando..." : "Aplicar"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Cadastro Tomador */}
            <Dialog open={showTomadorDialog} onOpenChange={setShowTomadorDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-teal-600" />
                            Cadastro de Tomadores
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {tomadores.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                <Label className="text-xs text-slate-500">Tomadores Cadastrados</Label>
                                {tomadores.map(t => (
                                    <div key={t.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">{t.nome}</p>
                                            <p className="text-xs text-slate-500">{t.cnpj} {t.cidade && `- ${t.cidade}/${t.uf}`}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => { 
                                                    setTomadorForm({ nome: t.nome, cnpj: t.cnpj || "", endereco: t.endereco || "", cidade: t.cidade || "", uf: t.uf || "", telefone: t.telefone || "" }); 
                                                    setEditingTomador(t); 
                                                }}
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7"
                                                onClick={() => { if(confirm("Excluir este tomador?")) deleteTomadorMutation.mutate(t.id); }}
                                            >
                                                <Trash2 className="w-3 h-3 text-red-600" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="border-t pt-4 space-y-4">
                            <h4 className="font-medium text-sm">{editingTomador ? "Editar Tomador" : "Novo Tomador"}</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Nome *</Label>
                                    <Input
                                        value={tomadorForm.nome}
                                        onChange={(e) => setTomadorForm({ ...tomadorForm, nome: e.target.value })}
                                        placeholder="Nome do tomador"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">CNPJ</Label>
                                    <Input
                                        value={tomadorForm.cnpj}
                                        onChange={(e) => setTomadorForm({ ...tomadorForm, cnpj: e.target.value })}
                                        placeholder="00.000.000/0000-00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Telefone</Label>
                                    <Input
                                        value={tomadorForm.telefone}
                                        onChange={(e) => setTomadorForm({ ...tomadorForm, telefone: e.target.value })}
                                        placeholder="(00) 0000-0000"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-xs">Endereço</Label>
                                    <Input
                                        value={tomadorForm.endereco}
                                        onChange={(e) => setTomadorForm({ ...tomadorForm, endereco: e.target.value })}
                                        placeholder="Endereço completo"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Cidade</Label>
                                    <Input
                                        value={tomadorForm.cidade}
                                        onChange={(e) => setTomadorForm({ ...tomadorForm, cidade: e.target.value })}
                                        placeholder="Cidade"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">UF</Label>
                                    <Input
                                        value={tomadorForm.uf}
                                        onChange={(e) => setTomadorForm({ ...tomadorForm, uf: e.target.value })}
                                        placeholder="SP"
                                        maxLength={2}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                {editingTomador && (
                                    <Button variant="ghost" onClick={() => { setEditingTomador(null); setTomadorForm({ nome: "", cnpj: "", endereco: "", cidade: "", uf: "", telefone: "" }); }}>
                                        Cancelar
                                    </Button>
                                )}
                                <Button 
                                    onClick={() => {
                                        if (editingTomador) {
                                            updateTomadorMutation.mutate({ id: editingTomador.id, data: tomadorForm });
                                        } else {
                                            createTomadorMutation.mutate(tomadorForm);
                                        }
                                    }}
                                    disabled={!tomadorForm.nome}
                                    className="bg-teal-500 hover:bg-teal-600"
                                >
                                    <Save className="w-4 h-4 mr-1" />
                                    {editingTomador ? "Atualizar" : "Cadastrar"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Calculadora */}
            <Dialog open={showCalculadora} onOpenChange={setShowCalculadora}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-green-600" />
                            Calculadora
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            value={calcInput}
                            onChange={(e) => setCalcInput(e.target.value)}
                            placeholder="Digite a expressão (ex: 100+50*2)"
                            className="text-lg font-mono"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    try {
                                        const result = eval(calcInput.replace(/,/g, "."));
                                        setCalcResult(String(result));
                                    } catch {
                                        setCalcResult("Erro");
                                    }
                                }
                            }}
                        />
                        {calcResult && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-sm text-green-600 mb-1">Resultado:</p>
                                <p className="text-2xl font-bold text-green-700">{calcResult}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-4 gap-2">
                            {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"].map(btn => (
                                <Button
                                    key={btn}
                                    variant={btn === "=" ? "default" : "outline"}
                                    className={btn === "=" ? "bg-green-500 hover:bg-green-600" : ""}
                                    onClick={() => {
                                        if (btn === "=") {
                                            try {
                                                const result = eval(calcInput.replace(/,/g, "."));
                                                setCalcResult(String(result));
                                            } catch {
                                                setCalcResult("Erro");
                                            }
                                        } else {
                                            setCalcInput(prev => prev + btn);
                                        }
                                    }}
                                >
                                    {btn}
                                </Button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => { setCalcInput(""); setCalcResult(""); }}>
                                Limpar
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={() => setCalcInput(prev => prev.slice(0, -1))}>
                                ← Apagar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-600" />
                            {editing ? "Editar CTE" : "Novo CTE"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    value={form.data}
                                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Fornecedor</Label>
                                <Input
                                    value={form.remetente}
                                    onChange={(e) => setForm({ ...form, remetente: e.target.value })}
                                    placeholder="Nome do fornecedor"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cliente</Label>
                                <Input
                                    value={form.destinatario}
                                    onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                                    placeholder="Nome do cliente"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tomador</Label>
                                <Select 
                                    value={form.tomador_id} 
                                    onValueChange={(v) => {
                                        const tomador = tomadores.find(t => t.id === v);
                                        setForm({ ...form, tomador_id: v, tomador: tomador?.nome || "" });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tomador..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tomadores.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>NFE</Label>
                                <Input
                                    value={form.nfe}
                                    onChange={(e) => setForm({ ...form, nfe: e.target.value })}
                                    placeholder="Número NFe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>CTE</Label>
                                <Input
                                    value={form.numero_cte}
                                    onChange={(e) => setForm({ ...form, numero_cte: e.target.value })}
                                    placeholder="Número do CTE"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor NF (R$)</Label>
                                <Input
                                    value={form.valor_nf}
                                    onChange={(e) => setForm({ ...form, valor_nf: e.target.value })}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>VOL</Label>
                                <Input
                                    value={form.volume}
                                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                                    placeholder="Volumes"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label>Peso (KG)</Label>
                                <Input
                                    value={form.peso}
                                    onChange={(e) => setForm({ ...form, peso: e.target.value })}
                                    placeholder="Peso em KG"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Frete Peso</Label>
                                <Input
                                    value={form.frete_peso}
                                    onChange={(e) => setForm({ ...form, frete_peso: e.target.value })}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Coleta</Label>
                                <Input
                                    value={form.coleta}
                                    onChange={(e) => setForm({ ...form, coleta: e.target.value })}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Seguro</Label>
                                <Input
                                    value={form.seguro}
                                    onChange={(e) => setForm({ ...form, seguro: e.target.value })}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Pedágio</Label>
                                <Input
                                    value={form.pedagio}
                                    onChange={(e) => setForm({ ...form, pedagio: e.target.value })}
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Outros</Label>
                                <Input
                                    value={form.outros}
                                    onChange={(e) => setForm({ ...form, outros: e.target.value })}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Valor Cobrado</Label>
                                <Input
                                    value={form.valor_cobrado}
                                    onChange={(e) => setForm({ ...form, valor_cobrado: e.target.value })}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>% (Porcentagem)</Label>
                                <Input
                                    value={form.porcentagem}
                                    onChange={(e) => setForm({ ...form, porcentagem: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>MDFE</Label>
                                <Input
                                    value={form.mdfe}
                                    onChange={(e) => setForm({ ...form, mdfe: e.target.value })}
                                    placeholder="Número MDFE"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusList.length > 0 ? (
                                            statusList.map(s => (
                                                <SelectItem key={s.id} value={s.nome}>
                                                    <span className={`px-2 py-0.5 rounded ${s.cor}`}>{s.nome}</span>
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <>
                                                <SelectItem value="pendente">Pendente</SelectItem>
                                                <SelectItem value="finalizado">Finalizado</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Arquivos/Comprovantes</Label>
                            <div className="flex gap-2">
                                <div className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-amber-500 transition-colors">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf"
                                        onChange={handleUploadFiles}
                                        className="hidden"
                                        id="file-upload-cte"
                                    />
                                    <label htmlFor="file-upload-cte" className="cursor-pointer">
                                        {uploading ? (
                                            <Loader2 className="w-8 h-8 mx-auto text-amber-500 animate-spin" />
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 mx-auto text-slate-400" />
                                                <span className="text-sm text-slate-600">Adicionar</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                <div 
                                    className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-amber-500 transition-colors cursor-pointer"
                                    onClick={() => { setScannerTarget('form'); setShowScanner(true); }}
                                >
                                    <Camera className="w-8 h-8 mx-auto text-slate-400" />
                                    <span className="text-sm text-slate-600">Scanner</span>
                                </div>
                            </div>

                            {form.arquivos.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {form.arquivos.map((arq, index) => (
                                        <div key={index} className="relative">
                                            {arq.tipo?.startsWith("image/") ? (
                                                <img src={arq.url} alt="" className="w-16 h-16 object-cover rounded" />
                                            ) : (
                                                <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center">
                                                    <File className="w-6 h-6 text-slate-500" />
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeArquivo(index)}
                                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={form.observacoes}
                                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                                rows={2}
                                placeholder="Observações..."
                            />
                        </div>

                        <Button type="submit" className="w-full h-12 text-lg bg-amber-600 hover:bg-amber-700">
                            <Save className="w-5 h-5 mr-2" />
                            {editing ? "Salvar Alterações" : "Cadastrar CTE"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}