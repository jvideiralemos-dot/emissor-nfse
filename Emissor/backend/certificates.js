const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models/db');
const { auth, gestor } = require('../middleware/auth');

// Armazenamento seguro dos certificados
const certStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'certs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const cnpj = req.body.cnpj?.replace(/\D/g, '') || Date.now();
    cb(null, `cert_${cnpj}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: certStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pfx', '.p12'].includes(ext)) cb(null, true);
    else cb(new Error('Apenas arquivos .pfx ou .p12 são aceitos'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Tenta extrair data de vencimento do PFX usando node-forge
function extractCertExpiry(filePath, password) {
  try {
    const forge = require('node-forge');
    const pfxData = fs.readFileSync(filePath).toString('binary');
    const asn1 = forge.asn1.fromDer(pfxData);
    const pfx = forge.pkcs12.pkcs12FromAsn1(asn1, false, password || '');
    const bags = pfx.getBags({ bagType: forge.pki.oids.certBag });
    const certBags = bags[forge.pki.oids.certBag] || [];
    if (certBags.length > 0) {
      const cert = certBags[0].cert;
      return cert.validity.notAfter.toISOString().slice(0, 10);
    }
  } catch (e) {
    console.warn('Não foi possível extrair validade do certificado:', e.message);
  }
  return null;
}

// GET /api/certificates
router.get('/', auth, (req, res) => {
  const clients = db.prepare('SELECT id, cnpj, name, cert_file, cert_expiry, im, city, uf, active FROM clients ORDER BY name').all();
  res.json(clients);
});

// GET /api/certificates/:id
router.get('/:id', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Não encontrado' });
  const { cert_password, ...safe } = c;
  res.json(safe);
});

// POST /api/certificates — criar empresa
router.post('/', auth, gestor, upload.single('certFile'), (req, res) => {
  const { cnpj, name, certPassword, certExpiry, im, address, city, uf, cep, phone, email } = req.body;
  if (!cnpj || !name) return res.status(400).json({ error: 'CNPJ e razão social obrigatórios' });

  let expiry = certExpiry || null;
  let certFileName = null;

  if (req.file) {
    certFileName = req.file.filename;
    const extracted = extractCertExpiry(req.file.path, certPassword);
    if (extracted) expiry = extracted;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO clients (cnpj, name, cert_file, cert_expiry, cert_password, im, address, city, uf, cep, phone, email)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    const info = stmt.run(cnpj, name, certFileName, expiry, certPassword || null, im||null, address||null, city||null, uf||null, cep||null, phone||null, email||null);
    res.json({ id: info.lastInsertRowid, cnpj, name, cert_file: certFileName, cert_expiry: expiry });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'CNPJ já cadastrado' });
    res.status(500).json({ error: 'Erro ao cadastrar empresa' });
  }
});

// PUT /api/certificates/:id
router.put('/:id', auth, gestor, upload.single('certFile'), (req, res) => {
  const { name, certPassword, certExpiry, im, address, city, uf, cep, phone, email } = req.body;
  const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Não encontrado' });

  let expiry = certExpiry || existing.cert_expiry;
  let certFileName = existing.cert_file;

  if (req.file) {
    // Remove arquivo anterior
    if (existing.cert_file) {
      const oldPath = path.join(__dirname, '..', 'uploads', 'certs', existing.cert_file);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    certFileName = req.file.filename;
    const extracted = extractCertExpiry(req.file.path, certPassword);
    if (extracted) expiry = extracted;
  }

  db.prepare(`
    UPDATE clients SET name=?, cert_file=?, cert_expiry=?, cert_password=?, im=?, address=?, city=?, uf=?, cep=?, phone=?, email=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, certFileName, expiry, certPassword||null, im||null, address||null, city||null, uf||null, cep||null, phone||null, email||null, req.params.id);

  res.json({ ok: true });
});

// DELETE /api/certificates/:id
router.delete('/:id', auth, gestor, (req, res) => {
  const c = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Não encontrado' });
  if (c.cert_file) {
    const filePath = path.join(__dirname, '..', 'uploads', 'certs', c.cert_file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
