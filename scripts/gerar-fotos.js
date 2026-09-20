// Gera versões leves das fotos (JPG) para o site.
// Lê os PNG da pasta ../final2 e grava em public/img (grande) e public/thumb (miniatura).
// Requer ImageMagick instalado (comando "magick").
// Uso: npm run fotos

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ORIGEM = path.resolve(__dirname, '..', '..', 'final2');
const IMG = path.resolve(__dirname, '..', 'public', 'img');
const THUMB = path.resolve(__dirname, '..', 'public', 'thumb');

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

console.log(`${arquivos.length} fotos encontradas, ${gerados} geradas/atualizadas.`);
