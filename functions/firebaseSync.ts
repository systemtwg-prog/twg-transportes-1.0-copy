import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const method = req.method;
        const url = new URL(req.url);
        const action = url.searchParams.get('action');

        // Firebase config
        const firebaseConfig = {
            apiKey: Deno.env.get("FIREBASE_API_KEY"),
            authDomain: Deno.env.get("firebase"),
            projectId: Deno.env.get("project"),
            storageBucket: Deno.env.get("storage"),
            messagingSenderId: Deno.env.get("meassure"),
            appId: Deno.env.get("appid")
        };

        // Validar se Firebase está configurado
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            return Response.json({ 
                error: 'Firebase não configurado corretamente',
                config: { hasApiKey: !!firebaseConfig.apiKey, hasProjectId: !!firebaseConfig.projectId }
            }, { status: 400 });
        }

        // Sincronizar posição GPS
        if (action === 'updateLocation') {
            const body = await req.json();
            const { latitude, longitude, placa, motorista_id } = body;

            // Atualizar ordem de coleta com localização
            if (motorista_id) {
                const ordensAtuais = await base44.entities.OrdemColeta.filter({
                    motorista_id: motorista_id,
                    status: 'em_andamento'
                });

                for (const ordem of ordensAtuais) {
                    await base44.entities.OrdemColeta.update(ordem.id, {
                        localizacao_latitude: latitude,
                        localizacao_longitude: longitude,
                        localizacao_atualizada_em: new Date().toISOString()
                    });
                }
            }

            return Response.json({
                success: true,
                message: 'Localização sincronizada',
                location: { latitude, longitude, placa }
            });
        }

        // Buscar veículos em tempo real
        if (action === 'getVehicles') {
            const veiculos = await base44.entities.Veiculo.list();
            const ordensAtuais = await base44.entities.OrdemColeta.filter({
                status: 'em_andamento'
            });

            const veiculosComLocalizacao = veiculos.map(v => {
                const ordemAtual = ordensAtuais.find(o => o.veiculo_id === v.id);
                return {
                    ...v,
                    localizacao: ordemAtual ? {
                        latitude: ordemAtual.localizacao_latitude,
                        longitude: ordemAtual.localizacao_longitude,
                        atualizada_em: ordemAtual.localizacao_atualizada_em
                    } : null
                };
            });

            return Response.json({ veiculos: veiculosComLocalizacao });
        }

        // Sincronizar dados de coleta
        if (action === 'syncColetas') {
            const coletasDiarias = await base44.entities.ColetaDiaria.list();
            const ordensColeta = await base44.entities.OrdemColeta.list();

            return Response.json({
                success: true,
                coletasDiarias: coletasDiarias.length,
                ordensColeta: ordensColeta.length,
                lastSync: new Date().toISOString()
            });
        }

        // Salvar mensagem de chat
        if (action === 'sendMessage') {
            const body = await req.json();
            const { destinatario_id, titulo, mensagem } = body;

            // Criar notificação de chat
            await base44.entities.Notificacao.create({
                titulo: titulo || 'Nova mensagem',
                mensagem: mensagem,
                tipo: 'sistema',
                prioridade: 'normal',
                destinatario_id: destinatario_id,
                destinatario_tipo: 'usuario',
                lida: false
            });

            return Response.json({ success: true, message: 'Mensagem enviada' });
        }

        return Response.json({ error: 'Action not found' }, { status: 400 });

    } catch (error) {
        console.error('Firebase Sync Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});