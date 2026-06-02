/**
 * Netlify Function: consultar.js
 * Consulta o status de uma NFS-e na Focus NFe pela referência.
 * Útil para notas que ficaram em processamento (status "processando").
 */

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método não permitido' }) };
  }

  const FOCUS_API_KEY = process.env.FOCUS_API_KEY;
  if (!FOCUS_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Chave de API não configurada' }) };
  }

  const ref = event.queryStringParameters?.ref;
  if (!ref) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Parâmetro ref obrigatório' }) };
  }

  const ambiente = event.queryStringParameters?.ambiente || 'homologacao';
  const base = ambiente === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';

  try {
    const resp = await fetch(`${base}/v2/nfse/${ref}`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(FOCUS_API_KEY + ':').toString('base64'),
      },
    });

    const data = await resp.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: resp.ok,
        status: data.status,
        numero: data.numero_nfse,
        codigoVerificacao: data.codigo_verificacao,
        linkNfse: data.caminho_xml_nota_fiscal,
        mensagem: data.mensagem,
        raw: data,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
