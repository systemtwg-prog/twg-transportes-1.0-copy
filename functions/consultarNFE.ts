import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Consulta NFE na SEFAZ pela chave de acesso (44 dígitos)
 * Retorna dados da NFE para preenchimento automático
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { chaveAcesso } = await req.json();

        if (!chaveAcesso || chaveAcesso.length !== 44) {
            return Response.json({ 
                error: 'Chave de acesso inválida. Deve conter 44 dígitos.' 
            }, { status: 400 });
        }

        if (!/^\d{44}$/.test(chaveAcesso)) {
            return Response.json({ 
                error: 'Chave de acesso deve conter apenas números.' 
            }, { status: 400 });
        }

        const provider = Deno.env.get("SEFAZ_PROVIDER") || "public";
        const apiKey = Deno.env.get("SEFAZ_API_KEY");

        let nfeData = null;

        if (provider === "nfeio" && apiKey) {
            nfeData = await consultarNFeIO(chaveAcesso, apiKey);
        } else if (provider === "focus" && apiKey) {
            nfeData = await consultarFocusNFe(chaveAcesso, apiKey);
        } else {
            nfeData = await consultarSEFAZPublico(chaveAcesso, base44);
        }

        if (!nfeData) {
            return Response.json({ 
                error: 'NFE não encontrada ou inacessível na SEFAZ' 
            }, { status: 404 });
        }

        return Response.json({
            success: true,
            data: nfeData
        });

    } catch (error) {
        console.error("Erro ao consultar NFE:", error);
        return Response.json({ 
            error: error.message || 'Erro ao consultar NFE' 
        }, { status: 500 });
    }
});

async function consultarNFeIO(chave, apiKey) {
    const response = await fetch(`https://api.nfe.io/v1/nfe/${chave}`, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
        numero_nf: data.numero,
        remetente: data.remetente?.nome,
        destinatario: data.destinatario?.nome,
        peso: data.peso?.toString(),
        volume: data.volumes?.toString(),
        valor: data.valorTotal?.toString(),
        data_emissao: data.dataEmissao,
        chave_acesso: chave
    };
}

async function consultarFocusNFe(chave, apiKey) {
    const response = await fetch(`https://api.focusnfe.com.br/v2/nfes/${chave}`, {
        headers: {
            'Authorization': `Basic ${btoa(apiKey + ':')}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
        numero_nf: data.numero,
        remetente: data.emitente?.nome_completo,
        destinatario: data.destinatario?.nome_completo,
        peso: data.peso_bruto?.toString(),
        volume: data.volumes?.toString(),
        valor: data.valor_total?.toString(),
        data_emissao: data.data_emissao,
        chave_acesso: chave
    };
}

async function consultarSEFAZPublico(chave, base44) {
    const uf = chave.substring(0, 2);
    const ufMap = {
        '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA',
        '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
        '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE',
        '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
        '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT',
        '52': 'GO', '53': 'DF'
    };

    const siglaUF = ufMap[uf];
    if (!siglaUF) {
        throw new Error('UF inválida na chave de acesso');
    }

    const prompt = `
Você é um assistente de extração de dados fiscais.

Tarefa: Consultar a Nota Fiscal Eletrônica (NFE) com a chave de acesso ${chave} no portal da SEFAZ do estado ${siglaUF}.

Use o portal: https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx

Extraia os dados principais da NFE.

Retorne APENAS um JSON com os seguintes campos (use null se não encontrar):
{
    "numero_nf": "número da nota fiscal",
    "data_emissao": "data de emissão (formato YYYY-MM-DD)",
    "remetente": "nome do remetente/emitente",
    "destinatario": "nome do destinatário",
    "valor": "valor total da nota",
    "peso": "peso em KG",
    "volume": "quantidade de volumes"
}
`;

    const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
            type: "object",
            properties: {
                numero_nf: { type: "string" },
                data_emissao: { type: "string" },
                remetente: { type: "string" },
                destinatario: { type: "string" },
                valor: { type: "string" },
                peso: { type: "string" },
                volume: { type: "string" }
            }
        }
    });

    if (!result || !result.numero_nf) return null;

    return {
        ...result,
        chave_acesso: chave
    };
}