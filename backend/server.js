/**
 * NFS-e Emissor Nacional — Backend Node.js
 * Stack: Express + SQLite + Multer + node-forge (certificados)
 * Padrão: ABRASF v2.03
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Criar pasta uploads se não existir
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// ─── ROTAS ────────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/clients',      require('./routes/clients'));
app.use('/api/invoices',     require('./routes/invoices'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/reports',      require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Serve frontend em produção
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🟢 NFS-e Emissor rodando em http://localhost:${PORT}`);
  console.log(`📋 API disponível em http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
