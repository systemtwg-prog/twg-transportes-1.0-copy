import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.email_imap_config) {
            return Response.json({ error: 'Configuração IMAP não encontrada' }, { status: 401 });
        }

        const { host, port, user: emailUser, password, encryption } = user.email_imap_config;
        const { maxResults = 50 } = await req.json();

        // Simulação de listagem IMAP - em produção usar biblioteca IMAP real
        // Por enquanto, retornar estrutura vazia
        return Response.json({
            emails: [],
            message: "Listagem IMAP em desenvolvimento. Use Gmail OAuth para funcionamento completo."
        });

    } catch (error) {
        console.error('Erro ao listar emails IMAP:', error);
        return Response.json({ 
            error: 'Erro ao listar emails',
            details: error.message 
        }, { status: 500 });
    }
});