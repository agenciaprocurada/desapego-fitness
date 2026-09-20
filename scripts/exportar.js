// Exporta os produtos do banco para public/produtos.json.
// É esse arquivo que o catálogo usa quando está publicado em hospedagem estática (Vercel),
// onde o servidor Node e o banco não existem.
// O servidor chama esta função sozinho a cada alteração; também dá para rodar à mão: npm run exportar

const fs = require('fs');
const path = require('path');

const DESTINO = path.resolve(__dirname, '..', 'public', 'produtos.json');

function exportar(db) {
  const produtos = db.prepare('SELECT * FROM produtos ORDER BY ordem, id').all();
  fs.writeFileSync(DESTINO, JSON.stringify(produtos, null, 1));
  return produtos.length;
}

module.exports = { exportar, DESTINO };

if (require.main === module) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.resolve(__dirname, '..', 'catalogo.db'));
  console.log(`${exportar(db)} peças exportadas para ${DESTINO}`);
  db.close();
}
