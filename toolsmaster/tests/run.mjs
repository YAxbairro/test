/* Exército de robôs do Tools Master.
   Uso: node tests/run.mjs [filtro]   → corre os robôs e escreve tests/reports/latest.{json,md}
   Código de saída 0 = tudo passou. */
import fs from 'fs'; import path from 'path'; import { start, TOOLS_DIR } from './lib/harness.mjs'; import { ensureFixtures } from './lib/fixtures.mjs';
const filter = process.argv[2] || '';
const dir = path.join(TOOLS_DIR, 'tests/robots');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mjs') && f.includes(filter)).sort();
console.log('A preparar ficheiros de teste...'); await ensureFixtures();
const results = [];
for (const f of files) {
  const t0 = Date.now(); process.stdout.write(`🤖 ${f} ... `);
  const env = await start();
  try { const r = await (await import(path.join(dir, f))).default(env); results.push({ robot: f, tool: r.tool, checks: r.checks, ms: Date.now() - t0 }); }
  catch (e) { results.push({ robot: f, tool: f, checks: [{ name: 'robô falhou a arrancar', ok: false, detail: String(e.stack || e).slice(0, 500) }], ms: Date.now() - t0 }); }
  finally { await env.stop(); }
  const last = results.at(-1); const bad = last.checks.filter(c => !c.ok).length;
  console.log(bad ? `❌ ${bad}/${last.checks.length} falharam` : `✅ ${last.checks.length}/${last.checks.length}`);
}
const total = results.flatMap(r => r.checks), failed = total.filter(c => !c.ok);
const when = new Date().toISOString();
const report = { when, passed: total.length - failed.length, failed: failed.length, total: total.length, results };
const out = path.join(TOOLS_DIR, 'tests/reports'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'latest.json'), JSON.stringify(report, null, 2));
let md = `# Relatório dos robôs — ${when}\n\n**${report.passed}/${report.total} verificações passaram** · ${failed.length} falharam\n\n| Robô | Ferramenta | Resultado |\n|---|---|---|\n`;
for (const r of results) { const b = r.checks.filter(c => !c.ok).length; md += `| ${r.robot} | ${r.tool} | ${b ? '❌ ' + b + ' falha(s)' : '✅ ' + r.checks.length + ' ok'} |\n`; }
if (failed.length) { md += `\n## Falhas\n`; for (const r of results) for (const c of r.checks.filter(c => !c.ok)) md += `- **${r.tool} — ${c.name}**: ${c.detail.replace(/\n/g, ' ')}\n`; }
fs.writeFileSync(path.join(out, 'latest.md'), md);
console.log('\n' + md); process.exit(failed.length ? 1 : 0);
