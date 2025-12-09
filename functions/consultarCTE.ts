import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Consulta CTE na SEFAZ pela chave de acesso (44 dígitos)
 * Retorna dados do CTE para preenchimento automático
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

        // Validar formato da chave de acesso
        if (!/^\d{44}$/.test(chaveAcesso)) {
            return Response.json({ 
                error: 'Chave de acesso deve conter apenas números.' 
            }, { status: 400 });
        }

        const provider = Deno.env.get("SEFAZ_PROVIDER") || "public";
        const apiKey = Deno.env.get("SEFAZ_API_KEY");

        let cteData = null;

        if (provider === "nfeio" && apiKey) {
            // Consulta via NFe.io API
            cteData = await consultarNFeIO(chaveAcesso, apiKey, "cte");
        } else if (provider === "focus" && apiKey) {
            // Consulta via Focus NFe API
            cteData = await consultarFocusNFe(chaveAcesso, apiKey, "cte");
        } else {
            // Consulta pública SEFAZ usando LLM para extrair dados
            cteData = await consultarSEFAZPublico(chaveAcesso, "cte", base44);
        }

        if (!cteData) {
            return Response.json({ 
                error: 'CTE não encontrado ou inacessível na SEFAZ' 
            }, { status: 404 });
        }

        return Response.json({
            success: true,
            data: cteData
        });

    } catch (error) {
        console.error("Erro ao consultar CTE:", error);
        return Response.json({ 
            error: error.message || 'Erro ao consultar CTE' 
        }, { status: 500 });
    }
});

async function consultarNFeIO(chave, apiKey, tipo) {
    const endpoint = tipo === "cte" 
        ? `https://api.nfe.io/v1/cte/${chave}`
        : `https://api.nfe.io/v1/nfe/${chave}`;

    const response = await fetch(endpoint, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) return null;

    const data = await response.json();
    return normalizarDadosCTE(data, "nfeio");
}

async function consultarFocusNFe(chave, apiKey, tipo) {
    const endpoint = tipo === "cte"
        ? `https://api.focusnfe.com.br/v2/ctes/${chave}`
        : `https://api.focusnfe.com.br/v2/nfes/${chave}`;

    const response = await fetch(endpoint, {
        headers: {
            'Authorization': `Basic ${btoa(apiKey + ':')}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) return null;

    const data = await response.json();
    return normalizarDadosCTE(data, "focus");
}

async function consultarSEFAZPublico(chave, tipo, base44) {
    // Extrair UF da chave (posições 0-1)
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

    // Usar LLM para fazer scraping da consulta pública SEFAZ
    const prompt = `
Você é um assistente de extração de dados fiscais.

Tarefa: Consultar o documento fiscal com a chave de acesso ${chave} no portal da SEFAZ.

Para isso, você deve:
1. Acessar o portal de consulta da SEFAZ do estado ${siglaUF}
2. Buscar informações sobre esse documento fiscal
3. Extrair os dados principais do ${tipo.toUpperCase()}

IMPORTANTE: Se não conseguir acessar diretamente, use o portal nacional: https://www.cte.fazenda.gov.br/

Retorne APENAS um JSON com os seguintes campos extraídos (use null se não encontrar):
{
    "numero_cte": "número do CTE",
    "data": "data de emissão (formato YYYY-MM-DD)",
    "remetente": "nome do remetente",
    "destinatario": "nome do destinatário", 
    "valor_total": "valor total do serviço",
    "peso": "peso da carga em KG",
    "nfe": "número da NFe vinculada (se houver)"
}
`;

    const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
            type: "object",
            properties: {
                numero_cte: { type: "string" },
                data: { type: "string" },
                remetente: { type: "string" },
                destinatario: { type: "string" },
                valor_total: { type: "string" },
                peso: { type: "string" },
                nfe: { type: "string" }
            }
        }
    });

    if (!result || !result.numero_cte) return null;

    return {
        numero_cte: result.numero_cte,
        data: result.data,
        remetente: result.remetente,
        destinatario: result.destinatario,
        valor_cobrado: result.valor_total,
        peso: result.peso,
        nfe: result.nfe,
        chave_acesso: chave
    };
}

function normalizarDadosCTE(data, provider) {
    // Normalizar dados de diferentes provedores para formato padrão
    if (provider === "nfeio") {
        return {
            numero_cte: data.numero,
            data: data.dataEmissao,
            remetente: data.remetente?.nome,
            destinatario: data.destinatario?.nome,
            valor_cobrado: data.valorTotal?.toString(),
            peso: data.peso?.toString(),
            nfe: data.numeroNFe
        };
    }

    if (provider === "focus") {
        return {
            numero_cte: data.numero,
            data: data.data_emissao,
            remetente: data.remetente?.nome_completo,
            destinatario: data.destinatario?.nome_completo,
            valor_cobrado: data.valor_total?.toString(),
            peso: data.peso?.toString(),
            nfe: data.nfe_numero
        };
    }

    return data;
}