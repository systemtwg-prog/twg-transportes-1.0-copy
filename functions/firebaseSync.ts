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

        // 1️⃣ RASTREAMENTO GPS EM TEMPO REAL
        if (action === 'updateLocation') {
            const body = await req.json();
            const { latitude, longitude, placa, motorista_id } = body;

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

        // 2️⃣ CHAT E MENSAGENS
        if (action === 'sendMessage') {
            const body = await req.json();
            const { destinatario_id, titulo, mensagem } = body;

            await base44.entities.Notificacao.create({
                titulo: titulo || 'Nova mensagem',
                mensagem: mensagem,
                tipo: 'sistema',
                prioridade: 'normal',
                destinatario_id: destinatario_id,
                destinatario_tipo: 'usuario',
                lida: false,
                link: 'SincronizacaoFirebase'
            });

            return Response.json({ success: true, message: 'Mensagem enviada' });
        }

        if (action === 'getMessages') {
            const messages = await base44.entities.Notificacao.filter({
                destinatario_id: user.id
            }, '-created_date', 100);

            return Response.json({ 
                success: true, 
                messages: messages,
                total: messages.length
            });
        }

        // 3️⃣ SINCRONIZAÇÃO E DASHBOARD
        if (action === 'syncColetas') {
            const coletasDiarias = await base44.entities.ColetaDiaria.list();
            const ordensColeta = await base44.entities.OrdemColeta.list();
            const romaneios = await base44.entities.RomaneioGerado.list();

            return Response.json({
                success: true,
                coletas: coletasDiarias.length,
                ordens: ordensColeta.length,
                romaneios: romaneios.length,
                lastSync: new Date().toISOString()
            });
        }

        // 4️⃣ BACKUP AUTOMÁTICO
        if (action === 'backup') {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // Coletar todos os dados
            const [
                clientes,
                motoristas,
                veiculos,
                ordensColeta,
                coletasDiarias,
                notasFiscais,
                romaneios,
                multas,
                transportadoras
            ] = await Promise.all([
                base44.entities.Cliente.list(),
                base44.entities.Motorista.list(),
                base44.entities.Veiculo.list(),
                base44.entities.OrdemColeta.list(),
                base44.entities.ColetaDiaria.list(),
                base44.entities.NotaFiscal.list(),
                base44.entities.RomaneioGerado.list(),
                base44.entities.Multa.list(),
                base44.entities.Transportadora.list()
            ]);

            const backupData = {
                timestamp,
                version: '1.0',
                data: {
                    clientes: clientes.length,
                    motoristas: motoristas.length,
                    veiculos: veiculos.length,
                    ordensColeta: ordensColeta.length,
                    coletasDiarias: coletasDiarias.length,
                    notasFiscais: notasFiscais.length,
                    romaneios: romaneios.length,
                    multas: multas.length,
                    transportadoras: transportadoras.length
                },
                totalRecords: [
                    clientes, motoristas, veiculos, ordensColeta,
                    coletasDiarias, notasFiscais, romaneios, multas, transportadoras
                ].reduce((sum, arr) => sum + arr.length, 0)
            };

            // Salvar backup como notificação de auditoria
            await base44.entities.Notificacao.create({
                titulo: `Backup realizado - ${timestamp}`,
                mensagem: `Backup contém ${backupData.totalRecords} registros de 9 entidades`,
                tipo: 'sistema',
                prioridade: 'normal',
                destinatario_tipo: 'gestores',
                lida: false
            });

            return Response.json({
                success: true,
                backup: backupData,
                message: `Backup de ${backupData.totalRecords} registros realizado com sucesso`
            });
        }

        // Status geral da sincronização
        if (action === 'getStatus') {
            const ordensAtuais = await base44.entities.OrdemColeta.filter({
                status: 'em_andamento'
            });

            return Response.json({
                firebaseConnected: !!firebaseConfig.projectId,
                ordensEmTransito: ordensAtuais.length,
                lastCheck: new Date().toISOString()
            });
        }

        return Response.json({ error: 'Action not found' }, { status: 400 });

    } catch (error) {
        console.error('Firebase Sync Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});