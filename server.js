// Catálogo Desapegos Fitness
// Servidor sem dependências externas: Node 22+ (usa o SQLite embutido do Node).
// Uso: npm start   →  http://localhost:3000  (catálogo)  /  http://localhost:3000/admin  (edição)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORTA = Number(process.env.PORTA || 3000);
const SENHA_ADMIN = process.env.ADMIN_SENHA || '';   // se definida, protege o /admin e as alterações
const PUBLIC = path.join(__dirname, 'public');
const PASTA_IMG = path.join(PUBLIC, 'img');
const DB_PATH = path.join(__dirname, 'catalogo.db');

// ---------- Banco ----------
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = DELETE;
  CREATE TABLE IF NOT EXISTS produtos (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    arquivo           TEXT    NOT NULL UNIQUE,
    nome              TEXT    NOT NULL DEFAULT '',
    marca             TEXT    NOT NULL DEFAULT '',
    tamanho           TEXT    NOT NULL DEFAULT '',
    preco             REAL,
    preco_promocional REAL,
    disponivel        INTEGER NOT NULL DEFAULT 1,
    ordem             INTEGER NOT NULL DEFAULT 0,
    atualizado_em     TEXT
  );
`);

// Migração: coluna de código de referência (bancos criados antes dela).
if (!db.prepare("PRAGMA table_info(produtos)").all().some(c => c.name === 'codigo')) {
  db.exec('ALTER TABLE produtos ADD COLUMN codigo TEXT');
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo)');

// Dá código sequencial (001, 002, ...) a quem ainda não tem, na ordem de cadastro.
function atribuirCodigos() {
  const semCodigo = db.prepare('SELECT id FROM produtos WHERE codigo IS NULL ORDER BY ordem, id').all();
  if (!semCodigo.length) return;
  let ultimo = Number(db.prepare('SELECT MAX(CAST(codigo AS INTEGER)) AS n FROM produtos').get().n || 0);
  const gravar = db.prepare('UPDATE produtos SET codigo = ? WHERE id = ?');
  for (const { id } of semCodigo) gravar.run(String(++ultimo).padStart(3, '0'), id);
}

// Lê a pasta de fotos e cadastra as que ainda não estão no banco.
function sincronizarFotos() {
  if (!fs.existsSync(PASTA_IMG)) return { novos: 0, total: 0 };
  const arquivos = fs.readdirSync(PASTA_IMG).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  const existe = db.prepare('SELECT 1 FROM produtos WHERE arquivo = ?');
  const inserir = db.prepare('INSERT INTO produtos (arquivo, nome, ordem, atualizado_em) VALUES (?, ?, ?, ?)');
  let novos = 0;
  arquivos.forEach((arquivo, i) => {
    if (existe.get(arquivo)) return;
    inserir.run(arquivo, `Peça ${i + 1}`, i, new Date().toISOString());
    novos++;
  });
  atribuirCodigos();
  return { novos, total: arquivos.length };
}

const listar = db.prepare('SELECT * FROM produtos ORDER BY ordem, id');
const buscar = db.prepare('SELECT * FROM produtos WHERE id = ?');
const atualizar = db.prepare(`
  UPDATE produtos SET nome = ?, marca = ?, tamanho = ?, preco = ?, preco_promocional = ?,
                      disponivel = ?, atualizado_em = ?
  WHERE id = ?`);

// ---------- Utilidades ----------
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8',
};

function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dados));
}

function arquivoEstatico(res, caminhoRel) {
  const caminho = path.normalize(path.join(PUBLIC, caminhoRel));
  if (!caminho.startsWith(PUBLIC) || !fs.existsSync(caminho) || fs.statSync(caminho).isDirectory()) {
    res.writeHead(404); return res.end('Não encontrado');
  }
  const ext = path.extname(caminho).toLowerCase();
  const cache = ext === '.html' ? 'no-store' : 'public, max-age=86400';
  res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': cache });
  fs.createReadStream(caminho).pipe(res);
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', c => { dados += c; if (dados.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(dados ? JSON.parse(dados) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function numeroOuNulo(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function autorizado(req, res) {
  if (!SENHA_ADMIN) return true;
  const cab = req.headers.authorization || '';
  const [tipo, cred] = cab.split(' ');
  if (tipo === 'Basic' && cred) {
    const senha = Buffer.from(cred, 'base64').toString().split(':').slice(1).join(':');
    if (senha === SENHA_ADMIN) return true;
  }
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Painel do catalogo"' });
  res.end('Acesso restrito');
  return false;
}

// ---------- Rotas ----------
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const rota = url.pathname;

  try {
    // API
    if (rota === '/api/produtos' && req.method === 'GET') {
      return json(res, 200, listar.all());
    }
    if (rota === '/api/ordem' && req.method === 'PUT') {
      if (!autorizado(req, res)) return;
      const b = await lerCorpo(req);
      const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isInteger) : [];
      if (!ids.length || new Set(ids).size !== ids.length) return json(res, 400, { erro: 'Lista de ids inválida' });
      const gravarOrdem = db.prepare('UPDATE produtos SET ordem = ? WHERE id = ?');
      db.exec('BEGIN');
      try {
        ids.forEach((id, i) => gravarOrdem.run(i, id));
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); throw e; }
      return json(res, 200, { ok: true, total: ids.length });
    }
    if (rota === '/api/sincronizar' && req.method === 'POST') {
      if (!autorizado(req, res)) return;
      return json(res, 200, sincronizarFotos());
    }
    const m = rota.match(/^\/api\/produtos\/(\d+)$/);
    if (m && req.method === 'PUT') {
      if (!autorizado(req, res)) return;
      const id = Number(m[1]);
      const atual = buscar.get(id);
      if (!atual) return json(res, 404, { erro: 'Produto não encontrado' });
      const b = await lerCorpo(req);
      const preco = 'preco' in b ? numeroOuNulo(b.preco) : atual.preco;
      let promo = 'preco_promocional' in b ? numeroOuNulo(b.preco_promocional) : atual.preco_promocional;
      if (promo !== null && preco !== null && promo >= preco) {
        return json(res, 400, { erro: 'O preço promocional precisa ser menor que o preço normal.' });
      }
      atualizar.run(
        'nome' in b ? String(b.nome).trim() : atual.nome,
        'marca' in b ? String(b.marca).trim() : atual.marca,
        'tamanho' in b ? String(b.tamanho).trim() : atual.tamanho,
        preco, promo,
        'disponivel' in b ? (b.disponivel ? 1 : 0) : atual.disponivel,
        new Date().toISOString(), id,
      );
      return json(res, 200, buscar.get(id));
    }

    // Páginas
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    if (rota === '/') return arquivoEstatico(res, 'index.html');
    if (rota === '/admin') {
      if (!autorizado(req, res)) return;
      return arquivoEstatico(res, 'admin.html');
    }
    return arquivoEstatico(res, decodeURIComponent(rota));
  } catch (e) {
    console.error(e);
    return json(res, 500, { erro: 'Erro interno' });
  }
});

const r = sincronizarFotos();
console.log(`Fotos: ${r.total} na pasta, ${r.novos} cadastradas agora.`);
servidor.listen(PORTA, () => {
  console.log(`Catálogo: http://localhost:${PORTA}`);
  console.log(`Painel:   http://localhost:${PORTA}/admin${SENHA_ADMIN ? ' (com senha)' : ''}`);
});
