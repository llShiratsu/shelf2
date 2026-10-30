// Funções compartilhadas pelas rotas da API: respostas, leitura segura do corpo,
// limite de requisições, autenticação e acesso ao Supabase.
const { verifyToken } = require("./token");

const MAX_BODY_BYTES = 64 * 1024;

class HttpError extends Error {
  constructor(statusCode, message, headers) {
    super(message);
    this.statusCode = statusCode;
    this.headers = headers;
  }
}

function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(data));
}

// Erros esperados (HttpError) mostram sua mensagem; o resto vira "Erro interno"
// e o detalhe fica só no log do servidor.
function sendError(res, error) {
  if (error instanceof HttpError) {
    send(res, error.statusCode, { error: error.message }, error.headers);
    return;
  }
  console.error("[shelf] erro interno:", error.message);
  send(res, 500, { error: "Erro interno. Tente novamente mais tarde." });
}

function readBody(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"] || 0);
    if (declared > limit) {
      reject(new HttpError(413, "Requisição grande demais."));
      req.resume();
      return;
    }
    const chunks = [];
    let size = 0;
    let rejected = false;
    req.on("data", (chunk) => {
      if (rejected) return;
      size += chunk.length;
      if (size > limit) {
        rejected = true;
        reject(new HttpError(413, "Requisição grande demais."));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (rejected) return;
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve({});
      try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("not an object");
        }
        resolve(parsed);
      } catch (_) {
        reject(new HttpError(400, "JSON inválido."));
      }
    });
    req.on("error", reject);
  });
}

function clientIp(req) {
  // Na Vercel o IP real do visitante vem no cabeçalho definido pela plataforma.
  if (process.env.VERCEL) {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket?.remoteAddress || "desconhecido";
}

// Limite por janela fixa, em memória. Em serverless cada instância tem seu próprio
// contador; em produção o ideal é um armazenamento compartilhado (ex.: Redis).
function createRateLimiter({ limit, windowMs }) {
  const hits = new Map();
  return function check(key) {
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      throw new HttpError(429, "Muitas requisições. Aguarde e tente novamente.", { "Retry-After": String(retryAfter) });
    }
  };
}

function requireUser(req) {
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer (.+)$/);
  const userId = match ? verifyToken(match[1]) : null;
  if (!userId) throw new HttpError(401, "Faça login para continuar.");
  return userId;
}

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_) {
    throw new Error("SUPABASE_URL inválida.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !local) {
    // Nunca enviar a chave de serviço sem TLS.
    throw new Error("SUPABASE_URL precisa usar https.");
  }
  return { url: url.replace(/\/$/, ""), key };
}

async function requestSupabase(path, options = {}) {
  const env = getSupabaseEnv();
  const response = await fetch(`${env.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Supabase respondeu ${response.status}: ${detail}`);
    error.upstreamStatus = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

module.exports = {
  HttpError, send, sendError, readBody, clientIp, createRateLimiter, requireUser, requestSupabase, MAX_BODY_BYTES,
};
