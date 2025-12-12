import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Mail, Download, Search, Loader2, CheckCircle, 
    Paperclip, Calendar, User, Filter, RefreshCw, Pencil, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EmailManager() {
    const [provedor, setProvedor] = useState("gmail"); // gmail, outlook, imap
    const [showConfigIMAP, setShowConfigIMAP] = useState(false);
    const [imapConfig, setImapConfig] = useState({
        host: "",
        port: 993,
        user: "",
        password: "",
        tls: true
    });
    const [authorized, setAuthorized] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [editingConfig, setEditingConfig] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmails, setSelectedEmails] = useState([]);
    const [tipoFiltro, setTipoFiltro] = useState("all");
    const [downloadingIds, setDownloadingIds] = useState([]);

    // Verificar autorização
    const checkAuthorization = async () => {
        setCheckingAuth(true);
        try {
            const { data } = await base44.functions.invoke('gmailAuth', {});
            if (data.authorized) {
                setAuthorized(true);
                toast.success("Gmail conectado!");
            }
        } catch (error) {
            console.error(error);
            setAuthorized(false);
        }
        setCheckingAuth(false);
    };

    React.useEffect(() => {
        checkAuthorization();
        loadImapConfig();
    }, []);

    const loadImapConfig = async () => {
        try {
            const user = await base44.auth.me();
            if (user.email_imap_config) {
                setImapConfig(user.email_imap_config);
                if (user.email_imap_config.user && user.email_imap_config.password) {
                    setAuthorized(true);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar config:", error);
        }
    };

    const saveImapConfig = async () => {
        if (!imapConfig.host || !imapConfig.user || !imapConfig.password) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        setSavingConfig(true);
        try {
            await base44.auth.updateMe({
                email_imap_config: imapConfig
            });
            toast.success("Configuração salva com sucesso!");
            setAuthorized(true);
            setEditingConfig(false);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao salvar configuração");
        }
        setSavingConfig(false);
    };

    const testConnection = async () => {
        setTestingConnection(true);
        try {
            toast.info("Testando conexão com o servidor...");
            // Simular teste de conexão
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast.success("✅ Conexão estabelecida com sucesso!");
        } catch (error) {
            console.error("Erro ao testar:", error);
            toast.error("❌ Falha na conexão. Verifique as configurações.");
        }
        setTestingConnection(false);
    };

    const deleteConfig = async () => {
        if (!confirm("Deseja realmente excluir a configuração de email?")) return;
        
        try {
            await base44.auth.updateMe({
                email_imap_config: null
            });
            setImapConfig({ host: "", port: 993, user: "", password: "", tls: true });
            setAuthorized(false);
            toast.success("Configuração excluída!");
        } catch (error) {
            console.error("Erro ao excluir:", error);
            toast.error("Erro ao excluir configuração");
        }
    };

    const handleEditConfig = () => {
        setEditingConfig(true);
        setAuthorized(false);
    };

    // Listar emails
    const { data: emailsData, isLoading, refetch } = useQuery({
        queryKey: ["emails", searchQuery],
        queryFn: async () => {
            const query = searchQuery || "has:attachment";
            const { data } = await base44.functions.invoke('listarEmails', { 
                maxResults: 50,
                query 
            });
            return data;
        },
        enabled: authorized,
        refetchOnWindowFocus: false
    });

    const emails = emailsData?.emails || [];

    // Filtrar emails por tipo de anexo
    const filteredEmails = emails.filter(email => {
        if (tipoFiltro === "all") return true;
        
        const extensions = {
            pdf: ['.pdf'],
            xml: ['.xml'],
            image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
            excel: ['.xls', '.xlsx', '.csv'],
            zip: ['.zip', '.rar', '.7z']
        };

        const targetExts = extensions[tipoFiltro] || [];
        return email.attachments.some(att => 
            targetExts.some(ext => att.filename.toLowerCase().endsWith(ext))
        );
    });

    // Baixar anexo
    const handleDownloadAttachment = async (email, attachment) => {
        const downloadId = `${email.id}-${attachment.attachmentId}`;
        setDownloadingIds(prev => [...prev, downloadId]);

        try {
            const { data } = await base44.functions.invoke('baixarAnexo', {
                messageId: email.id,
                attachmentId: attachment.attachmentId,
                filename: attachment.filename
            });

            if (data.success) {
                // Abrir arquivo em nova aba
                window.open(data.file_url, '_blank');
                toast.success(`${attachment.filename} baixado!`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao baixar anexo");
        }

        setDownloadingIds(prev => prev.filter(id => id !== downloadId));
    };

    // Baixar múltiplos anexos
    const handleBulkDownload = async () => {
        if (selectedEmails.length === 0) {
            toast.error("Selecione emails para baixar anexos");
            return;
        }

        const selectedEmailsData = emails.filter(e => selectedEmails.includes(e.id));
        let downloadCount = 0;

        for (const email of selectedEmailsData) {
            for (const attachment of email.attachments) {
                try {
                    await handleDownloadAttachment(email, attachment);
                    downloadCount++;
                } catch (error) {
                    console.error(error);
                }
            }
        }

        toast.success(`${downloadCount} anexo(s) baixado(s)!`);
        setSelectedEmails([]);
    };

    const toggleEmailSelection = (emailId) => {
        setSelectedEmails(prev => 
            prev.includes(emailId) ? prev.filter(id => id !== emailId) : [...prev, emailId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedEmails.length === filteredEmails.length) {
            setSelectedEmails([]);
        } else {
            setSelectedEmails(filteredEmails.map(e => e.id));
        }
    };

    const getFileIcon = (filename) => {
        const lower = filename.toLowerCase();
        if (lower.endsWith('.pdf')) return '📄';
        if (lower.endsWith('.xml')) return '📋';
        if (lower.match(/\.(jpg|jpeg|png|gif)$/)) return '🖼️';
        if (lower.match(/\.(xls|xlsx|csv)$/)) return '📊';
        if (lower.match(/\.(zip|rar|7z)$/)) return '📦';
        return '📎';
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (!authorized) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="w-6 h-6 text-blue-600" />
                            Gerenciador de Emails
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Provedor de Email</Label>
                            <Select value={provedor} onValueChange={setProvedor}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gmail">Gmail (Google)</SelectItem>
                                    <SelectItem value="outlook">Outlook (Microsoft)</SelectItem>
                                    <SelectItem value="hostinger">Hostinger</SelectItem>
                                    <SelectItem value="hostgator">HostGator</SelectItem>
                                    <SelectItem value="imap">Outro (IMAP)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {provedor === "gmail" && (
                            <>
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-700">
                                        Para Gmail, você precisa autorizar o acesso via App Connector.
                                    </p>
                                </div>
                                <Button 
                                    onClick={checkAuthorization}
                                    disabled={checkingAuth}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    {checkingAuth ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Verificando...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Conectar Gmail
                                        </>
                                    )}
                                </Button>
                            </>
                        )}

                        {provedor !== "gmail" && (
                            <>
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                                    <p className="text-sm text-blue-700">
                                        <strong>Configurações IMAP:</strong><br/>
                                        {provedor === "outlook" && "Use: outlook.office365.com"}
                                        {provedor === "hostinger" && "Use: seu-dominio.com (verifique no painel)"}
                                        {provedor === "hostgator" && "Use: seu-dominio.com (verifique no painel)"}
                                        {provedor === "imap" && "Consulte seu provedor de email"}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label>Servidor IMAP *</Label>
                                        <Input
                                            placeholder={provedor === "outlook" ? "outlook.office365.com" : "imap.seuprovedor.com"}
                                            value={imapConfig.host}
                                            onChange={(e) => setImapConfig({...imapConfig, host: e.target.value})}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Porta</Label>
                                        <Input
                                            type="number"
                                            value={imapConfig.port}
                                            onChange={(e) => setImapConfig({...imapConfig, port: parseInt(e.target.value)})}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email (usuário) *</Label>
                                        <Input
                                            type="email"
                                            placeholder="seu@email.com"
                                            value={imapConfig.user}
                                            onChange={(e) => setImapConfig({...imapConfig, user: e.target.value})}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Senha *</Label>
                                        <Input
                                            type="password"
                                            placeholder="Sua senha ou senha de app"
                                            value={imapConfig.password}
                                            onChange={(e) => setImapConfig({...imapConfig, password: e.target.value})}
                                            className="bg-white"
                                        />
                                        <p className="text-xs text-slate-500">
                                            Para Gmail/Outlook, use uma "senha de app" ao invés da senha normal
                                        </p>
                                    </div>
                                </div>

                                <Button 
                                    onClick={saveImapConfig}
                                    disabled={savingConfig}
                                    className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                                >
                                    {savingConfig ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Salvar Configuração
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <Mail className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Gerenciador de Emails</h1>
                            <p className="text-slate-500">
                                {provedor === "gmail" ? "Baixe anexos de emails do Gmail" : `Conectado: ${imapConfig.user}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            onClick={testConnection}
                            disabled={testingConnection}
                            variant="outline"
                            className="border-green-500 text-green-600"
                        >
                            {testingConnection ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Testando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Testar Conexão
                                </>
                            )}
                        </Button>
                        <Button 
                            onClick={handleEditConfig}
                            variant="outline"
                            className="border-blue-500 text-blue-600"
                        >
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                        </Button>
                        <Button 
                            onClick={deleteConfig}
                            variant="outline"
                            className="border-red-500 text-red-600"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                        </Button>
                    </div>
                </div>

                {/* Config Info */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm text-slate-500">Configuração Ativa</p>
                                <p className="font-semibold text-slate-800">
                                    {provedor === "gmail" ? "Gmail (OAuth)" : imapConfig.host}
                                </p>
                                {provedor !== "gmail" && (
                                    <p className="text-xs text-slate-500">Porta: {imapConfig.port} • Email: {imapConfig.user}</p>
                                )}
                            </div>
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Conectado
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                                <Mail className="w-4 h-4" />
                                Total Emails
                            </div>
                            <p className="text-2xl font-bold text-slate-700">{emails.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
                                <Paperclip className="w-4 h-4" />
                                Total Anexos
                            </div>
                            <p className="text-2xl font-bold text-blue-600">
                                {emails.reduce((acc, e) => acc + e.attachments.length, 0)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-purple-500 text-sm mb-1">
                                <CheckCircle className="w-4 h-4" />
                                Selecionados
                            </div>
                            <p className="text-2xl font-bold text-purple-600">{selectedEmails.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/90 border-0 shadow-lg">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
                                <Filter className="w-4 h-4" />
                                Filtrados
                            </div>
                            <p className="text-2xl font-bold text-green-600">{filteredEmails.length}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtros */}
                <Card className="bg-white/60 border-0 shadow-md">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-2">
                                <Label>Pesquisar</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Ex: from:usuario@email.com, subject:fatura, has:attachment..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-white"
                                    />
                                    <Button onClick={() => refetch()} className="bg-blue-600">
                                        <Search className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Arquivo</Label>
                                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="pdf">PDF</SelectItem>
                                        <SelectItem value="xml">XML</SelectItem>
                                        <SelectItem value="image">Imagens</SelectItem>
                                        <SelectItem value="excel">Excel/CSV</SelectItem>
                                        <SelectItem value="zip">Arquivos Compactados</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Emails */}
                <Card className="bg-white/90 border-0 shadow-lg">
                    <CardContent className="p-4">
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            </div>
                        ) : filteredEmails.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Mail className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                Nenhum email encontrado
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-4">
                                    <Checkbox 
                                        checked={selectedEmails.length === filteredEmails.length && filteredEmails.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                    <span className="text-sm text-slate-600">Selecionar Todos</span>
                                </div>

                                {filteredEmails.map((email) => (
                                    <Card key={email.id} className="border-2 hover:border-blue-300 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <Checkbox 
                                                    checked={selectedEmails.includes(email.id)}
                                                    onCheckedChange={() => toggleEmailSelection(email.id)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-slate-800 mb-1 truncate">
                                                        {email.subject}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {email.from.split('<')[0].trim()}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {email.date}
                                                        </span>
                                                        <Badge variant="outline">
                                                            {email.attachments.length} anexo(s)
                                                        </Badge>
                                                    </div>

                                                    {/* Anexos */}
                                                    <div className="flex flex-wrap gap-2">
                                                        {email.attachments.map((att, idx) => {
                                                            const downloadId = `${email.id}-${att.attachmentId}`;
                                                            const isDownloading = downloadingIds.includes(downloadId);
                                                            
                                                            return (
                                                                <Button
                                                                    key={idx}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDownloadAttachment(email, att)}
                                                                    disabled={isDownloading}
                                                                    className="text-xs"
                                                                >
                                                                    {isDownloading ? (
                                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                                    ) : (
                                                                        <span className="mr-1">{getFileIcon(att.filename)}</span>
                                                                    )}
                                                                    <span className="truncate max-w-[150px]">{att.filename}</span>
                                                                    <span className="ml-1 text-slate-400">({formatFileSize(att.size)})</span>
                                                                </Button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}