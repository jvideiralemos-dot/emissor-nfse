/**
 * db.js — Configuração do banco SQLite
 */
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'nfse.db');

// Garantir que a pasta data existe
const fs = require('fs');
if (!fs.existsSync(path.join(__dirname, '..', 'data'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
}

const db = new Database(DB_PATH);

// WAL mode para melhor performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'operador', -- 'gestor' | 'operador'
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj          TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    cert_file     TEXT,
    cert_expiry   TEXT,
    cert_password TEXT, -- criptografado
    im            TEXT,  -- inscrição municipal
    address       TEXT,
    city          TEXT,
    uf            TEXT,
    cep           TEXT,
    phone         TEXT,
    email         TEXT,
    active        INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id                  TEXT PRIMARY KEY,
    prestador_id        INTEGER REFERENCES clients(id),
    prestador_nome      TEXT,
    prestador_cnpj      TEXT,
    tomador_cnpj        TEXT,
    tomador_nome        TEXT,
    tomador_email       TEXT,
    tomador_logradouro  TEXT,
    tomador_numero      TEXT,
    tomador_complemento TEXT,
    tomador_bairro      TEXT,
    tomador_cidade      TEXT,
    tomador_uf          TEXT,
    tomador_cep         TEXT,
    tomador_telefone    TEXT,
    discriminacao       TEXT NOT NULL,
    codigo_servico      TEXT,
    valor               REAL NOT NULL,
    aliquota            REAL DEFAULT 5,
    iss                 REAL,
    competencia         TEXT,
    optante_simples     TEXT DEFAULT 'N',
    incentivador        TEXT DEFAULT 'N',
    observacoes         TEXT,
    status              TEXT DEFAULT 'pendente', -- pendente | emitida | cancelada | erro
    numero_nfse         TEXT,
    codigo_verificacao  TEXT,
    data_emissao        TEXT,
    xml_enviado         TEXT,
    xml_retorno         TEXT,
    erro_msg            TEXT,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id),
    action      TEXT NOT NULL,
    entity      TEXT,
    entity_id   TEXT,
    details     TEXT,
    ip          TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

// ─── SEED: usuário admin padrão ───────────────────────────────────────────────
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@sistema.com');
if (!adminExists) {
  const hash = bcrypt.hashSync('Admin@2025', 10);
  db.prepare(`
    INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)
  `).run('Administrador', 'admin@sistema.com', hash, 'gestor');
  console.log('✅ Usuário admin criado: admin@sistema.com / Admin@2025');
}

module.exports = db;
