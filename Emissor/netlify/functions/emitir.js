/**
 * Netlify Function: emitir.js
 * Proxy seguro entre o frontend e a API da Focus NFe.
 * A chave de API fica guardada como variável de ambiente no Netlify
 * e nunca fica exposta no código ou no navegador.
 */

exports.handler = async (event) => {
  // Só aceita POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  const FOCUS_API_KEY = process.env.FOCUS_API_KEY;
  if (!FOCUS_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Chave de API não configurada' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { nota, ambiente } = body;
  // ambiente: 'homologacao' ou 'producao'
  const base = ambiente === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';

  // Monta o payload no formato Focus NFe para NFS-e Nacional
  const payload = {
    data_emissao:             nota.dataEmissao || new Date().toISOString().slice(0, 10),
    prestador_cnpj:           nota.prestadorCnpj?.replace(/\D/g, ''),
    prestador_inscricao_municipal: nota.prestadorIm,
    prestador_codigo_municipio: '3303302', // Niterói — código IBGE
    tomador_cnpj:             nota.tomadorCnpj?.replace(/\D/g, '') || undefined,
    tomador_cpf:              nota.tomadorCpf?.replace(/\D/g, '') || undefined,
    tomador_razao_social:     nota.tomadorNome,
    tomador_email:            nota.tomadorEmail || undefined,
    tomador_logradouro:       nota.tomadorLogradouro || undefined,
    tomador_numero:           nota.tomadorNumero || undefined,
    tomador_complemento:      nota.tomadorComplemento || undefined,
    tomador_bairro:           nota.tomadorBairro || undefined,
    tomador_codigo_municipio: nota.tomadorCodigoMunicipio || undefined,
    tomador_uf:               nota.tomadorUf || undefined,
    tomador_cep:              nota.tomadorCep?.replace(/\D/g, '') || undefined,
    tomador_telefone:         nota.tomadorTelefone?.replace(/\D/g, '') || undefined,
    // Serviço
    servico_item_lista_servico:       nota.itemListaServico,
    servico_codigo_tributacao_municipio: nota.codigoTributacaoMunicipal || nota.codigoTributacaoNacional,
    servico_codigo_nbs:               nota.nbs || undefined,
    servico_discriminacao:            nota.discriminacao,
    servico_codigo_municipio:         '3303302',
    // Valores
    servico_valor_servicos:           nota.valor?.toFixed(2),
    servico_aliquota:                 (nota.aliquota / 100)?.toFixed(4),
    servico_iss_retido:               nota.issRetido ? '1' : '2',
    servico_valor_iss:                nota.iss?.toFixed(2),
    servico_base_calculo:             nota.valor?.toFixed(2),
    // Competência
    competencia:                      nota.competencia ? nota.competencia + '-01' : undefined,
    // Regime
    optante_simples_nacional:         nota.simplesNacional ? '1' : '2',
    incentivador_cultural:            '2',
    natureza_operacao:                '1',
    // Retenções federais
    servico_valor_pis:    nota.retPis    ? (nota.valor * 0.0065).toFixed(2) : undefined,
    servico_valor_cofins: nota.retCofins ? (nota.valor * 0.03).toFixed(2)   : undefined,
    servico_valor_csll:   nota.retCsll   ? (nota.valor * 0.01).toFixed(2)   : undefined,
    servico_valor_ir:     nota.retIrpj   ? (nota.valor * 0.015).toFixed(2)  : undefined,
    servico_valor_inss:   nota.retInss   ? (nota.valor * 0.11).toFixed(2)   : undefined,
  };

  // Remove campos undefined para não poluir o payload
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  try {
    const ref = `nfse_${Date.now()}`; // referência única
    const url = `${base}/v2/nfse?ref=${ref}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(FOCUS_API_KEY + ':').toString('base64'),
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (resp.ok || resp.status === 202) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          ref,
          status: data.status,
          numero: data.numero_nfse,
          codigoVerificacao: data.codigo_verificacao,
          linkNfse: data.caminho_xml_nota_fiscal || null,
          raw: data,
        }),
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          error: data.mensagem || data.erros?.[0]?.mensagem || 'Erro na Focus NFe',
          raw: data,
        }),
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'Erro de conexão: ' + err.message }),
    };
  }
};
