/**
 * services/abrasf.js
 * Serviço de emissão NFS-e — Padrão ABRASF v2.03
 *
 * IMPORTANTE: Este arquivo contém o stub de integração.
 * Para produção, substitua emitirNfse() pela chamada ao webservice
 * real da prefeitura do prestador, assinando o XML com o certificado PFX.
 *
 * Documentação: https://www.abrasf.org.br/nfse.phtml
 */

const fs = require('fs');
const path = require('path');

/**
 * Escapa caracteres especiais para XML
 */
function escXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Gera o XML LoteRps conforme padrão ABRASF 2.03
 */
function gerarXmlLoteRps(inv, prestador, numeroLote) {
  const competencia = inv.competencia
    ? `${inv.competencia}-01`
    : new Date().toISOString().slice(0,10);

  return `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <LoteRps versao="2.03">
    <NumeroLote>${numeroLote}</NumeroLote>
    <CpfCnpj>
      <Cnpj>${prestador.cnpj?.replace(/\D/g, '')}</Cnpj>
    </CpfCnpj>
    <InscricaoMunicipal>${prestador.im || ''}</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps>
      <Rps>
        <InfDeclaracaoPrestacaoServico Id="rps${Date.now()}">
          <Rps>
            <IdentificacaoRps>
              <Numero>${Date.now()}</Numero>
              <Serie>RPS</Serie>
              <Tipo>1</Tipo>
            </IdentificacaoRps>
            <DataEmissao>${new Date().toISOString().slice(0,19)}</DataEmissao>
            <Status>1</Status>
          </Rps>
          <Competencia>${competencia}</Competencia>
          <Servico>
            <Valores>
              <ValorServicos>${inv.valor.toFixed(2)}</ValorServicos>
              <Aliquota>${(inv.aliquota / 100).toFixed(4)}</Aliquota>
              <ValorIss>${inv.iss.toFixed(2)}</ValorIss>
              <BaseCalculo>${inv.valor.toFixed(2)}</BaseCalculo>
            </Valores>
            <IssRetido>2</IssRetido>
            <ItemListaServico>${escXml(inv.codigo_servico)}</ItemListaServico>
            <Discriminacao>${escXml(inv.discriminacao)}</Discriminacao>
            <CodigoMunicipio>${prestador.city_code || '3550308'}</CodigoMunicipio>
            <ExigibilidadeISS>1</ExigibilidadeISS>
            <MunicipioIncidencia>${prestador.city_code || '3550308'}</MunicipioIncidencia>
          </Servico>
          <Prestador>
            <CpfCnpj>
              <Cnpj>${prestador.cnpj?.replace(/\D/g, '')}</Cnpj>
            </CpfCnpj>
            <InscricaoMunicipal>${prestador.im || ''}</InscricaoMunicipal>
          </Prestador>
          <Tomador>
            <IdentificacaoTomador>
              <CpfCnpj>
                <Cnpj>${inv.tomador_cnpj?.replace(/\D/g, '')}</Cnpj>
              </CpfCnpj>
            </IdentificacaoTomador>
            <RazaoSocial>${escXml(inv.tomador_nome)}</RazaoSocial>
            <Endereco>
              <Endereco>${escXml(inv.tomador_logradouro)}</Endereco>
              <Numero>${escXml(inv.tomador_numero)}</Numero>
              <Complemento>${escXml(inv.tomador_complemento)}</Complemento>
              <Bairro>${escXml(inv.tomador_bairro)}</Bairro>
              <CodigoMunicipio>3550308</CodigoMunicipio>
              <Uf>${inv.tomador_uf || 'SP'}</Uf>
              <Cep>${inv.tomador_cep?.replace(/\D/g,'') || ''}</Cep>
            </Endereco>
          </Tomador>
          <OptanteSimplesNacional>${inv.optante_simples === 'S' ? 1 : 2}</OptanteSimplesNacional>
          <IncentivoFiscal>${inv.incentivador === 'S' ? 1 : 2}</IncentivoFiscal>
        </InfDeclaracaoPrestacaoServico>
      </Rps>
    </ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;
}

/**
 * Simula a emissão (stub).
 * Em produção: assinar XML com PFX e enviar via SOAP/REST para a prefeitura.
 */
async function emitirNfse(inv, prestador) {
  const numeroLote = Date.now().toString();
  const xmlEnviado = gerarXmlLoteRps(inv, prestador, numeroLote);
  const numero = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  const codigoVerificacao = Math.random().toString(36).substring(2, 10).toUpperCase();

  // Salva XML localmente para auditoria
  const xmlDir = path.join(__dirname, '..', 'uploads', 'xml');
  if (!fs.existsSync(xmlDir)) fs.mkdirSync(xmlDir, { recursive: true });
  fs.writeFileSync(path.join(xmlDir, `${inv.id}.xml`), xmlEnviado);

  // Simula delay de rede
  await new Promise(r => setTimeout(r, 200));

  const xmlRetorno = `<RetornoEnviarLoteRps>
  <ListaNfse>
    <CompNfse>
      <Nfse>
        <InfNfse>
          <Numero>${numero}</Numero>
          <CodigoVerificacao>${codigoVerificacao}</CodigoVerificacao>
          <DataEmissao>${new Date().toISOString()}</DataEmissao>
        </InfNfse>
      </Nfse>
    </CompNfse>
  </ListaNfse>
</RetornoEnviarLoteRps>`;

  return { numero, codigoVerificacao, xmlEnviado, xmlRetorno };
}

/**
 * Para integração REAL com prefeituras ABRASF:
 *
 * 1. Instale: npm install node-soap node-forge
 *
 * 2. Assine o XML:
 *    const forge = require('node-forge');
 *    const pfx = forge.pkcs12.pkcs12FromAsn1(asn1, false, certPassword);
 *    // ... assinar com xmldsig
 *
 * 3. Envie via SOAP:
 *    const soap = require('node-soap');
 *    const client = await soap.createClientAsync(wsdlUrl);
 *    const result = await client.RecepcionarLoteRpsAsync({ xml: xmlAssinado });
 *
 * WSDLs por prefeitura (exemplos):
 * - São Paulo:  https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx?wsdl
 * - Campinas:   https://issdigital.campinas.sp.gov.br/WsNFe2/LoteRps.jws?wsdl
 * - Rio:        https://notacarioca.rio.gov.br/WSNacional/nfse.asmx?wsdl
 * - (demais prefeituras: verificar portal do Emissor Nacional)
 */

module.exports = { emitirNfse, gerarXmlLoteRps };
