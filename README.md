# Acervo de Camisas — Atlético

Catálogo web para registrar a coleção de camisas do Atlético: foto, nome e descrição de cada peça. A galeria é pública; adicionar, editar e excluir camisas exige login com e-mail e senha.

## Como funciona

Página única (`index.html`), hospedada de graça no GitHub Pages. Sem Firebase, sem cartão de crédito:

- **Dados**: `data/camisas.json` (nome, descrição, nome do arquivo da foto) e as fotos em `fotos/`, ambos dentro deste mesmo repositório.
- **Leitura da galeria**: pública, direto de `raw.githubusercontent.com` — qualquer visitante vê, sem precisar de login.
- **Escrita** (adicionar/editar/excluir): passa por um **Cloudflare Worker** (`worker/index.js`) — uma função pequena e gratuita que guarda o token do GitHub em segredo e só libera a escrita depois de validar e-mail/senha. O navegador nunca tem acesso direto ao token do GitHub.

```
Navegador → login e-mail/senha → Worker valida e devolve uma sessão
Navegador → salvar/editar/excluir → Worker confere a sessão → grava no GitHub
```

## 1. Implantar o backend (Cloudflare Worker)

Gratuito, sem cartão de crédito.

1. Crie uma conta em [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) (só e-mail e senha).
2. No painel, vá em **Workers & Pages** → **Create** → **Create Worker**. Dê um nome (ex: `acervo-camisas-atletico`) → **Deploy**.
3. Depois de criado, clique em **Edit code** (editor no navegador, sem precisar instalar nada).
4. Apague o conteúdo padrão e cole o conteúdo de [`worker/index.js`](worker/index.js) deste repositório → **Deploy**.
5. Volte para a página do Worker → aba **Settings → Variables and Secrets** → adicione (como **Secret**, não como texto plano):
   - `GITHUB_TOKEN` — um fine-grained personal access token do GitHub (Settings → Developer settings → Personal access tokens → Fine-grained tokens → Only select repositories → este repositório → Permissions → **Contents: Read and write**).
   - `JWT_SECRET` — qualquer string longa e aleatória (ex: gere uma em [1password.com/password-generator](https://1password.com/password-generator) ou similar).
   - `ADMIN_EMAIL` — o e-mail que vai fazer login no site.
   - `ADMIN_SENHA` — a senha correspondente.
6. Copie a URL pública do Worker (algo como `https://acervo-camisas-atletico.SEU-USUARIO.workers.dev`).

## 2. Conectar o site ao backend

Em [`index.html`](index.html), troque:

```js
const WORKER_URL = "https://SEU-WORKER.SEU-SUBDOMINIO.workers.dev";
```

pela URL copiada no passo anterior, e faça commit/push. O GitHub Pages publica automaticamente.

## Publicar o site (GitHub Pages)

Settings → Pages → Deploy from branch → `main` / `/ (root)`. (Já está configurado neste repositório.)

## Uso

- Sem login: qualquer visitante vê a galeria.
- Com login (e-mail/senha cadastrados no Worker): aparece o botão "+ Nova camisa" e as ações de editar/excluir em cada card. A sessão dura 12h.

## Espaço

GitHub recomenda manter repositórios abaixo de 1GB (tolera até ~5GB), com até 100MB por arquivo. Como as fotos são comprimidas para ~200–400KB cada, dá para catalogar milhares de camisas sem se aproximar do limite. O Worker também é gratuito até 100 mil requisições/dia — muito acima do uso de um catálogo pessoal.
