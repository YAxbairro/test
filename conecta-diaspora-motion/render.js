// Renders index.html frame-by-frame (deterministic GSAP seek) and muxes with the soundtrack.
// Usage: node render.js [fps] [--frames 0.5,3,7]  (frames mode writes PNG stills for review)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = Number(process.argv[2]) || 30;
const stillsArg = process.argv.indexOf('--frames');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?render', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.ready);

  if (stillsArg > -1) {
    for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
      await page.evaluate(t => window.seek(t), t);
      await page.screenshot({ path: path.join(OUT, `still_${t.toFixed(2)}.png`) });
    }
    await browser.close();
    return;
  }

  const total = Math.round(15 * FPS);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-i', path.join(__dirname, 'audio', 'track.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '256k', '-af', 'afade=t=out:st=14.2:d=0.8',
    '-shortest', '-movflags', '+faststart', path.join(OUT, 'conecta-diaspora-2027.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 30 === 0) process.stdout.write(`frame ${i}/${total}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done');
})();
