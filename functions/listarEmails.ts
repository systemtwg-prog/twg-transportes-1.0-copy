import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Lista emails do Gmail com anexos
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { maxResults = 20, query = '' } = await req.json();

        const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

        if (!accessToken) {
            return Response.json({ error: 'Gmail não autorizado' }, { status: 401 });
        }

        // Buscar lista de mensagens
        const searchQuery = query || 'has:attachment';
        const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}`;
        
        const listResponse = await fetch(listUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!listResponse.ok) {
            throw new Error('Erro ao buscar emails');
        }

        const listData = await listResponse.json();
        
        if (!listData.messages || listData.messages.length === 0) {
            return Response.json({ emails: [] });
        }

        // Buscar detalhes de cada mensagem
        const emails = [];
        for (const msg of listData.messages.slice(0, maxResults)) {
            const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`;
            const detailResponse = await fetch(detailUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (detailResponse.ok) {
                const detail = await detailResponse.json();
                
                const headers = detail.payload?.headers || [];
                const subject = headers.find(h => h.name === 'Subject')?.value || 'Sem assunto';
                const from = headers.find(h => h.name === 'From')?.value || '';
                const date = headers.find(h => h.name === 'Date')?.value || '';

                // Extrair anexos
                const attachments = [];
                const parts = detail.payload?.parts || [];
                
                for (const part of parts) {
                    if (part.filename && part.body?.attachmentId) {
                        attachments.push({
                            filename: part.filename,
                            mimeType: part.mimeType,
                            attachmentId: part.body.attachmentId,
                            size: part.body.size || 0
                        });
                    }
                    // Verificar subpartes (emails com estrutura complexa)
                    if (part.parts) {
                        for (const subpart of part.parts) {
                            if (subpart.filename && subpart.body?.attachmentId) {
                                attachments.push({
                                    filename: subpart.filename,
                                    mimeType: subpart.mimeType,
                                    attachmentId: subpart.body.attachmentId,
                                    size: subpart.body.size || 0
                                });
                            }
                        }
                    }
                }

                emails.push({
                    id: msg.id,
                    subject,
                    from,
                    date,
                    attachments
                });
            }
        }

        return Response.json({ emails });

    } catch (error) {
        console.error("Erro ao listar emails:", error);
        return Response.json({ 
            error: error.message || 'Erro ao listar emails' 
        }, { status: 500 });
    }
});