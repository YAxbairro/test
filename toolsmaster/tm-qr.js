/* Tools Master — motor de QR.
   Usa qrcode-generator (MIT, suporta UTF-8/acentos) e desenha a partir da matriz real de módulos:
   formas de módulo, "olhos" na posição certa para qualquer versão, gradiente só nos módulos e SVG vetorial. */
(function () {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  function matrix(text, ecc) {
    if (!text) throw new Error('Não há dados para o QR.');
    const q = qrcode(0, ecc || 'H');
    q.addData(text, 'Byte');
    try { q.make(); }
    catch (e) { throw new Error('Texto demasiado longo para um QR com este nível de correção. Reduz o texto ou baixa a correção de erros.'); }
    const n = q.getModuleCount();
    return { n, dark: (r, c) => q.isDark(r, c) };
  }

  const inEye = (n, r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  function rr(ctx, x, y, w, h, rad) {
    rad = Math.min(rad, w / 2, h / 2);
    ctx.moveTo(x + rad, y); ctx.arcTo(x + w, y, x + w, y + h, rad); ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad); ctx.arcTo(x, y, x + w, y, rad); ctx.closePath();
  }

  function module(ctx, shape, x, y, s, m, r, c) {
    const g = s * 0.08;
    switch (shape) {
      case 'dot': ctx.moveTo(x + s, y + s / 2); ctx.arc(x + s / 2, y + s / 2, s * 0.46, 0, Math.PI * 2); break;
      case 'rounded': rr(ctx, x + g / 2, y + g / 2, s - g, s - g, s * 0.3); break;
      case 'diamond': { const e = s * 0.18; ctx.moveTo(x + s / 2, y - e); ctx.lineTo(x + s + e, y + s / 2); ctx.lineTo(x + s / 2, y + s + e); ctx.lineTo(x - e, y + s / 2); ctx.closePath(); break; }
      case 'star': {
        const cx = x + s / 2, cy = y + s / 2;
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? s * 0.38 : s * 0.62; const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.closePath(); break;
      }
      case 'vertical': {
        const up = r > 0 && m.dark(r - 1, c) && !inEye(m.n, r - 1, c), down = r < m.n - 1 && m.dark(r + 1, c) && !inEye(m.n, r + 1, c);
        const top = up ? y : y + g, bot = down ? y + s : y + s - g;
        rr(ctx, x + s * 0.12, top, s * 0.76, bot - top, (up || down) ? s * 0.15 : s * 0.38); break;
      }
      default: ctx.rect(x, y, s + 0.5, s + 0.5);
    }
  }

  function eye(ctx, shape, x, y, s, light, color) {
    const ring = (outerFn, innerFn, coreFn) => {
      ctx.fillStyle = color; ctx.beginPath(); outerFn(); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); innerFn(); ctx.fill(); ctx.restore();
      ctx.fillStyle = color; ctx.beginPath(); coreFn(); ctx.fill();
    };
    const u = s / 7;
    if (shape === 'circle') ring(() => ctx.arc(x + s / 2, y + s / 2, s / 2, 0, 7), () => ctx.arc(x + s / 2, y + s / 2, s / 2 - u, 0, 7), () => ctx.arc(x + s / 2, y + s / 2, 1.5 * u, 0, 7));
    else if (shape === 'rounded') ring(() => rr(ctx, x, y, s, s, 2 * u), () => rr(ctx, x + u, y + u, s - 2 * u, s - 2 * u, 1.3 * u), () => rr(ctx, x + 2 * u, y + 2 * u, 3 * u, 3 * u, u));
    else if (shape === 'leaf') {
      const leaf = (lx, ly, w, rad) => { ctx.moveTo(lx + rad, ly); ctx.lineTo(lx + w, ly); ctx.lineTo(lx + w, ly + w - rad); ctx.arcTo(lx + w, ly + w, lx + w - rad, ly + w, rad); ctx.lineTo(lx, ly + w); ctx.lineTo(lx, ly + rad); ctx.arcTo(lx, ly, lx + rad, ly, rad); ctx.closePath(); };
      ring(() => leaf(x, y, s, 3 * u), () => leaf(x + u, y + u, s - 2 * u, 2 * u), () => leaf(x + 2 * u, y + 2 * u, 3 * u, 1.2 * u));
    } else ring(() => ctx.rect(x, y, s, s), () => ctx.rect(x + u, y + u, s - 2 * u, s - 2 * u), () => ctx.rect(x + 2 * u, y + 2 * u, 3 * u, 3 * u));
  }

  /* Desenha o QR em ctx na área (ox, oy, size). Fundo não é pintado aqui. */
  function draw(ctx, m, ox, oy, size, o = {}) {
    const margin = o.margin ?? 2, cells = m.n + margin * 2, s = size / cells;
    const off = document.createElement('canvas'); off.width = off.height = Math.ceil(size);
    const c = off.getContext('2d');
    c.fillStyle = o.dark || '#000'; c.beginPath();
    for (let r = 0; r < m.n; r++) for (let col = 0; col < m.n; col++)
      if (m.dark(r, col) && !inEye(m.n, r, col)) module(c, o.modShape || 'square', (col + margin) * s, (r + margin) * s, s, m, r, col);
    c.fill();
    if (o.gradient && o.gradient.type && o.gradient.type !== 'none') {
      const g = o.gradient.type === 'linear' ? c.createLinearGradient(0, 0, size, size) : c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, o.gradient.c1); g.addColorStop(1, o.gradient.c2);
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = g; c.fillRect(0, 0, size, size); c.globalCompositeOperation = 'source-over';
    }
    const es = 7 * s;
    [[0, 0], [0, m.n - 7], [m.n - 7, 0]].forEach(([r, col]) => eye(c, o.eyeShape || 'square', (col + margin) * s, (r + margin) * s, es, o.light, o.eye || o.dark || '#000'));
    ctx.drawImage(off, ox, oy);
  }

  /* SVG vetorial (quadrados/pontos), com fundo opcional. */
  function svg(m, o = {}) {
    const margin = o.margin ?? 2, cells = m.n + margin * 2, dark = o.dark || '#000', eyeC = o.eye || dark;
    let body = '';
    for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) {
      if (!m.dark(r, c) || inEye(m.n, r, c)) continue;
      const x = c + margin, y = r + margin;
      body += o.modShape === 'dot' ? `<circle cx="${x + .5}" cy="${y + .5}" r=".46"/>` : o.modShape === 'rounded' ? `<rect x="${x + .04}" y="${y + .04}" width=".92" height=".92" rx=".28"/>` : `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
    }
    let eyes = '';
    [[0, 0], [0, m.n - 7], [m.n - 7, 0]].forEach(([r, c]) => {
      const x = c + margin, y = r + margin, rad = o.eyeShape === 'circle' ? 3.5 : o.eyeShape === 'rounded' ? 2 : 0;
      eyes += o.eyeShape === 'circle'
        ? `<circle cx="${x + 3.5}" cy="${y + 3.5}" r="3" fill="none" stroke="${eyeC}" stroke-width="1"/><circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5" fill="${eyeC}"/>`
        : `<rect x="${x + .5}" y="${y + .5}" width="6" height="6" rx="${rad * .8}" fill="none" stroke="${eyeC}" stroke-width="1"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${rad * .4}" fill="${eyeC}"/>`;
    });
    const bg = o.light && !o.transparent ? `<rect width="${cells}" height="${cells}" fill="${o.light}"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${cells}" width="${o.size || 1000}" height="${o.size || 1000}" shape-rendering="${o.modShape && o.modShape !== 'square' ? 'geometricPrecision' : 'crispEdges'}">${bg}<g fill="${dark}">${body}</g>${eyes}</svg>`;
  }

  /* Compatibilidade com a API do qrcodejs usada no resto da ferramenta: new QRCode(el, {...}) cria um <canvas>. */
  function QRCode(el, opt) {
    const m = matrix(opt.text, opt.correctLevel || 'H');
    const cv = document.createElement('canvas'); cv.width = opt.width; cv.height = opt.height;
    const ctx = cv.getContext('2d'); ctx.fillStyle = opt.colorLight || '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    draw(ctx, m, 0, 0, opt.width, { dark: opt.colorDark, light: opt.colorLight, margin: 2 });
    el.appendChild(cv);
  }
  QRCode.CorrectLevel = { L: 'L', M: 'M', Q: 'Q', H: 'H' };

  window.TMQR = { matrix, draw, svg };
  window.QRCode = QRCode;
})();
