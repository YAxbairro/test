// Girassol → logótipo. Tudo é função determinística do tempo t (segundos),
// para poder tocar em tempo real no browser e exportar frame a frame.
(() => {
  const W = 1920, H = 1080, DUR = 13.5;
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  cv.width = W; cv.height = H;

  // ---------- utilidades ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const eout = t => 1 - Math.pow(1 - t, 3);
  const eback = t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function rng(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const TAU = Math.PI * 2;

  // ---------- composição final (coordenadas do "mundo" = canvas antes da câmara) ----------
  const LC = { x: 960, y: 548 };          // centro do logótipo
  const G = 0.98;                          // escala global do logótipo
  const FINAL = {
    arc:    { x: 19,   y: -134, s: 1.73 },
    leaves: { x: -262, y: 105,  s: 1.39 },
    fan:    { x: 296,  y: 114,  s: 1.28 },
    body:   { x: 49,   y: 140,  s: 1.70 },
    arm:    { x: 30,   y: 0,    s: 1.28 },
    ball:   { x: 5,    y: -134, s: 1.25 },
  };
  for (const k in FINAL) {
    const f = FINAL[k];
    f.x = LC.x + f.x * G; f.y = LC.y + f.y * G; f.s *= G; f.rot = 0;
  }
  const ORDER = ['arc', 'leaves', 'fan', 'body', 'arm', 'ball'];
  const FLOWER = { x: 960, y: 530, s: 1.55 }; // centro do miolo

  // ---------- carregar sprites ----------
  const IMG = {}, PIX = {};
  const names = Object.keys(window.SPRITES);
  const META = window.SPRITE_META;
  function loadAll() {
    return Promise.all(names.map(n => new Promise(res => {
      const im = new Image();
      im.onload = () => {
        IMG[n] = im;
        const c = document.createElement('canvas');
        c.width = im.width; c.height = im.height;
        const x = c.getContext('2d');
        x.drawImage(im, 0, 0);
        PIX[n] = { w: im.width, h: im.height, d: x.getImageData(0, 0, im.width, im.height).data };
        res();
      };
      im.src = window.SPRITES[n];
    })));
  }

  // transformação de um sprite: centro (x,y), escala s, rotação rot
  function toWorld(name, tr, px, py) {
    const P = PIX[name];
    const lx = (px - P.w / 2) * tr.s, ly = (py - P.h / 2) * tr.s;
    const c = Math.cos(tr.rot || 0), s = Math.sin(tr.rot || 0);
    return [tr.x + lx * c - ly * s, tr.y + lx * s + ly * c];
  }
  function sample(name, tr, n, R, colorFn) {
    const P = PIX[name], out = [];
    let guard = 0;
    while (out.length < n && guard++ < n * 60) {
      const px = Math.floor(R() * P.w), py = Math.floor(R() * P.h);
      const i = (py * P.w + px) * 4;
      if (P.d[i + 3] < 150) continue;
      const [x, y] = toWorld(name, tr, px + R(), py + R());
      let c = [P.d[i], P.d[i + 1], P.d[i + 2]];
      if (colorFn) c = colorFn(c);
      out.push({ x, y, c });
    }
    return out;
  }

  // posição dos sprites do girassol relativamente ao miolo
  const DISK = META.disk_center; // cx, cy, R na folha
  function flowerTr(name, extraRot = 0, extraS = 1) {
    const m = META[name];
    const scx = m[0] + m[2] / 2, scy = m[1] + m[3] / 2;
    const s = FLOWER.s * extraS;
    const dx = (scx - DISK[0]) * s, dy = (scy - DISK[1]) * s;
    const c = Math.cos(extraRot), sn = Math.sin(extraRot);
    return { x: FLOWER.x + dx * c - dy * sn, y: FLOWER.y + dx * sn + dy * c, s, rot: extraRot };
  }

  // pétala verde: recolorir pela luminância com a paleta das folhas
  function greenify(c, k = 1) {
    const L = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
    const g = L < 0.6
      ? [lerp(8, 30, L / 0.6), lerp(60, 150, L / 0.6), lerp(18, 40, L / 0.6)]
      : [lerp(30, 190, (L - 0.6) / 0.4), lerp(150, 240, (L - 0.6) / 0.4), lerp(40, 150, (L - 0.6) / 0.4)];
    return [lerp(c[0], g[0], k), lerp(c[1], g[1], k), lerp(c[2], g[2], k)];
  }
  const GREEN = {};
  function makeGreenPetals() {
    for (let i = 0; i < 14; i++) {
      const n = 'petal' + i, P = PIX[n];
      const c = document.createElement('canvas');
      c.width = P.w; c.height = P.h;
      const x = c.getContext('2d');
      const id = x.createImageData(P.w, P.h);
      for (let j = 0; j < P.d.length; j += 4) {
        const g = greenify([P.d[j], P.d[j + 1], P.d[j + 2]]);
        id.data[j] = g[0]; id.data[j + 1] = g[1]; id.data[j + 2] = g[2]; id.data[j + 3] = P.d[j + 3];
      }
      x.putImageData(id, 0, 0);
      GREEN[n] = c;
    }
  }
  // eixo principal de cada pétala (para orientar a ponta para fora)
  const PAXIS = {};
  function petalAxes() {
    for (let i = 0; i < 14; i++) {
      const n = 'petal' + i, P = PIX[n];
      let m = 0, mx = 0, my = 0;
      for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
        const a = P.d[(y * P.w + x) * 4 + 3] / 255; m += a; mx += a * x; my += a * y;
      }
      mx /= m; my /= m;
      let xx = 0, yy = 0, xy = 0;
      for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
        const a = P.d[(y * P.w + x) * 4 + 3] / 255, dx = x - mx, dy = y - my;
        xx += a * dx * dx; yy += a * dy * dy; xy += a * dx * dy;
      }
      let ang = 0.5 * Math.atan2(2 * xy, xx - yy);
      // a ponta fica do lado com cauda mais longa (3.º momento)
      let sk = 0; const ca = Math.cos(ang), sa = Math.sin(ang);
      for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
        const a = P.d[(y * P.w + x) * 4 + 3] / 255, u = (x - mx) * ca + (y - my) * sa;
        sk += a * u * u * u;
      }
      if (sk < 0) ang += Math.PI;
      PAXIS[n] = ang;
    }
  }

  // ---------- pétalas em voo ----------
  const NP = 21;
  const PET = [];
  const T_BURST = 3.7;
  const GROUPS = {
    leaves: { tg: [5.3, 5.9], ts: 6.55 },
    fan:    { tg: [5.7, 6.35], ts: 6.95 },
    arc:    { tg: [6.1, 6.6], ts: 7.35 },
  };
  function setupPetals() {
    const R = rng(7);
    const pattern = ['leaves', 'fan', 'arc', 'fan', 'leaves', 'fan', 'leaves'];
    for (let i = 0; i < NP; i++) {
      const g = pattern[i % pattern.length];
      const img = 'petal' + ((i * 5) % 14);
      const phi = i / NP * TAU + 0.12;
      const tgt = FINAL[g];
      const P = PIX[g];
      // ponto de encontro dentro da zona da peça final
      const gx = tgt.x + (R() - 0.5) * P.w * tgt.s * 0.8;
      const gy = tgt.y + (R() - 0.5) * P.h * tgt.s * 0.6;
      const tg = lerp(GROUPS[g].tg[0], GROUPS[g].tg[1], R());
      PET.push({
        i, g, img, phi, gx, gy, tg, ts: GROUPS[g].ts,
        rOrb: 330 + R() * 300, wob: R() * TAU, spin: 0.7 + R() * 0.5,
        sEnd: 0.55 + R() * 0.25, rotEnd: R() * TAU,
      });
    }
  }
  const RP = 205; // raio a que as pétalas nascem na coroa
  function orbitPos(p, t) {
    const dt = Math.max(0, t - T_BURST);
    const u = eout(clamp(dt / 1.9));
    const r = lerp(RP, p.rOrb, u);
    const th = p.phi + 2.4 * u + p.spin * dt * 0.9;
    const tilt = lerp(1, 0.5, u);
    const x = FLOWER.x + Math.cos(th) * r;
    const y = FLOWER.y + Math.sin(th) * r * tilt - 30 * u;
    return { x, y, th };
  }
  function petalState(p, t) {
    if (t < T_BURST - 0.05 || t > p.ts + 0.15) return null;
    const o = orbitPos(p, t);
    const k = eio(clamp((t - p.tg) / (p.ts - p.tg)));
    const x = lerp(o.x, p.gx, k), y = lerp(o.y, p.gy, k);
    const u = eout(clamp((t - T_BURST) / 1.9));
    const radial = o.th - PAXIS[p.img];
    const tumble = radial + Math.PI / 2 * u + 0.5 * Math.sin(t * 2.3 + p.wob) * u;
    const rot = lerp(tumble, tumble + 0.6, k);
    const s = lerp(lerp(0.78, 0.95, u), p.sEnd, k);
    const green = p.g === 'leaves' ? ss(0.15, 0.9, k) : 0;
    const a = ss(T_BURST - 0.05, T_BURST + 0.12, t) * (1 - ss(p.ts, p.ts + 0.12, t));
    return { x, y, rot, s, green, a };
  }

  // ---------- sistema de partículas (morph de A para B) ----------
  // cada partícula: origem, destino, 2 pontos de controlo (bezier cúbica), cores, atraso
  class Morph {
    constructor(opt) {
      Object.assign(this, { t0: 0, dur: 1.5, w: 1.0, hold: 0.3, fade: 0.5, fadeIn: 0.12, vanish: false }, opt);
      this.P = [];
    }
    add(src, dst, R, opt = {}) {
      const n = Math.min(src.length, dst.length);
      for (let i = 0; i < n; i++) {
        const a = src[i], b = dst[i];
        const ctrl = opt.ctrl ? opt.ctrl(a, b, R) : null;
        const dx = b.x - a.x, dy = b.y - a.y;
        const sw = (opt.swirl ?? 0.35) * (R() - 0.35);
        this.P.push({
          sx: a.x, sy: a.y, tx: b.x, ty: b.y,
          c1x: ctrl ? ctrl[0] : a.x + dx * 0.3 - dy * sw, c1y: ctrl ? ctrl[1] : a.y + dy * 0.3 + dx * sw,
          c2x: ctrl ? ctrl[2] : a.x + dx * 0.75 - dy * sw * 0.5, c2y: ctrl ? ctrl[3] : a.y + dy * 0.75 + dx * sw * 0.5,
          ca: a.c, cb: b.c || a.c,
          d: opt.delay ? opt.delay(a, b, i, R) : R() * 0.3,
          du: this.dur * (0.8 + R() * 0.4),
          tw: R() * TAU,
        });
      }
      return this;
    }
    render(t, splat) {
      if (t < this.t0) return;
      const T = t - this.t0;
      for (const q of this.P) {
        const lt = T - q.d;
        if (lt < 0) continue;
        const p = clamp(lt / q.du);
        let a;
        if (this.vanish) a = clamp(p / 0.08) * (1 - p);
        else a = clamp(p / this.fadeIn) * (1 - clamp((lt - q.du - this.hold) / this.fade));
        if (a <= 0.003) continue;
        const e = eio(p), u = 1 - e;
        const x = u * u * u * q.sx + 3 * u * u * e * q.c1x + 3 * u * e * e * q.c2x + e * e * e * q.tx;
        const y = u * u * u * q.sy + 3 * u * u * e * q.c1y + 3 * u * e * e * q.c2y + e * e * e * q.ty;
        const hot = Math.sin(Math.PI * p) * 0.6; // brilho extra a meio da viagem
        const w = this.w * a * (1 + hot) * (0.85 + 0.15 * Math.sin(t * 9 + q.tw));
        splat(x, y,
          lerp(q.ca[0], q.cb[0], e) + 90 * hot,
          lerp(q.ca[1], q.cb[1], e) + 60 * hot,
          lerp(q.ca[2], q.cb[2], e) + 20 * hot, w);
      }
    }
  }

  const MORPHS = [];
  let ARC_PATH = [];
  let LOGO_PTS = [];
  const sortAngle = (pts, cx, cy) => pts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  const shuffle = (arr, R) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  function setupMorphs() {
    const R = rng(42);

    // 1) o girassol forma-se a partir de uma galáxia de poeira dourada
    {
      const dst = sample('flower', flowerTr('flower'), 15000, R);
      dst.sort((a, b) => Math.hypot(a.x - FLOWER.x, a.y - FLOWER.y) - Math.hypot(b.x - FLOWER.x, b.y - FLOWER.y));
      // galáxia de 4 braços em espiral; o interior da galáxia forma o interior da flor
      const src = dst.map((b, i) => {
        const f = i / dst.length;
        const arm = i % 4;
        const r = 90 + f * 760 + (R() - 0.5) * 60;
        const th = arm * TAU / 4 + f * 4.2 + (R() - 0.5) * (0.18 + f * 0.25);
        const hot = 1 - f * 0.4;
        return { x: FLOWER.x + Math.cos(th) * r, y: FLOWER.y + Math.sin(th) * r * 0.58, c: [255, 170 + 50 * hot, 70 + 60 * hot] };
      });
      const m = new Morph({ t0: 0.15, dur: 1.6, w: 1.5, hold: 0.25, fade: 0.45 });
      m.add(src, dst, R, {
        ctrl: (a, b) => {
          // espiral: pontos de controlo a rodar em torno do miolo
          const ra = Math.hypot(a.x - FLOWER.x, a.y - FLOWER.y), aa = Math.atan2(a.y - FLOWER.y, a.x - FLOWER.x);
          const rb = Math.hypot(b.x - FLOWER.x, b.y - FLOWER.y), ab = Math.atan2(b.y - FLOWER.y, b.x - FLOWER.x);
          let da = ab - aa; while (da < 0) da += TAU;
          const p1 = [aa + da * 0.33, lerp(ra, rb, 0.55)], p2 = [aa + da * 0.72, lerp(ra, rb, 0.88)];
          return [FLOWER.x + Math.cos(p1[0]) * p1[1], FLOWER.y + Math.sin(p1[0]) * p1[1] * 0.8,
                  FLOWER.x + Math.cos(p2[0]) * p2[1], FLOWER.y + Math.sin(p2[0]) * p2[1] * 0.95];
        },
        delay: (a, b, i) => (i / dst.length) * 0.75 + R() * 0.12,
      });
      MORPHS.push(m);
    }

    // 2) a coroa desfaz-se em poeira que segue o vórtice
    {
      const src = sample('ring', flowerTr('ring'), 7000, R);
      const dst = src.map(a => {
        const r = Math.hypot(a.x - FLOWER.x, a.y - FLOWER.y), th = Math.atan2(a.y - FLOWER.y, a.x - FLOWER.x);
        const r2 = r + 250 + R() * 420, th2 = th + 1.2 + R() * 0.8;
        return { x: FLOWER.x + Math.cos(th2) * r2, y: FLOWER.y + Math.sin(th2) * r2 * 0.55, c: [255, 170, 40] };
      });
      MORPHS.push(new Morph({ t0: T_BURST, dur: 1.9, w: 0.8, vanish: true }).add(src, dst, R, {
        ctrl: (a, b) => {
          const th = Math.atan2(a.y - FLOWER.y, a.x - FLOWER.x), r = Math.hypot(a.x - FLOWER.x, a.y - FLOWER.y);
          return [FLOWER.x + Math.cos(th + 0.5) * r * 1.25, FLOWER.y + Math.sin(th + 0.5) * r * 1.1,
                  (a.x + b.x) / 2, (a.y + b.y) / 2];
        },
        delay: () => R() * 0.25,
      }));
    }

    // 3) as sementes do miolo explodem e renascem como a figura (bola + braço + corpo)
    {
      const T = 5.0;
      const diskTr = diskTransform(T);
      const parts = [['ball', 2000, 0.0], ['arm', 5000, 0.25], ['body', 7000, 0.45]];
      for (const [name, n, d0] of parts) {
        const dst = sample(name, FINAL[name], n, R);
        const src = sample('disk', diskTr, n, R);
        sortAngle(dst, FINAL[name].x, FINAL[name].y);
        sortAngle(src, diskTr.x, diskTr.y);
        const m = new Morph({ t0: T, dur: 1.45, w: 2.0, hold: 0.55, fade: 0.5 });
        m.add(src, dst, R, {
          ctrl: (a, b, R) => {
            const th = Math.atan2(a.y - diskTr.y, a.x - diskTr.x) + 0.9;
            const r = 220 + R() * 340;
            return [diskTr.x + Math.cos(th) * r, diskTr.y + Math.sin(th) * r * 0.7,
                    b.x + (R() - 0.5) * 140, b.y - 60 - R() * 120];
          },
          delay: () => d0 + R() * 0.35,
        });
        MORPHS.push(m);
      }
    }

    // 4) pétalas fundem-se: folhas (ficam verdes), leque e arco
    const counts = { leaves: 9000, fan: 9000, arc: 4200 };
    for (const g of ['leaves', 'fan', 'arc']) {
      const ps = PET.filter(p => p.g === g);
      const ts = GROUPS[g].ts;
      const n = counts[g];
      const dst = sample(g, FINAL[g], n, R);
      let src = [];
      for (const p of ps) {
        const st = petalState(p, ts - 0.001);
        const k = st.green;
        src = src.concat(sample(p.img, { x: st.x, y: st.y, s: st.s, rot: st.rot }, Math.ceil(n / ps.length), R,
          c => greenify(c, k)));
      }
      src = src.slice(0, n);
      const F = FINAL[g];
      let delay;
      if (g === 'arc') {
        // o arco desenha-se da esquerda para a direita, como um cometa
        dst.sort((a, b) => a.x - b.x);
        src.sort((a, b) => a.x - b.x);
        const x0 = dst[0].x, x1 = dst[dst.length - 1].x;
        delay = (a, b) => 0.05 + (b.x - x0) / (x1 - x0) * 0.75 + R() * 0.06;
        ARC_PATH = dst.filter((_, i) => i % 6 === 0);
      } else {
        sortAngle(dst, F.x, F.y + 40);
        sortAngle(src, F.x, F.y + 40);
        delay = () => R() * 0.4;
      }
      MORPHS.push(new Morph({ t0: ts, dur: g === 'arc' ? 0.85 : 1.25, w: 1.0, hold: 0.45, fade: 0.55 })
        .add(src, dst, R, { swirl: 0.5, delay }));
    }

    // pontos do logótipo final (para cintilações)
    for (const k of ORDER) LOGO_PTS = LOGO_PTS.concat(sample(k, FINAL[k], 160, R));
    shuffle(LOGO_PTS, R);
  }

  // miolo: gira cada vez mais rápido e encolhe antes de se desfazer
  function diskTransform(t) {
    const dt = Math.max(0, t - T_BURST);
    const tr = flowerTr('disk', 0.35 * dt * dt, 1 - 0.12 * ss(T_BURST, 5.0, t));
    return tr;
  }

  // ---------- poeira em espiral (galáxia) ----------
  const DUST = [];
  function setupDust() {
    const R = rng(99);
    for (let i = 0; i < 2600; i++) {
      const arm = i % 3;
      const f = R();
      DUST.push({ r: 120 + f * 760, th: arm * TAU / 3 + f * 3.2 + (R() - 0.5) * 0.7, w: 0.25 + R() * 0.5, tw: R() * TAU, sp: 0.3 + R() * 0.4 });
    }
  }

  // ---------- rendering ----------
  const acc = new Float32Array(W * H * 3);
  const pcv = document.createElement('canvas'); pcv.width = W; pcv.height = H;
  const pctx = pcv.getContext('2d');
  const pimg = pctx.createImageData(W, H);
  const bcv = document.createElement('canvas'); bcv.width = 480; bcv.height = 270;
  const bctx = bcv.getContext('2d');
  const tcv = document.createElement('canvas'); tcv.width = W; tcv.height = H;
  const tctx = tcv.getContext('2d');
  let cam = { k: 1, ox: 0, oy: 0 };
  let accUsed = false;

  function camAt(t) {
    const k = 1.0 + 0.05 * ss(0, 3.5, t) - 0.08 * ss(3.4, 6.5, t) + 0.04 * ss(8.0, DUR, t);
    return { k, ox: 0, oy: 0 };
  }
  function W2S(x, y) { return [(x - 960) * cam.k + 960 + cam.ox, (y - 540) * cam.k + 540 + cam.oy]; }

  function splat(x, y, r, g, b, w) {
    const [sx, sy] = W2S(x, y);
    const x0 = Math.floor(sx), y0 = Math.floor(sy);
    if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) return;
    const fx = sx - x0, fy = sy - y0;
    const ws = [(1 - fx) * (1 - fy) * w, fx * (1 - fy) * w, (1 - fx) * fy * w, fx * fy * w];
    const idx = [(y0 * W + x0) * 3, (y0 * W + x0 + 1) * 3, ((y0 + 1) * W + x0) * 3, ((y0 + 1) * W + x0 + 1) * 3];
    for (let k = 0; k < 4; k++) {
      const j = idx[k], q = ws[k];
      acc[j] += r * q; acc[j + 1] += g * q; acc[j + 2] += b * q;
    }
    accUsed = true;
  }

  function flushParticles() {
    if (!accUsed) return;
    const d = pimg.data;
    for (let i = 0, j = 0; i < acc.length; i += 3, j += 4) {
      d[j] = acc[i]; d[j + 1] = acc[i + 1]; d[j + 2] = acc[i + 2]; d[j + 3] = 255;
    }
    pctx.putImageData(pimg, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(pcv, 0, 0);
    ctx.restore();
  }

  // brilho (glint) pré-desenhado
  const GL = document.createElement('canvas'); GL.width = GL.height = 128;
  (() => {
    const g = GL.getContext('2d');
    const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,250,220,1)');
    rg.addColorStop(0.15, 'rgba(255,215,120,0.55)');
    rg.addColorStop(0.45, 'rgba(255,150,30,0.12)');
    rg.addColorStop(1, 'rgba(255,120,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = 'lighter';
    // estrela de 4 pontas: dois raios finos e simétricos
    for (const rot of [0, Math.PI / 2]) {
      g.save(); g.translate(64, 64); g.rotate(rot); g.scale(1, 0.035);
      const sg = g.createRadialGradient(0, 0, 0, 0, 0, 64);
      sg.addColorStop(0, 'rgba(255,245,210,0.9)'); sg.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(0, 0, 64, 0, TAU); g.fill(); g.restore();
    }
  })();
  function glint(x, y, size, a, rot = 0) {
    if (a <= 0.01) return;
    const [sx, sy] = W2S(x, y);
    const s = size * cam.k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(a);
    ctx.translate(sx, sy); ctx.rotate(rot);
    ctx.drawImage(GL, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  function drawSprite(img, tr, a, c = ctx) {
    if (a <= 0.003) return;
    const [sx, sy] = W2S(tr.x, tr.y);
    c.save();
    c.globalAlpha = clamp(a);
    c.translate(sx, sy);
    c.rotate(tr.rot || 0);
    const s = tr.s * cam.k;
    c.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
    c.restore();
  }

  function background(t) {
    const g = ctx.createRadialGradient(960, 560, 0, 960, 560, 1100);
    const warm = 0.6 + 0.4 * ss(1.5, 3, t);
    g.addColorStop(0, `rgb(${Math.round(34 * warm)},${Math.round(20 * warm)},${Math.round(8 * warm)})`);
    g.addColorStop(0.45, `rgb(${Math.round(12 * warm)},${Math.round(7 * warm)},3)`);
    g.addColorStop(1, '#000');
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function godRays(t, cx, cy, a, len) {
    if (a <= 0.01) return;
    const [sx, sy] = W2S(cx, cy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(sx, sy);
    ctx.rotate(t * 0.08);
    const n = 28;
    for (let i = 0; i < n; i++) {
      const w = 0.025 + 0.02 * Math.sin(i * 7.3);
      const L = len * (0.7 + 0.3 * Math.sin(i * 3.1 + t * 0.7));
      const g = ctx.createLinearGradient(0, 0, L, 0);
      g.addColorStop(0, `rgba(255,190,80,${0.10 * a})`);
      g.addColorStop(1, 'rgba(255,150,30,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, L, -w, w);
      ctx.closePath();
      ctx.fill();
      ctx.rotate(TAU / n);
    }
    ctx.restore();
  }

  function swooshes(t) {
    const a = ss(4.6, 5.6, t) * (1 - ss(8.4, 9.4, t));
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const rings = [[700, 240, -0.18, 1.0], [620, 300, 0.12, -0.8], [780, 200, 0.05, 1.3]];
    rings.forEach(([rx, ry, rot, sp], k) => {
      const [sx, sy] = W2S(LC.x, LC.y + 40);
      const head = t * sp * 1.4 + k * 2;
      for (let j = 0; j < 14; j++) {
        const a0 = head - j * 0.07;
        ctx.strokeStyle = `rgba(255,${190 - j * 4},${90 - j * 5},${a * 0.5 * (1 - j / 14)})`;
        ctx.lineWidth = (3.2 - j * 0.2) * cam.k;
        ctx.beginPath();
        ctx.ellipse(sx, sy, rx * cam.k, ry * cam.k, rot, a0 - 0.07, a0);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function bloom(a) {
    bctx.globalCompositeOperation = 'source-over';
    bctx.filter = 'none';
    bctx.clearRect(0, 0, 480, 270);
    bctx.filter = 'blur(5px)';
    bctx.drawImage(cv, 0, 0, 480, 270);
    bctx.filter = 'none';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.drawImage(bcv, 0, 0, W, H);
    ctx.globalAlpha = a * 0.6;
    ctx.drawImage(bcv, -40, -22, W + 80, H + 44);
    ctx.restore();
  }

  function vignette() {
    const g = ctx.createRadialGradient(960, 540, 420, 960, 540, 1200);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // aparecimento de cada peça final (depois das partículas chegarem)
  const APPEAR = {
    ball:   [6.25, 6.75],
    arm:    [6.55, 7.15],
    body:   [6.75, 7.4],
    leaves: [7.45, 8.0],
    fan:    [7.85, 8.45],
    arc:    [8.15, 8.65],
  };

  function frame(t) {
    cam = camAt(t);
    acc.fill(0); accUsed = false;
    background(t);

    // raios de luz atrás do girassol / atrás do logótipo final
    godRays(t, FLOWER.x, FLOWER.y, ss(1.6, 2.6, t) * (1 - ss(3.6, 4.8, t)), 900);
    godRays(t + 3, FINAL.ball.x, FINAL.ball.y, 0.55 * ss(8.6, 10, t), 1000);

    // brilho de chão
    {
      const a = ss(8.0, 9.4, t);
      if (a > 0) {
        const [sx, sy] = W2S(LC.x, LC.y + 340 * G - 18);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(sx, sy); ctx.scale(1, 0.06);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 760 * cam.k);
        g.addColorStop(0, `rgba(255,190,80,${0.75 * a})`);
        g.addColorStop(0.35, `rgba(255,140,30,${0.3 * a})`);
        g.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-800 * cam.k, -800 * cam.k, 1600 * cam.k, 1600 * cam.k);
        ctx.restore();
      }
    }

    // girassol (sprites)
    {
      const ringA = ss(1.65, 2.35, t) * (1 - ss(T_BURST - 0.02, T_BURST + 0.3, t));
      const breath = 1 + 0.012 * Math.sin((t - 2.3) * 2.4) * ss(2.3, 2.8, t);
      const bloomRot = -0.08 * (1 - eout(clamp((t - 1.65) / 1.3)));
      const pulse = 1 + 0.035 * Math.exp(-Math.pow((t - (T_BURST - 0.12)) / 0.08, 2));
      drawSprite(IMG.ring, flowerTr('ring', bloomRot, breath * pulse), ringA);
      const diskA = ss(1.5, 2.2, t) * (1 - ss(5.0, 5.2, t));
      const dt = t < T_BURST ? diskTransform(T_BURST) : diskTransform(t);
      if (t < T_BURST) { dt.s *= breath; dt.rot = bloomRot; }
      drawSprite(IMG.disk, dt, diskA);
      // o miolo aquece antes de explodir
      const heat = ss(4.2, 5.0, t) * (1 - ss(5.0, 5.3, t));
      if (heat > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        drawSprite(IMG.disk, dt, heat * 0.6);
        ctx.restore();
        glint(dt.x, dt.y, 520 * heat, heat * 0.8);
      }
    }

    // peças finais
    for (const k of ORDER) {
      const [a0, a1] = APPEAR[k];
      const a = ss(a0, a1, t);
      if (a <= 0) continue;
      const tr = { ...FINAL[k] };
      const pop = eback(clamp((t - a0) / (a1 - a0 + 0.25)));
      tr.s *= lerp(0.96, 1, pop);
      drawSprite(IMG[k], tr, a);
      // reflexo quente enquanto "solidifica"
      const hot = Math.sin(Math.PI * clamp((t - a0) / (a1 - a0 + 0.5)));
      if (hot > 0.01) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        drawSprite(IMG[k], tr, hot * 0.3);
        ctx.restore();
      }
    }

    // pétalas em voo + rastos
    for (const p of PET) {
      const st = petalState(p, t);
      if (!st) continue;
      for (let j = 1; j <= 9; j++) {
        const pr = petalState(p, t - j * 0.035);
        if (!pr) break;
        glint(pr.x, pr.y, 46 - j * 3.5, st.a * 0.22 * (1 - j / 10), j);
      }
      const tr = { x: st.x, y: st.y, s: st.s, rot: st.rot };
      if (st.green < 1) drawSprite(IMG[p.img], tr, st.a * (1 - st.green));
      if (st.green > 0) drawSprite(GREEN[p.img], tr, st.a * st.green);
    }

    // poeira da galáxia
    {
      const a = ss(T_BURST, T_BURST + 0.6, t) * (1 - ss(7.6, 9.0, t));
      if (a > 0) {
        const dt = t - T_BURST;
        for (const d of DUST) {
          const th = d.th + dt * d.sp * (300 / (d.r + 120)) * 1.6;
          const r = d.r * (0.6 + 0.4 * eout(clamp(dt / 2)));
          const x = FLOWER.x + Math.cos(th) * r, y = FLOWER.y + Math.sin(th) * r * 0.5 - 30;
          const tw = 0.5 + 0.5 * Math.sin(t * 6 + d.tw);
          splat(x, y, 255, 190, 90, a * d.w * tw * 1.4);
        }
      }
    }

    for (const m of MORPHS) m.render(t, splat);
    flushParticles();

    swooshes(t);

    // cometa do arco
    if (ARC_PATH.length && t > GROUPS.arc.ts && t < GROUPS.arc.ts + 1.3) {
      const f = clamp((t - GROUPS.arc.ts - 0.35) / 0.9);
      const i = Math.floor(f * (ARC_PATH.length - 1));
      const p = ARC_PATH[i];
      const a = Math.sin(Math.PI * f);
      glint(p.x, p.y, 220, a);
    }

    // clarões nos momentos de fusão
    const flash = (tc, x, y, size, amp) => glint(x, y, size, amp * Math.exp(-Math.pow((t - tc) / 0.16, 2)));
    flash(0.3, FLOWER.x, FLOWER.y, 260, 0.9);
    flash(2.15, FLOWER.x, FLOWER.y, 900, 0.65);
    flash(T_BURST, FLOWER.x, FLOWER.y, 1100, 0.7);
    flash(5.05, FLOWER.x, FLOWER.y, 900, 0.9);
    flash(6.45, FINAL.ball.x, FINAL.ball.y, 380, 1.0);
    flash(8.7, LC.x, LC.y, 1400, 0.3);

    // brilho a varrer o logótipo final
    shine(t);

    // cintilações sobre o logótipo
    if (t > 8.6) {
      const a = ss(8.6, 9.4, t);
      for (let i = 0; i < 26; i++) {
        const p = LOGO_PTS[i * 7 % LOGO_PTS.length];
        const ph = (t * 0.55 + i * 0.137) % 1;
        const tw = Math.pow(Math.sin(Math.PI * ph), 6);
        const q = LOGO_PTS[(i * 7 + Math.floor(t * 0.55 + i * 0.137) * 31) % LOGO_PTS.length];
        glint(q.x, q.y, 70, a * tw * 0.8, i);
      }
    }

    bloom(0.2);
    vignette();
  }

  function shine(t) {
    const t0 = 9.1, t1 = 10.4;
    if (t < t0 || t > t1) return;
    const f = (t - t0) / (t1 - t0);
    tctx.save();
    tctx.globalCompositeOperation = 'source-over';
    tctx.clearRect(0, 0, W, H);
    for (const k of ORDER) drawSprite(IMG[k], FINAL[k], 1, tctx);
    tctx.globalCompositeOperation = 'source-atop';
    const x = lerp(200, 1800, eio(f));
    const g = tctx.createLinearGradient(x - 220, 0, x + 220, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,245,215,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    tctx.setTransform(1, 0, -0.35, 1, 0, 0);
    tctx.fillStyle = g;
    tctx.fillRect(-1000, 0, W + 2000, H);
    tctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 * Math.sin(Math.PI * f);
    ctx.drawImage(tcv, 0, 0);
    ctx.restore();
  }

  // ---------- arranque ----------
  async function init() {
    await loadAll();
    makeGreenPetals();
    petalAxes();
    setupPetals();
    setupMorphs();
    setupDust();
    window.DUR = DUR;
    window.renderFrame = t => frame(t);
    window.READY = true;
    const q = new URLSearchParams(location.search);
    if (q.has('t')) { frame(parseFloat(q.get('t'))); return; }
    if (q.has('render')) return;
    let start = performance.now();
    cv.addEventListener('click', () => { start = performance.now(); });
    const loop = now => {
      let t = (now - start) / 1000;
      if (t > DUR + 1.5) { start = now; t = 0; }
      frame(Math.min(t, DUR));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  init();
})();
