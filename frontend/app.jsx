const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

// ─── STORAGE HELPERS (persistência entre sessões) ─────────────────────────────
const store = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ─── DADOS INICIAIS ───────────────────────────────────────────────────────────
const INIT_USERS = [
  { id: 1, name: 'Carlos Oliveira', email: 'carlos@contabil.com', password: '123456', role: 'gestor', active: true },
  { id: 2, name: 'Ana Paula Silva', email: 'ana@contabil.com', password: '123456', role: 'operador', active: true },
];

const INIT_COMPANIES = [
  {
    id: 1, cnpj: '12.345.678/0001-90', name: 'Tech Solutions Ltda',
    im: '123456-7', logradouro: 'Rua das Flores', numero: '100', complemento: 'Sala 5',
    bairro: 'Centro', cidade: 'Niterói', uf: 'RJ', cep: '24020-005',
    telefone: '(21) 3333-0000', email: 'fiscal@techsolutions.com',
    simplesNacional: true, regimeTributario: '1',
    // Padrões fiscais
    codigoTributacaoNacional: '010701', codigoTributacaoMunicipal: '010701001',
    itemListaServico: '1.07', nbs: '1.0507.00.00',
    aliquotaIss: 5, issRetido: false,
    // Retenções federais
    retPis: false, retCofins: false, retCsll: false, retIrpj: false, retInss: false,
    aliquotaPis: 0.65, aliquotaCofins: 3, aliquotaCsll: 1, aliquotaIrpj: 1.5, aliquotaInss: 11,
    certFile: null, certExpiry: '2026-12-31', certPassword: '',
  },
  {
    id: 2, cnpj: '98.765.432/0001-10', name: 'Consultoria Alfa S.A.',
    im: '234567-8', logradouro: 'Av. Presidente Vargas', numero: '500', complemento: '',
    bairro: 'Icaraí', cidade: 'Niterói', uf: 'RJ', cep: '24220-000',
    telefone: '(21) 4444-0000', email: 'nfse@consultoriaalfa.com',
    simplesNacional: false, regimeTributario: '3',
    codigoTributacaoNacional: '020101', codigoTributacaoMunicipal: '020101001',
    itemListaServico: '17.06', nbs: '1.0101.00.00',
    aliquotaIss: 5, issRetido: false,
    retPis: true, retCofins: true, retCsll: true, retIrpj: true, retInss: false,
    aliquotaPis: 0.65, aliquotaCofins: 3, aliquotaCsll: 1, aliquotaIrpj: 1.5, aliquotaInss: 11,
    certFile: null, certExpiry: '2024-08-15', certPassword: '',
  },
];

const INIT_ISSUED = [
  {
    id: 'NF-LXQ1A', numero: '000001', competencia: '2025-01',
    prestadorId: 1, prestadorNome: 'Tech Solutions Ltda', prestadorCnpj: '12.345.678/0001-90', prestadorIm: '123456-7',
    tomadorNome: 'Empresa X Ltda', tomadorCnpj: '11.111.111/0001-11', tomadorCidade: 'Rio de Janeiro', tomadorUf: 'RJ',
    discriminacao: 'Serviços de consultoria em TI referente ao mês de janeiro/2025',
    itemListaServico: '1.07', codigoTributacaoNacional: '010701', nbs: '1.0507.00.00',
    valor: 5000, aliquota: 5, iss: 250, issRetido: false,
    status: 'emitida', dataEmissao: '2025-01-15', codigoVerificacao: 'ABCD1234',
  },
  {
    id: 'NF-LXQ2B', numero: '000002', competencia: '2025-01',
    prestadorId: 1, prestadorNome: 'Tech Solutions Ltda', prestadorCnpj: '12.345.678/0001-90', prestadorIm: '123456-7',
    tomadorNome: 'Empresa Y ME', tomadorCnpj: '22.222.222/0001-22', tomadorCidade: 'Niterói', tomadorUf: 'RJ',
    discriminacao: 'Desenvolvimento de sistema de gestão financeira',
    itemListaServico: '1.07', codigoTributacaoNacional: '010701', nbs: '1.0507.00.00',
    valor: 12000, aliquota: 5, iss: 600, issRetido: false,
    status: 'emitida', dataEmissao: '2025-01-20', codigoVerificacao: 'EFGH5678',
  },
];

function genId() { return 'NF-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase(); }

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const AppCtx = createContext(null);
function useApp() { return useContext(AppCtx); }

// ─── TOAST ────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const users = store.get('nfse_users', INIT_USERS);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setErr('');
    await new Promise(r => setTimeout(r, 600));
    const user = users.find(u => u.email === email && u.password === pw && u.active);
    if (user) onLogin(user);
    else { setErr('E-mail ou senha incorretos.'); setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid"></div>
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">N</div>
          <div className="login-logo-text">
            <div className="login-logo-name">NFS-e Emissor</div>
            <div className="login-logo-sub">PADRÃO ABRASF — EMISSOR NACIONAL</div>
          </div>
        </div>
        <div className="login-heading">Acesso ao sistema</div>
        <div className="login-sub">Entre com suas credenciais de acesso</div>
        <form onSubmit={submit}>
          <div className="form-group" style={{marginBottom:14}}>
            <label className="form-label" style={{color:'var(--blue-300)',fontSize:11}}>E-MAIL</label>
            <input className="login-input" type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="form-group" style={{marginBottom:6}}>
            <label className="form-label" style={{color:'var(--blue-300)',fontSize:11}}>SENHA</label>
            <input className="login-input" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} required />
          </div>
          {err && <div className="login-err">⚠ {err}</div>}
          <button className="login-btn" type="submit" disabled={loading} style={{marginTop:20}}>
            {loading ? 'Verificando...' : 'Entrar no sistema'}
          </button>
        </form>
        <div style={{marginTop:20,fontSize:11,color:'var(--blue-400)',textAlign:'center'}}>
          Demo: carlos@contabil.com / 123456
        </div>
      </div>
    </div>
  );
}

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
function UsersPage() {
  const { toast, currentUser } = useApp();
  const [users, setUsers] = useState(() => store.get('nfse_users', INIT_USERS));
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'operador', active:true });

  const save = () => {
    if (!form.name || !form.email) return toast('Preencha nome e e-mail', 'error');
    const updated = editing
      ? users.map(u => u.id === editing.id ? { ...u, ...form, password: form.password || u.password } : u)
      : [...users, { ...form, id: Date.now() }];
    setUsers(updated); store.set('nfse_users', updated);
    toast(editing ? 'Usuário atualizado' : 'Usuário criado', 'success');
    setShowModal(false);
  };

  const toggle = (id) => {
    const updated = users.map(u => u.id === id ? { ...u, active: !u.active } : u);
    setUsers(updated); store.set('nfse_users', updated);
  };

  return (
    <div>
      <div className="flex-row" style={{marginBottom:20,justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:16,fontWeight:600}}>Usuários do Sistema</div>
          <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>Controle de acesso e perfis</div>
        </div>
        {currentUser.role === 'gestor' && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({name:'',email:'',password:'',role:'operador',active:true}); setShowModal(true); }}>
            + Novo Usuário
          </button>
        )}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>NOME</th><th>E-MAIL</th><th>PERFIL</th><th>STATUS</th>{currentUser.role==='gestor'&&<th>AÇÕES</th>}</tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div className="user-avatar" style={{width:28,height:28,fontSize:10,background:u.role==='gestor'?'var(--blue-500)':'var(--gray-400)'}}>
                        {u.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                      </div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{color:'var(--gray-500)'}}>{u.email}</td>
                  <td><span className={`badge ${u.role==='gestor'?'badge-info':'badge-gray'}`}>{u.role==='gestor'?'Gestor':'Operador'}</span></td>
                  <td><span className={`badge ${u.active?'badge-success':'badge-danger'}`}>{u.active?'Ativo':'Inativo'}</span></td>
                  {currentUser.role==='gestor'&&(
                    <td>
                      <div className="flex-row gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={()=>{setEditing(u);setForm({...u,password:''});setShowModal(true);}}>Editar</button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>toggle(u.id)}>{u.active?'Desativar':'Ativar'}</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editing?'Editar Usuário':'Novo Usuário'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Nome *</label>
                  <input className="form-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">E-mail *</label>
                  <input className="form-control" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Senha {editing&&'(em branco = manter)'}</label>
                  <input className="form-control" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Perfil</label>
                  <select className="form-control" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                    <option value="operador">Operador</option><option value="gestor">Gestor</option>
                  </select></div>
              </div>
              <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
                <input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} /> Usuário ativo
              </label>
              <div className="alert alert-info" style={{marginTop:14,fontSize:12}}>
                <strong>Gestor:</strong> acesso total. &nbsp;<strong>Operador:</strong> emissão e relatórios apenas.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EMPRESAS PAGE (antigo Certificados) ─────────────────────────────────────
function EmpresasPage() {
  const { toast } = useApp();
  const [companies, setCompanies] = useState(() => store.get('nfse_companies', INIT_COMPANIES));
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');
  const fileRef = useRef();
  const emptyForm = {
    cnpj:'', name:'', im:'', logradouro:'', numero:'', complemento:'',
    bairro:'', cidade:'', uf:'RJ', cep:'', telefone:'', email:'',
    simplesNacional:false, regimeTributario:'1',
    codigoTributacaoNacional:'', codigoTributacaoMunicipal:'', itemListaServico:'', nbs:'',
    aliquotaIss:5, issRetido:false,
    retPis:false, retCofins:false, retCsll:false, retIrpj:false, retInss:false,
    aliquotaPis:0.65, aliquotaCofins:3, aliquotaCsll:1, aliquotaIrpj:1.5, aliquotaInss:11,
    certFile:null, certExpiry:'', certPassword:'',
  };
  const [form, setForm] = useState(emptyForm);
  const [dragging, setDragging] = useState(false);

  const f = (field, val) => setForm(p => ({...p, [field]: val}));

  const getCertStatus = (exp) => {
    if (!exp) return { label:'Sem certificado', cls:'badge-gray', dot:'' };
    const diff = (new Date(exp) - new Date()) / 86400000;
    if (diff < 0) return { label:'Vencido', cls:'badge-danger', dot:'cert-exp' };
    if (diff < 60) return { label:`Vence em ${Math.ceil(diff)}d`, cls:'badge-warning', dot:'cert-warn' };
    return { label:`Válido até ${exp}`, cls:'badge-success', dot:'cert-ok' };
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setActiveTab('geral'); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({...c}); setActiveTab('geral'); setShowModal(true); };

  const handleCert = (e) => {
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (!file) return;
    if (!file.name.match(/\.(pfx|p12)$/i)) { toast('Use arquivos .pfx ou .p12', 'error'); return; }
    const mockExpiry = new Date(Date.now() + 365*86400000).toISOString().slice(0,10);
    setForm(p => ({...p, certFile: file.name, certExpiry: mockExpiry}));
    toast(`Certificado "${file.name}" carregado. Validade extraída.`, 'success');
  };

  const save = () => {
    if (!form.cnpj || !form.name || !form.im) return toast('CNPJ, razão social e inscrição municipal são obrigatórios', 'error');
    const updated = editing
      ? companies.map(c => c.id === editing.id ? {...c,...form} : c)
      : [...companies, {...form, id: Date.now()}];
    setCompanies(updated); store.set('nfse_companies', updated);
    toast(editing ? 'Empresa atualizada' : 'Empresa cadastrada', 'success');
    setShowModal(false);
  };

  const del = (id) => {
    if (!window.confirm('Remover esta empresa?')) return;
    const updated = companies.filter(c => c.id !== id);
    setCompanies(updated); store.set('nfse_companies', updated);
    toast('Empresa removida', 'info');
  };

  const expiring = companies.filter(c => { if (!c.certExpiry) return false; const d=(new Date(c.certExpiry)-new Date())/86400000; return d>=0&&d<60; });

  const TABS = ['geral', 'fiscal', 'retenções', 'certificado'];

  return (
    <div>
      <div className="flex-row" style={{marginBottom:20,justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:16,fontWeight:600}}>Empresas Prestadoras</div>
          <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>Cadastro completo de prestadores de serviço</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nova Empresa</button>
      </div>

      {expiring.length > 0 && (
        <div className="alert alert-warning" style={{marginBottom:16}}>
          ⚠ {expiring.length} certificado(s) vencem em menos de 60 dias: {expiring.map(c=>c.name).join(', ')}
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>EMPRESA</th><th>CNPJ</th><th>INSCRIÇÃO MUNICIPAL</th><th>REGIME</th><th>CERTIFICADO</th><th>AÇÕES</th></tr>
            </thead>
            <tbody>
              {companies.map(c => {
                const st = getCertStatus(c.certExpiry);
                const regimes = {'1':'Simples Nacional','2':'Estimativa','3':'Lucro Presumido','4':'Lucro Real'};
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{fontWeight:500}}>{c.name}</div>
                      <div style={{fontSize:11,color:'var(--gray-400)'}}>{c.cidade}/{c.uf}</div>
                    </td>
                    <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{c.cnpj}</td>
                    <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{c.im || '—'}</td>
                    <td>
                      <span className="badge badge-gray" style={{fontSize:10}}>
                        {c.simplesNacional ? 'Simples' : regimes[c.regimeTributario] || '—'}
                      </span>
                    </td>
                    <td>
                      <div className={`cert-status ${st.dot}`}>
                        <div className="cert-dot"></div>
                        <span className={`badge ${st.cls}`} style={{fontSize:10}}>{st.label}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex-row gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={()=>openEdit(c)}>Editar</button>
                        <button className="btn btn-ghost btn-sm" style={{color:'var(--red-600)'}} onClick={()=>del(c.id)}>Remover</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {companies.length===0&&<tr><td colSpan={6}><div className="empty-state">Nenhuma empresa cadastrada</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EMPRESA */}
      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{maxWidth:720}}>
            <div className="modal-header">
              <div className="modal-title">{editing?'Editar Empresa':'Nova Empresa'}</div>
              <button className="modal-close" onClick={()=>setShowModal(false)}>×</button>
            </div>
            <div style={{display:'flex',borderBottom:'1px solid var(--gray-200)',padding:'0 22px',gap:0}}>
              {TABS.map(t => (
                <button key={t} onClick={()=>setActiveTab(t)}
                  style={{padding:'10px 16px',background:'none',border:'none',borderBottom:`2px solid ${activeTab===t?'var(--blue-600)':'transparent'}`,
                    color:activeTab===t?'var(--blue-700)':'var(--gray-500)',fontSize:13,fontWeight:activeTab===t?600:400,cursor:'pointer',textTransform:'capitalize'}}>
                  {t === 'retenções' ? 'Retenções' : t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
            <div className="modal-body">

              {/* ABA GERAL */}
              {activeTab==='geral' && (
                <>
                  <div className="grid-2">
                    <div className="form-group"><label className="form-label">CNPJ *</label>
                      <input className="form-control" style={{fontFamily:'var(--font-mono)'}} placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e=>f('cnpj',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Razão Social *</label>
                      <input className="form-control" value={form.name} onChange={e=>f('name',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Inscrição Municipal *</label>
                      <input className="form-control" style={{fontFamily:'var(--font-mono)'}} value={form.im} onChange={e=>f('im',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">E-mail</label>
                      <input className="form-control" type="email" value={form.email} onChange={e=>f('email',e.target.value)} /></div>
                  </div>
                  <div className="grid-3">
                    <div className="form-group" style={{gridColumn:'span 2'}}><label className="form-label">Logradouro</label>
                      <input className="form-control" value={form.logradouro} onChange={e=>f('logradouro',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Número</label>
                      <input className="form-control" value={form.numero} onChange={e=>f('numero',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Complemento</label>
                      <input className="form-control" value={form.complemento} onChange={e=>f('complemento',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Bairro</label>
                      <input className="form-control" value={form.bairro} onChange={e=>f('bairro',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">CEP</label>
                      <input className="form-control" style={{fontFamily:'var(--font-mono)'}} value={form.cep} onChange={e=>f('cep',e.target.value)} /></div>
                    <div className="form-group" style={{gridColumn:'span 2'}}><label className="form-label">Cidade</label>
                      <input className="form-control" value={form.cidade} onChange={e=>f('cidade',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">UF</label>
                      <input className="form-control" value={form.uf} onChange={e=>f('uf',e.target.value)} maxLength={2} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Telefone</label>
                    <input className="form-control" style={{width:200}} value={form.telefone} onChange={e=>f('telefone',e.target.value)} /></div>
                </>
              )}

              {/* ABA FISCAL */}
              {activeTab==='fiscal' && (
                <>
                  <div className="alert alert-info" style={{marginBottom:16,fontSize:12}}>
                    Estes dados serão usados como padrão ao emitir notas desta empresa. Podem ser alterados nota a nota.
                  </div>
                  <div className="grid-2">
                    <div className="form-group"><label className="form-label">Regime Tributário</label>
                      <select className="form-control" value={form.regimeTributario} onChange={e=>f('regimeTributario',e.target.value)}>
                        <option value="1">Simples Nacional</option>
                        <option value="2">Estimativa</option>
                        <option value="3">Lucro Presumido</option>
                        <option value="4">Lucro Real</option>
                      </select></div>
                    <div className="form-group"><label className="form-label">Alíquota ISS padrão (%)</label>
                      <input className="form-control" type="number" step="0.01" min="0" max="5" value={form.aliquotaIss} onChange={e=>f('aliquotaIss',parseFloat(e.target.value)||0)} /></div>
                    <div className="form-group"><label className="form-label">Item Lista de Serviço (LC 116)</label>
                      <input className="form-control" placeholder="Ex: 1.07" value={form.itemListaServico} onChange={e=>f('itemListaServico',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Cód. Tributação Nacional (cTribNac)</label>
                      <input className="form-control" style={{fontFamily:'var(--font-mono)'}} placeholder="Ex: 010701" value={form.codigoTributacaoNacional} onChange={e=>f('codigoTributacaoNacional',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Cód. Tributação Municipal</label>
                      <input className="form-control" style={{fontFamily:'var(--font-mono)'}} placeholder="Ex: 010701001" value={form.codigoTributacaoMunicipal} onChange={e=>f('codigoTributacaoMunicipal',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">NBS (Nomenclatura Brasileira de Serviços)</label>
                      <input className="form-control" style={{fontFamily:'var(--font-mono)'}} placeholder="Ex: 1.0507.00.00" value={form.nbs} onChange={e=>f('nbs',e.target.value)} /></div>
                  </div>
                  <div style={{display:'flex',gap:24,marginTop:4}}>
                    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
                      <input type="checkbox" checked={form.simplesNacional} onChange={e=>f('simplesNacional',e.target.checked)} />
                      Optante pelo Simples Nacional
                    </label>
                    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
                      <input type="checkbox" checked={form.issRetido} onChange={e=>f('issRetido',e.target.checked)} />
                      ISS Retido na fonte (padrão)
                    </label>
                  </div>
                </>
              )}

              {/* ABA RETENÇÕES */}
              {activeTab==='retenções' && (
                <>
                  <div className="alert alert-info" style={{marginBottom:16,fontSize:12}}>
                    Defina as retenções federais padrão desta empresa. Serão aplicadas automaticamente nas notas.
                  </div>
                  <table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:'var(--gray-50)'}}>
                        <th style={{padding:'8px 12px',textAlign:'left',fontSize:11,color:'var(--gray-500)',borderBottom:'1px solid var(--gray-200)'}}>TRIBUTO</th>
                        <th style={{padding:'8px 12px',textAlign:'center',fontSize:11,color:'var(--gray-500)',borderBottom:'1px solid var(--gray-200)'}}>RETER</th>
                        <th style={{padding:'8px 12px',textAlign:'right',fontSize:11,color:'var(--gray-500)',borderBottom:'1px solid var(--gray-200)'}}>ALÍQUOTA (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['PIS', 'retPis', 'aliquotaPis'],
                        ['COFINS', 'retCofins', 'aliquotaCofins'],
                        ['CSLL', 'retCsll', 'aliquotaCsll'],
                        ['IRPJ', 'retIrpj', 'aliquotaIrpj'],
                        ['INSS', 'retInss', 'aliquotaInss'],
                      ].map(([label, retKey, aqKey]) => (
                        <tr key={label} style={{borderBottom:'1px solid var(--gray-100)'}}>
                          <td style={{padding:'10px 12px',fontWeight:500}}>{label}</td>
                          <td style={{padding:'10px 12px',textAlign:'center'}}>
                            <input type="checkbox" checked={form[retKey]} onChange={e=>f(retKey,e.target.checked)} />
                          </td>
                          <td style={{padding:'10px 12px',textAlign:'right'}}>
                            <input className="form-control" type="number" step="0.01" min="0" max="100"
                              style={{width:90,textAlign:'right',marginLeft:'auto'}}
                              value={form[aqKey]} onChange={e=>f(aqKey,parseFloat(e.target.value)||0)}
                              disabled={!form[retKey]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* ABA CERTIFICADO */}
              {activeTab==='certificado' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Certificado Digital A1 (.pfx / .p12)</label>
                    <div
                      className={`upload-zone ${dragging?'drag-over':''}`}
                      style={{padding:20}}
                      onDragOver={e=>{e.preventDefault();setDragging(true);}}
                      onDragLeave={()=>setDragging(false)}
                      onDrop={e=>{setDragging(false);handleCert(e);}}
                      onClick={()=>fileRef.current?.click()}
                    >
                      <input ref={fileRef} type="file" accept=".pfx,.p12" style={{display:'none'}} onChange={handleCert} />
                      {form.certFile
                        ? <div style={{color:'var(--blue-600)',fontWeight:500,fontSize:13}}>🔐 {form.certFile}<div style={{fontSize:11,color:'var(--gray-400)',marginTop:4}}>Clique para substituir</div></div>
                        : <div className="upload-text"><div style={{fontSize:24,marginBottom:8}}>🔐</div>Arraste o <strong>.pfx ou .p12</strong> aqui ou clique para selecionar</div>}
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group"><label className="form-label">Senha do certificado</label>
                      <input className="form-control" type="password" value={form.certPassword} onChange={e=>f('certPassword',e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Vencimento (extraído automaticamente)</label>
                      <input className="form-control" type="date" value={form.certExpiry} onChange={e=>f('certExpiry',e.target.value)} /></div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>Salvar empresa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VALIDAÇÃO DE NOTA ────────────────────────────────────────────────────────
function validateInv(inv) {
  const errs = [];
  if (!inv.tomadorCnpj) errs.push('CNPJ/CPF do tomador ausente');
  if (!inv.tomadorNome) errs.push('Nome do tomador ausente');
  if (!inv.discriminacao || inv.discriminacao.trim().length < 10) errs.push('Discriminação muito curta (mín. 10 caracteres)');
  if (!inv.valor || inv.valor <= 0) errs.push('Valor inválido ou zero');
  if (!inv.competencia || !/^\d{4}-\d{2}$/.test(inv.competencia)) errs.push('Competência inválida (use AAAA-MM)');
  if (!inv.itemListaServico) errs.push('Item da lista de serviço ausente');
  if (!inv.codigoTributacaoNacional) errs.push('Código de tributação nacional ausente');
  if (inv.aliquota < 0 || inv.aliquota > 5) errs.push('Alíquota ISS fora do intervalo (0–5%)');
  if (/[<>&"']/.test(inv.discriminacao || '')) errs.push('Discriminação contém caracteres inválidos (<>&"\')');
  return errs;
}

// ─── EMISSOR PAGE ─────────────────────────────────────────────────────────────
function EmissorPage() {
  const { toast } = useApp();
  const companies = store.get('nfse_companies', INIT_COMPANIES);

  // Persistência da fila entre sessões
  const [invoices, setInvoices] = useState(() => store.get('nfse_queue', []));
  const saveInvoices = (inv) => { setInvoices(inv); store.set('nfse_queue', inv); };

  const [step, setStep] = useState(() => store.get('nfse_queue',[]).length > 0 ? 'list' : 'upload');
  const [prestadorId, setPrestadorId] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [filters, setFilters] = useState({ periodo:'', tomador:'', status:'' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showEmitModal, setShowEmitModal] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validResults, setValidResults] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({});
  const fileRef = useRef();

  const comp = companies.find(c => c.id === parseInt(prestadorId));

  const downloadTemplate = () => {
    if (!window.XLSX) { toast('Biblioteca XLSX não disponível', 'error'); return; }
    const cols = [
      'tomador_cnpj','tomador_nome','tomador_email','tomador_logradouro','tomador_numero',
      'tomador_complemento','tomador_bairro','tomador_cidade','tomador_uf','tomador_cep','tomador_telefone',
      'discriminacao','item_lista_servico','codigo_tributacao_nacional','codigo_tributacao_municipal',
      'nbs','valor_servico','aliquota_iss','iss_retido','competencia',
      'optante_simples','ret_pis','ret_cofins','ret_csll','ret_irpj','ret_inss','observacoes'
    ];
    const exemplo = [
      '12.345.678/0001-90','Empresa Exemplo Ltda','fiscal@empresa.com','Rua das Flores','100',
      'Sala 01','Centro','Niterói','RJ','24020-005','(21) 9999-0000',
      'Serviços de consultoria contábil referente ao mês de janeiro/2025','1.07','010701','010701001',
      '1.0507.00.00','5000.00','5','N','2025-01',
      'N','N','N','N','N','N',''
    ];
    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet([cols, exemplo]);
    ws['!cols'] = cols.map(() => ({wch:24}));
    window.XLSX.utils.book_append_sheet(wb, ws, 'Notas Fiscais');
    window.XLSX.writeFile(wb, 'modelo_nfse.xlsx');
    toast('Planilha modelo baixada!', 'success');
  };

  const handleUpload = (e) => {
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (!file) return;
    if (!prestadorId) { toast('Selecione o prestador antes de importar', 'error'); return; }
    const prestador = companies.find(c => c.id === parseInt(prestadorId));
    if (!window.XLSX) { importMock(prestador); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = window.XLSX.read(ev.target.result, {type:'binary'});
        const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (!rows.length) { toast('Planilha vazia', 'error'); return; }
        const mapped = rows.map(r => mapRow(r, prestador));
        saveInvoices(mapped); setSelected(new Set()); setValidResults(null); setStep('list');
        toast(`${mapped.length} nota(s) importada(s)`, 'success');
      } catch { toast('Erro ao ler planilha. Verifique o formato.', 'error'); }
    };
    reader.readAsBinaryString(file);
  };

  const mapRow = (r, prestador) => {
    const valor = parseFloat(r.valor_servico || r.valor || 0);
    const aliquota = parseFloat(r.aliquota_iss || r.aliquota || prestador.aliquotaIss || 5);
    return {
      id: genId(), status: 'pendente',
      prestadorId: prestador.id, prestadorNome: prestador.name, prestadorCnpj: prestador.cnpj,
      prestadorIm: prestador.im, simplesNacional: r.optante_simples==='S' || prestador.simplesNacional,
      tomadorCnpj: r.tomador_cnpj||'', tomadorNome: r.tomador_nome||'',
      tomadorEmail: r.tomador_email||'', tomadorLogradouro: r.tomador_logradouro||'',
      tomadorNumero: String(r.tomador_numero||''), tomadorComplemento: r.tomador_complemento||'',
      tomadorBairro: r.tomador_bairro||'', tomadorCidade: r.tomador_cidade||'',
      tomadorUf: r.tomador_uf||'', tomadorCep: r.tomador_cep||'', tomadorTelefone: r.tomador_telefone||'',
      discriminacao: r.discriminacao||'',
      itemListaServico: r.item_lista_servico || prestador.itemListaServico || '',
      codigoTributacaoNacional: r.codigo_tributacao_nacional || prestador.codigoTributacaoNacional || '',
      codigoTributacaoMunicipal: r.codigo_tributacao_municipal || prestador.codigoTributacaoMunicipal || '',
      nbs: r.nbs || prestador.nbs || '',
      valor, aliquota, iss: parseFloat((valor*aliquota/100).toFixed(2)),
      issRetido: r.iss_retido==='S' || prestador.issRetido || false,
      retPis: r.ret_pis==='S' || prestador.retPis || false,
      retCofins: r.ret_cofins==='S' || prestador.retCofins || false,
      retCsll: r.ret_csll==='S' || prestador.retCsll || false,
      retIrpj: r.ret_irpj==='S' || prestador.retIrpj || false,
      retInss: r.ret_inss==='S' || prestador.retInss || false,
      competencia: r.competencia||'', observacoes: r.observacoes||'',
      erroMsg: '',
    };
  };

  const importMock = (prestador) => {
    const mocks = [
      {tomadorNome:'Alpha Consultoria Ltda',tomadorCnpj:'11.111.111/0001-11',discriminacao:'Consultoria contábil — Janeiro/2025',valor:3500,competencia:'2025-01',tomadorCidade:'Niterói',tomadorUf:'RJ'},
      {tomadorNome:'Beta Serviços ME',tomadorCnpj:'22.222.222/0001-22',discriminacao:'Auditoria fiscal e revisão de declarações',valor:8000,competencia:'2025-01',tomadorCidade:'Rio de Janeiro',tomadorUf:'RJ'},
      {tomadorNome:'Gama Tecnologia S.A.',tomadorCnpj:'33.333.333/0001-33',discriminacao:'Desenvolvimento de sistema de gestão',valor:12000,competencia:'2025-01',tomadorCidade:'Niterói',tomadorUf:'RJ'},
      {tomadorNome:'',tomadorCnpj:'',discriminacao:'Nota com erro proposital',valor:0,competencia:'2025-99',tomadorCidade:'',tomadorUf:''},
    ].map(r => mapRow(r, prestador));
    saveInvoices(mocks); setSelected(new Set()); setValidResults(null); setStep('list');
    toast(`${mocks.length} notas de exemplo importadas (1 com erro intencional para teste)`, 'success');
  };

  const openManual = () => {
    if (!prestadorId) { toast('Selecione o prestador primeiro', 'error'); return; }
    const p = companies.find(c => c.id === parseInt(prestadorId));
    setManualForm({
      id: genId(), status: 'pendente',
      prestadorId: p.id, prestadorNome: p.name, prestadorCnpj: p.cnpj, prestadorIm: p.im,
      simplesNacional: p.simplesNacional,
      tomadorCnpj:'', tomadorNome:'', tomadorEmail:'', tomadorLogradouro:'',
      tomadorNumero:'', tomadorComplemento:'', tomadorBairro:'', tomadorCidade:'', tomadorUf:'', tomadorCep:'', tomadorTelefone:'',
      discriminacao:'', itemListaServico: p.itemListaServico||'', codigoTributacaoNacional: p.codigoTributacaoNacional||'',
      codigoTributacaoMunicipal: p.codigoTributacaoMunicipal||'', nbs: p.nbs||'',
      valor:0, aliquota: p.aliquotaIss||5, iss:0,
      issRetido: p.issRetido||false,
      retPis: p.retPis||false, retCofins: p.retCofins||false,
      retCsll: p.retCsll||false, retIrpj: p.retIrpj||false, retInss: p.retInss||false,
      competencia: new Date().toISOString().slice(0,7), observacoes:'', erroMsg:'',
    });
    setShowManual(true);
  };

  const saveManual = () => {
    const updated = [...invoices, manualForm];
    saveInvoices(updated); setSelected(new Set()); setValidResults(null);
    if (step === 'upload') setStep('list');
    toast('Nota manual adicionada à fila', 'success');
    setShowManual(false);
  };

  const mf = (k, v) => setManualForm(p => {
    const next = {...p, [k]: v};
    if (k==='valor'||k==='aliquota') next.iss = parseFloat(((next.valor||0)*(next.aliquota||0)/100).toFixed(2));
    return next;
  });

  const filtered = invoices.filter(inv => {
    if (filters.periodo && !inv.competencia?.includes(filters.periodo)) return false;
    if (filters.tomador && !inv.tomadorNome?.toLowerCase().includes(filters.tomador.toLowerCase())) return false;
    if (filters.status === 'erro' && inv.status !== 'erro') return false;
    if (filters.status === 'pendente' && inv.status !== 'pendente') return false;
    return true;
  });

  const toggleSel = (id) => setSelected(s => { const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = () => selected.size===filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(i=>i.id)));

  const validate = async () => {
    if (selected.size === 0) return toast('Selecione ao menos uma nota', 'warning');
    setValidating(true);
    await new Promise(r => setTimeout(r, 1000));
    const results = filtered.filter(i=>selected.has(i.id)).map(inv => ({id:inv.id, nome:inv.tomadorNome||'(sem nome)', errs:validateInv(inv)}));
    setValidResults(results); setValidating(false);
    const hasErr = results.some(r=>r.errs.length>0);
    toast(hasErr ? `Validação concluída — ${results.filter(r=>r.errs.length>0).length} nota(s) com problema` : 'Todas as notas validadas sem erros!', hasErr?'warning':'success');
  };

  // Ambiente: 'homologacao' para testes, 'producao' para emissão real
  // Troque para 'producao' somente após validar todos os testes
  const AMBIENTE = 'producao';

  const emitir = async () => {
    setShowEmitModal(false);
    const toEmit = invoices.filter(i => selected.has(i.id));
    const issued = store.get('nfse_issued', INIT_ISSUED);
    const results = [];
    let okCount = 0;

    toast(`Enviando ${toEmit.length} nota(s) para a prefeitura...`, 'info');

    for (const nota of toEmit) {
      try {
        const resp = await fetch('/.netlify/functions/emitir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nota, ambiente: AMBIENTE }),
        });
        const data = await resp.json();

        if (data.ok) {
          results.push({
            ...nota,
            status: 'emitida',
            dataEmissao: new Date().toISOString().slice(0, 10),
            numero: data.numero || String(issued.length + okCount + 1).padStart(6, '0'),
            codigoVerificacao: data.codigoVerificacao || '',
            focusRef: data.ref || '',
            linkNfse: data.linkNfse || '',
          });
          okCount++;
        } else {
          // Nota fica na fila com status erro e mensagem visível
          const updated = invoices.map(i =>
            i.id === nota.id ? { ...i, status: 'erro', erroMsg: data.error || 'Erro desconhecido' } : i
          );
          saveInvoices(updated);
        }
      } catch (err) {
        const updated = invoices.map(i =>
          i.id === nota.id ? { ...i, status: 'erro', erroMsg: 'Falha de conexão: ' + err.message } : i
        );
        saveInvoices(updated);
      }
    }

    if (results.length > 0) {
      store.set('nfse_issued', [...issued, ...results]);
      const emittedIds = new Set(results.map(r => r.id));
      const remaining = invoices.filter(i => !emittedIds.has(i.id) && selected.has(i.id) === false)
        .concat(invoices.filter(i => selected.has(i.id) && i.status === 'erro'));
      saveInvoices(remaining);
      setSelected(new Set());
      setValidResults(null);
      if (remaining.length === 0) setStep('upload');
    }

    const errCount = toEmit.length - okCount;
    if (okCount > 0 && errCount === 0) toast(`✓ ${okCount} nota(s) emitida(s) com sucesso!`, 'success');
    else if (okCount > 0 && errCount > 0) toast(`${okCount} emitida(s) · ${errCount} com erro — veja a fila`, 'warning');
    else toast(`Todas as notas retornaram erro — verifique a fila`, 'error');
  };

  const deleteSelected = () => {
    const updated = invoices.filter(i=>!selected.has(i.id));
    saveInvoices(updated); setSelected(new Set()); setValidResults(null);
    if (updated.length===0) setStep('upload');
    toast('Notas removidas da fila', 'info');
  };

  const openEdit = (inv) => { setEditingId(inv.id); setEditForm({...inv}); };
  const ef = (k, v) => setEditForm(p => { const n={...p,[k]:v}; if(k==='valor'||k==='aliquota') n.iss=parseFloat(((n.valor||0)*(n.aliquota||0)/100).toFixed(2)); return n; });
  const saveEdit = () => {
    const updated = invoices.map(i=>i.id===editForm.id ? {...editForm, status:'pendente', erroMsg:''} : i);
    saveInvoices(updated); setEditingId(null); toast('Nota atualizada', 'success');
  };

  // ─── UPLOAD STEP ─────────────────────────────────────────────────────────────
  if (step==='upload') return (
    <div style={{maxWidth:700,margin:'0 auto'}}>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:16,fontWeight:600}}>Emissor de NFS-e em Massa</div>
        <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>Padrão ABRASF — Emissor Nacional</div>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div className="card-header"><div className="card-title">1. Selecionar Prestador de Serviço</div></div>
        <div className="card-body">
          <select className="form-control" value={prestadorId} onChange={e=>setPrestadorId(e.target.value)}>
            <option value="">— Selecione a empresa prestadora —</option>
            {companies.map(c=><option key={c.id} value={c.id}>{c.name} — {c.cnpj} (IM: {c.im})</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div className="card-header">
          <div className="card-title">2. Importar Planilha ou Nota Manual</div>
          <div className="flex-row gap-2">
            <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>↓ Baixar Modelo .xlsx</button>
            <button className="btn btn-primary btn-sm" onClick={openManual}>+ Nota Manual</button>
          </div>
        </div>
        <div className="card-body">
          <div className="upload-zone" onDragOver={e=>e.preventDefault()} onDrop={handleUpload}
            onClick={()=>prestadorId?fileRef.current?.click():toast('Selecione o prestador primeiro','warning')}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleUpload} />
            <div className="upload-icon">📊</div>
            <div className="upload-text">Arraste sua planilha <strong>.xlsx</strong> aqui ou clique para selecionar<br/>
              <span style={{fontSize:11,color:'var(--gray-400)'}}>Use o modelo para garantir o formato correto com todos os campos obrigatórios</span></div>
          </div>
        </div>
      </div>

      <div className="alert alert-info" style={{fontSize:12}}>
        <strong>Campos obrigatórios na planilha:</strong> CNPJ do tomador, Razão social, Discriminação (mín. 10 caracteres),
        Item da lista de serviço, Código de tributação nacional, Valor, Alíquota ISS e Competência (AAAA-MM).
        Os demais campos são puxados do cadastro da empresa quando não informados.
      </div>

      {invoices.length > 0 && (
        <div className="alert alert-warning" style={{marginTop:12,fontSize:12}}>
          ⚠ Há <strong>{invoices.length}</strong> nota(s) salva(s) na fila de uma sessão anterior.{' '}
          <button className="btn btn-secondary btn-sm" style={{marginLeft:8}} onClick={()=>setStep('list')}>Ver fila</button>
        </div>
      )}
    </div>
  );

  // ─── LIST STEP ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex-row" style={{marginBottom:16,justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:16,fontWeight:600}}>Fila de Emissão</div>
          <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>
            {invoices.length} nota(s) na fila · {invoices.filter(i=>i.status==='erro').length} com erro
          </div>
        </div>
        <div className="flex-row gap-2">
          <button className="btn btn-secondary btn-sm" onClick={()=>setStep('upload')}>← Início</button>
          {prestadorId && <button className="btn btn-primary btn-sm" onClick={openManual}>+ Nota Manual</button>}
        </div>
      </div>

      {/* Notas com erro ficam destacadas */}
      {invoices.some(i=>i.status==='erro') && (
        <div className="alert alert-danger" style={{marginBottom:12}}>
          <strong>⚠ Notas com erro de retorno:</strong> corrija as informações e tente reemitir.
          {invoices.filter(i=>i.status==='erro').map(i=>(
            <div key={i.id} style={{marginTop:6,fontSize:12}}>
              • <strong>{i.tomadorNome||i.id}</strong>: {i.erroMsg || 'Erro na emissão'}
            </div>
          ))}
        </div>
      )}

      {/* FILTROS */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end',padding:'14px 16px'}}>
          <div className="filter-group">
            <span className="filter-label">COMPETÊNCIA</span>
            <input className="form-control" style={{width:130}} placeholder="2025-01" value={filters.periodo} onChange={e=>setFilters({...filters,periodo:e.target.value})} />
          </div>
          <div className="filter-group" style={{flex:1,minWidth:160}}>
            <span className="filter-label">TOMADOR</span>
            <input className="form-control" placeholder="Buscar por nome..." value={filters.tomador} onChange={e=>setFilters({...filters,tomador:e.target.value})} />
          </div>
          <div className="filter-group">
            <span className="filter-label">STATUS</span>
            <select className="form-control" style={{width:130}} value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}>
              <option value="">Todos</option><option value="pendente">Pendente</option><option value="erro">Com erro</option>
            </select>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setFilters({periodo:'',tomador:'',status:''})}>Limpar</button>
        </div>
      </div>

      {/* BARRA DE AÇÕES */}
      <div className="flex-row" style={{marginBottom:12,padding:'10px 16px',background:'white',border:'1px solid var(--gray-200)',borderRadius:'var(--radius-lg)',flexWrap:'wrap',gap:8}}>
        <span style={{fontSize:13,color:'var(--gray-500)'}}>
          {selected.size>0 ? <><strong style={{color:'var(--blue-600)'}}>{selected.size}</strong> selecionadas</> : 'Nenhuma selecionada'}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={validate} disabled={selected.size===0||validating}>
          {validating ? '⏳ Validando...' : '✓ Validar Selecionadas'}
        </button>
        <button className="btn btn-success btn-sm" onClick={()=>setShowEmitModal(true)} disabled={selected.size===0}>
          ▶ Emitir Notas ({selected.size})
        </button>
        <button className="btn btn-ghost btn-sm" style={{color:'var(--red-600)',marginLeft:'auto'}} onClick={deleteSelected} disabled={selected.size===0}>
          🗑 Excluir Selecionadas
        </button>
      </div>

      {/* RESULTADO DE VALIDAÇÃO */}
      {validResults && (
        <div style={{marginBottom:12}}>
          {validResults.some(r=>r.errs.length>0)
            ? <div className="alert alert-warning">
                <strong>Problemas encontrados — corrija antes de emitir:</strong>
                {validResults.filter(r=>r.errs.length>0).map(r=>(
                  <div key={r.id} style={{marginTop:4,fontSize:12}}>• <strong>{r.nome}</strong>: {r.errs.join(' · ')}</div>
                ))}
              </div>
            : <div className="alert alert-success">✓ Todas as {validResults.length} notas validadas sem erros — pode emitir!</div>}
        </div>
      )}

      {/* TABELA */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{width:36}}><input type="checkbox" className="cb" checked={selected.size===filtered.length&&filtered.length>0} onChange={toggleAll} /></th>
                <th>TOMADOR</th><th>CNPJ</th><th>DISCRIMINAÇÃO</th><th>COMPETÊNCIA</th>
                <th className="text-right">VALOR</th><th className="text-right">ISS</th><th>STATUS</th><th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const hasErr = validResults?.find(r=>r.id===inv.id)?.errs?.length > 0;
                const isEmitErr = inv.status === 'erro';
                return (
                  <tr key={inv.id} style={{background: isEmitErr ? 'var(--red-50)' : hasErr ? '#fffbeb' : undefined}}>
                    <td><input type="checkbox" className="cb" checked={selected.has(inv.id)} onChange={()=>toggleSel(inv.id)} /></td>
                    <td style={{fontWeight:500}}>{inv.tomadorNome||<span style={{color:'var(--red-600)'}}>⚠ Ausente</span>}</td>
                    <td style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--gray-500)'}}>{inv.tomadorCnpj||'—'}</td>
                    <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--gray-600)'}} title={inv.discriminacao}>{inv.discriminacao}</td>
                    <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{inv.competencia}</td>
                    <td className="text-right" style={{fontFamily:'var(--font-mono)',fontWeight:500}}>{(inv.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                    <td className="text-right" style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--gray-500)'}}>{(inv.iss||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                    <td>
                      {isEmitErr ? <span className="badge badge-danger" title={inv.erroMsg}>✗ Erro retorno</span>
                        : hasErr ? <span className="badge badge-warning">⚠ Validar</span>
                        : <span className="badge badge-gray">Pendente</span>}
                    </td>
                    <td>
                      <div className="flex-row gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(inv)}>Editar</button>
                        {isEmitErr && (
                          <button className="btn btn-secondary btn-sm" style={{color:'var(--blue-600)'}} onClick={()=>{setSelected(new Set([inv.id]));setShowEmitModal(true);}}>
                            Reemitir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length===0&&<tr><td colSpan={9}><div className="empty-state">Nenhuma nota encontrada</div></td></tr>}
            </tbody>
          </table>
        </div>
        {filtered.length>0&&(
          <div style={{padding:'12px 16px',borderTop:'1px solid var(--gray-100)',display:'flex',justifyContent:'flex-end',gap:24,fontSize:13}}>
            <span style={{color:'var(--gray-500)'}}>Total: <strong>{filtered.length}</strong></span>
            <span style={{color:'var(--gray-500)'}}>Valor: <strong style={{color:'var(--gray-800)'}}>{filtered.reduce((s,i)=>s+(i.valor||0),0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></span>
            <span style={{color:'var(--gray-500)'}}>ISS: <strong style={{color:'var(--gray-800)'}}>{filtered.reduce((s,i)=>s+(i.iss||0),0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong></span>
          </div>
        )}
      </div>

      {/* MODAL EDITAR */}
      {editingId && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditingId(null)}>
          <div className="modal" style={{maxWidth:700}}>
            <div className="modal-header">
              <div className="modal-title">Editar Nota Fiscal</div>
              <button className="modal-close" onClick={()=>setEditingId(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="section-title" style={{marginBottom:10}}>Dados do Tomador</div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">CNPJ / CPF *</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} value={editForm.tomadorCnpj} onChange={e=>ef('tomadorCnpj',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Razão Social *</label>
                  <input className="form-control" value={editForm.tomadorNome} onChange={e=>ef('tomadorNome',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">E-mail</label>
                  <input className="form-control" value={editForm.tomadorEmail||''} onChange={e=>ef('tomadorEmail',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Telefone</label>
                  <input className="form-control" value={editForm.tomadorTelefone||''} onChange={e=>ef('tomadorTelefone',e.target.value)} /></div>
                <div className="form-group" style={{gridColumn:'span 2'}}><label className="form-label">Logradouro</label>
                  <input className="form-control" value={editForm.tomadorLogradouro||''} onChange={e=>ef('tomadorLogradouro',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Número</label>
                  <input className="form-control" value={editForm.tomadorNumero||''} onChange={e=>ef('tomadorNumero',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Complemento</label>
                  <input className="form-control" value={editForm.tomadorComplemento||''} onChange={e=>ef('tomadorComplemento',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Bairro</label>
                  <input className="form-control" value={editForm.tomadorBairro||''} onChange={e=>ef('tomadorBairro',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">CEP</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} value={editForm.tomadorCep||''} onChange={e=>ef('tomadorCep',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Cidade</label>
                  <input className="form-control" value={editForm.tomadorCidade||''} onChange={e=>ef('tomadorCidade',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">UF</label>
                  <input className="form-control" value={editForm.tomadorUf||''} onChange={e=>ef('tomadorUf',e.target.value)} maxLength={2} /></div>
              </div>
              <hr className="divider" />
              <div className="section-title" style={{marginBottom:10}}>Dados do Serviço</div>
              <div className="form-group"><label className="form-label">Discriminação do serviço * (mín. 10 caracteres)</label>
                <textarea className="form-control" rows={3} value={editForm.discriminacao} onChange={e=>ef('discriminacao',e.target.value)} /></div>
              <div className="grid-3">
                <div className="form-group"><label className="form-label">Item Lista Serviço (LC 116)</label>
                  <input className="form-control" value={editForm.itemListaServico||''} onChange={e=>ef('itemListaServico',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Cód. Tributação Nacional</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} value={editForm.codigoTributacaoNacional||''} onChange={e=>ef('codigoTributacaoNacional',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">NBS</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} value={editForm.nbs||''} onChange={e=>ef('nbs',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Valor (R$) *</label>
                  <input className="form-control" type="number" step="0.01" value={editForm.valor} onChange={e=>ef('valor',parseFloat(e.target.value)||0)} /></div>
                <div className="form-group"><label className="form-label">Alíquota ISS (%)</label>
                  <input className="form-control" type="number" step="0.01" value={editForm.aliquota} onChange={e=>ef('aliquota',parseFloat(e.target.value)||0)} /></div>
                <div className="form-group"><label className="form-label">Competência (AAAA-MM) *</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} value={editForm.competencia} onChange={e=>ef('competencia',e.target.value)} /></div>
              </div>
              <div style={{display:'flex',gap:20,fontSize:13,marginTop:4}}>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={editForm.issRetido||false} onChange={e=>ef('issRetido',e.target.checked)} /> ISS retido</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={editForm.retPis||false} onChange={e=>ef('retPis',e.target.checked)} /> Ret. PIS</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={editForm.retCofins||false} onChange={e=>ef('retCofins',e.target.checked)} /> Ret. COFINS</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={editForm.retCsll||false} onChange={e=>ef('retCsll',e.target.checked)} /> Ret. CSLL</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={editForm.retIrpj||false} onChange={e=>ef('retIrpj',e.target.checked)} /> Ret. IRPJ</label>
              </div>
              <div className="form-group" style={{marginTop:14}}><label className="form-label">Observações</label>
                <textarea className="form-control" rows={2} value={editForm.observacoes||''} onChange={e=>ef('observacoes',e.target.value)} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setEditingId(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveEdit}>Salvar alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO EMISSÃO */}
      {showEmitModal && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth:460}}>
            <div className="modal-header">
              <div className="modal-title">Confirmar Emissão</div>
              <button className="modal-close" onClick={()=>setShowEmitModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{marginBottom:14}}>
                Você está prestes a emitir <strong>{selected.size} nota(s) fiscal(is)</strong>.
              </div>
              {comp && (
                <div style={{background:'var(--gray-50)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius)',padding:'14px 16px',marginBottom:14}}>
                  <div style={{fontSize:11,color:'var(--gray-500)',marginBottom:4}}>PRESTADOR SELECIONADO</div>
                  <div style={{fontWeight:600,fontSize:15}}>{comp.name}</div>
                  <div style={{fontSize:12,color:'var(--gray-500)',fontFamily:'var(--font-mono)'}}>{comp.cnpj} · IM {comp.im}</div>
                </div>
              )}
              {!comp && invoices.filter(i=>selected.has(i.id))[0] && (() => {
                const p = invoices.filter(i=>selected.has(i.id))[0];
                return (
                  <div style={{background:'var(--gray-50)',border:'1px solid var(--gray-200)',borderRadius:'var(--radius)',padding:'14px 16px',marginBottom:14}}>
                    <div style={{fontSize:11,color:'var(--gray-500)',marginBottom:4}}>PRESTADOR</div>
                    <div style={{fontWeight:600}}>{p.prestadorNome}</div>
                    <div style={{fontSize:12,color:'var(--gray-500)',fontFamily:'var(--font-mono)'}}>{p.prestadorCnpj} · IM {p.prestadorIm}</div>
                  </div>
                );
              })()}
              <div style={{fontSize:13,color:'var(--gray-600)',marginBottom:8}}>
                Valor total: <strong>{invoices.filter(i=>selected.has(i.id)).reduce((s,i)=>s+(i.valor||0),0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong>
              </div>
              <div className="alert alert-warning" style={{fontSize:12}}>
                ⚠ Confirme que o prestador e os dados estão corretos. Esta ação é irreversível.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowEmitModal(false)}>Cancelar</button>
              <button className="btn btn-success" onClick={emitir}>✓ Confirmar e Emitir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTA MANUAL */}
      {showManual && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowManual(false)}>
          <div className="modal" style={{maxWidth:720}}>
            <div className="modal-header">
              <div className="modal-title">Nova Nota Manual — {manualForm.prestadorNome}</div>
              <button className="modal-close" onClick={()=>setShowManual(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="section-title">Dados do Tomador</div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">CNPJ / CPF *</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} placeholder="00.000.000/0001-00" value={manualForm.tomadorCnpj||''} onChange={e=>mf('tomadorCnpj',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Razão Social / Nome *</label>
                  <input className="form-control" value={manualForm.tomadorNome||''} onChange={e=>mf('tomadorNome',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">E-mail</label>
                  <input className="form-control" type="email" value={manualForm.tomadorEmail||''} onChange={e=>mf('tomadorEmail',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Telefone</label>
                  <input className="form-control" value={manualForm.tomadorTelefone||''} onChange={e=>mf('tomadorTelefone',e.target.value)} /></div>
                <div className="form-group" style={{gridColumn:'span 2'}}><label className="form-label">Logradouro</label>
                  <input className="form-control" value={manualForm.tomadorLogradouro||''} onChange={e=>mf('tomadorLogradouro',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Número</label>
                  <input className="form-control" value={manualForm.tomadorNumero||''} onChange={e=>mf('tomadorNumero',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Complemento</label>
                  <input className="form-control" value={manualForm.tomadorComplemento||''} onChange={e=>mf('tomadorComplemento',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Bairro</label>
                  <input className="form-control" value={manualForm.tomadorBairro||''} onChange={e=>mf('tomadorBairro',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">CEP</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} value={manualForm.tomadorCep||''} onChange={e=>mf('tomadorCep',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Cidade</label>
                  <input className="form-control" value={manualForm.tomadorCidade||''} onChange={e=>mf('tomadorCidade',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">UF</label>
                  <input className="form-control" value={manualForm.tomadorUf||''} onChange={e=>mf('tomadorUf',e.target.value)} maxLength={2} /></div>
              </div>
              <hr className="divider" />
              <div className="section-title">Dados do Serviço</div>
              <div className="form-group"><label className="form-label">Discriminação *</label>
                <textarea className="form-control" rows={3} placeholder="Descreva detalhadamente os serviços prestados..." value={manualForm.discriminacao||''} onChange={e=>mf('discriminacao',e.target.value)} /></div>
              <div className="grid-3">
                <div className="form-group"><label className="form-label">Item Lista Serviço *</label>
                  <input className="form-control" placeholder="Ex: 1.07" value={manualForm.itemListaServico||''} onChange={e=>mf('itemListaServico',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Cód. Tributação Nacional *</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} placeholder="Ex: 010701" value={manualForm.codigoTributacaoNacional||''} onChange={e=>mf('codigoTributacaoNacional',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Cód. Tributação Municipal</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} value={manualForm.codigoTributacaoMunicipal||''} onChange={e=>mf('codigoTributacaoMunicipal',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">NBS</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} placeholder="Ex: 1.0507.00.00" value={manualForm.nbs||''} onChange={e=>mf('nbs',e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Valor do Serviço (R$) *</label>
                  <input className="form-control" type="number" step="0.01" min="0" value={manualForm.valor||0} onChange={e=>mf('valor',parseFloat(e.target.value)||0)} /></div>
                <div className="form-group"><label className="form-label">Alíquota ISS (%)</label>
                  <input className="form-control" type="number" step="0.01" min="0" max="5" value={manualForm.aliquota||5} onChange={e=>mf('aliquota',parseFloat(e.target.value)||0)} /></div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',padding:'10px 14px',background:'var(--gray-50)',borderRadius:'var(--radius)',marginBottom:14,fontSize:13}}>
                <span style={{color:'var(--gray-500)'}}>ISS calculado:</span>
                <strong style={{fontFamily:'var(--font-mono)'}}>{(manualForm.iss||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</strong>
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Competência (AAAA-MM) *</label>
                  <input className="form-control" style={{fontFamily:'var(--font-mono)'}} value={manualForm.competencia||''} onChange={e=>mf('competencia',e.target.value)} /></div>
              </div>
              <div style={{display:'flex',gap:20,fontSize:13,marginTop:4,flexWrap:'wrap'}}>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={manualForm.issRetido||false} onChange={e=>mf('issRetido',e.target.checked)} /> ISS retido na fonte</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={manualForm.simplesNacional||false} onChange={e=>mf('simplesNacional',e.target.checked)} /> Simples Nacional</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={manualForm.retPis||false} onChange={e=>mf('retPis',e.target.checked)} /> Ret. PIS</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={manualForm.retCofins||false} onChange={e=>mf('retCofins',e.target.checked)} /> Ret. COFINS</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={manualForm.retCsll||false} onChange={e=>mf('retCsll',e.target.checked)} /> Ret. CSLL</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={manualForm.retIrpj||false} onChange={e=>mf('retIrpj',e.target.checked)} /> Ret. IRPJ</label>
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
                  <input type="checkbox" checked={manualForm.retInss||false} onChange={e=>mf('retInss',e.target.checked)} /> Ret. INSS</label>
              </div>
              <div className="form-group" style={{marginTop:14}}><label className="form-label">Observações</label>
                <textarea className="form-control" rows={2} value={manualForm.observacoes||''} onChange={e=>mf('observacoes',e.target.value)} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowManual(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveManual}>Adicionar à fila</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RELATÓRIOS PAGE ──────────────────────────────────────────────────────────
function ReportsPage() {
  const { toast } = useApp();
  const [issued, setIssued] = useState(() => store.get('nfse_issued', INIT_ISSUED));
  const [selected, setSelected] = useState(new Set());
  const [filters, setFilters] = useState({ empresa:'', im:'', periodo:'', status:'' });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddr, setEmailAddr] = useState('');
  const [showPdf, setShowPdf] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const companies = store.get('nfse_companies', INIT_COMPANIES);

  // Recarrega ao montar (pega notas recém emitidas)
  useEffect(() => { setIssued(store.get('nfse_issued', INIT_ISSUED)); }, []);

  const prestadores = [...new Set(issued.map(i=>i.prestadorNome).filter(Boolean))];
  const ims = [...new Set(issued.map(i=>i.prestadorIm).filter(Boolean))];

  const filtered = issued.filter(inv => {
    if (filters.empresa && inv.prestadorNome !== filters.empresa) return false;
    if (filters.im && inv.prestadorIm !== filters.im) return false;
    if (filters.periodo && !inv.competencia?.includes(filters.periodo) && !inv.dataEmissao?.includes(filters.periodo)) return false;
    if (filters.status && inv.status !== filters.status) return false;
    return true;
  });

  const toggleSel = (id) => setSelected(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll = () => selected.size===filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(i=>i.id)));

  const cancelNota = (inv) => {
    const updated = issued.map(i => i.id===inv.id ? {...i, status:'cancelada'} : i);
    setIssued(updated); store.set('nfse_issued', updated);
    setShowCancelModal(null);
    toast('Nota fiscal cancelada', 'info');
  };

  const sendEmail = () => {
    if (!emailAddr) return toast('Informe o e-mail', 'error');
    toast(`${selected.size} nota(s) enviada(s) para ${emailAddr}`, 'success');
    setShowEmailModal(false); setEmailAddr('');
  };

  const totalVal = filtered.reduce((s,i)=>s+(i.valor||0),0);
  const totalIss = filtered.reduce((s,i)=>s+(i.iss||0),0);

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:16,fontWeight:600}}>Relatórios — Notas Emitidas</div>
        <div style={{fontSize:12,color:'var(--gray-400)',marginTop:2}}>Consulta, cancelamento e download de NFS-e</div>
      </div>

      {/* TOTALIZADORES */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">TOTAL EMITIDAS</div>
          <div className="stat-value">{filtered.filter(i=>i.status==='emitida').length}</div>
          <div className="stat-sub">notas no filtro</div></div>
        <div className="stat-card"><div className="stat-label">VALOR TOTAL</div>
          <div className="stat-value" style={{fontSize:18}}>{totalVal.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>
          <div className="stat-sub">serviços</div></div>
        <div className="stat-card"><div className="stat-label">ISS TOTAL</div>
          <div className="stat-value" style={{fontSize:18}}>{totalIss.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>
          <div className="stat-sub">imposto</div></div>
        <div className="stat-card"><div className="stat-label">CANCELADAS</div>
          <div className="stat-value">{filtered.filter(i=>i.status==='cancelada').length}</div>
          <div className="stat-sub">no filtro</div></div>
      </div>

      {/* FILTROS */}
      <div className="card" style={{marginBottom:14}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end',padding:'14px 16px'}}>
          <div className="filter-group" style={{flex:1,minWidth:160}}>
            <span className="filter-label">EMPRESA PRESTADORA</span>
            <select className="form-control" value={filters.empresa} onChange={e=>setFilters({...filters,empresa:e.target.value})}>
              <option value="">Todas</option>
              {prestadores.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">INSCRIÇÃO MUNICIPAL</span>
            <select className="form-control" style={{width:150}} value={filters.im} onChange={e=>setFilters({...filters,im:e.target.value})}>
              <option value="">Todas</option>
              {ims.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">PERÍODO</span>
            <input className="form-control" style={{width:130}} placeholder="2025-01" value={filters.periodo} onChange={e=>setFilters({...filters,periodo:e.target.value})} />
          </div>
          <div className="filter-group">
            <span className="filter-label">STATUS</span>
            <select className="form-control" style={{width:130}} value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}>
              <option value="">Todos</option><option value="emitida">Emitida</option><option value="cancelada">Cancelada</option>
            </select>
          </div>
          <button className="btn btn-ghost btn-sm" style={{marginTop:18}} onClick={()=>setFilters({empresa:'',im:'',periodo:'',status:''})}>Limpar</button>
        </div>
      </div>

      {/* BARRA AÇÕES */}
      {selected.size > 0 && (
        <div className="flex-row" style={{marginBottom:12,padding:'10px 16px',background:'var(--blue-50)',border:'1px solid var(--blue-200)',borderRadius:'var(--radius-lg)'}}>
          <span style={{fontSize:13,color:'var(--blue-700)'}}><strong>{selected.size}</strong> selecionadas</span>
          <button className="btn btn-secondary btn-sm" onClick={()=>setShowEmailModal(true)}>✉ Enviar por E-mail</button>
          <button className="btn btn-secondary btn-sm" onClick={()=>toast(`Download de ${selected.size} nota(s) em ZIP iniciado`,'success')}>⬇ Baixar ZIP</button>
        </div>
      )}

      {/* TABELA */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{width:36}}><input type="checkbox" className="cb" checked={selected.size===filtered.length&&filtered.length>0} onChange={toggleAll} /></th>
                <th>Nº NFS-e</th><th>TOMADOR</th><th>PRESTADOR</th><th>IM</th><th>COMPETÊNCIA</th>
                <th>EMISSÃO</th><th className="text-right">VALOR</th><th>STATUS</th><th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} style={inv.status==='cancelada'?{opacity:0.55}:undefined}>
                  <td><input type="checkbox" className="cb" checked={selected.has(inv.id)} onChange={()=>toggleSel(inv.id)} /></td>
                  <td style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--blue-600)',fontWeight:500}}>{inv.numero||inv.id.slice(-6)}</td>
                  <td><div style={{fontWeight:500}}>{inv.tomadorNome}</div>
                    <div style={{fontSize:11,color:'var(--gray-400)',fontFamily:'var(--font-mono)'}}>{inv.tomadorCnpj}</div></td>
                  <td style={{fontSize:12,color:'var(--gray-600)'}}>{inv.prestadorNome}</td>
                  <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{inv.prestadorIm||'—'}</td>
                  <td style={{fontFamily:'var(--font-mono)',fontSize:12}}>{inv.competencia}</td>
                  <td style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--gray-500)'}}>{inv.dataEmissao}</td>
                  <td className="text-right" style={{fontFamily:'var(--font-mono)',fontWeight:500}}>
                    {(inv.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                  <td>
                    <span className={`badge ${inv.status==='emitida'?'badge-success':'badge-danger'}`}>
                      {inv.status==='emitida'?'✓ Emitida':'✗ Cancelada'}
                    </span>
                  </td>
                  <td>
                    <div className="flex-row gap-2">
                      <button className="btn btn-ghost btn-sm" style={{color:'var(--blue-600)'}} onClick={()=>setShowPdf(inv)}>📄 PDF</button>
                      {inv.status==='emitida' && (
                        <button className="btn btn-ghost btn-sm" style={{color:'var(--red-600)'}} onClick={()=>setShowCancelModal(inv)}>Cancelar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0&&<tr><td colSpan={10}><div className="empty-state"><div className="empty-state-icon">📋</div>Nenhuma nota encontrada</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EMAIL */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowEmailModal(false)}>
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-header">
              <div className="modal-title">Enviar por E-mail</div>
              <button className="modal-close" onClick={()=>setShowEmailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{marginBottom:14,fontSize:13,color:'var(--gray-600)'}}>
                Enviando <strong>{selected.size}</strong> nota(s) em anexo.
              </div>
              <div className="form-group"><label className="form-label">E-mail do destinatário *</label>
                <input className="form-control" type="email" placeholder="destinatario@email.com" value={emailAddr} onChange={e=>setEmailAddr(e.target.value)} /></div>
              <div className="form-group" style={{marginBottom:0}}><label className="form-label">Mensagem (opcional)</label>
                <textarea className="form-control" rows={3} placeholder="Segue em anexo as notas fiscais do período..." /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowEmailModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={sendEmail}>✉ Enviar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CANCELAMENTO */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCancelModal(null)}>
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-header">
              <div className="modal-title">Cancelar NFS-e</div>
              <button className="modal-close" onClick={()=>setShowCancelModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger" style={{marginBottom:14}}>
                ⚠ Esta ação é irreversível e comunicada à prefeitura.
              </div>
              <div style={{fontSize:13,color:'var(--gray-700)'}}>
                <strong>NFS-e nº {showCancelModal.numero}</strong><br/>
                Tomador: {showCancelModal.tomadorNome}<br/>
                Valor: {(showCancelModal.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
              </div>
              <div className="form-group" style={{marginTop:14}}><label className="form-label">Motivo do cancelamento *</label>
                <select className="form-control">
                  <option>Erro nas informações da nota</option>
                  <option>Serviço não prestado</option>
                  <option>Duplicidade de emissão</option>
                  <option>Outro motivo</option>
                </select></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowCancelModal(null)}>Voltar</button>
              <button className="btn btn-danger" onClick={()=>cancelNota(showCancelModal)}>Confirmar Cancelamento</button>
            </div>
          </div>
        </div>
      )}

      {/* PDF PREVIEW */}
      {showPdf && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowPdf(null)}>
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header">
              <div className="modal-title">NFS-e — Prévia do Documento</div>
              <button className="modal-close" onClick={()=>setShowPdf(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{background:'white',border:'1px solid var(--gray-200)',borderRadius:6,padding:28,fontSize:12}}>
                <div style={{textAlign:'center',marginBottom:20,borderBottom:'2px solid var(--blue-800)',paddingBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--blue-800)',letterSpacing:'0.04em'}}>NOTA FISCAL DE SERVIÇOS ELETRÔNICA — NFS-e</div>
                  <div style={{fontSize:10,color:'var(--gray-500)',marginTop:4}}>Padrão Nacional ABRASF · Município de {showPdf.prestadorIm?'Niterói/RJ':'—'}</div>
                  <div style={{fontSize:20,fontWeight:700,color:'var(--gray-800)',marginTop:10,fontFamily:'var(--font-mono)'}}>Nº {showPdf.numero}</div>
                  {showPdf.codigoVerificacao&&<div style={{fontSize:10,color:'var(--gray-400)',marginTop:4}}>Cód. verificação: {showPdf.codigoVerificacao}</div>}
                </div>
                <div className="grid-2" style={{gap:16,marginBottom:14}}>
                  <div style={{padding:'10px 12px',background:'var(--gray-50)',borderRadius:4}}>
                    <div style={{fontSize:9,color:'var(--gray-400)',fontWeight:600,marginBottom:5}}>PRESTADOR DO SERVIÇO</div>
                    <div style={{fontWeight:600}}>{showPdf.prestadorNome}</div>
                    <div style={{color:'var(--gray-500)',fontFamily:'var(--font-mono)',fontSize:11}}>{showPdf.prestadorCnpj}</div>
                    <div style={{color:'var(--gray-500)',fontSize:11}}>IM: {showPdf.prestadorIm}</div>
                  </div>
                  <div style={{padding:'10px 12px',background:'var(--gray-50)',borderRadius:4}}>
                    <div style={{fontSize:9,color:'var(--gray-400)',fontWeight:600,marginBottom:5}}>TOMADOR DO SERVIÇO</div>
                    <div style={{fontWeight:600}}>{showPdf.tomadorNome}</div>
                    <div style={{color:'var(--gray-500)',fontFamily:'var(--font-mono)',fontSize:11}}>{showPdf.tomadorCnpj}</div>
                    <div style={{color:'var(--gray-500)',fontSize:11}}>{showPdf.tomadorCidade}/{showPdf.tomadorUf}</div>
                  </div>
                </div>
                <div style={{background:'var(--gray-50)',padding:'10px 12px',borderRadius:4,marginBottom:14}}>
                  <div style={{fontSize:9,color:'var(--gray-400)',fontWeight:600,marginBottom:5}}>DISCRIMINAÇÃO DO SERVIÇO</div>
                  <div style={{color:'var(--gray-700)',lineHeight:1.5}}>{showPdf.discriminacao}</div>
                  {showPdf.itemListaServico&&<div style={{marginTop:6,fontSize:10,color:'var(--gray-400)'}}>Item LC 116: {showPdf.itemListaServico} · CTN: {showPdf.codigoTributacaoNacional} · NBS: {showPdf.nbs}</div>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
                  {[
                    ['COMPETÊNCIA', showPdf.competencia],
                    ['VALOR SERVIÇO', (showPdf.valor||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})],
                    ['ALÍQUOTA ISS', `${showPdf.aliquota||0}%`],
                    ['ISS', (showPdf.iss||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})],
                  ].map(([k,v])=>(
                    <div key={k} style={{textAlign:'center',padding:'8px 6px',border:'1px solid var(--gray-200)',borderRadius:4}}>
                      <div style={{fontSize:8,color:'var(--gray-400)',fontWeight:600}}>{k}</div>
                      <div style={{fontSize:13,fontWeight:700,color:'var(--gray-800)',marginTop:3,fontFamily:'var(--font-mono)'}}>{v}</div>
                    </div>
                  ))}
                </div>
                {(showPdf.retPis||showPdf.retCofins||showPdf.retCsll||showPdf.retIrpj||showPdf.retInss) && (
                  <div style={{fontSize:10,color:'var(--gray-500)',marginBottom:10}}>
                    Retenções: {[showPdf.retPis&&'PIS',showPdf.retCofins&&'COFINS',showPdf.retCsll&&'CSLL',showPdf.retIrpj&&'IRPJ',showPdf.retInss&&'INSS'].filter(Boolean).join(' · ')}
                  </div>
                )}
                <div style={{textAlign:'center',fontSize:9,color:'var(--gray-400)',borderTop:'1px solid var(--gray-200)',paddingTop:10}}>
                  Data de emissão: {showPdf.dataEmissao} · Gerado pelo NFS-e Emissor Nacional
                  {showPdf.status==='cancelada'&&<span style={{color:'var(--red-600)',fontWeight:700,marginLeft:8}}>— NOTA CANCELADA —</span>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowPdf(null)}>Fechar</button>
              <button className="btn btn-primary" onClick={()=>toast('Download do PDF iniciado','success')}>⬇ Baixar PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
const PAGES = [
  { id:'emissor',    label:'Emissor de NFS-e',    icon:'📤', section:'principal',      roles:['gestor','operador'] },
  { id:'relatorios', label:'Relatórios',           icon:'📊', section:'principal',      roles:['gestor','operador'] },
  { id:'empresas',   label:'Empresas',             icon:'🏢', section:'configurações', roles:['gestor'] },
  { id:'usuarios',   label:'Usuários',             icon:'👥', section:'configurações', roles:['gestor'] },
];
const PAGE_TITLES = {
  emissor:    { title:'Emissor de NFS-e',          sub:'Emissão em massa + nota manual — Padrão ABRASF' },
  relatorios: { title:'Relatórios',                sub:'NFS-e emitidas, cancelamentos e downloads' },
  empresas:   { title:'Empresas Prestadoras',      sub:'Cadastro completo com certificado e parâmetros fiscais' },
  usuarios:   { title:'Usuários',                  sub:'Controle de acesso e perfis' },
};

function AppShell({ currentUser, onLogout }) {
  const [page, setPage] = useState('emissor');
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type='info') => {
    const id = Date.now()+Math.random();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3500);
  }, []);

  const visible = PAGES.filter(p=>p.roles.includes(currentUser.role));
  const sections = [...new Set(visible.map(p=>p.section))];

  const renderPage = () => {
    switch(page) {
      case 'emissor':    return <EmissorPage />;
      case 'relatorios': return <ReportsPage />;
      case 'empresas':   return <EmpresasPage />;
      case 'usuarios':   return <UsersPage />;
      default: return null;
    }
  };

  return (
    <AppCtx.Provider value={{toast, currentUser}}>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">
              <div className="logo-icon">N</div>
              <div><div>NFS-e Emissor</div><div className="logo-sub">EMISSOR NACIONAL</div></div>
            </div>
          </div>
          {sections.map(sec=>(
            <div key={sec} className="sidebar-section">
              <div className="sidebar-label">{sec}</div>
              {visible.filter(p=>p.section===sec).map(p=>(
                <button key={p.id} className={`nav-item ${page===p.id?'active':''}`} onClick={()=>setPage(p.id)}>
                  <span className="nav-icon">{p.icon}</span>{p.label}
                </button>
              ))}
            </div>
          ))}
          <div className="sidebar-user">
            <div className="user-card" onClick={onLogout} title="Sair">
              <div className="user-avatar">{currentUser.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
              <div>
                <div className="user-name">{currentUser.name}</div>
                <div className="user-role">{currentUser.role==='gestor'?'Gestor':'Operador'} · Sair</div>
              </div>
            </div>
          </div>
        </aside>
        <div className="main-area">
          <div className="top-bar">
            <div>
              <div className="top-bar-title">{PAGE_TITLES[page]?.title}</div>
              <div className="top-bar-subtitle">{PAGE_TITLES[page]?.sub}</div>
            </div>
            <div className="top-bar-actions">
              <span className="badge badge-info" style={{fontSize:11}}>{currentUser.role}</span>
              <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sair</button>
            </div>
          </div>
          <div className="page-content">{renderPage()}</div>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </AppCtx.Provider>
  );
}

function App() {
  const [user, setUser] = useState(null);
  if (!user) return <LoginPage onLogin={setUser} />;
  return <AppShell currentUser={user} onLogout={()=>setUser(null)} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
