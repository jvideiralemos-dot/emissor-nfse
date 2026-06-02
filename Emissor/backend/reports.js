const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { auth } = require('../middleware/auth');
const archiver = require('archiver');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// GET /api/reports — lista notas emitidas
router.get('/', auth, (req, res) => {
  const { empresa, periodo, status, page = 1, limit = 50 } = req.query;
  let sql = `SELECT * FROM invoices WHERE status IN ('emitida', 'cancelada')`;
  const params = [];
  if (empresa) { sql += ' AND prestador_nome LIKE ?'; params.push(`%${empresa}%`); }
  if (periodo) { sql += ' AND (competencia LIKE ? OR data_emissao LIKE ?)'; params.push(`%${periodo}%`, `%${periodo}%`); }
  if (status && status !== 'todos') { sql += ' AND status = ?'; params.push(status); }
  sql += ` ORDER BY data_emissao DESC LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page)-1)*parseInt(limit)}`;
  const rows = db.prepare(sql).all(...params);

  // Totais
  let totalSql = `SELECT COUNT(*) as total, SUM(valor) as valor_total, SUM(iss) as iss_total FROM invoices WHERE status IN ('emitida', 'cancelada')`;
  const totals = db.prepare(totalSql).get();

  res.json({ data: rows, totals });
});

// GET /api/reports/:id/pdf — gera PDF da nota (stub — em produção usar pdfkit)
router.get('/:id/pdf', auth, (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Nota não encontrada' });
  // Em produção: gerar PDF real com pdfkit ou puppeteer
  // Por ora retorna os dados para o frontend renderizar
  res.json(inv);
});

// POST /api/reports/download-zip — baixa várias notas em ZIP
router.post('/download-zip', auth, (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ error: 'Informe os IDs' });

  const placeholders = ids.map(() => '?').join(',');
  const invs = db.prepare(`SELECT * FROM invoices WHERE id IN (${placeholders})`).all(...ids);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="nfse_${Date.now()}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);

  invs.forEach(inv => {
    const content = `NFS-e Nº ${inv.numero_nfse || inv.id}
Prestador: ${inv.prestador_nome}
Tomador: ${inv.tomador_nome} (${inv.tomador_cnpj})
Valor: R$ ${inv.valor?.toFixed(2)}
ISS: R$ ${inv.iss?.toFixed(2)}
Discriminação: ${inv.discriminacao}
Data: ${inv.data_emissao}
Cód. Verificação: ${inv.codigo_verificacao || '-'}`;

    const xmlPath = path.join(__dirname, '..', 'uploads', 'xml', `${inv.id}.xml`);
    if (fs.existsSync(xmlPath)) {
      archive.file(xmlPath, { name: `nfse_${inv.numero_nfse || inv.id}.xml` });
    } else {
      archive.append(content, { name: `nfse_${inv.numero_nfse || inv.id}.txt` });
    }
  });

  archive.finalize();
});

// POST /api/reports/send-email — envia notas por email
router.post('/send-email', auth, async (req, res) => {
  const { ids, to, message } = req.body;
  if (!ids?.length || !to) return res.status(400).json({ error: 'Informe os IDs e destinatário' });

  const placeholders = ids.map(() => '?').join(',');
  const invs = db.prepare(`SELECT * FROM invoices WHERE id IN (${placeholders})`).all(...ids);

  // Configurar transporter com variáveis de ambiente
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const attachments = invs.map(inv => {
    const xmlPath = path.join(__dirname, '..', 'uploads', 'xml', `${inv.id}.xml`);
    if (fs.existsSync(xmlPath)) {
      return { filename: `nfse_${inv.numero_nfse || inv.id}.xml`, path: xmlPath };
    }
    return {
      filename: `nfse_${inv.numero_nfse || inv.id}.txt`,
      content: `NFS-e ${inv.numero_nfse} — ${inv.tomador_nome} — R$ ${inv.valor?.toFixed(2)}`
    };
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `NFS-e — ${invs.length} nota(s) fiscal(is)`,
      text: message || `Segue em anexo ${invs.length} nota(s) fiscal(is).`,
      attachments,
    });
    res.json({ ok: true, enviadas: invs.length });
  } catch (err) {
    console.error('E-mail error:', err.message);
    res.status(500).json({ error: 'Falha ao enviar e-mail: ' + err.message });
  }
});

// POST /api/reports/cancel/:id — cancelar NFS-e
router.post('/cancel/:id', auth, (req, res) => {
  db.prepare(`UPDATE invoices SET status='cancelada', updated_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
