const { signToken } = require("../../src/token");

const TEST_AUTH_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-0000";
const TEST_USER_ID = "usuario-de-teste";

function setAuthEnv() {
  process.env.AUTH_SECRET = TEST_AUTH_SECRET;
}

function clearAuthEnv() {
  delete process.env.AUTH_SECRET;
}

function authHeader(userId = TEST_USER_ID) {
  return { Authorization: `Bearer ${signToken(userId, { secret: TEST_AUTH_SECRET })}` };
}

module.exports = { setAuthEnv, clearAuthEnv, authHeader, TEST_USER_ID };
