# Acervo de Camisas — Atlético

Catálogo web para registrar a coleção de camisas do Atlético: foto, nome e descrição de cada peça. A galeria é pública; adicionar, editar e excluir camisas exige login.

## Stack

Página única (`index.html`), sem build, usando Firebase:

- **Auth** — login por e-mail/senha (só o dono da coleção precisa de conta)
- **Firestore** — dados de cada camisa (nome, descrição, link da foto)
- **Storage** — armazenamento das fotos (redimensionadas no navegador antes do upload, até 1280px, para economizar espaço)

## Configurar

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. Ative:
   - **Authentication** → método "E-mail/senha" → crie manualmente o usuário do colecionador (não há tela de cadastro no site).
   - **Firestore Database** (modo produção).
   - **Storage**.
3. Em "Configurações do projeto" → copie as credenciais do app Web e cole em `FIREBASE_CONFIG` no topo do `<script>` de `index.html`.
4. Aplique as regras de segurança abaixo.

### Regras do Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /camisas/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Regras do Storage

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /camisas/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Publicar (GitHub Pages)

Repositório público → Settings → Pages → Deploy from branch → `main` / `/ (root)`.

## Uso

- Sem login: qualquer visitante vê a galeria.
- Com login: aparece o botão "+ Nova camisa" e as ações de editar/excluir em cada card.
