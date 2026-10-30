// Token de sessão assinado com HMAC-SHA256 (formato parecido com JWT HS256).
// O segredo vem de AUTH_SECRET e nunca é enviado ao navegador.
const crypto = require("node:crypto");

const DEFAULT_TTL_SECONDS = 12 * 60 * 60;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || "";
  if (secret.length < 32) {
    const error = new Error("AUTH_SECRET ausente ou curto demais (mínimo 32 caracteres).");
    error.statusCode = 500;
    error.internal = true;
    throw error;
  }
  return secret;
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const sign = (data, secret) => crypto.createHmac("sha256", secret).update(data).digest("base64url");

function signToken(userId, { secret = getAuthSecret(), ttlSeconds = DEFAULT_TTL_SECONDS, now = Date.now() } = {}) {
  const iat = Math.floor(now / 1000);
  const data = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, iat, exp: iat + ttlSeconds })}`;
  return `${data}.${sign(data, secret)}`;
}

// Retorna o id do usuário ou null. Nunca lança erro por token inválido.
function verifyToken(token, { secret = getAuthSecret(), now = Date.now() } = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`, secret));
  const received = Buffer.from(parts[2]);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
    return payload.sub;
  } catch (_) {
    return null;
  }
}

module.exports = { signToken, verifyToken, getAuthSecret };
