# Catálogo Desapegos Fitness

Catálogo online das peças com banco local (SQLite) para preço, preço promocional, marca e tamanho.
Não precisa instalar nada além do Node (versão 22 ou mais nova) e do ImageMagick (só para gerar as fotos).

## Como usar

1. Abra um terminal na pasta `catalogo`.
2. Rode:

```
npm start
```

3. Abra no navegador:
   - Catálogo (para clientes): http://localhost:3000
   - Painel de edição: http://localhost:3000/admin

No painel, cada peça tem os campos **nome, marca, tamanho, preço, preço promocional** e a caixa **Disponível**.
Preencha e clique em **Salvar** (ou aperte Enter). Aparece "Salvo ✓" ao lado. A caixa Disponível salva na hora.

## Adicionar fotos novas

1. Coloque os PNG novos numa pasta ao lado de `catalogo` (ex.: `final3`). Se o nome do arquivo tiver a descrição
   (ex.: `03_jaqueta-azul_frente-costas.png`), a peça já entra com o nome "Jaqueta azul".
2. Rode, informando a pasta:

```
npm run fotos -- ../final3
```

Isso gera versões leves em `public/img` (grande) e `public/thumb` (miniatura).

3. No painel, clique em **Buscar fotos novas** (ou reinicie o `npm start`).

## Onde ficam os dados

- Banco: `catalogo/catalogo.db` (um arquivo só). Ele vai junto no GitHub: depois de editar preços, faça `git add catalogo.db`, `git commit` e `git push` para atualizar.
- Tabela `produtos`: id, codigo (referência), arquivo, nome, marca, tamanho, preco, preco_promocional, disponivel, ordem, atualizado_em.

## Proteger o painel com senha

Se for colocar na internet, defina uma senha antes de iniciar. No PowerShell:

```
$env:ADMIN_SENHA = "sua-senha"
npm start
```

O navegador vai pedir usuário (qualquer um) e a senha ao abrir `/admin`.

## Logo

Se salvar a logo como `public/logo.png`, ela aparece no topo do catálogo automaticamente.

## Regras

- Preço promocional precisa ser menor que o preço normal (o painel avisa se não for).
- Peças marcadas como não disponíveis aparecem em cinza com selo "Vendido" só quando o cliente escolhe "Todos" no filtro.
- Peça em promoção mostra o preço antigo riscado e o novo em destaque, sem selo.

## Código de referência

Cada peça recebe um código sequencial (001, 002, ...) na hora em que é cadastrada. Ele aparece no painel e no catálogo
como "REF 001" e não muda depois. Fotos novas continuam a numeração de onde parou.

## Botão do WhatsApp

Cada peça disponível tem o botão **Quero essa peça**, que abre o WhatsApp (51 98112-6240) com a mensagem já preenchida:
referência, nome, marca, tamanho, preço e valor promocional. Para trocar o número, edite a linha `const WHATSAPP` em `public/index.html`.

## Ordem das peças

No painel, arraste a peça pela barra "⠿ arrastar" (em cima da foto) para a posição que quiser, ou use as setas ◀ ▶
para mover uma posição por vez (as setas também funcionam no celular). A ordem é salva na hora e vale para o catálogo.
Com o filtro de busca preenchido não dá para reordenar; limpe o filtro antes.

## Publicar na Vercel (site online)

A Vercel só serve os arquivos da pasta `public`; o servidor Node e o banco não rodam lá.
Por isso o painel funciona **só no seu computador** (o arquivo dele fica em `painel/`, fora de `public`, e nunca é publicado). O site online lê o arquivo `public/produtos.json`,
que o painel atualiza sozinho a cada alteração.

Para colocar as mudanças no ar:

```
npm run publicar
```

Isso exporta o banco para `produtos.json`, faz o commit e o push. A Vercel publica em cerca de 1 minuto.
Na Vercel, o "Output Directory" do projeto precisa ser `public`.

## Arte da oferta (imagem para postar)

No catálogo, clicar na foto de uma peça abre uma arte quadrada (1080x1080, formato de post) com a foto,
a logo, referência, nome, marca, tamanho e preços. O botão **Download imagem** baixa essa arte como JPG
(`desapegos-fitness-ref-001.jpg`) para postar no Instagram, status do WhatsApp etc.
