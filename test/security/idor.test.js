const test = require('node:test');
const assert = require('node:assert/strict');
const { startApp, BOOK_A, BOOK_B, USER_A, auth } = require('./support/app.cjs');

// Política testada: cada livro pertence a um usuário. Visitante anônimo não acessa nada,
// e um usuário autenticado não consegue ler, editar ou excluir livros de outro usuário
// trocando o id na URL (IDOR).

test('[IDOR-01] visitante sem login não lista livros', async (t) => {
  const app = await startApp(t);
  const res = await app.request('GET', '/api/books');
  const state = await app.control('inspect');
  t.diagnostic(`GET anônimo: HTTP ${res.status}; chamadas ao banco: ${state.calls.length}.`);
  assert.equal(res.status, 401);
  assert.equal(state.calls.length, 0, 'Acesso negado deve ocorrer antes de consultar o banco.');
});

test('[IDOR-02] visitante sem login não edita livro pelo id', async (t) => {
  const app = await startApp(t);
  const res = await app.request('PUT', `/api/books?id=${BOOK_B.id}`, { ...BOOK_B, title: 'Alterado sem login' });
  const state = await app.control('inspect');
  const changed = state.rows.find((row) => row.id === BOOK_B.id).title !== BOOK_B.title;
  t.diagnostic(`PUT anônimo: HTTP ${res.status}; livro B alterado: ${changed}.`);
  assert.equal(res.status, 401);
  assert.equal(changed, false);
});

test('[IDOR-03] visitante sem login não exclui livro pelo id', async (t) => {
  const app = await startApp(t);
  const res = await app.request('DELETE', `/api/books?id=${BOOK_B.id}`);
  const state = await app.control('inspect');
  const deleted = !state.rows.some((row) => row.id === BOOK_B.id);
  t.diagnostic(`DELETE anônimo: HTTP ${res.status}; livro B excluído: ${deleted}.`);
  assert.equal(res.status, 401);
  assert.equal(deleted, false);
});

test('[IDOR-04] token inválido não concede acesso', async (t) => {
  const app = await startApp(t);
  const res = await app.request('PUT', `/api/books?id=${BOOK_B.id}`, { ...BOOK_B, title: 'Token falso' }, { Authorization: 'Bearer token-ficticio-invalido' });
  const state = await app.control('inspect');
  const changed = state.rows.find((row) => row.id === BOOK_B.id).title !== BOOK_B.title;
  t.diagnostic(`Bearer inválido: HTTP ${res.status}; alteração persistida: ${changed}.`);
  assert.equal(res.status, 401);
  assert.equal(changed, false);
});

test('[IDOR-05] usuário A só vê os próprios livros', async (t) => {
  const app = await startApp(t);
  const res = await app.request('GET', '/api/books', undefined, auth(USER_A));
  const ids = res.body.map((book) => book.id);
  t.diagnostic(`Usuário A listou: ${JSON.stringify(ids)}.`);
  assert.equal(res.status, 200);
  assert.deepEqual(ids, [BOOK_A.id], 'A listagem trouxe livro de outro usuário.');
});

test('[IDOR-06] usuário A não edita o livro do usuário B trocando o id', async (t) => {
  const app = await startApp(t);
  const res = await app.request('PUT', `/api/books?id=${BOOK_B.id}`, { ...BOOK_B, title: 'Alterado por A' }, auth(USER_A));
  const state = await app.control('inspect');
  const changed = state.rows.find((row) => row.id === BOOK_B.id).title !== BOOK_B.title;
  t.diagnostic(`A tentou editar o livro de B: HTTP ${res.status}; livro B alterado: ${changed}.`);
  assert.equal(res.status, 404);
  assert.equal(changed, false);
});

test('[IDOR-07] usuário A não exclui o livro do usuário B trocando o id', async (t) => {
  const app = await startApp(t);
  const res = await app.request('DELETE', `/api/books?id=${BOOK_B.id}`, undefined, auth(USER_A));
  const state = await app.control('inspect');
  const deleted = !state.rows.some((row) => row.id === BOOK_B.id);
  t.diagnostic(`A tentou excluir o livro de B: HTTP ${res.status}; livro B excluído: ${deleted}.`);
  assert.equal(res.status, 404);
  assert.equal(deleted, false);
});

test('[IDOR-08] controle: o dono consegue editar o próprio livro', async (t) => {
  const app = await startApp(t);
  const res = await app.request('PUT', `/api/books?id=${BOOK_A.id}`, { ...BOOK_A, title: 'Editado pela dona' }, auth(USER_A));
  const state = await app.control('inspect');
  t.diagnostic(`Dona editou o próprio livro: HTTP ${res.status}.`);
  assert.equal(res.status, 200);
  assert.equal(state.rows.find((row) => row.id === BOOK_A.id).title, 'Editado pela dona');
});
