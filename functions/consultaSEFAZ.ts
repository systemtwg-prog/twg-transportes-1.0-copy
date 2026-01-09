import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, chave, certificado_base64, senha_cert } = body;

        // 1️⃣ VALIDAR CHAVE DE ACESSO
        if (action === 'validarChave') {
            const chaveRegex = /^\d{44}$/;
            
            if (!chaveRegex.test(chave)) {
                return Response.json({
                    valid: false,
                    message: 'Chave de acesso deve ter 44 dígitos'
                });
            }

            // Extrair informações da chave
            const uf = chave.substring(0, 2);
            const aaaa = chave.substring(2, 6);
            const mm = chave.substring(6, 8);
            const cnpj = chave.substring(8, 20);
            const tipo = chave.substring(20, 22);
            const numero = chave.substring(22, 32);
            const serie = chave.substring(32, 34);
            const dv = chave.substring(42, 44);

            // Calcular dígito verificador
            const sequencia = '4321987654321987654321987654321987654321987';
            let soma = 0;
            const chaveBase = chave.substring(0, 42);
            
            for (let i = 0; i < 42; i++) {
                soma += parseInt(chaveBase[i]) * parseInt(sequencia[i]);
            }

            const resto = soma % 11;
            const dv_calc = resto === 0 ? 0 : 11 - resto;

            const valid = dv_calc === parseInt(dv);

            return Response.json({
                valid: valid,
                message: valid ? 'Chave válida' : 'Dígito verificador inválido',
                info: {
                    uf,
                    data: `${mm}/${aaaa}`,
                    cnpj,
                    tipo: tipo === '55' ? 'NF-e' : 'NFC-e',
                    numero,
                    serie
                }
            });
        }

        // 2️⃣ SIMULAR BUSCA DE DFE (sem certificado real)
        if (action === 'buscarDFE') {
            if (!chave) {
                return Response.json({
                    error: 'Chave de acesso é obrigatória'
                }, { status: 400 });
            }

            // Simular resposta de DFE encontrado
            const dfeSimulado = {
                chave: chave,
                status: 'autorizado',
                data_autorizacao: new Date().toISOString(),
                numero_nf: chave.substring(22, 32),
                serie: chave.substring(32, 34),
                cnpj_emitente: chave.substring(8, 20),
                valor: 1500.00,
                descricao_status: 'Documento foi localizado',
                tipo: 'NF-e'
            };

            return Response.json({
                success: true,
                dfe: dfeSimulado,
                xml_disponivel: true,
                danfe_disponivel: true,
                message: 'DFE localizado com sucesso'
            });
        }

        // 3️⃣ GERAR LINK DE DOWNLOAD XML
        if (action === 'downloadXML') {
            if (!chave) {
                return Response.json({
                    error: 'Chave é obrigatória'
                }, { status: 400 });
            }

            // Simular XML
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${chave}">
        <ide>
            <cUF>35</cUF>
            <cNF>${chave.substring(22, 32)}</cNF>
            <assinaturaQRCode></assinaturaQRCode>
        </ide>
    </infNFe>
</NFe>`;

            return Response.json({
                success: true,
                xml_content: xmlContent,
                filename: `${chave}.xml`
            });
        }

        // 4️⃣ GERAR LINK DE DOWNLOAD DANFE
        if (action === 'downloadDANFE') {
            if (!chave) {
                return Response.json({
                    error: 'Chave é obrigatória'
                }, { status: 400 });
            }

            // Aqui seria gerado o PDF DANFE
            return Response.json({
                success: true,
                pdf_url: `https://fake-sefaz.br/danfe/${chave}.pdf`,
                filename: `DANFE-${chave}.pdf`,
                message: 'DANFE gerado com sucesso'
            });
        }

        // 5️⃣ GUARDAR CERTIFICADO (apenas metadados, não guardamos arquivo)
        if (action === 'uploadCertificado') {
            if (!certificado_base64 || !senha_cert) {
                return Response.json({
                    error: 'Certificado e senha são obrigatórios'
                }, { status: 400 });
            }

            // Salvar referência do certificado no usuário
            const userData = await base44.auth.me();
            await base44.auth.updateMe({
                certificado_digital_configurado: true,
                certificado_data: new Date().toISOString()
            });

            return Response.json({
                success: true,
                message: 'Certificado importado com sucesso',
                certificado_data: new Date().toISOString()
            });
        }

        return Response.json({ error: 'Action not found' }, { status: 400 });

    } catch (error) {
        console.error('SEFAZ Consulta Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});