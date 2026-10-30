const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const allowed = ['idor', 'crypto', 'injection', 'bots'];
const groups = process.argv.slice(2);
if (groups.some((item) => !allowed.includes(item))) {
  console.error('Categorias aceitas: ' + allowed.join(', '));
  process.exit(2);
}
const files = (groups.length ? groups : allowed).map((name) => `test/security/${name}.test.js`);
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
const log = fs.createWriteStream(path.join(root, 'reports/security-console.txt'));
const child = spawn(process.execPath, [
  '--test', '--test-concurrency=1', '--test-timeout=60000',
  '--test-reporter=./scripts/security-reporter.cjs', ...files,
], { cwd: root, env: { ...process.env, NODE_OPTIONS: '' }, stdio: ['inherit', 'pipe', 'pipe'] });
child.stdout.on('data', (data) => { process.stdout.write(data); log.write(data); });
child.stderr.on('data', (data) => { process.stderr.write(data); log.write(data); });
child.on('error', (error) => { console.error(error); log.end(); process.exitCode = 2; });
child.on('close', (code) => { log.end(); process.exitCode = code ?? 2; });
