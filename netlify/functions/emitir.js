/**
 * Netlify Function: emitir.js
 * Proxy seguro entre o frontend e a API da Focus NFe.
 */

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  const FOCUS_API_KEY = (process.env.FOCUS_API_KEY || '').trim();
  if (!FOCUS_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'Chave de API não configurada' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'JSON inválido' }) };
  }

  const { nota, ambiente } = body;
  const base = ambiente === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';

  // Monta payload Focus NFe NFS-e
  const payload = {
    data_emissao:                        nota.dataEmissao || new Date().toISOString().slice(0, 10),
    prestador_cnpj:                      (nota.prestadorCnpj || '').replace(/\D/g, ''),
    prestador_inscricao_municipal:       nota.prestadorIm || '',
    prestador_codigo_municipio:          '3303302',
    tomador_razao_social:                nota.tomadorNome || '',
    servico_item_lista_servico:          nota.itemListaServico || '',
    servico_codigo_tributacao_municipio: nota.codigoTributacaoMunicipal || nota.codigoTributacaoNacional || '',
    servico_discriminacao:               nota.discriminacao || '',
    servico_codigo_municipio:            '3303302',
    servico_valor_servicos:              Number(nota.valor || 0).toFixed(2),
    servico_aliquota:                    (Number(nota.aliquota || 0) / 100).toFixed(4),
    servico_iss_retido:                  nota.issRetido ? '1' : '2',
    servico_valor_iss:                   Number(nota.iss || 0).toFixed(2),
    servico_base_calculo:                Number(nota.valor || 0).toFixed(2),
    competencia:                         nota.competencia ? nota.competencia + '-01' : '',
    optante_simples_nacional:            nota.simplesNacional ? '1' : '2',
    incentivador_cultural:               '2',
    natureza_operacao:                   '1',
  };

  // Campos opcionais do tomador
  if (nota.tomadorCnpj) payload.tomador_cnpj = nota.tomadorCnpj.replace(/\D/g, '');
  if (nota.tomadorEmail) payload.tomador_email = nota.tomadorEmail;
  if (nota.tomadorLogradouro) payload.tomador_logradouro = nota.tomadorLogradouro;
  if (nota.tomadorNumero) payload.tomador_numero = nota.tomadorNumero;
  if (nota.tomadorComplemento) payload.tomador_complemento = nota.tomadorComplemento;
  if (nota.tomadorBairro) payload.tomador_bairro = nota.tomadorBairro;
  if (nota.tomadorUf) payload.tomador_uf = nota.tomadorUf;
  if (nota.tomadorCep) payload.tomador_cep = nota.tomadorCep.replace(/\D/g, '');
  if (nota.nbs) payload.servico_codigo_nbs = nota.nbs;

  // Retenções
  if (nota.retPis)    payload.servico_valor_pis    = (nota.valor * 0.0065).toFixed(2);
  if (nota.retCofins) payload.servico_valor_cofins  = (nota.valor * 0.03).toFixed(2);
  if (nota.retCsll)   payload.servico_valor_csll    = (nota.valor * 0.01).toFixed(2);
  if (nota.retIrpj)   payload.servico_valor_ir      = (nota.valor * 0.015).toFixed(2);
  if (nota.retInss)   payload.servico_valor_inss    = (nota.valor * 0.11).toFixed(2);

  try {
    const ref = 'nfse_' + Date.now();
    const url = `${base}/v2/nfse?ref=${ref}`;
    const authToken = Buffer.from(FOCUS_API_KEY + ':').toString('base64');

    console.log('Enviando para Focus NFe:', url);
    console.log('Payload:', JSON.stringify(payload));

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + authToken,
      },
      body: JSON.stringify(payload),
    });

    // Lê a resposta como texto primeiro para evitar erro de parse
    const rawText = await resp.text();
    console.log('Resposta Focus NFe status:', resp.status);
    console.log('Resposta Focus NFe body:', rawText);

    let data = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      // Resposta não é JSON — provavelmente erro de autenticação HTML
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          error: `Resposta inesperada da Focus NFe (HTTP ${resp.status}): ${rawText.slice(0, 200)}`,
        }),
      };
    }

    if (resp.status === 200 || resp.status === 201 || resp.status === 202) {
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
      const errMsg = data.mensagem || (data.erros && data.erros[0] && data.erros[0].mensagem) || `Erro HTTP ${resp.status}`;
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: false, error: errMsg, raw: data }),
      };
    }
  } catch (err) {
    console.error('Erro na função emitir:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'Erro interno: ' + err.message }),
    };
  }
};
