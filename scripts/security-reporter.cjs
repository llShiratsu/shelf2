const fs = require('node:fs');
const path = require('node:path');

module.exports = async function* reporter(events) {
  const results = [];
  const diagnostics = [];
  const startedAt = new Date().toISOString();
  for await (const event of events) {
    const data = event.data;
    if (event.type === 'test:diagnostic') {
      diagnostics.push(data.message);
      yield `  EVIDÊNCIA: ${data.message}\n`;
    }
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
    const error = data.details?.error;
    const cause = error?.cause || error;
    const status = data.skip ? 'NAO_APLICAVEL' : event.type === 'test:pass' ? 'PASSOU' : 'FALHOU';
    const entry = {
      name: data.name, status, durationMs: data.details?.duration_ms,
      file: data.file ? path.relative(process.cwd(), data.file).split(path.sep).join('/') : null,
      line: data.line,
      reason: typeof data.skip === 'string' ? data.skip : (cause?.message || error?.message || null),
    };
    results.push(entry);
    yield `[${status}] ${entry.name}\n`;
    if (entry.reason) yield `  ${entry.reason}\n`;
  }
  const summary = {
    total: results.length,
    passed: results.filter((row) => row.status === 'PASSOU').length,
    failed: results.filter((row) => row.status === 'FALHOU').length,
    notApplicable: results.filter((row) => row.status === 'NAO_APLICAVEL').length,
  };
  const report = {
    startedAt, completedAt: new Date().toISOString(), node: process.version,
    platform: `${process.platform}/${process.arch}`,
    target: 'Código local do Shelf; HTTP 127.0.0.1; Supabase substituído por adaptador em memória.',
    summary, results, diagnostics,
  };
  const directory = path.resolve('reports');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'security-results.json'), JSON.stringify(report, null, 2) + '\n');
  const escape = (value) => String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const markdown = [
    '# Resultado executado — segurança do Shelf', '',
    `Data UTC: ${startedAt}. Node: ${process.version}. Ambiente: ${report.platform}.`, '',
    report.target, '',
    `**${summary.total} casos: ${summary.passed} passaram, ${summary.failed} falharam, ${summary.notApplicable} não aplicável(is).**`, '',
    'Falha significa que o comportamento seguro esperado não foi atendido. Não equivale a defeito do executor.', '',
    '| Caso | Resultado | Motivo |', '|---|---|---|',
    ...results.map((row) => `| ${escape(row.name)} | ${row.status} | ${escape(row.reason)} |`), '',
    '## Evidências emitidas durante a execução', '',
    ...diagnostics.map((value) => `- ${escape(value)}`), '',
    '## Limites', '',
    'O Supabase é substituído por um adaptador em memória (não executa PostgreSQL, RLS ou TLS de verdade). O teste de XSS roda o app.js em uma VM com o DOM simulado, sem navegador. O limite de requisições fica em memória, então em serverless cada instância tem o próprio contador.', '',
  ].join('\n');
  fs.writeFileSync(path.join(directory, 'security-results.md'), markdown);
  yield `\nRESUMO: ${JSON.stringify(summary)}\nRelatórios: reports/security-results.json e reports/security-results.md\n`;
};
