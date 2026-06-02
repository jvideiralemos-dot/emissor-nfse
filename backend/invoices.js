const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { auth } = require('../middleware/auth');
const abrasf = require('../services/abrasf');

const upload = multer({ dest: path.join(__dirname, '..', 'uploads', 'tmp') });

// ─── HELPER ────────────────────────────────────────────────────────────────────
function mapRow(row, prestador) {
  const valor = parseFloat(row.valor_servico || row.valor || 0);
  const aliquota = parseFloat(row.aliquota_iss || row.aliquota || 5);
  return {
    id: uuidv4(),
    prestador_id: prestador.id,
    prestador_nome: prestador.name,
    prestador_cnpj: prestador.cnpj,
    tomador_cnpj:        row.tomador_cnpj || '',
    tomador_nome:        row.tomador_nome || '',
    tomador_email:       row.tomador_email || '',
    tomador_logradouro:  row.tomador_logradouro || '',
    tomador_numero:      String(row.tomador_numero || ''),
    tomador_complemento: row.tomador_complemento || '',
    tomador_bairro:      row.tomador_bairro || '',
    tomador_cidade:      row.tomador_cidade || '',
    tomador_uf:          row.tomador_uf || '',
    tomador_cep:         row.tomador_cep || '',
    tomador_telefone:    row.tomador_telefone || '',
    discriminacao:       row.discriminacao || '',
    codigo_servico:      row.codigo_servico || '',
    valor,
    aliquota,
    iss: parseFloat((valor * aliquota / 100).toFixed(2)),
    competencia:         row.competencia || '',
    optante_simples:     row.optante_simples || 'N',
    incentivador:        row.incentivador_cultural || 'N',
    observacoes:         row.observacoes || '',
    status: 'pendente',
  };
}

function validateInvoice(inv) {
  const errs = [];
  if (!inv.tomador_cnpj) errs.push('CNPJ do tomador ausente');
  if (!inv.discriminacao || inv.discriminacao.trim().length < 5) errs.push('Discriminação muito curta (mín. 5 caracteres)');
  if (!inv.valor || inv.valor <= 0) errs.push('Valor inválido');
  if (!inv.competencia) errs.push('Competência não informada');
  if (inv.aliquota < 0 || inv.aliquota > 100) errs.push('Alíquota fora do intervalo');
  // Verifica caracteres inválidos no XML
  const invalidChars = /[<>&"']/;
  if (invalidChars.test(inv.discriminacao)) errs.push('Discriminação contém caracteres inválidos para XML');
  return errs;
}

// ─── GET /api/invoices — lista fila pendente ──────────────────────────────────
router.get('/', auth, (req, res) => {
  const { prestador_id, status, competencia, tomador } = req.query;
  let sql = 'SELECT * FROM invoices WHERE 1=1';
  const params = [];
  if (prestador_id) { sql += ' AND prestador_id = ?'; params.push(prestador_id); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (competencia) { sql += ' AND competencia LIKE ?'; params.push(`%${competencia}%`); }
  if (tomador) { sql += ' AND tomador_nome LIKE ?'; params.push(`%${tomador}%`); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// ─── POST /api/invoices/import — importa planilha ────────────────────────────
router.post('/import', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
  const { prestador_id } = req.body;
  if (!prestador_id) return res.status(400).json({ error: 'Informe o prestador' });

  const prestador = db.prepare('SELECT * FROM clients WHERE id = ?').get(prestador_id);
  if (!prestador) return res.status(404).json({ error: 'Prestador não encontrado' });

  try {
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    if (!rows.length) return res.status(400).json({ error: 'Planilha vazia' });

    const invoices = rows.map(r => mapRow(r, prestador));

    const insert = db.prepare(`
      INSERT INTO invoices (id, prestador_id, prestador_nome, prestador_cnpj,
        tomador_cnpj, tomador_nome, tomador_email, tomador_logradouro, tomador_numero,
        tomador_complemento, tomador_bairro, tomador_cidade, tomador_uf, tomador_cep, tomador_telefone,
        discriminacao, codigo_servico, valor, aliquota, iss, competencia,
        optante_simples, incentivador, observacoes, status)
      VALUES (@id, @prestador_id, @prestador_nome, @prestador_cnpj,
        @tomador_cnpj, @tomador_nome, @tomador_email, @tomador_logradouro, @tomador_numero,
        @tomador_complemento, @tomador_bairro, @tomador_cidade, @tomador_uf, @tomador_cep, @tomador_telefone,
        @discriminacao, @codigo_servico, @valor, @aliquota, @iss, @competencia,
        @optante_simples, @incentivador, @observacoes, @status)
    `);

    const insertMany = db.transaction((items) => items.forEach(i => insert.run(i)));
    insertMany(invoices);

    fs.unlinkSync(req.file.path);
    res.json({ imported: invoices.length, ids: invoices.map(i => i.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar planilha: ' + err.message });
  }
});

// ─── GET /api/invoices/template — baixa planilha modelo ──────────────────────
router.get('/template', auth, (req, res) => {
  const cols = [
    'tomador_cnpj', 'tomador_nome', 'tomador_email', 'tomador_logradouro',
    'tomador_numero', 'tomador_complemento', 'tomador_bairro', 'tomador_cidade',
    'tomador_uf', 'tomador_cep', 'tomador_telefone',
    'discriminacao', 'codigo_servico', 'valor_servico', 'aliquota_iss',
    'competencia', 'optante_simples', 'incentivador_cultural', 'observacoes'
  ];
  const exemplo = [
    '12.345.678/0001-90', 'Empresa Exemplo Ltda', 'empresa@email.com', 'Rua das Flores',
    '100', 'Sala 01', 'Centro', 'São Paulo', 'SP', '01001-000', '(11) 9999-0000',
    'Serviços de consultoria contábil referente ao mês de janeiro', '1.05',
    '5000.00', '5', '2025-01', 'N', 'N', ''
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([cols, exemplo]);
  ws['!cols'] = cols.map(() => ({ wch: 24 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Notas Fiscais');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="modelo_nfse.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ─── PUT /api/invoices/:id — edita nota ──────────────────────────────────────
router.put('/:id', auth, (req, res) => {
  const fields = [
    'tomador_cnpj', 'tomador_nome', 'tomador_email', 'tomador_logradouro',
    'tomador_numero', 'tomador_bairro', 'tomador_cidade', 'tomador_uf', 'tomador_cep',
    'discriminacao', 'codigo_servico', 'valor', 'aliquota', 'iss', 'competencia', 'observacoes'
  ];
  const sets = fields.map(f => `${f} = @${f}`).join(', ');
  const data = { ...req.body, id: req.params.id };
  if (data.valor && data.aliquota) data.iss = parseFloat((data.valor * data.aliquota / 100).toFixed(2));
  db.prepare(`UPDATE invoices SET ${sets}, updated_at = datetime('now') WHERE id = @id`).run(data);
  res.json({ ok: true });
});

// ─── POST /api/invoices/validate — valida lote ───────────────────────────────
router.post('/validate', auth, (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: 'Informe os IDs' });
  const placeholders = ids.map(() => '?').join(',');
  const invs = db.prepare(`SELECT * FROM invoices WHERE id IN (${placeholders})`).all(...ids);
  const results = invs.map(inv => ({ id: inv.id, nome: inv.tomador_nome, errs: validateInvoice(inv) }));
  res.json(results);
});

// ─── POST /api/invoices/emit — emite lote ────────────────────────────────────
router.post('/emit', auth, async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: 'Informe os IDs' });
  const placeholders = ids.map(() => '?').join(',');
  const invs = db.prepare(`SELECT * FROM invoices WHERE id IN (${placeholders}) AND status = 'pendente'`).all(...ids);

  const results = [];

  for (const inv of invs) {
    try {
      const prestador = db.prepare('SELECT * FROM clients WHERE id = ?').get(inv.prestador_id);
      if (!prestador) throw new Error('Prestador não encontrado');

      // Valida antes de emitir
      const errs = validateInvoice(inv);
      if (errs.length) throw new Error(errs.join('; '));

      // Chama serviço ABRASF (stub — integração real por prefeitura)
      const result = await abrasf.emitirNfse(inv, prestador);

      db.prepare(`
        UPDATE invoices SET status='emitida', numero_nfse=?, codigo_verificacao=?,
          data_emissao=date('now'), xml_enviado=?, xml_retorno=?, updated_at=datetime('now')
        WHERE id=?
      `).run(result.numero, result.codigoVerificacao, result.xmlEnviado, result.xmlRetorno, inv.id);

      results.push({ id: inv.id, ok: true, numero: result.numero });
    } catch (err) {
      db.prepare(`UPDATE invoices SET status='erro', erro_msg=?, updated_at=datetime('now') WHERE id=?`)
        .run(err.message, inv.id);
      results.push({ id: inv.id, ok: false, error: err.message });
    }
  }

  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  res.json({ total: invs.length, emitidas: ok, erros: fail, results });
});

// ─── DELETE /api/invoices/:id ─────────────────────────────────────────────────
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id = ? AND status = \'pendente\'').run(req.params.id);
  res.json({ ok: true });
});

// ─── DELETE /api/invoices — exclui vários ────────────────────────────────────
router.delete('/', auth, (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: 'Informe os IDs' });
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM invoices WHERE id IN (${placeholders}) AND status = 'pendente'`).run(...ids);
  res.json({ ok: true });
});

module.exports = router;
