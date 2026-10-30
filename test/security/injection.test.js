const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { startApp, ROOT, BOOK_A, USER_A, auth } = require('./support/app.cjs');

test('[INJECAO-01] texto semelhante a SQL permanece como dado no JSON enviado ao Supabase', async (t) => {
  const app = await startApp(t);
  const payload = "Livro'); DROP TABLE books; --";
  const res = await app.request('POST', '/api/books', { title: payload, author: "O'Reilly", status: 'quero_ler' }, auth(USER_A));
  const state = await app.control('inspect');
  assert.equal(res.status, 201);
  const call = state.calls.find((item) => item.method === 'POST');
  assert.equal(new URL(call.url).pathname, '/rest/v1/books');
  assert.equal(new URL(call.url).search, '');
  assert.equal(JSON.parse(call.body).title, payload);
  assert.equal(res.body.title, payload);
  assert.equal(state.rows.length, 3);
  t.diagnostic('Payload preservado no corpo JSON e ausente da URL. Escopo: construção da requisição; não executa SQL no PostgreSQL real.');
});

test('[INJECAO-02] ID com separadores não pode acrescentar filtros ao PostgREST', async (t) => {
  const app = await startApp(t);
  const payload = `${BOOK_A.id}&or=(id.neq.0)&select=*`;
  const res = await app.request('DELETE', `/api/books?id=${encodeURIComponent(payload)}`, undefined, auth(USER_A));
  const state = await app.control('inspect');
  assert.ok(res.status < 500);
  assert.equal(state.calls.length, 1);
  const url = new URL(state.calls[0].url);
  assert.deepEqual([...url.searchParams.keys()].sort(), ['id', 'select', 'user_id']);
  assert.equal(url.searchParams.get('id'), `eq.${payload}`);
  assert.equal(url.searchParams.get('user_id'), `eq.${USER_A}`);
  assert.equal(state.rows.length, 2);
  t.diagnostic('Separadores escapados: um único parâmetro id; ambos os registros fictícios preservados.');
});

test('[INJECAO-03] filtro de status manipulado deve ser recusado antes do banco', async (t) => {
  const app = await startApp(t);
  const payload = 'lido&or=(id.neq.0)';
  const res = await app.request('GET', `/api/books?status=${encodeURIComponent(payload)}`, undefined, auth(USER_A));
  assert.equal(res.status, 400);
  assert.equal((await app.control('inspect')).calls.length, 0);
  t.diagnostic('Status fora da lista permitida retornou 400, sem acesso ao adaptador de banco.');
});

test('[INJECAO-04] campos extras e __proto__ não podem ser atribuídos ao registro', async (t) => {
  const app = await startApp(t);
  const body = JSON.stringify({ title: 'Livro', author: 'Autora', status: 'lido', id: BOOK_A.id, user_id: 'intruso', owner_id: 'intruso', is_admin: true }).slice(0, -1) + ',"__proto__":{"polluted":true}}';
  const res = await app.request('POST', '/api/books', body, auth(USER_A));
  assert.equal(res.status, 201);
  const state = await app.control('inspect');
  const sent = JSON.parse(state.calls[0].body);
  assert.deepEqual(Object.keys(sent).sort(), ['author', 'end_date', 'genre', 'rating', 'start_date', 'status', 'title', 'user_id']);
  assert.equal(sent.user_id, USER_A, 'Dono do livro deve vir do token, não do corpo enviado.');
  assert.notEqual(res.body.id, BOOK_A.id);
  for (const field of ['owner_id', 'is_admin', '__proto__']) assert.equal(Object.hasOwn(res.body, field), false);
  t.diagnostic('Somente campos permitidos chegaram ao banco. user_id veio do token; user_id, owner_id e is_admin enviados pelo cliente foram ignorados.');
});

test('[INJECAO-05] renderização do frontend mantém payloads XSS em textContent', async (t) => {
  const payloads = [
    '<img src=x onerror="globalThis.__shelfXss=1">',
    '<svg onload="globalThis.__shelfXss=1"></svg>',
    '<script>globalThis.__shelfXss=1</script>',
  ];
  const htmlWrites = [];
  const textWrites = [];
  const rows = [];
  // Instrumented DOM sink adapter, not a browser or an HTML parser.
  // Executes the real public/app.js and records which DOM API receives each value.
  function element() {
    const childrenBySelector = new Map();
    return {
      value: '', hidden: false, dataset: {}, children: [], classList: { toggle() {} },
      addEventListener() {}, reset() {}, focus() {},
      appendChild(child) { rows.push(child); },
      querySelector(selector) {
        if (!childrenBySelector.has(selector)) childrenBySelector.set(selector, element());
        return childrenBySelector.get(selector);
      },
      set innerHTML(value) { htmlWrites.push(String(value)); this.children = Array.from({ length: 4 }, () => element()); },
      set textContent(value) { textWrites.push(String(value)); },
    };
  }
  const elements = new Map();
  const context = vm.createContext({
    document: {
      querySelector(selector) { if (!elements.has(selector)) elements.set(selector, element()); return elements.get(selector); },
      querySelectorAll() { return []; },
      createElement() { return element(); },
    },
    fetch: async () => ({ ok: true, json: async () => payloads.map((value) => ({ ...BOOK_A, title: value, author: value, genre: value })) }),
    confirm: () => false,
    localStorage: { getItem: (key) => (key === 'shelf_token' ? 'token-de-teste' : null), setItem() {}, removeItem() {} },
  });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/app.js'), 'utf8'), context, { timeout: 1000 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(rows.length, payloads.length, 'Controle: renderBooks precisa ter sido executada.');
  for (const payload of payloads) {
    assert.ok(textWrites.some((value) => value.includes(payload)), 'Payload não percorreu o renderizador real.');
    assert.ok(htmlWrites.every((value) => !value.includes(payload)), 'Payload não confiável foi interpolado em innerHTML.');
  }
  assert.equal(context.__shelfXss, undefined);
  t.diagnostic('Três payloads percorreram o renderizador real: dados em textContent; innerHTML recebeu apenas template estático. Ensaio de componente, sem navegador real.');
});

test('[INJECAO-06] JSON malformado deve retornar 400 sem detalhes internos', async (t) => {
  const app = await startApp(t);
  const res = await app.request('POST', '/api/books', '{"title":', auth(USER_A));
  assert.equal((await app.control('inspect')).calls.length, 0);
  t.diagnostic(`JSON truncado: HTTP ${res.status}; corpo: ${JSON.stringify(res.body)}.`);
  assert.equal(res.status, 400, 'Erro de entrada do cliente foi tratado como erro interno 500.');
  assert.doesNotMatch(res.text, /SyntaxError|JSON at position|Unexpected end|JSON input/i);
});

test('[INJECAO-07] e-mail com separadores no login não acrescenta filtros', async (t) => {
  const app = await startApp(t);
  const payload = 'a@b.com&or=(email.neq.x)';
  const res = await app.request('POST', '/api/auth?action=login', { email: payload, password: 'qualquer-coisa' });
  const state = await app.control('inspect');
  t.diagnostic(`E-mail manipulado: HTTP ${res.status}; chamadas ao banco: ${state.calls.length}.`);
  assert.ok([400, 401].includes(res.status));
  for (const call of state.calls) {
    const url = new URL(call.url);
    assert.deepEqual([...url.searchParams.keys()].sort(), ['email', 'limit', 'select']);
  }
});
