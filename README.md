# Acervo de Camisas — Atlético

Catálogo web para registrar a coleção de camisas do Atlético: foto, nome e descrição de cada peça. A galeria é pública; adicionar, editar e excluir camisas exige um token de acesso.

## Stack

Página única (`index.html`), sem build e sem serviço externo — o próprio repositório GitHub funciona como banco de dados:

- `data/camisas.json` — lista das camisas (nome, descrição, nome do arquivo da foto)
- `fotos/` — as fotos (redimensionadas no navegador para até 1280px antes do envio, para economizar espaço)
- Leitura da galeria: pública, direto de `raw.githubusercontent.com` (sem precisar de login)
- Escrita (adicionar/editar/excluir): feita via API do GitHub, autenticada com um token pessoal

Sem Firebase, sem cartão de crédito, sem plano pago.

## Configurar o login (token de acesso)

Só quem vai gerenciar o acervo precisa disso — os visitantes não.

1. No GitHub, vá em **Settings → Developer settings → Personal access tokens → Fine-grained tokens** → **Generate new token**.
2. Em "Repository access", escolha **Only select repositories** → selecione `acervo-camisas-atletico`.
3. Em "Permissions" → "Repository permissions" → defina **Contents: Read and write**.
4. Defina uma validade (ex: 1 ano) e gere o token.
5. Copie o token (começa com `github_pat_...`) — ele só aparece uma vez.
6. No site, clique em "Entrar" e cole o token.

O token fica salvo apenas no navegador de quem faz login (`localStorage`), nunca no repositório. Se vazar, revogue em Settings → Developer settings a qualquer momento e gere um novo.

## Publicar (GitHub Pages)

Settings → Pages → Deploy from branch → `main` / `/ (root)`. (Já está configurado neste repositório.)

## Uso

- Sem login: qualquer visitante vê a galeria.
- Com login: aparece o botão "+ Nova camisa" e as ações de editar/excluir em cada card.

## Espaço

GitHub recomenda manter repositórios abaixo de 1GB (tolera até ~5GB), com até 100MB por arquivo. Como as fotos são comprimidas para ~200–400KB cada, dá para catalogar milhares de camisas sem se aproximar do limite.
