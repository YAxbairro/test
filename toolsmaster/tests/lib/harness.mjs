/* Infra comum dos robôs: servidor estático + Chromium (Playwright).
   Pedidos HTTPS do browser passam pelo Node (route.fetch), que confia no CA do proxy do ambiente — sem desligar TLS. */
import http from 'http'; import fs from 'fs'; import path from 'path'; import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
export const TOOLS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FX = path.join(TOOLS_DIR, 'tests/.fixtures');
const pwRoot = path.join(execSync('npm root -g').toString().trim(), 'playwright/index.mjs');
const { chromium } = await import(pwRoot);
const TYPES = { js: 'text/javascript', mjs: 'text/javascript', wasm: 'application/wasm', json: 'application/json', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', pdf: 'application/pdf', css: 'text/css', html: 'text/html; charset=utf-8' };

export async function start() {
  const srv = http.createServer((q, r) => {
    const f = path.join(TOOLS_DIR, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(TOOLS_DIR)) { r.writeHead(403); r.end(); return; }
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream' }); r.end(d); });
  });
  await new Promise(res => srv.listen(0, res));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true });
  await ctx.route(/^https:\/\//, async route => { try { await route.fulfill({ response: await route.fetch() }); } catch (e) { await route.abort(); } });
  const url = 'http://localhost:' + srv.address().port + '/';
  return { browser, ctx, url, stop: async () => { await browser.close(); srv.close(); } };
}

/* Página com registo de erros JS e diálogos. */
export async function page(env, file) {
  const p = await env.ctx.newPage(); p.errors = [];
  p.on('pageerror', e => p.errors.push(e.message.slice(0, 200)));
  p.on('dialog', d => { p.errors.push('DIALOG: ' + d.message().slice(0, 120)); d.dismiss(); });
  await p.goto(env.url + file);
  return p;
}

/* Clica e espera um download; devolve {name, buf} ou null. */
export async function download(p, clickFn, timeout = 60000) {
  const dl = p.waitForEvent('download', { timeout }).catch(() => null);
  await clickFn();
  const d = await dl; if (!d) return null;
  return { name: d.suggestedFilename(), buf: fs.readFileSync(await d.path()) };
}

/* Robô: acumula verificações. */
export function robot(tool) {
  const checks = [];
  return {
    tool, checks,
    async check(name, fn) {
      const t0 = Date.now();
      try { const detail = await fn(); checks.push({ name, ok: true, detail: String(detail ?? ''), ms: Date.now() - t0 }); }
      catch (e) { checks.push({ name, ok: false, detail: String(e && e.message || e).slice(0, 400), ms: Date.now() - t0 }); }
    },
  };
}
export function assert(cond, msg) { if (!cond) throw new Error(msg); }
