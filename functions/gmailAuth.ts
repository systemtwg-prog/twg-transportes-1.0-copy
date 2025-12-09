import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Obtém o token de acesso do Gmail via App Connector
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Obter token de acesso do Gmail via app connector
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

        if (!accessToken) {
            return Response.json({ 
                error: 'Gmail não autorizado. Configure o app connector primeiro.' 
            }, { status: 401 });
        }

        return Response.json({
            success: true,
            authorized: true
        });

    } catch (error) {
        console.error("Erro ao verificar Gmail:", error);
        return Response.json({ 
            error: error.message || 'Erro ao verificar autorização',
            authorized: false
        }, { status: 500 });
    }
});