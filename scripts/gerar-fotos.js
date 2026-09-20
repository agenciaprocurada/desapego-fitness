// Gera versões leves das fotos (JPG) para o site.
// Lê os PNG de uma pasta de origem e grava em public/img (grande) e public/thumb (miniatura).
// Requer ImageMagick instalado (comando "magick").
//
// Uso: npm run fotos -- ../final3      (a pasta pode ser relativa à pasta catalogo ou absoluta)
//      npm run fotos                   (sem argumento: usa ../final2, se existir)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const ORIGEM = path.resolve(RAIZ, process.argv[2] || '../final2');
const IMG = path.join(RAIZ, 'public', 'img');
const THUMB = path.join(RAIZ, 'public', 'thumb');

if (!fs.existsSync(ORIGEM)) {
  console.error(`Pasta de origem não encontrada: ${ORIGEM}\nUso: npm run fotos -- ../nome-da-pasta`);
  process.exit(1);
}

fs.mkdirSync(IMG, { recursive: true });
fs.mkdirSync(THUMB, { recursive: true });

const arquivos = fs.readdirSync(ORIGEM).filter(f => /\.(png|jpe?g)$/i.test(f)).sort();
let gerados = 0;

for (const f of arquivos) {
  const nome = f.replace(/\.(png|jpe?g)$/i, '.jpg');
  const origem = path.join(ORIGEM, f);
  const destImg = path.join(IMG, nome);
  const destThumb = path.join(THUMB, nome);
  const origemMtime = fs.statSync(origem).mtimeMs;

  const precisa = dest => !fs.existsSync(dest) || fs.statSync(dest).mtimeMs < origemMtime;

  if (precisa(destImg)) {
    execFileSync('magick', [origem, '-resize', 'x1600>', '-strip', '-quality', '85', destImg]);
    gerados++;
  }
  if (precisa(destThumb)) {
    execFileSync('magick', [origem, '-resize', 'x700>', '-strip', '-quality', '80', destThumb]);
  }
}

console.log(`Origem: ${ORIGEM}\n${arquivos.length} fotos encontradas, ${gerados} geradas/atualizadas.`);
