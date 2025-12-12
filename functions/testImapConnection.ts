import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { host, port, user: emailUser, password, tls } = await req.json();

        if (!host || !port || !emailUser || !password) {
            return Response.json({ 
                success: false, 
                error: 'Configurações incompletas' 
            }, { status: 400 });
        }

        try {
            // Criar conexão TCP para testar
            const conn = await Deno.connect({
                hostname: host,
                port: parseInt(port),
                transport: tls ? "tcp" : "tcp"
            });

            // Se conectar com sucesso, fechar a conexão
            conn.close();

            return Response.json({
                success: true,
                message: 'Conexão estabelecida com sucesso!'
            });

        } catch (connError) {
            console.error('Erro de conexão:', connError);
            
            let errorMessage = 'Falha na conexão com o servidor';
            
            if (connError.message.includes('ENOTFOUND')) {
                errorMessage = 'Servidor não encontrado. Verifique o endereço.';
            } else if (connError.message.includes('ETIMEDOUT')) {
                errorMessage = 'Tempo de conexão esgotado. Verifique o endereço e porta.';
            } else if (connError.message.includes('ECONNREFUSED')) {
                errorMessage = 'Conexão recusada. Verifique se a porta está correta.';
            }

            return Response.json({
                success: false,
                error: errorMessage,
                details: connError.message
            });
        }

    } catch (error) {
        console.error('Erro geral:', error);
        return Response.json({ 
            success: false,
            error: 'Erro ao testar conexão',
            details: error.message 
        }, { status: 500 });
    }
});