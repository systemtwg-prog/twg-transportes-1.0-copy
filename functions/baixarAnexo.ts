import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Baixa anexo de email do Gmail
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { messageId, attachmentId, filename } = await req.json();

        const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

        if (!accessToken) {
            return Response.json({ error: 'Gmail não autorizado' }, { status: 401 });
        }

        // Baixar anexo
        const attachUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
        
        const response = await fetch(attachUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao baixar anexo');
        }

        const data = await response.json();
        
        // Decodificar base64 URL-safe
        const base64Data = data.data.replace(/-/g, '+').replace(/_/g, '/');
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Criar blob e fazer upload
        const blob = new Blob([binaryData]);
        const file = new File([blob], filename);
        
        const uploadResult = await base44.integrations.Core.UploadFile({ file });

        return Response.json({
            success: true,
            file_url: uploadResult.file_url,
            filename
        });

    } catch (error) {
        console.error("Erro ao baixar anexo:", error);
        return Response.json({ 
            error: error.message || 'Erro ao baixar anexo' 
        }, { status: 500 });
    }
});