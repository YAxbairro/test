// Exporta a animação: node render.mjs [fps] [saída.mp4]   |  node render.mjs stills t1,t2,...
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[erro]', e.message));
await page.goto('file://' + path.join(here, 'index.html') + '?render=1');
await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
const grab = (t, type = 'image/jpeg') => page.evaluate(([t, type]) => {
  window.renderFrame(t);
  return document.getElementById('c').toDataURL(type, 0.95).split(',')[1];
}, [t, type]);

if (process.argv[2] === 'stills') {
  const out = process.argv[4] || 'stills';
  fs.mkdirSync(out, { recursive: true });
  for (const t of process.argv[3].split(',').map(Number)) {
    fs.writeFileSync(path.join(out, `t${t.toFixed(2)}.jpg`), Buffer.from(await grab(t), 'base64'));
  }
} else {
  const fps = +(process.argv[2] || 60), outFile = process.argv[3] || 'girassol.mp4';
  const dur = await page.evaluate(() => window.DUR);
  const n = Math.round(dur * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i++) {
    const buf = Buffer.from(await grab(i / fps), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('ok', outFile);
}
await browser.close();
