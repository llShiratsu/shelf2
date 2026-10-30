// POST /api/auth?action=register  { email, password }
// POST /api/auth?action=login     { email, password }
const { hashPassword, verifyPassword, validatePassword, getDummyHash } = require("../src/password");
const { signToken, getAuthSecret } = require("../src/token");
const {
  HttpError, send, sendError, readBody, clientIp, createRateLimiter, requestSupabase,
} = require("../src/http");

// Até 10 tentativas de login/cadastro por minuto por IP (contra força bruta).
const authLimit = createRateLimiter({ limit: 10, windowMs: 60 * 1000 });
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_LOGIN = "E-mail ou senha incorretos.";

function readCredentials(body) {
  const email = String(body.email || "").trim().toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new HttpError(400, "Informe um e-mail válido.");
  return { email, password };
}

async function register(body) {
  const { email, password } = readCredentials(body);
  const problem = validatePassword(password);
  if (problem) throw new HttpError(400, problem);

  const password_hash = await hashPassword(password);
  let created;
  try {
    created = await requestSupabase("users?select=id,email", {
      method: "POST",
      body: JSON.stringify({ email, password_hash }),
    });
  } catch (error) {
    if (error.upstreamStatus === 409) throw new HttpError(409, "Este e-mail já está cadastrado.");
    throw error;
  }
  return created[0];
}

async function login(body) {
  const { email, password } = readCredentials(body);
  const rows = await requestSupabase(
    `users?select=id,email,password_hash&email=eq.${encodeURIComponent(email)}&limit=1`,
    { method: "GET" },
  );
  const user = rows[0];
  // Mesmo sem usuário, roda o scrypt para não revelar pelo tempo de resposta se o e-mail existe.
  const valid = await verifyPassword(password, user ? user.password_hash : await getDummyHash());
  if (!user || !valid) throw new HttpError(401, INVALID_LOGIN);
  return { id: user.id, email: user.email };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") throw new HttpError(405, "Método não permitido.");
    authLimit(clientIp(req));
    getAuthSecret(); // falha cedo se o servidor estiver sem segredo configurado

    const action = new URL(req.url, "http://localhost").searchParams.get("action");
    const body = await readBody(req, 4 * 1024);

    if (action === "register") {
      const user = await register(body);
      send(res, 201, { token: signToken(user.id), user: { email: user.email } });
      return;
    }
    if (action === "login") {
      const user = await login(body);
      send(res, 200, { token: signToken(user.id), user: { email: user.email } });
      return;
    }
    throw new HttpError(400, "Ação inválida.");
  } catch (error) {
    sendError(res, error);
  }
};
