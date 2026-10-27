// Plano a Plano — app principal.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  let P = null;              // projeto aberto
  let tab = 'chat';
  let pendingAudio = null;   // { mime, base64 } a enviar ao realizador na próxima mensagem
  let thinking = false;
  let generating = false;
  let audioURL = null;
  let setPendingOnly = false;
  let wakeLock = null;
  const busy = new Set();    // `${projectId}:${kind}:${id}` em geração

  const isDesktop = () => matchMedia('(min-width: 1000px)').matches;
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const pad = n => String(n).padStart(2, '0');

  // ---------- utilitários ----------
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function md(s) {
    const lines = esc(s).split('\n');
    let html = '', inList = false;
    for (const line of lines) {
      const li = line.match(/^\s*[-•*]\s+(.*)/);
      if (li) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${li[1]}</li>`; continue; }
      if (inList) { html += '</ul>'; inList = false; }
      html += line.trim() ? `<p>${line}</p>` : '';
    }
    if (inList) html += '</ul>';
    return html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  }
  function toSec(t) {
    if (t == null || t === '') return null;
    if (typeof t === 'number') return t;
    const parts = String(t).trim().split(':').map(Number);
    if (parts.some(isNaN)) return null;
    return parts.reduce((acc, v) => acc * 60 + v, 0);
  }
  let toastTimer;
  function toast(msg, type = '') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), type === 'error' ? 7000 : 3500);
  }
  window.addEventListener('pap-notice', e => toast(e.detail));

  let saveTimer;
  function save(now = false) {
    if (!P) return;
    P.updatedAt = Date.now();
    clearTimeout(saveTimer);
    const p = P;
    const run = () => DB.saveProject(p).catch(e => toast('Erro a guardar: ' + e.message, 'error'));
    now ? run() : (saveTimer = setTimeout(run, 400));
  }

  // ---------- projetos ----------
  function newProjectData() {
    return {
      id: uid(), name: 'Novo videoclipe', createdAt: Date.now(), updatedAt: Date.now(),
      chat: [{ role: 'assistant', local: true, text: 'Olá! Sou o teu **realizador**. Vamos preparar este videoclipe juntos até teres todos os planos prontos para filmar.\n\nPara começar:\n- carrega a música no botão 🎵 (eu ouço-a e tiro a letra, a estrutura e os tempos), **ou** cola aqui a letra\n- e conta-me a ideia que tens, mesmo que seja vaga. Se não tiveres nenhuma, eu proponho.', suggestions: ['Ainda não tenho ideia nenhuma', 'Já tenho um conceito'] }],
      brief: {}, ready: false, board: null, hasAudio: false, audioName: '',
      settings: { style: 'realista', aspect: '16:9' },
    };
  }

  async function renderHome() {
    const list = (await DB.listProjects()).sort((a, b) => b.updatedAt - a.updatedAt);
    $('#project-list').innerHTML = list.length ? list.map(p => {
      const thumb = p.board?.shots?.find(s => s.image)?.image;
      const n = p.board?.shots?.length || 0;
      const done = p.board?.shots?.filter(s => s.done).length || 0;
      return `<button class="project-card" data-open="${p.id}">
        <div class="thumb">${thumb ? `<img src="${thumb}" alt="">` : '🎞️'}</div>
        <div class="info"><strong>${esc(p.name)}</strong>
          <span class="muted">${n ? `${n} planos · ${done} filmados` : 'Em preparação'} · ${new Date(p.updatedAt).toLocaleDateString('pt-PT')}</span></div>
      </button>`;
    }).join('') : '<p class="muted empty-home">Ainda não tens projetos. Cria o primeiro 👆</p>';
  }

  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.toggle('hidden', s.id !== id));
  }

  async function openProject(id) {
    P = await DB.getProject(id);
    if (!P) return toast('Projeto não encontrado.', 'error');
    pendingAudio = null;
    if (audioURL) { URL.revokeObjectURL(audioURL); audioURL = null; }
    if (P.hasAudio) {
      const blob = await DB.getAudio(P.id);
      if (blob) { audioURL = URL.createObjectURL(blob); $('#player').src = audioURL; }
    }
    $('#project-name').value = P.name;
    showScreen('project');
    setTab(P.board ? 'board' : 'chat');
  }

  function goHome() {
    $('#player').pause();
    P = null;
    showScreen('home');
    renderHome();
  }

  // ---------- separadores ----------
  function setTab(t) {
    if (t === 'chat' && isDesktop()) t = 'board';
    tab = t;
    $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $('.workspace').className = `workspace tab-${tab}`;
    render();
  }

  function render() {
    if (!P) return;
    renderChat();
    if (tab === 'board' || isDesktop()) renderBoard();
    if (tab === 'prod') renderProd();
    if (tab === 'set') renderSet();
    updateQueueStatus();
  }

  // ---------- chat do realizador ----------
  function renderChat() {
    $('#provider-badge').textContent = AI.textProviderName();
    const log = $('#chat-log');
    log.innerHTML = P.chat.map(m => `
      <div class="msg ${m.role}">
        ${m.audio ? `<div class="attachment">🎵 ${esc(m.audioName || 'música')}</div>` : ''}
        <div class="bubble">${m.role === 'assistant' ? md(m.text) : esc(m.text).replace(/\n/g, '<br>')}</div>
      </div>`).join('') + (thinking ? '<div class="msg assistant"><div class="bubble typing"><span></span><span></span><span></span></div></div>' : '');
    log.scrollTop = log.scrollHeight;

    const last = [...P.chat].reverse().find(m => m.role === 'assistant');
    const chips = [];
    if (!thinking && last) {
      (last.suggestions || []).slice(0, 4).forEach(s => chips.push(`<button class="chip" data-chip="${esc(s)}">${esc(s)}</button>`));
      const hasMaterial = P.brief && (P.brief.lyrics || P.brief.concept || P.brief.structure);
      if (!P.board && (P.ready || hasMaterial)) chips.push(`<button class="chip accent" data-action="generate">🎬 Criar storyboard</button>`);
      if (P.board && last.regenerate) chips.push(`<button class="chip accent" data-action="regenerate">🔁 Refazer storyboard</button>`);
    }
    $('#chat-chips').innerHTML = chips.join('');
    $('#chat-send').disabled = thinking;
  }

  async function sendMessage(text) {
    text = (text || '').trim();
    if ((!text && !pendingAudio) || thinking || !P) return;
    const msg = { role: 'user', text: text || 'Carreguei a música. Ouve-a e diz-me o que achas.' };
    const audio = pendingAudio;
    if (audio) { msg.audio = true; msg.audioName = P.audioName; }
    pendingAudio = null;
    P.chat.push(msg);
    thinking = true;
    renderChat();
    save();

    try {
      const history = P.chat.filter(m => !m.local).slice(-24).map(m => ({ role: m.role, text: m.text }));
      if (audio) history[history.length - 1].audio = audio;
      const r = await AI.chatJSON(PROMPTS.director(P.brief, P.board), history);
      if (r.brief && typeof r.brief === 'object') {
        P.brief = { ...P.brief, ...r.brief };
        if (AI.aspects.includes(P.brief.aspect_ratio) && !P.board) P.settings.aspect = P.brief.aspect_ratio;
        if (P.name === 'Novo videoclipe' && P.brief.song_title) {
          P.name = P.brief.song_title + (P.brief.artist ? ' — ' + P.brief.artist : '');
          $('#project-name').value = P.name;
        }
      }
      if (r.ready) P.ready = true;
      let note = '';
      if (r.edits && P.board) note = applyEdits(r.edits);
      P.chat.push({ role: 'assistant', text: (r.reply || '…') + (note ? `\n\n*${note}*` : ''), suggestions: r.suggestions || [], regenerate: !!r.regenerate });
    } catch (e) {
      P.chat.push({ role: 'assistant', local: true, text: '⚠️ ' + e.message });
      if (audio) pendingAudio = audio; // para poder tentar outra vez
      if (e.needsKey) openSettings(SETUP_INTRO);
    } finally {
      thinking = false;
      save(true);
      render();
    }
  }

  async function handleAudio(file) {
    if (!file || !P) return;
    if (file.size > 18 * 1024 * 1024) {
      toast('O ficheiro tem mais de 18 MB. Exporta em MP3 (128–192 kbps) e tenta outra vez.', 'error');
      return;
    }
    await DB.saveAudio(P.id, file);
    P.hasAudio = true;
    P.audioName = file.name;
    if (audioURL) URL.revokeObjectURL(audioURL);
    audioURL = URL.createObjectURL(file);
    $('#player').src = audioURL;
    save(true);
    if (!AI.hasGemini()) {
      P.chat.push({ role: 'assistant', local: true, text: `🎵 Guardei **${file.name}**. Já dá para ouvir cada plano no storyboard e no set.\n\nPara eu **ouvir** a música e tirar a letra e os tempos sozinho, precisas da chave Gemini (grátis) nas Definições ⚙️. Entretanto cola aqui a letra.` });
      render();
      return;
    }
    pendingAudio = { mime: file.type || 'audio/mpeg', base64: await AI.blobToBase64(file) };
    sendMessage($('#chat-input').value);
    $('#chat-input').value = '';
  }

  // ---------- storyboard: geração e edição ----------
  const SHOT_KEYS = ['section', 'start', 'end', 'lyrics', 'shot_size', 'angle', 'movement', 'lens', 'action', 'location', 'characters', 'lighting', 'notes', 'frame_en'];
  const VISUAL_KEYS = ['frame_en', 'shot_size', 'characters', 'location'];

  function nextShotId() {
    const max = Math.max(0, ...P.board.shots.map(s => parseInt(String(s.id).replace(/\D/g, '')) || 0));
    return 'P' + pad(max + 1);
  }

  function normShot(s, id) {
    const shot = { id, image: null, stale: false, done: false, takes: 0, setNote: '', prompt_override: null };
    for (const k of SHOT_KEYS) shot[k] = s[k] ?? (k === 'characters' ? [] : '');
    if (typeof shot.characters === 'string') shot.characters = shot.characters.split(',').map(x => x.trim()).filter(Boolean);
    shot.shot_size = String(shot.shot_size || 'MS').toUpperCase();
    return shot;
  }

  function normBoard(r) {
    const items = arr => (Array.isArray(arr) ? arr : []).map(x => ({ text: typeof x === 'string' ? x : (x.name || x.text || JSON.stringify(x)), done: false }));
    const prod = r.production || {};
    const seen = new Set();
    return {
      title: r.title || P.name, logline: r.logline || '', visual_style_en: r.visual_style_en || '',
      characters: (r.characters || []).map(c => ({ name: c.name || 'Personagem', role: c.role || '', look_en: c.look_en || '', ref: null })),
      locations: (r.locations || []).map(l => ({ name: l.name || 'Local', description: l.description || '', look_en: l.look_en || '' })),
      shots: (r.shots || []).map((s, i) => {
        let id = s.id || 'P' + pad(i + 1);
        if (seen.has(id)) id = 'P' + pad(i + 1) + 'b';
        seen.add(id);
        return normShot(s, id);
      }),
      production: {
        equipment: items(prod.equipment), props: items(prod.props), wardrobe: items(prod.wardrobe), cast: items(prod.cast),
        crew: items(prod.crew), locations: items(prod.locations), notes: items(prod.notes),
        schedule: (prod.schedule || []).map(x => typeof x === 'string' ? x : JSON.stringify(x)),
      },
      seed: Math.floor(Math.random() * 1e6),
    };
  }

  async function generateBoard(force = false) {
    if (!P || generating) return;
    if (P.board && !force) return setTab('board');
    if (P.board && !confirm('Refazer o storyboard do zero? Os planos e imagens atuais são substituídos.')) return;
    generating = true;
    setTab('board');
    try {
      const r = await AI.chatJSON(PROMPTS.generator(P.brief), [{ role: 'user', text: 'Cria agora o storyboard completo e a lista de produção.' }]);
      const board = normBoard(r);
      if (!board.shots.length) throw new Error('A IA não devolveu planos. Tenta outra vez.');
      if (AI.aspects.includes(r.aspect_ratio)) P.settings.aspect = r.aspect_ratio;
      P.board = board;
      P.chat.push({ role: 'assistant', text: `✅ Storyboard criado: **${board.shots.length} planos**, ${board.locations.length} locais. Estou a gerar as imagens de cada plano.\n\nSe quiseres mudar alguma coisa, diz-me aqui (ex.: *"o P05 em contrapicado com gimbal"* ou *"não tenho drone"*) e eu atualizo os planos e as imagens.`, suggestions: [] });
      save(true);
      generating = false;
      render();
      board.shots.forEach(s => enqueue('shot', s.id));
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      generating = false;
      render();
    }
  }

  function applyEdits(edits) {
    const shots = P.board.shots;
    let changed = 0, added = 0, removed = 0;
    for (const u of edits.update || []) {
      const s = shots.find(x => x.id === u.id);
      if (!s) continue;
      const visual = VISUAL_KEYS.some(k => k in u);
      for (const k of SHOT_KEYS) if (k in u) s[k] = u[k];
      if (typeof s.characters === 'string') s.characters = s.characters.split(',').map(x => x.trim()).filter(Boolean);
      s.shot_size = String(s.shot_size || 'MS').toUpperCase();
      if (visual) { s.prompt_override = null; if (s.image) s.stale = true; enqueue('shot', s.id); }
      changed++;
    }
    for (const a of edits.add || []) {
      const shot = normShot(a, nextShotId());
      const i = a.after ? shots.findIndex(x => x.id === a.after) : -1;
      shots.splice(i >= 0 ? i + 1 : shots.length, 0, shot);
      enqueue('shot', shot.id);
      added++;
    }
    for (const id of edits.delete || []) {
      const i = shots.findIndex(x => x.id === id);
      if (i >= 0) { shots.splice(i, 1); removed++; }
    }
    const parts = [];
    if (changed) parts.push(`${changed} plano(s) alterado(s)`);
    if (added) parts.push(`${added} adicionado(s)`);
    if (removed) parts.push(`${removed} removido(s)`);
    return parts.length ? 'Storyboard atualizado: ' + parts.join(', ') + '.' : '';
  }

  // ---------- fila de imagens ----------
  const Q = { items: [], running: false, total: 0, done: 0 };

  function enqueue(kind, id, pid = P?.id) {
    const key = `${pid}:${kind}:${id}`;
    if (busy.has(key)) return;
    busy.add(key);
    Q.items.push({ pid, kind, id, key });
    Q.total++;
    updateQueueStatus();
    runQueue();
  }

  async function runQueue() {
    if (Q.running) return;
    Q.running = true;
    while (Q.items.length) {
      const job = Q.items.shift();
      refreshFrames();
      try { await runJob(job); }
      catch (e) {
        toast(e.message, 'error');
        if (e.needsKey || /Definições/.test(e.message)) {
          // sem chave ou fornecedor indisponível: pára a fila em vez de repetir o mesmo erro
          Q.items.forEach(j => busy.delete(j.key));
          Q.done += Q.items.length;
          Q.items = [];
          if (e.needsKey) openSettings(SETUP_INTRO);
        }
      }
      busy.delete(job.key);
      Q.done++;
      updateQueueStatus();
      refreshFrames();
    }
    Q.running = false;
    Q.total = Q.done = 0;
    updateQueueStatus();
  }

  async function runJob(job) {
    const proj = P && P.id === job.pid ? P : await DB.getProject(job.pid);
    if (!proj?.board) return;
    const b = proj.board, style = proj.settings.style, aspect = proj.settings.aspect;
    if (job.kind === 'char') {
      const c = b.characters.find(x => x.name === job.id);
      if (!c) return;
      const { image } = await AI.image(PROMPTS.characterRef(c, b, style), { aspect: '1:1', seed: b.seed });
      c.ref = image;
    } else {
      const s = b.shots.find(x => x.id === job.id);
      if (!s) return;
      const prompt = s.prompt_override || PROMPTS.image(s, b, style);
      const refs = b.characters.filter(c => c.ref && s.characters.includes(c.name)).map(c => c.ref);
      const { image, provider } = await AI.image(prompt, { aspect, seed: s.seed ?? b.seed, refs });
      s.image = image; s.stale = false; s.imageProvider = provider;
    }
    if (P && P.id === proj.id) { save(); } else { proj.updatedAt = Date.now(); await DB.saveProject(proj); }
  }

  function updateQueueStatus() {
    const el = $('#queue-status');
    if (!el) return;
    if (Q.running || Q.items.length) {
      el.classList.remove('hidden');
      el.textContent = `🖼️ ${Math.min(Q.done + 1, Q.total)}/${Q.total}`;
      el.title = 'A gerar imagens';
    } else el.classList.add('hidden');
  }

  // Atualiza só as molduras (sem perder o scroll).
  function refreshFrames() {
    if (!P?.board) return;
    if (tab === 'prod') return renderProd();
    $$('[data-frame]').forEach(el => {
      const s = P.board.shots.find(x => x.id === el.dataset.frame);
      if (s) el.innerHTML = frameHTML(s);
    });
  }

  // ---------- desenho de enquadramento (antes da imagem existir) ----------
  function framingSVG(shot) {
    const [aw, ah] = (P.settings.aspect === '2.39:1' ? '2.39:1' : P.settings.aspect).split(':').map(Number);
    const W = 160, H = Math.round(W * ah / aw);
    const scale = { EWS: 0.12, WS: 0.3, MWS: 0.55, MS: 0.8, TWO: 0.8, OTS: 0.95, MCU: 1.2, CU: 1.8, ECU: 3.2, POV: 0, INSERT: 0 }[shot.shot_size] ?? 0.8;
    const horizon = Math.round(H * 0.62);
    let body = '';
    const fig = (cx, s) => {
      const h = H * s * 2.2, head = h * 0.13, top = H - h * 0.95 + (s > 1 ? h * 0.18 : 0);
      return `<circle cx="${cx}" cy="${top + head}" r="${head}" />
        <path d="M${cx - head * 2.1} ${top + head * 2 + h} Q${cx - head * 2} ${top + head * 2.4} ${cx} ${top + head * 2.3} Q${cx + head * 2} ${top + head * 2.4} ${cx + head * 2.1} ${top + head * 2 + h} Z" />`;
    };
    if (shot.shot_size === 'INSERT') body = `<rect x="${W * 0.35}" y="${H * 0.35}" width="${W * 0.3}" height="${H * 0.3}" rx="4" />`;
    else if (shot.shot_size === 'POV') body = `<path d="M${W * 0.3} ${H} L${W * 0.42} ${H * 0.7} L${W * 0.5} ${H * 0.72} L${W * 0.46} ${H} Z" /><path d="M${W * 0.7} ${H} L${W * 0.6} ${H * 0.72} L${W * 0.52} ${H * 0.74} L${W * 0.56} ${H} Z" />`;
    else if (shot.shot_size === 'TWO') body = fig(W * 0.36, scale) + fig(W * 0.64, scale);
    else if (shot.shot_size === 'OTS') body = `<g opacity=".5">${fig(W * 0.18, 1.3)}</g>` + fig(W * 0.62, 0.75);
    else body = fig(W / 2, scale);
    return `<svg viewBox="0 0 ${W} ${H}" class="framing" aria-hidden="true">
      <line x1="0" y1="${horizon}" x2="${W}" y2="${horizon}" class="hz"/>
      <g class="fig">${body}</g>
      <line x1="${W / 3}" y1="0" x2="${W / 3}" y2="${H}" class="grid"/><line x1="${W * 2 / 3}" y1="0" x2="${W * 2 / 3}" y2="${H}" class="grid"/>
      <line x1="0" y1="${H / 3}" x2="${W}" y2="${H / 3}" class="grid"/><line x1="0" y1="${H * 2 / 3}" x2="${W}" y2="${H * 2 / 3}" class="grid"/>
    </svg>`;
  }

  function frameHTML(s) {
    const isBusy = busy.has(`${P.id}:shot:${s.id}`);
    return (s.image ? `<img src="${s.image}" alt="${esc(s.id)}" loading="lazy">` : framingSVG(s)) +
      (isBusy ? '<div class="frame-busy"><span class="spinner"></span>a gerar…</div>' : '') +
      (s.stale && !isBusy ? '<span class="stale">desatualizada</span>' : '');
  }

  const sizeLabel = s => CINE.sizes[s.shot_size]?.short || s.shot_size;
  const sizeName = s => CINE.sizes[s.shot_size]?.pt || s.shot_size;
  const aspectCSS = () => P.settings.aspect.replace(':', ' / ');

  // ---------- separador Storyboard ----------
  function renderBoard() {
    const el = $('#panel-board');
    if (generating) {
      el.innerHTML = `<div class="empty"><span class="spinner big"></span><h3>A criar o storyboard…</h3><p class="muted">O realizador está a dividir a música em planos. Pode demorar até um minuto.</p></div>`;
      return;
    }
    if (!P.board) {
      el.innerHTML = `<div class="empty">
        <div class="empty-icon">🎞️</div>
        <h3>Ainda não há storyboard</h3>
        <p class="muted">Fala com o realizador: carrega a música ou cola a letra e conta a ideia. Quando ele tiver o essencial, crias o storyboard.</p>
        ${isDesktop() ? '' : '<button class="btn" data-tab-go="chat">🎬 Falar com o realizador</button>'}
        <button class="btn primary" data-action="generate">Criar storyboard com o que já existe</button>
      </div>`;
      return;
    }
    const b = P.board;
    const missing = b.shots.filter(s => !s.image || s.stale).length;
    let html = `<div class="board-head">
      <div class="board-title"><h2>${esc(b.title)}</h2><p class="muted">${esc(b.logline)}</p></div>
      <div class="board-actions">
        <select data-setting="style" title="Estilo das imagens">${Object.entries(CINE.styles).map(([k, v]) => `<option value="${k}" ${P.settings.style === k ? 'selected' : ''}>${v.pt}</option>`).join('')}</select>
        <select data-setting="aspect" title="Formato">${AI.aspects.map(a => `<option ${P.settings.aspect === a ? 'selected' : ''}>${a}</option>`).join('')}</select>
        ${missing ? `<button class="btn primary small" data-action="gen-missing">🖼️ Gerar ${missing} imagem(ns)</button>` : ''}
        <button class="btn small" data-action="regen-all">🔄 Refazer todas as imagens</button>
        <button class="btn small" data-action="print">🖨️ PDF</button>
        <button class="btn ghost small" data-action="regenerate">🔁 Refazer storyboard</button>
      </div>
    </div>
    <p class="muted small">${b.shots.length} planos · toca num plano para editar ou mudar a imagem${P.hasAudio ? ' · ▶ ouve o trecho da música' : ''}</p>`;
    let section = null;
    html += '<div class="shot-grid">';
    for (const s of b.shots) {
      if (s.section !== section) {
        section = s.section;
        html += `<h3 class="section-title">${esc(section || 'Sem secção')}</h3>`;
      }
      html += `<article class="shot-card" data-shot="${esc(s.id)}">
        <div class="frame" data-frame="${esc(s.id)}" style="aspect-ratio:${aspectCSS()}">${frameHTML(s)}</div>
        <div class="shot-meta">
          <div class="row"><span class="num">${esc(s.id)}</span><span class="time">${esc(s.start)}–${esc(s.end)}</span>
            ${P.hasAudio ? `<button class="play" data-play="${esc(s.id)}" title="Ouvir trecho">▶</button>` : ''}</div>
          <div class="tags"><span class="tag size" title="${esc(sizeName(s))}">${esc(sizeLabel(s))}</span>${s.movement ? `<span class="tag">${esc(s.movement)}</span>` : ''}${s.lens ? `<span class="tag">${esc(s.lens)}</span>` : ''}</div>
          <p class="action">${esc(s.action)}</p>
          ${s.lyrics ? `<p class="lyrics">“${esc(s.lyrics)}”</p>` : ''}
        </div>
      </article>`;
    }
    html += '</div>';
    el.innerHTML = html;
  }

  // ---------- modal de plano ----------
  function openShot(id) {
    const s = P.board.shots.find(x => x.id === id);
    if (!s) return;
    const b = P.board;
    const autoPrompt = PROMPTS.image(s, b, P.settings.style);
    const field = (k, label, type = 'text') => `<label class="field"><span>${label}</span>${type === 'area'
      ? `<textarea name="${k}" rows="2">${esc(s[k])}</textarea>` : `<input name="${k}" value="${esc(s[k])}">`}</label>`;
    openModal(`
      <form id="shot-form" class="shot-form">
        <h3>${esc(s.id)} · ${esc(sizeName(s))} <span class="muted">${esc(s.start)}–${esc(s.end)}</span></h3>
        <div class="frame big" data-frame="${esc(s.id)}" style="aspect-ratio:${aspectCSS()}">${frameHTML(s)}</div>
        <div class="row-btns">
          <button type="button" class="btn primary" data-action="shot-image" data-id="${esc(s.id)}">🖼️ Nova imagem</button>
          ${P.hasAudio ? `<button type="button" class="btn" data-play="${esc(s.id)}">▶ Ouvir trecho</button>` : ''}
        </div>
        <div class="grid2">
          ${field('section', 'Secção')}
          <label class="field"><span>Tamanho do plano</span><select name="shot_size">${Object.entries(CINE.sizes).map(([k, v]) => `<option value="${k}" ${s.shot_size === k ? 'selected' : ''}>${v.short} — ${v.pt}</option>`).join('')}</select></label>
          ${field('start', 'Início (m:ss)')}${field('end', 'Fim (m:ss)')}
          ${field('angle', 'Ângulo')}${field('movement', 'Movimento')}
          ${field('lens', 'Lente')}${field('location', 'Local')}
          ${field('lighting', 'Luz')}
          <label class="field"><span>Personagens (separadas por vírgula)</span><input name="characters" value="${esc(s.characters.join(', '))}"></label>
        </div>
        ${field('action', 'Ação', 'area')}
        ${field('lyrics', 'Letra', 'area')}
        ${field('notes', 'Notas', 'area')}
        ${field('frame_en', 'O que se vê no plano (em inglês, é a base da imagem)', 'area')}
        <details ${s.prompt_override ? 'open' : ''}><summary>Prompt final da imagem</summary>
          <p class="muted small">Gerado a partir dos campos acima. Se o editares à mão, fica fixo até mudares o plano.</p>
          <textarea name="prompt" rows="5" data-auto="${esc(autoPrompt)}">${esc(s.prompt_override || autoPrompt)}</textarea>
        </details>
        <div class="row-btns end">
          <button type="button" class="btn ghost danger" data-action="shot-delete" data-id="${esc(s.id)}">Apagar</button>
          <button type="button" class="btn ghost" data-action="shot-duplicate" data-id="${esc(s.id)}">Duplicar</button>
          <button type="submit" class="btn">Guardar</button>
          <button type="submit" class="btn primary" data-regen="1">Guardar e gerar imagem</button>
        </div>
      </form>`);
    $('#shot-form').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const before = JSON.stringify(VISUAL_KEYS.map(k => s[k]));
      for (const k of SHOT_KEYS) if (f.has(k)) s[k] = f.get(k);
      s.characters = String(f.get('characters') || '').split(',').map(x => x.trim()).filter(Boolean);
      const prompt = f.get('prompt').trim();
      const visualChanged = before !== JSON.stringify(VISUAL_KEYS.map(k => s[k]));
      const auto = e.target.prompt.dataset.auto;
      s.prompt_override = prompt && prompt !== auto && !visualChanged ? prompt : (visualChanged ? null : s.prompt_override);
      if (prompt === auto) s.prompt_override = null;
      if ((visualChanged || s.prompt_override) && s.image) s.stale = true;
      save();
      closeModal();
      if (e.submitter?.dataset.regen) { s.seed = Math.floor(Math.random() * 1e6); enqueue('shot', s.id); }
      render();
    });
  }

  function openModal(html) {
    $('#modal-body').innerHTML = html;
    $('#modal').classList.remove('hidden');
  }
  function closeModal() { $('#modal').classList.add('hidden'); $('#modal-body').innerHTML = ''; }

  // ---------- separador Produção ----------
  const PROD_SECTIONS = [
    ['equipment', '🎥 Equipamento'], ['props', '🧸 Adereços'], ['wardrobe', '👕 Guarda-roupa'],
    ['cast', '🧑‍🎤 Elenco'], ['crew', '👥 Equipa'], ['locations', '📍 Locais'], ['notes', '📝 Notas'],
  ];

  function renderProd() {
    const el = $('#panel-prod');
    const br = P.brief || {};
    const structure = Array.isArray(br.structure) ? br.structure : [];
    const briefHTML = `<details class="card" ${P.board ? '' : 'open'}><summary><strong>🎵 Brief e música</strong></summary>
      <dl class="brief">
        ${[['Música', [br.song_title, br.artist].filter(Boolean).join(' — ')], ['Género / BPM', [br.genre, br.bpm && br.bpm + ' BPM'].filter(Boolean).join(' · ')],
          ['Duração', br.duration], ['Conceito', br.concept], ['Ambiente', br.mood], ['Estética', br.visual_style], ['Referências', br.references],
          ['Dias de rodagem', br.shoot_days], ['Orçamento', br.budget], ['Limitações', br.constraints]]
          .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(typeof v === 'string' ? v : JSON.stringify(v))}</dd>`).join('') || '<p class="muted">Ainda vazio. Fala com o realizador.</p>'}
      </dl>
      ${structure.length ? `<table class="structure"><tbody>${structure.map(x => `<tr><td>${esc(x.start)}–${esc(x.end)}</td><td><strong>${esc(x.name)}</strong></td><td class="muted">${esc(x.lyrics || '')}</td></tr>`).join('')}</tbody></table>` : ''}
      ${br.lyrics ? `<details><summary>Letra</summary><pre class="lyrics-full">${esc(br.lyrics)}</pre></details>` : ''}
    </details>`;

    if (!P.board) { el.innerHTML = briefHTML + '<div class="empty"><p class="muted">A lista de produção aparece quando criares o storyboard.</p></div>'; return; }
    const b = P.board, pr = b.production;
    const charHTML = `<div class="card"><h3>🧑 Personagens <span class="muted small">— a referência mantém a cara igual em todos os planos (com imagens Gemini)</span></h3>
      <div class="char-grid">${b.characters.map((c, i) => {
        const isBusy = busy.has(`${P.id}:char:${c.name}`);
        return `<div class="char">
          <div class="char-img">${c.ref ? `<img src="${c.ref}" alt="">` : '👤'}${isBusy ? '<div class="frame-busy"><span class="spinner"></span></div>' : ''}</div>
          <div><strong>${esc(c.name)}</strong> <span class="muted">${esc(c.role)}</span>
          <textarea data-char="${i}" rows="3" title="Aspeto (inglês)">${esc(c.look_en)}</textarea>
          <button class="btn small" data-action="char-ref" data-i="${i}">${c.ref ? '🔄 Nova referência' : '🖼️ Gerar referência'}</button></div>
        </div>`;
      }).join('') || '<p class="muted">Sem personagens.</p>'}</div></div>`;

    const lists = PROD_SECTIONS.map(([k, label]) => {
      const list = pr[k] || [];
      const done = list.filter(x => x.done).length;
      return `<div class="card"><h3>${label} <span class="muted small">${list.length ? `${done}/${list.length}` : ''}</span></h3>
        <ul class="checklist">${list.map((x, i) => `<li><label><input type="checkbox" data-check="${k}" data-i="${i}" ${x.done ? 'checked' : ''}><span>${esc(x.text)}</span></label><button class="x" data-del="${k}" data-i="${i}" title="Remover">✕</button></li>`).join('')}</ul>
        <form class="add-item" data-add="${k}"><input placeholder="Adicionar…"><button class="btn small">＋</button></form></div>`;
    }).join('');

    const schedule = pr.schedule?.length ? `<div class="card"><h3>🗓️ Plano de rodagem</h3><ol class="schedule">${pr.schedule.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : '';
    el.innerHTML = `<div class="prod">${briefHTML}${charHTML}${schedule}<div class="prod-grid">${lists}</div></div>`;
  }

  // ---------- separador Rodagem (no set, no telemóvel) ----------
  function renderSet() {
    const el = $('#panel-set');
    if (!P.board) { el.innerHTML = '<div class="empty"><div class="empty-icon">🎥</div><h3>Sem planos ainda</h3><p class="muted">Cria o storyboard primeiro.</p></div>'; return; }
    const shots = P.board.shots;
    const done = shots.filter(s => s.done).length;
    const groups = new Map();
    for (const s of shots) {
      const k = s.location || 'Sem local';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(s);
    }
    let html = `<div class="set-head">
      <div class="progress"><div style="width:${shots.length ? done / shots.length * 100 : 0}%"></div></div>
      <div class="set-bar"><strong>${done}/${shots.length} filmados</strong>
        <label class="toggle"><input type="checkbox" data-action="pending-only" ${setPendingOnly ? 'checked' : ''}> Só pendentes</label>
        <button class="btn small ${wakeLock ? 'primary' : ''}" data-action="wake">${wakeLock ? '☀️ Ecrã sempre ligado' : '🌙 Manter ecrã ligado'}</button>
      </div></div>`;
    for (const [loc, list] of groups) {
      const visible = setPendingOnly ? list.filter(s => !s.done) : list;
      if (!visible.length) continue;
      html += `<h3 class="section-title">📍 ${esc(loc)} <span class="muted small">${list.filter(s => s.done).length}/${list.length}</span></h3>`;
      for (const s of visible) {
        html += `<article class="set-card ${s.done ? 'done' : ''}">
          <div class="frame" data-frame="${esc(s.id)}" style="aspect-ratio:${aspectCSS()}">${frameHTML(s)}</div>
          <div class="set-info">
            <div class="row"><span class="num big">${esc(s.id)}</span><span class="time">${esc(s.start)}–${esc(s.end)}</span><span class="tag size">${esc(sizeName(s))}</span></div>
            <div class="tags">${[s.angle, s.movement, s.lens].filter(Boolean).map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>
            <p class="action">${esc(s.action)}</p>
            ${s.lyrics ? `<p class="lyrics">“${esc(s.lyrics)}”</p>` : ''}
            <p class="muted small">${[s.characters.join(', '), s.lighting && '💡 ' + s.lighting, s.notes].filter(Boolean).map(esc).join(' · ')}</p>
            <input class="set-note" data-note="${esc(s.id)}" placeholder="Nota do set…" value="${esc(s.setNote)}">
            <div class="set-actions">
              ${P.hasAudio ? `<button class="btn" data-play="${esc(s.id)}" data-preroll="1">▶ Playback</button>` : ''}
              <div class="takes"><button class="btn small" data-take="${esc(s.id)}" data-d="-1">−</button><span>Take ${s.takes || 0}</span><button class="btn small" data-take="${esc(s.id)}" data-d="1">＋</button></div>
              <button class="btn ${s.done ? '' : 'primary'}" data-done="${esc(s.id)}">${s.done ? '↩︎ Desfazer' : '✅ Feito'}</button>
            </div>
          </div>
        </article>`;
      }
    }
    if (setPendingOnly && done === shots.length) html += '<div class="empty"><div class="empty-icon">🎉</div><h3>Tudo filmado!</h3></div>';
    el.innerHTML = html;
  }

  async function toggleWake() {
    try {
      if (wakeLock) { await wakeLock.release(); wakeLock = null; }
      else if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; if (tab === 'set') renderSet(); });
      } else toast('Este browser não suporta manter o ecrã ligado.');
    } catch (e) { toast(e.message, 'error'); }
    renderSet();
  }

  // ---------- áudio por plano ----------
  let stopAt = null;
  function playSegment(id, preroll) {
    const s = P.board?.shots.find(x => x.id === id);
    const player = $('#player');
    if (!s || !audioURL) return;
    const start = toSec(s.start), end = toSec(s.end);
    if (start == null) return toast('Este plano não tem tempo de início.');
    if (!player.paused && player.dataset.shot === id) { player.pause(); return; }
    player.dataset.shot = id;
    player.currentTime = Math.max(0, start - (preroll ? 2 : 0));
    stopAt = end && end > start ? end : null;
    player.play().catch(e => toast(e.message, 'error'));
  }
  $('#player').addEventListener('timeupdate', e => {
    if (stopAt != null && e.target.currentTime >= stopAt) { e.target.pause(); stopAt = null; }
  });

  // ---------- definições ----------
  const SETUP_INTRO = '👋 <strong>Configuração única (2 minutos).</strong> A app usa duas chaves grátis: uma para o realizador e outra para as imagens. Depois de as colares, nunca mais te são pedidas.';
  function openSettings(intro = '') {
    const s = AI.settings();
    const ok = v => v ? '<span class="ok-badge">✔︎ configurada</span>' : '';
    openModal(`
      <form id="settings-form" class="settings">
        <h3>⚙️ Definições</h3>
        ${intro ? `<p>${intro}</p>` : ''}
        <div class="card">
          <h4>1 · Realizador: chave Gemini (grátis) ${ok(s.geminiKey)}</h4>
          <p class="muted small">É o cérebro: ouve a música, faz as perguntas e cria os planos.
          Abre <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>, entra com a tua conta Google, carrega em <strong>Create API key</strong> e cola-a aqui.</p>
          <div class="key-row"><input name="geminiKey" type="password" value="${esc(s.geminiKey)}" placeholder="AIza…" autocomplete="off">
            <button type="button" class="btn small" data-action="toggle-key" data-for="geminiKey">👁️</button>
            <button type="button" class="btn small" data-action="test-key">Testar</button></div>
        </div>
        <div class="card">
          <h4>2 · Imagens: chave Pollinations (grátis) ${ok(s.pollinationsKey)}</h4>
          <p class="muted small">Desenha cada plano. Abre <a href="https://enter.pollinations.ai/keys" target="_blank" rel="noopener">enter.pollinations.ai/keys</a>, entra (GitHub ou Google), cria uma chave <strong>publishable (pk_…)</strong> e cola-a aqui. O modelo Z-Image Turbo é muito barato e usa o saldo grátis da conta.</p>
          <div class="key-row"><input name="pollinationsKey" type="password" value="${esc(s.pollinationsKey)}" placeholder="pk_…" autocomplete="off">
            <button type="button" class="btn small" data-action="toggle-key" data-for="pollinationsKey">👁️</button>
            <button type="button" class="btn small" data-action="test-pkey">Testar</button></div>
        </div>
        <p class="muted small">As chaves ficam guardadas só neste dispositivo e não te voltam a ser pedidas.</p>
        <details class="card"><summary>Opções avançadas</summary>
          <label class="field"><span>Modelo de texto (Gemini)</span><select name="textModel">
            ${['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'].map(m => `<option ${s.textModel === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select></label>
          <label class="field"><span>Modelo de imagem (Pollinations)</span><select name="pollinationsModel">
            ${[['zimage', 'Z-Image Turbo (rápido, barato)'], ['black-forest-labs/flux.1.1-pro', 'FLUX 1.1 Pro (melhor, mais caro)'], ['microsoft/mai-image-2.6-flash', 'MAI Image Flash']].map(([v, l]) => `<option value="${v}" ${s.pollinationsModel === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
          <label class="field"><span>Fornecedor de imagens</span><select name="imageProvider">
            <option value="auto" ${s.imageProvider !== 'gemini' ? 'selected' : ''}>Pollinations</option>
            <option value="gemini" ${s.imageProvider === 'gemini' ? 'selected' : ''}>Gemini (precisa de faturação ativa na Google; mantém a cara das personagens)</option>
          </select></label>
          <label class="field"><span>Modelo de imagem Gemini</span><select name="imageModel">
            ${['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3-pro-image'].map(m => `<option ${s.imageModel === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select></label>
        </details>
        ${P ? `<div class="card"><h4>Este projeto</h4>
          <p class="muted small">Para passar o projeto do portátil para o telemóvel: exporta aqui e importa no outro dispositivo, no ecrã inicial.</p>
          <div class="row-btns"><button type="button" class="btn" data-action="export">⬇️ Exportar projeto</button>
          <button type="button" class="btn ghost danger" data-action="delete-project">Apagar projeto</button></div></div>` : ''}
        <div class="row-btns end"><button class="btn primary">Guardar</button></div>
      </form>`);
    $('#settings-form').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target);
      AI.saveSettings({
        geminiKey: f.get('geminiKey').trim(), pollinationsKey: f.get('pollinationsKey').trim(),
        textModel: f.get('textModel'), pollinationsModel: f.get('pollinationsModel'),
        imageProvider: f.get('imageProvider'), imageModel: f.get('imageModel'),
      });
      closeModal();
      toast('Definições guardadas ✔︎');
      if (P) render();
    });
  }

  // ---------- exportar / importar ----------
  async function exportProject() {
    const blob = P.hasAudio ? await DB.getAudio(P.id) : null;
    const data = { app: 'plano-a-plano', version: 1, project: P, audio: blob ? { name: P.audioName, mime: blob.type, base64: await AI.blobToBase64(blob) } : null };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    a.download = (P.name || 'projeto').replace(/[^\w\- ]+/g, '').trim() + '.plano.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function importProject(file) {
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'plano-a-plano' || !data.project?.id) throw new Error('Este ficheiro não é um projeto do Plano a Plano.');
      const exists = await DB.getProject(data.project.id);
      if (exists && !confirm(`Já tens "${exists.name}" neste dispositivo. Substituir pela versão importada?`)) return;
      if (data.audio) {
        const bytes = Uint8Array.from(atob(data.audio.base64), c => c.charCodeAt(0));
        await DB.saveAudio(data.project.id, new Blob([bytes], { type: data.audio.mime }));
      }
      await DB.saveProject(data.project);
      toast('Projeto importado ✔︎');
      renderHome();
    } catch (e) { toast(e.message, 'error'); }
  }

  // ---------- eventos ----------
  document.addEventListener('click', async e => {
    const t = e.target.closest('button, [data-shot], [data-open]');
    if (!t) return;
    if (t.dataset.open) return openProject(t.dataset.open);
    if (t.dataset.tab) return setTab(t.dataset.tab);
    if (t.dataset.tabGo) return setTab(t.dataset.tabGo);
    if (t.dataset.chip) return sendMessage(t.dataset.chip);
    if (t.dataset.play) { e.stopPropagation(); return playSegment(t.dataset.play, !!t.dataset.preroll); }
    if (t.dataset.done) {
      const s = P.board.shots.find(x => x.id === t.dataset.done);
      s.done = !s.done; save(); return renderSet();
    }
    if (t.dataset.take) {
      const s = P.board.shots.find(x => x.id === t.dataset.take);
      s.takes = Math.max(0, (s.takes || 0) + Number(t.dataset.d)); save(); return renderSet();
    }
    if (t.dataset.del) {
      P.board.production[t.dataset.del].splice(Number(t.dataset.i), 1); save(); return renderProd();
    }
    if (t.dataset.shot && !t.dataset.action) return openShot(t.dataset.shot);

    switch (t.dataset.action) {
      case 'new-project': {
        const p = newProjectData(); await DB.saveProject(p); await openProject(p.id);
        if (!AI.hasGemini() || !AI.settings().pollinationsKey) openSettings(SETUP_INTRO);
        return;
      }
      case 'demo': {
        const p = { ...newProjectData(), ...structuredClone(DEMO_PROJECT) };
        await DB.saveProject(p); return openProject(p.id);
      }
      case 'home': return goHome();
      case 'settings': return openSettings();
      case 'close-modal': return closeModal();
      case 'generate': return generateBoard();
      case 'regenerate': return generateBoard(true);
      case 'gen-missing': P.board.shots.filter(s => !s.image || s.stale).forEach(s => enqueue('shot', s.id)); return renderBoard();
      case 'regen-all':
        if (!confirm('Gerar de novo as imagens de todos os planos?')) return;
        P.board.shots.forEach(s => { s.seed = Math.floor(Math.random() * 1e6); enqueue('shot', s.id); }); return renderBoard();
      case 'print': return printBoard();
      case 'shot-image': {
        const s = P.board.shots.find(x => x.id === t.dataset.id);
        s.seed = Math.floor(Math.random() * 1e6); enqueue('shot', s.id); return refreshFrames();
      }
      case 'shot-delete': {
        if (!confirm('Apagar este plano?')) return;
        P.board.shots = P.board.shots.filter(x => x.id !== t.dataset.id); save(); closeModal(); return render();
      }
      case 'shot-duplicate': {
        const i = P.board.shots.findIndex(x => x.id === t.dataset.id);
        const copy = { ...structuredClone(P.board.shots[i]), id: nextShotId(), done: false, takes: 0, setNote: '' };
        P.board.shots.splice(i + 1, 0, copy); save(); closeModal(); render(); return openShot(copy.id);
      }
      case 'char-ref': return enqueue('char', P.board.characters[Number(t.dataset.i)].name), renderProd();
      case 'wake': return toggleWake();
      case 'export': return exportProject();
      case 'delete-project':
        if (!confirm(`Apagar "${P.name}" deste dispositivo? Não dá para desfazer.`)) return;
        await DB.deleteProject(P.id); await DB.deleteAudio(P.id); closeModal(); return goHome();
      case 'toggle-key': { const i = $(`[name=${t.dataset.for}]`); i.type = i.type === 'password' ? 'text' : 'password'; return; }
      case 'test-pkey': {
        const key = $('[name=pollinationsKey]').value.trim();
        if (!key) return toast('Cola primeiro a chave.');
        t.textContent = '…';
        try { await AI.testPollinationsKey(key); toast('Chave Pollinations válida ✔︎'); } catch (err) { toast('Chave Pollinations não funciona: ' + err.message, 'error'); }
        t.textContent = 'Testar'; return;
      }
      case 'test-key': {
        const key = $('[name=geminiKey]').value.trim();
        if (!key) return toast('Cola primeiro a chave.');
        t.textContent = '…';
        try { await AI.testKey(key); toast('Chave Gemini válida ✔︎'); } catch (err) { toast('Chave não funciona: ' + err.message, 'error'); }
        t.textContent = 'Testar'; return;
      }
    }
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'audio-file') { handleAudio(t.files[0]); t.value = ''; }
    else if (t.id === 'import-file') { importProject(t.files[0]); t.value = ''; }
    else if (t.dataset.setting) {
      P.settings[t.dataset.setting] = t.value;
      if (P.board) P.board.shots.forEach(s => { if (s.image) s.stale = true; });
      save(); renderBoard();
      if (P.board?.shots.length) toast('Carrega em "Gerar imagens" para aplicar a todas.');
    }
    else if (t.dataset.check) { P.board.production[t.dataset.check][Number(t.dataset.i)].done = t.checked; save(); renderProd(); }
    else if (t.dataset.action === 'pending-only') { setPendingOnly = t.checked; renderSet(); }
    else if (t.dataset.note) { P.board.shots.find(x => x.id === t.dataset.note).setNote = t.value; save(); }
    else if (t.dataset.char) {
      const c = P.board.characters[Number(t.dataset.char)];
      c.look_en = t.value;
      P.board.shots.forEach(s => { if (s.image && s.characters.includes(c.name)) s.stale = true; });
      save();
    }
  });

  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-add]');
    if (!f) return;
    e.preventDefault();
    const v = f.querySelector('input').value.trim();
    if (!v) return;
    P.board.production[f.dataset.add].push({ text: v, done: false });
    save(); renderProd();
  });

  $('#chat-form').addEventListener('submit', e => {
    e.preventDefault();
    const i = $('#chat-input');
    sendMessage(i.value);
    i.value = ''; i.style.height = '';
  });
  $('#chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer: coarse)').matches) { e.preventDefault(); $('#chat-form').requestSubmit(); }
  });
  $('#chat-input').addEventListener('input', e => { e.target.style.height = ''; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; });
  $('#project-name').addEventListener('change', e => { P.name = e.target.value.trim() || 'Sem nome'; save(); });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  matchMedia('(min-width: 1000px)').addEventListener('change', () => P && setTab(tab));

  function printBoard() {
    const prev = tab;
    document.body.classList.add('print-board');
    setTab('board');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('print-board');
      setTab(prev);
    }, 300);
  }

  // Grava logo quando a app vai para segundo plano ou fecha (telemóvel).
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
  window.addEventListener('pagehide', () => save(true));

  // ---------- arranque ----------
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  renderHome();
})();
