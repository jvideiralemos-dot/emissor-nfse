# NFS-e Emissor Nacional

Sistema de emissão em massa de Nota Fiscal de Serviços Eletrônica (NFS-e)  
Padrão ABRASF v2.03 — para uso por escritórios de contabilidade.

---

## 🗂 Estrutura do projeto

```
nfse-system/
├── frontend/
│   ├── index.html       # HTML + CSS completo
│   └── app.jsx          # React app (todas as telas)
└── backend/
    ├── server.js        # Servidor Express
    ├── package.json
    ├── models/
    │   └── db.js        # SQLite (criação automática do banco)
    ├── routes/
    │   ├── auth.js      # Login / JWT
    │   ├── users.js     # Usuários
    │   ├── certificates.js  # Certificados PFX
    │   ├── invoices.js  # Fila de emissão
    │   └── reports.js   # Relatórios + e-mail + ZIP
    └── services/
        └── abrasf.js    # Geração XML ABRASF + stub de emissão
```

---

## ✅ Pré-requisitos

- **Node.js** >= 18 ([nodejs.org](https://nodejs.org))
- **npm** >= 9

---

## 🚀 Instalação em 4 passos

### 1. Instale as dependências do backend

```bash
cd nfse-system/backend
npm install
```

### 2. Configure as variáveis de ambiente (opcional para teste)

Crie o arquivo `backend/.env`:

```env
PORT=3001
JWT_SECRET=troque_por_uma_chave_segura_aqui

# Para envio de e-mail (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=sua_senha_de_app
SMTP_FROM=NFS-e Emissor <seu@email.com>
```

### 3. Inicie o servidor

```bash
# Modo desenvolvimento (com auto-reload)
npm run dev

# OU modo produção
npm start
```

Você verá:
```
🟢 NFS-e Emissor rodando em http://localhost:3001
```

### 4. Abra o frontend

Abra o arquivo `frontend/index.html` **diretamente no navegador** para testar,  
ou acesse `http://localhost:3001` (o backend serve o frontend automaticamente).

---

## 🔐 Acesso inicial

| E-mail | Senha | Perfil |
|--------|-------|--------|
| `admin@sistema.com` | `Admin@2025` | Gestor |

Crie novos usuários pelo menu **Usuários** após o primeiro login.

---

## 📋 Funcionalidades

| Menu | Perfil | Descrição |
|------|--------|-----------|
| Emissor de NFS-e | Todos | Upload planilha, validação, emissão em massa |
| Relatórios | Todos | Consulta, PDF, envio por e-mail, download ZIP |
| Certificados | Gestor | Upload .pfx, controle de vencimento |
| Usuários | Gestor | Cadastro com perfil Operador / Gestor |

---

## 🔗 Integração real com prefeituras

O arquivo `backend/services/abrasf.js` contém o **gerador de XML ABRASF v2.03** completo.  
Para ativar a emissão real:

1. Instale as libs de assinatura:
   ```bash
   npm install node-soap node-forge
   ```

2. No `abrasf.js`, substitua a função `emitirNfse()` pela chamada SOAP real:
   ```js
   const client = await soap.createClientAsync(WSDL_DA_PREFEITURA);
   const result = await client.RecepcionarLoteRpsAsync({ xml: xmlAssinado });
   ```

3. Assine o XML com o certificado PFX usando `node-forge` (exemplo comentado no código).

**WSDLs por cidade:**
- São Paulo: `https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx?wsdl`
- Rio de Janeiro: `https://notacarioca.rio.gov.br/WSNacional/nfse.asmx?wsdl`
- Campinas: `https://issdigital.campinas.sp.gov.br/WsNFe2/LoteRps.jws?wsdl`
- Demais: consultar o portal do [Emissor Nacional](https://www.nfse.gov.br/)

---

## 🌐 Deploy em produção (Railway/Render — gratuito)

### Railway

```bash
npm install -g railway
railway login
railway init
railway up
```

### Render

1. Conecte o GitHub com o repositório
2. Crie um **Web Service** apontando para `backend/`
3. Build command: `npm install`
4. Start command: `npm start`
5. Adicione as variáveis de ambiente no painel

---

## 🗄 Banco de dados

O banco SQLite é criado automaticamente em `backend/data/nfse.db`  
no primeiro acesso. Para produção com múltiplos usuários simultâneos,  
recomenda-se migrar para **PostgreSQL** (troque `better-sqlite3` por `pg`).

---

## 🔒 Segurança em produção

- [ ] Troque `JWT_SECRET` por uma string aleatória longa
- [ ] Use HTTPS (certbot / Cloudflare)  
- [ ] Habilite rate limiting (`express-rate-limit`)
- [ ] Armazene certificados PFX com criptografia adicional
- [ ] Configure backups automáticos do banco

---

## 📞 Suporte

Sistema desenvolvido para escritórios de contabilidade.  
Para dúvidas sobre integração com prefeituras específicas, consulte  
o portal oficial: https://www.nfse.gov.br
