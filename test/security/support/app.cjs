const http = require('node:http');
const path = require('node:path');
const { fork } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../../..');
const { signToken } = require(path.join(ROOT, 'src/token.js'));
const SECRET = 'SHELF_TEST_ONLY_SERVICE_KEY_NOT_A_REAL_SECRET';
const AUTH_SECRET = 'SHELF_TEST_ONLY_AUTH_SECRET_0123456789abcdef';
// Two distinct accounts. Book A belongs to user A, book B to user B.
const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BOOK_A = { id: '11111111-1111-4111-8111-111111111111', user_id: USER_A, title: 'Livro A', author: 'Autora A', status: 'quero_ler' };
const BOOK_B = { id: '22222222-2222-4222-8222-222222222222', user_id: USER_B, title: 'Livro B', author: 'Autora B', status: 'lendo' };

// Valid session token for a user, signed exactly as the API signs it.
function tokenFor(userId, options = {}) {
  return signToken(userId, { secret: AUTH_SECRET, ...options });
}
const auth = (userId) => ({ Authorization: `Bearer ${tokenFor(userId)}` });

async function startApp(t, { protocol = 'https:', authSecret = AUTH_SECRET } = {}) {
  const child = fork(path.join(__dirname, 'child.cjs'), [], {
    cwd: ROOT,
    execArgv: [],
    env: {
      ...process.env,
      NODE_OPTIONS: '',
      PORT: '0',
      SUPABASE_URL: `${protocol}//shelf-test.invalid`,
      SUPABASE_SERVICE_ROLE_KEY: SECRET,
      SUPABASE_ANON_KEY: 'SHELF_TEST_ONLY_ANON_KEY',
      AUTH_SECRET: authSecret,
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let stderr = '';
  child.stderr.on('data', (data) => { stderr += data; });
  child.stdout.resume();
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => { child.once('exit', resolve); child.kill(); });
    }
  });
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Local server startup timeout: ' + stderr)), 10000);
    const cleanup = () => { clearTimeout(timeout); child.off('message', ready); child.off('exit', exited); };
    function ready(message) { if (message.ready) { cleanup(); resolve(message.port); } }
    function exited(code) { cleanup(); reject(new Error(`Local server exited (${code}): ${stderr}`)); }
    child.on('message', ready);
    child.once('exit', exited);
    child.once('error', (error) => { cleanup(); reject(error); });
  });
  let next = 0;
  function control(command, value) {
    return new Promise((resolve, reject) => {
      const sequence = ++next;
      const timer = setTimeout(() => { child.off('message', listener); reject(new Error('Test IPC timeout')); }, 5000);
      function listener(message) {
        if (message.sequence !== sequence) return;
        clearTimeout(timer);
        child.off('message', listener);
        if (message.error) reject(new Error(message.error)); else resolve(message.result);
      }
      child.on('message', listener);
      child.send({ sequence, command, value });
    });
  }
  function request(method, route, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const data = body === undefined ? '' : (typeof body === 'string' ? body : JSON.stringify(body));
      const req = http.request({
        host: '127.0.0.1', port, path: route, method, agent: false,
        headers: { ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}), ...headers },
      }, (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { text += chunk; });
        res.on('end', () => {
          let result = text;
          try { result = JSON.parse(text); } catch (_) { /* static responses */ }
          resolve({ status: res.statusCode, headers: res.headers, body: result, text });
        });
        res.on('error', reject);
      });
      req.setTimeout(5000, () => req.destroy(new Error('Local HTTP timeout')));
      req.on('error', reject);
      req.end(data);
    });
  }
  await control('seed', { books: [BOOK_A, BOOK_B], users: [] });
  return { request, control, port };
}

module.exports = { startApp, ROOT, SECRET, AUTH_SECRET, USER_A, USER_B, BOOK_A, BOOK_B, tokenFor, auth };
