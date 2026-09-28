/* Gera os ficheiros de teste (não versionados) em tests/.fixtures. */
import fs from 'fs'; import path from 'path'; import { FX, start, page } from './harness.mjs';
import { execSync } from 'child_process';

export async function ensureFixtures() {
  fs.mkdirSync(FX, { recursive: true });
  const need = ['photo.jpg', 'transp.png', 'person.jpg', 'sig.jpg', 'noise.png', 'texto.png', 'a.pdf', 'b.pdf', 'form.pdf', 'heavy.pdf', 'tone.wav', 'clip.mp4', 'logo.svg', 'proposta.docx', 'planos.xlsx', 'sample.heic'];
  if (need.every(f => fs.existsSync(path.join(FX, f)))) return;
  const env = await start();
  try {
    const p = await page(env, 'pdfmaster.html');
    await p.addScriptTag({ url: env.url + 'vendor/xlsx.full.min.js' });
    await p.addScriptTag({ url: env.url + 'vendor/jszip.min.js' });
    const out = await p.evaluate(async () => {
      const mk = (w, h, f, type, q) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); f(x, c); return c.toDataURL(type, q).split(',')[1]; };
      const r = {};
      r['photo.jpg'] = mk(1200, 900, x => { x.fillStyle = '#2878c8'; x.fillRect(0, 0, 1200, 900); x.fillStyle = '#fafafa'; x.fillRect(300, 200, 600, 500); x.fillStyle = '#111'; x.font = '60px sans-serif'; x.fillText('Foto teste', 450, 470); }, 'image/jpeg', .92);
      r['transp.png'] = mk(800, 600, x => { x.fillStyle = '#e65028'; x.beginPath(); x.arc(400, 300, 200, 0, 7); x.fill(); }, 'image/png');
      r['person.jpg'] = mk(600, 800, x => { x.fillStyle = '#9fd3f5'; x.fillRect(0, 0, 600, 800); x.fillStyle = '#6b4226'; x.beginPath(); x.arc(300, 300, 130, 0, 7); x.fill(); x.fillStyle = '#223'; x.fillRect(150, 450, 300, 350); }, 'image/jpeg', .92);
      r['sig.jpg'] = mk(900, 400, x => { x.fillStyle = '#eeeae0'; x.fillRect(0, 0, 900, 400); x.strokeStyle = '#1a2a6c'; x.lineWidth = 6; x.beginPath(); x.moveTo(150, 250); x.bezierCurveTo(250, 50, 350, 350, 450, 200); x.bezierCurveTo(550, 80, 650, 320, 750, 180); x.stroke(); }, 'image/jpeg', .85);
      r['noise.png'] = mk(1600, 1200, (x, c) => { const g = x.createLinearGradient(0, 0, 1600, 1200); g.addColorStop(0, '#c33'); g.addColorStop(1, '#39c'); x.fillStyle = g; x.fillRect(0, 0, 1600, 1200); const im = x.getImageData(0, 0, 1600, 1200); for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() - .5) * 40; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; } x.putImageData(im, 0, 0); }, 'image/png');
      r['texto.png'] = mk(1000, 300, x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 1000, 300); x.fillStyle = '#111'; x.font = 'bold 56px Arial'; x.fillText('Bom dia Cabo Verde', 40, 110); x.font = '40px Arial'; x.fillText('Proposta nº 2026 — Praia', 40, 200); }, 'image/png');
      const { PDFDocument, StandardFonts } = PDFLib;
      for (const [n, pages] of [['a.pdf', 3], ['b.pdf', 2]]) { const d = await PDFDocument.create(); const f = await d.embedFont(StandardFonts.Helvetica); for (let i = 1; i <= pages; i++) d.addPage([595, 842]).drawText(n + ' pagina ' + i, { x: 60, y: 760, size: 28, font: f }); r[n] = await d.saveAsBase64(); }
      { const d = await PDFDocument.create(); const pg = d.addPage([595, 842]); d.getForm().createTextField('nome').addToPage(pg, { x: 60, y: 700, width: 300, height: 30 }); r['form.pdf'] = await d.saveAsBase64(); }
      { const d = await PDFDocument.create(); const img = await d.embedPng('data:image/png;base64,' + r['noise.png']); for (let i = 0; i < 2; i++) d.addPage([595, 842]).drawImage(img, { x: 0, y: 200, width: 595, height: 446 }); r['heavy.pdf'] = await d.saveAsBase64(); }
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Produto', 'Preço (ECV)'], ['Starter', 17000], ['Business', 25000]]), 'Planos'); r['planos.xlsx'] = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const z = new JSZip();
      z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
      z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
      z.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Proposta Eagle Marketing — ção</w:t></w:r></w:p><w:p><w:r><w:t>Segundo parágrafo.</w:t></w:r></w:p></w:body></w:document>');
      r['proposta.docx'] = await z.generateAsync({ type: 'base64' });
      return r;
    });
    for (const [f, b64] of Object.entries(out)) fs.writeFileSync(path.join(FX, f), Buffer.from(b64, 'base64'));
    fs.writeFileSync(path.join(FX, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#f59e0b"/></svg>');
    execSync(`python3 -c "import wave,struct,math;w=wave.open('${path.join(FX, 'tone.wav')}','w');w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000);w.writeframes(b''.join(struct.pack('<h',int(8000*math.sin(2*math.pi*440*i/16000))) for i in range(32000)));w.close()"`);
    // vídeo com som, gerado pelo próprio ffmpeg.wasm
    const c = await page(env, 'convertermaster.html');
    const mp4 = await c.evaluate(async () => { const ff = await TMFF.load(); const code = await ff.exec(['-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=4', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', 'clip.mp4']); if (code !== 0) throw new Error('fixture mp4 falhou'); const d = await ff.readFile('clip.mp4'); let s = ''; for (let i = 0; i < d.length; i += 32768) s += String.fromCharCode(...d.subarray(i, i + 32768)); return btoa(s); });
    fs.writeFileSync(path.join(FX, 'clip.mp4'), Buffer.from(mp4, 'base64'));
    const heic = await c.evaluate(async () => { const r = await fetch('https://cdn.jsdelivr.net/gh/alexcorvi/heic2any@master/demo/1.heic'); if (!r.ok) throw new Error('HEIC ' + r.status); const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode(...b.subarray(i, i + 32768)); return btoa(s); });
    fs.writeFileSync(path.join(FX, 'sample.heic'), Buffer.from(heic, 'base64'));
  } finally { await env.stop(); }
}
