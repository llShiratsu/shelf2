const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { startApp, SECRET, ROOT, USER_A, USER_B, BOOK_B, tokenFor, auth } = require('./support/app.cjs');
const { hashPassword, verifyPassword } = require(path.join(ROOT, 'src/password.js'));

// ---------- Senhas ----------

test('[SENHAS-01] hash com scrypt e salt aleatório; a senha não aparece no hash', async (t) => {
  const password = 'MinhaSenhaForte123';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  t.diagnostic(`Formato do hash: ${first.split('$').slice(0, 4).join('$')}$<salt>$<hash>.`);
  assert.match(first, /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.ok(!first.includes(password));
  assert.notEqual(first, second, 'Mesma senha deve gerar hashes diferentes (salt).');
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('senha-errada', first), false);
});

test('[SENHAS-02] cadastro guarda só o hash e não devolve senha nem hash', async (t) => {
  const app = await startApp(t);
  const password = 'SenhaDeCadastro123';
  const res = await app.request('POST', '/api/auth?action=register', { email: 'Ana@Exemplo.com', password });
  const state = await app.control('inspect');
  const stored = state.users[0];
  t.diagnostic(`Cadastro: HTTP ${res.status}; campos salvos: ${Object.keys(stored).join(', ')}.`);
  assert.equal(res.status, 201);
  assert.equal(stored.email, 'ana@exemplo.com');
  assert.ok(stored.password_hash.startsWith('scrypt$'));
  assert.ok(!JSON.stringify(state.calls).includes(password), 'Senha em texto puro foi enviada ao banco.');
  assert.ok(!res.text.includes(password) && !res.text.includes('password_hash'));
  assert.ok(res.body.token);
});

test('[SENHAS-03] login certo funciona; senha errada e e-mail inexistente dão a mesma resposta', async (t) => {
  const app = await startApp(t);
  await app.request('POST', '/api/auth?action=register', { email: 'bia@exemplo.com', password: 'SenhaCorreta123' });
  const ok = await app.request('POST', '/api/auth?action=login', { email: 'bia@exemplo.com', password: 'SenhaCorreta123' });
  const wrong = await app.request('POST', '/api/auth?action=login', { email: 'bia@exemplo.com', password: 'SenhaErrada123' });
  const missing = await app.request('POST', '/api/auth?action=login', { email: 'ninguem@exemplo.com', password: 'SenhaErrada123' });
  t.diagnostic(`Login correto: ${ok.status}; senha errada: ${wrong.status}; e-mail inexistente: ${missing.status}.`);
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  assert.equal(wrong.status, 401);
  assert.equal(missing.status, 401);
  assert.equal(wrong.text, missing.text, 'Respostas diferentes revelam quais e-mails existem.');
});

test('[SENHAS-04] senha com menos de 8 caracteres é recusada', async (t) => {
  const app = await startApp(t);
  const res = await app.request('POST', '/api/auth?action=register', { email: 'cia@exemplo.com', password: '1234567' });
  const state = await app.control('inspect');
  t.diagnostic(`Senha de 7 caracteres: HTTP ${res.status}; usuários criados: ${state.users.length}.`);
  assert.equal(res.status, 400);
  assert.equal(state.users.length, 0);
});

// ---------- Criptografia e segredos ----------

test('[CRIPTO-01] chave de serviço não aparece nos arquivos públicos nem nas respostas', async (t) => {
  const app = await startApp(t);
  for (const [route, headers] of [['/', {}], ['/app.js', {}], ['/styles.css', {}], ['/api/books', auth(USER_A)]]) {
    const res = await app.request('GET', route, undefined, headers);
    assert.equal(res.status, 200, `Resposta de controle: ${route}`);
    assert.ok(!res.text.includes(SECRET), `Chave exposta em ${route}`);
  }
  const state = await app.control('inspect');
  assert.equal(state.calls[0].headers.apikey, SECRET, 'Controle: o backend precisa ter usado a chave.');
  t.diagnostic('Chave usada só pelo backend e ausente das quatro respostas públicas.');
});

test('[CRIPTO-02] arquivo .env não é servido por HTTP', async (t) => {
  const envPath = path.join(ROOT, '.env');
  try {
    fs.writeFileSync(envPath, `SHELF_TEST_MARKER=${SECRET}\n`, { flag: 'wx' });
    t.after(() => fs.unlinkSync(envPath));
  } catch (error) { if (error.code !== 'EEXIST') throw error; }
  const app = await startApp(t);
  for (const route of ['/.env', '/%2e%2e/.env', '/..%2f.env', '/%2e%2e%5c.env']) {
    const res = await app.request('GET', route);
    assert.ok([403, 404].includes(res.status), `Arquivo de configuração acessível por ${route}`);
    assert.ok(!res.text.includes(SECRET));
  }
  t.diagnostic('Quatro caminhos para o .env retornaram 403 ou 404.');
});

test('[CRIPTO-03] SUPABASE_URL com http é recusada antes de enviar a chave', async (t) => {
  const app = await startApp(t, { protocol: 'http:' });
  const res = await app.request('GET', '/api/books', undefined, auth(USER_A));
  const state = await app.control('inspect');
  t.diagnostic(`SUPABASE_URL com http: HTTP ${res.status}; tentativas de envio da chave: ${state.calls.length}.`);
  assert.equal(state.calls.length, 0, 'Chave seria enviada sem TLS.');
  assert.equal(res.status, 500);
});

test('[CRIPTO-04] erro do serviço externo não vaza detalhes ao cliente', async (t) => {
  const app = await startApp(t);
  await app.control('failure', { status: 500, text: `Erro simulado contendo ${SECRET}` });
  const res = await app.request('GET', '/api/books', undefined, auth(USER_A));
  t.diagnostic(`Falha externa simulada: HTTP ${res.status}; corpo: ${res.text}.`);
  assert.equal(res.status, 500);
  assert.ok(!res.text.includes(SECRET));
});

test('[CRIPTO-05] token adulterado ou expirado é recusado', async (t) => {
  const app = await startApp(t);
  const [header, , signature] = tokenFor(USER_A).split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ sub: USER_B, iat: 0, exp: 9999999999 })).toString('base64url');
  const forged = `${header}.${forgedPayload}.${signature}`;
  const expired = tokenFor(USER_B, { ttlSeconds: 60, now: Date.now() - 3600 * 1000 });
  const wrongKey = tokenFor(USER_B, { secret: 'outro-segredo-qualquer-com-32-caracteres!!' });
  const results = [];
  for (const token of [forged, expired, wrongKey]) {
    const res = await app.request('DELETE', `/api/books?id=${BOOK_B.id}`, undefined, { Authorization: `Bearer ${token}` });
    results.push(res.status);
  }
  const state = await app.control('inspect');
  t.diagnostic(`Payload trocado / expirado / outra chave: HTTP ${results.join(' / ')}; livro B presente: ${state.rows.some((row) => row.id === BOOK_B.id)}.`);
  assert.deepEqual(results, [401, 401, 401]);
  assert.equal(state.calls.length, 0);
});

test('[CRIPTO-06] sem AUTH_SECRET configurado o servidor não emite tokens', async (t) => {
  const app = await startApp(t, { authSecret: '' });
  const res = await app.request('POST', '/api/auth?action=register', { email: 'dan@exemplo.com', password: 'SenhaValida123' });
  t.diagnostic(`Sem AUTH_SECRET: HTTP ${res.status}; token emitido: ${Boolean(res.body && res.body.token)}.`);
  assert.equal(res.status, 500);
  assert.ok(!res.body.token);
  assert.ok(!res.text.includes('AUTH_SECRET'), 'Detalhe de configuração não deve chegar ao cliente.');
});
