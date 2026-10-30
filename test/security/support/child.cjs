// Test-only process. Runs the real server.js; replaces ONLY the external Supabase transport.
// Never imported by production code. No credentials or requests leave this process.
const http = require('node:http');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

let rows = [];
let users = [];
let calls = [];
let failure = null;
const copy = (value) => JSON.parse(JSON.stringify(value));
const reply = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => copy(data),
  text: async () => typeof data === 'string' ? data : JSON.stringify(data),
});
const eqFilters = (url) => {
  const filters = {};
  for (const [key, value] of url.searchParams) {
    if (['select', 'order', 'limit'].includes(key)) continue;
    filters[key] = value;
  }
  return filters;
};
// Every non-reserved parameter must be an exact eq. match; anything else matches nothing.
const matches = (row, filters) => Object.entries(filters).every(([key, value]) => value === `eq.${row[key]}`);

global.fetch = async (target, options = {}) => {
  const url = new URL(String(target));
  // .invalid is a reserved test domain; this adapter performs no network I/O.
  const table = { '/rest/v1/books': 'books', '/rest/v1/users': 'users' }[url.pathname];
  if (url.hostname !== 'shelf-test.invalid' || !table) {
    throw new Error('Test adapter blocked an unexpected external destination.');
  }
  const method = options.method || 'GET';
  calls.push({ url: url.href, method, headers: { ...options.headers }, body: options.body });
  if (failure) return reply(failure.text, failure.status);
  const filters = eqFilters(url);
  const source = table === 'books' ? rows : users;
  if (method === 'GET') return reply(source.filter((row) => matches(row, filters)));
  if (method === 'POST') {
    const input = JSON.parse(options.body);
    if (table === 'users' && users.some((user) => user.email === input.email)) return reply('duplicate key', 409);
    const row = { id: randomUUID(), ...input, created_at: '2026-01-01T00:00:00Z' };
    source.push(row);
    return reply([row], 201);
  }
  if (method === 'PATCH') {
    const updated = [];
    for (let index = 0; index < source.length; index++) {
      if (!matches(source[index], filters)) continue;
      source[index] = { ...source[index], ...JSON.parse(options.body) };
      updated.push(source[index]);
    }
    return reply(updated);
  }
  if (method === 'DELETE') {
    const deleted = source.filter((row) => matches(row, filters));
    const kept = source.filter((row) => !matches(row, filters));
    if (table === 'books') rows = kept; else users = kept;
    return reply(deleted);
  }
  return reply({ error: 'Unsupported test adapter method' }, 405);
};

process.on('message', ({ sequence, command, value }) => {
  try {
    if (command === 'seed') { rows = copy(value.books || value); users = copy(value.users || []); calls = []; failure = null; }
    if (command === 'failure') failure = value;
    const result = command === 'inspect' ? { rows: copy(rows), users: copy(users), calls: copy(calls) } : true;
    process.send({ sequence, result });
  } catch (error) { process.send({ sequence, error: error.message }); }
});
process.on('disconnect', () => process.exit(0));

// Use an ephemeral loopback-only port without changing the application's server code.
const originalListen = http.Server.prototype.listen;
http.Server.prototype.listen = function (...args) {
  const callback = args.find((item) => typeof item === 'function');
  this.once('listening', () => process.send({ ready: true, port: this.address().port }));
  return originalListen.call(this, 0, '127.0.0.1', callback);
};
require(path.resolve(__dirname, '../../../server.js'));
