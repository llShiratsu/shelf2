const test = require('node:test');
const assert = require('node:assert/strict');
const { startApp, USER_A, auth } = require('./support/app.cjs');

test('[BOTS-01] rajada de 30 cadastros deve acionar limite e Retry-After', async (t) => {
  const app = await startApp(t);
  await app.control('seed', { books: [], users: [] });
  const statuses = {};
  const limited = [];
  const started = Date.now();
  // Política: no máximo 20 escritas por minuto por IP.
  for (let index = 0; index < 30; index++) {
    const res = await app.request('POST', '/api/books', { title: `Livro automatizado ${index}`, author: 'Bot local', status: 'quero_ler' }, auth(USER_A));
    statuses[res.status] = (statuses[res.status] || 0) + 1;
    if (res.status === 429) limited.push(res);
  }
  const state = await app.control('inspect');
  t.diagnostic(`30 requisições sequenciais em ${Date.now() - started} ms; HTTP: ${JSON.stringify(statuses)}; registros: ${state.rows.length}.`);
  assert.ok(Date.now() - started < 60000, 'Ambiente lento: repetir ensaio dentro da janela de 60 segundos.');
  assert.ok(limited.length >= 10 && state.rows.length <= 20, 'Nenhum limite de 20 escritas/minuto impediu a rajada de cadastros.');
  for (const res of limited) assert.match(String(res.headers['retry-after']), /^\d+$/, '429 deve indicar quando tentar novamente.');
});

test('[BOTS-02] API deve respeitar o limite de 120 caracteres do título da interface', async (t) => {
  const app = await startApp(t);
  const res = await app.request('POST', '/api/books', { title: 'A'.repeat(121), author: 'Bot local', status: 'quero_ler' }, auth(USER_A));
  const state = await app.control('inspect');
  t.diagnostic(`Título com 121 caracteres: HTTP ${res.status}; chamadas ao banco: ${state.calls.length}.`);
  assert.equal(res.status, 400, 'maxlength do HTML pode ser contornado com chamada direta à API.');
  assert.equal(state.calls.length, 0);
});

test('[BOTS-03] corpo acima do orçamento de 64 KiB deve receber 413', async (t) => {
  const app = await startApp(t);
  const payload = { title: 'Livro grande', author: 'Bot local', status: 'quero_ler', padding: 'x'.repeat(70 * 1024) };
  const res = await app.request('POST', '/api/books', payload, auth(USER_A));
  const state = await app.control('inspect');
  t.diagnostic(`JSON enviado: ${Buffer.byteLength(JSON.stringify(payload))} bytes; HTTP ${res.status}; chamadas ao banco: ${state.calls.length}.`);
  assert.equal(res.status, 413, 'API não limita o tamanho do corpo antes de processá-lo (orçamento proposto: 64 KiB).');
  assert.equal(state.calls.length, 0);
});

test('[BOTS-04] força bruta no login é bloqueada após 10 tentativas por minuto', async (t) => {
  const app = await startApp(t);
  const statuses = [];
  for (let index = 0; index < 15; index++) {
    const res = await app.request('POST', '/api/auth?action=login', { email: 'alvo@exemplo.com', password: `chute-${index}` });
    statuses.push(res.status);
  }
  const blocked = statuses.filter((status) => status === 429).length;
  t.diagnostic(`15 tentativas de senha: ${JSON.stringify(statuses)}.`);
  assert.equal(blocked, 5, 'Tentativas acima de 10/minuto deveriam receber 429.');
});
