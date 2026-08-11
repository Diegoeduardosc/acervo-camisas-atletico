// Cloudflare Worker — backend leve do Acervo de Camisas.
// Guarda o token do GitHub em segredo e só libera escrita após login
// de e-mail/senha. Leitura da galeria continua pública, direto do
// raw.githubusercontent.com (não passa por aqui).

const GITHUB_OWNER = "Diegoeduardosc";
const GITHUB_REPO = "acervo-camisas-atletico";
const GITHUB_BRANCH = "main";
const DATA_PATH = "data/camisas.json";
const FOTOS_DIR = "fotos";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

const encoder = new TextEncoder();

function base64url(bytes) {
  let str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function assinarJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const data = `${base64url(encoder.encode(JSON.stringify(header)))}.${base64url(encoder.encode(JSON.stringify(payload)))}`;
  const assinatura = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(data));
  return `${data}.${base64url(new Uint8Array(assinatura))}`;
}

async function verificarJWT(token, secret) {
  const partes = token.split(".");
  if (partes.length !== 3) throw new Error("Token malformado");
  const [headerB64, payloadB64, sigB64] = partes;
  const valido = await crypto.subtle.verify("HMAC", await hmacKey(secret), base64urlDecode(sigB64), encoder.encode(`${headerB64}.${payloadB64}`));
  if (!valido) throw new Error("Sessão inválida");
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
  if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error("Sessão expirada");
  return payload;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(dados, status, origin) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function exigirAuth(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new Error("Não autenticado");
  await verificarJWT(token, env.JWT_SECRET);
}

async function githubFetch(env, path, options = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "acervo-camisas-worker",
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `Erro ${res.status} no GitHub`);
  return body;
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "https://diegoeduardosc.github.io";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    try {
      if (url.pathname === "/api/login" && request.method === "POST") {
        const { email, senha } = await request.json();
        if (email !== env.ADMIN_EMAIL || senha !== env.ADMIN_SENHA) {
          return jsonResponse({ erro: "E-mail ou senha inválidos." }, 401, origin);
        }
        const token = await assinarJWT({ sub: email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 }, env.JWT_SECRET);
        return jsonResponse({ token, email }, 200, origin);
      }

      if (url.pathname === "/api/estado" && request.method === "GET") {
        await exigirAuth(request, env);
        const dado = await githubFetch(env, `/contents/${DATA_PATH}?ref=${GITHUB_BRANCH}`);
        return jsonResponse({ sha: dado.sha, conteudo: dado.content }, 200, origin);
      }

      if (url.pathname === "/api/dados" && request.method === "PUT") {
        await exigirAuth(request, env);
        const { conteudo, sha, mensagem } = await request.json();
        const resultado = await githubFetch(env, `/contents/${DATA_PATH}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: mensagem, content: conteudo, sha, branch: GITHUB_BRANCH }),
        });
        return jsonResponse({ sha: resultado.content.sha }, 200, origin);
      }

      const fotoMatch = url.pathname.match(/^\/api\/fotos\/([^/]+)$/);
      if (fotoMatch && request.method === "PUT") {
        await exigirAuth(request, env);
        const nome = decodeURIComponent(fotoMatch[1]);
        const { conteudo, mensagem } = await request.json();
        await githubFetch(env, `/contents/${FOTOS_DIR}/${nome}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: mensagem, content: conteudo, branch: GITHUB_BRANCH }),
        });
        return jsonResponse({ ok: true }, 200, origin);
      }

      if (fotoMatch && request.method === "DELETE") {
        await exigirAuth(request, env);
        const nome = decodeURIComponent(fotoMatch[1]);
        try {
          const meta = await githubFetch(env, `/contents/${FOTOS_DIR}/${nome}?ref=${GITHUB_BRANCH}`);
          await githubFetch(env, `/contents/${FOTOS_DIR}/${nome}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: `remover foto: ${nome}`, sha: meta.sha, branch: GITHUB_BRANCH }),
          });
        } catch (e) {
          // melhor esforço: se a foto já não existir, seguimos em frente
        }
        return jsonResponse({ ok: true }, 200, origin);
      }

      return jsonResponse({ erro: "Rota não encontrada" }, 404, origin);
    } catch (err) {
      const msg = err.message || "Erro inesperado";
      const status = /autenticado|expirada|inválid/i.test(msg) ? 401 : 400;
      return jsonResponse({ erro: msg }, status, origin);
    }
  },
};
