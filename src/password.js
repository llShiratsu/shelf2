// Armazenamento de senha com scrypt (nativo do Node), salt aleatório por usuário
// e comparação em tempo constante.
const crypto = require("node:crypto");

const KEY_LENGTH = 64;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

function scrypt(password, salt, params = PARAMS) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, params, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < MIN_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_LENGTH} caracteres.`;
  }
  if (password.length > MAX_LENGTH) return `A senha deve ter no máximo ${MAX_LENGTH} caracteres.`;
  return null;
}

// Formato salvo no banco: scrypt$N$r$p$salt(base64)$hash(base64)
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, saltText, hashText] = parts;
  const expected = Buffer.from(hashText, "base64");
  const key = await scrypt(String(password), Buffer.from(saltText, "base64"), {
    N: Number(N), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem,
  });
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
}

// Hash fixo usado quando o e-mail não existe, para o login levar o mesmo tempo
// nos dois casos e não revelar quais e-mails estão cadastrados.
let dummyHash = null;
async function getDummyHash() {
  if (!dummyHash) dummyHash = await hashPassword("senha-inexistente-para-tempo-constante");
  return dummyHash;
}

module.exports = { hashPassword, verifyPassword, validatePassword, getDummyHash, MIN_LENGTH };
