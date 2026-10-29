// Camada de IA.
// Texto (realizador): OpenRouter — escolhe sozinho o melhor modelo GRÁTIS e troca se falhar — ou Gemini.
// Imagens: AI Horde (grátis, comunitária) ou fal.ai (paga, muito barata e rápida). Extra: Pollinations, Gemini, OpenRouter.
// As chaves são guardadas UMA vez no dispositivo e nunca mais são pedidas.
const AI = (() => {
  const SETTINGS_KEY = 'pap-settings';
  const DEFAULTS = {
    openrouterKey: '',
    openrouterModel: 'auto',        // auto = melhor modelo grátis disponível
    geminiKey: '',
    textModel: 'gemini-2.5-flash',
    hordeKey: '',                   // vazio = anónimo (grátis, fila mais lenta)
    hordeModel: 'flux',
    falKey: '',
    falModel: 'fal-ai/flux/schnell',
    pollinationsKey: '',
    pollinationsModel: 'zimage',
    imageProvider: 'horde',         // horde | fal | pollinations | gemini | openrouter
    imageModel: 'gemini-2.5-flash-image',
    openrouterImageModel: 'google/gemini-2.5-flash-image',
  };
  let geminiImageBlocked = false;   // as imagens Gemini não têm plano grátis: se falharem, deixamos de tentar nesta sessão
  let lastModel = '';

  function settings() {
    try {
      const s = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
      if (s.imageProvider === 'auto') s.imageProvider = 'horde'; // versões antigas: "auto" era Pollinations
      return s;
    }
    catch { return { ...DEFAULTS }; }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings(), ...s })); } catch {}
    geminiImageBlocked = false;
  }
  const hasText = () => !!(settings().openrouterKey || settings().geminiKey);
  function hasImages() {
    const s = settings();
    return {
      horde: true, fal: !!s.falKey, pollinations: !!s.pollinationsKey,
      gemini: !!s.geminiKey, openrouter: !!s.openrouterKey,
    }[s.imageProvider] ?? true;
  }
  // AI Horde: pedidos em paralelo (cada um espera na fila da rede). Os outros: um de cada vez.
  const imageConcurrency = () => (settings().imageProvider === 'horde' ? 4 : 1);
  function textProviderName() {
    const s = settings();
    if (s.openrouterKey) return lastModel ? 'OpenRouter · ' + lastModel.split('/').pop().replace(':free', '') : 'OpenRouter (grátis)';
    return s.geminiKey ? 'Gemini' : 'sem chave';
  }

  // ---------- utilitários ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function parseJSON(text) {
    if (!text) throw new Error('Resposta vazia da IA.');
    let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try { return JSON.parse(t); } catch {}
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error('A IA não devolveu JSON válido.');
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  // Reduz e converte para JPEG para não encher o dispositivo.
  function compressImage(src, maxW = 1024) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const scale = Math.min(1, maxW / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Não consegui ler a imagem gerada.'));
      img.src = src;
    });
  }

  // ---------- OpenRouter ----------
  const OR = 'https://openrouter.ai/api/v1';
  const OR_CACHE = 'pap-or-free';
  // Preferência entre os grátis (os mais capazes primeiro). O resto é ordenado pelo tamanho do contexto.
  const PREFERRED = ['google/gemma-4-31b', 'nvidia/nemotron-3-ultra', 'thinkingmachines/inkling:', 'nvidia/nemotron-3.5-super',
    'google/gemma-4-26b', 'thinkingmachines/inkling-small', 'dots-studio/', 'nvidia/nemotron-3-nano-omni'];
  let freeCache = null;

  function paramsB(id) {
    const sizes = [...id.matchAll(/(\d+(?:\.\d+)?)b(?![a-z0-9])/gi)].map(m => parseFloat(m[1]));
    return sizes.length ? Math.max(...sizes) : null;
  }

  // Lista de modelos de texto grátis, do melhor para o pior. Atualiza de 6 em 6 horas.
  async function freeModels(force = false) {
    if (freeCache && !force) return freeCache;
    if (!force) {
      try {
        const c = JSON.parse(localStorage.getItem(OR_CACHE) || 'null');
        if (c && Date.now() - c.t < 6 * 3600e3 && c.list?.length) return (freeCache = c.list);
      } catch {}
    }
    const res = await fetch(OR + '/models');
    if (!res.ok) throw new Error(`OpenRouter: não consegui ler a lista de modelos (erro ${res.status}).`);
    const data = (await res.json()).data || [];
    const list = data.filter(m => {
      const p = m.pricing || {}, a = m.architecture || {};
      const free = Number(p.prompt) === 0 && Number(p.completion) === 0;
      const out = a.output_modalities || ['text'];
      const size = paramsB(m.id);
      return free && out.includes('text') && !out.includes('audio') && !out.includes('image') &&
        !/safety|guard|code|coder|lyria|embed/i.test(m.id) && (m.context_length || 0) >= 32000 && !(size && size < 8);
    }).map(m => {
      const pref = PREFERRED.findIndex(p => m.id.startsWith(p));
      return {
        id: m.id, name: m.name || m.id, ctx: m.context_length,
        audio: (m.architecture?.input_modalities || []).includes('audio'),
        score: m.id === 'openrouter/free' ? 1e6 : pref >= 0 ? pref : 100 - Math.log10(m.context_length || 1),
      };
    }).sort((a, b) => a.score - b.score);
    try { localStorage.setItem(OR_CACHE, JSON.stringify({ t: Date.now(), list })); } catch {}
    return (freeCache = list);
  }

  const AUDIO_FORMATS = { mpeg: 'mp3', mp3: 'mp3', wav: 'wav', 'x-wav': 'wav', wave: 'wav', ogg: 'ogg', flac: 'flac', 'x-flac': 'flac', mp4: 'm4a', m4a: 'm4a', 'x-m4a': 'm4a', aac: 'aac', webm: 'webm' };

  async function openrouter(body) {
    const res = await fetch(OR + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + settings().openrouterKey, 'X-Title': 'Plano a Plano' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    const msg = data.error?.message || (res.ok ? '' : `erro ${res.status}`);
    if (!res.ok || data.error) {
      const err = new Error(msg);
      err.status = data.error?.code || res.status;
      if (err.status === 401) { err.fatal = true; err.message = 'A chave OpenRouter é inválida. Verifica-a nas Definições ⚙️.'; }
      if (err.status === 429 && /per-day|per day|daily/i.test(msg)) {
        err.fatal = true;
        err.message = 'Chegaste ao limite diário de pedidos grátis do OpenRouter. Volta amanhã ou adiciona créditos na tua conta OpenRouter para teres mais pedidos por dia.';
      }
      throw err;
    }
    return data;
  }

  async function openrouterText(model, system, messages) {
    const msgs = [{ role: 'system', content: system }, ...messages.map(m => {
      if (!m.audio) return { role: m.role, content: m.text || '(sem texto)' };
      const fmt = AUDIO_FORMATS[(m.audio.mime.split('/')[1] || '').toLowerCase()] || 'mp3';
      return { role: m.role, content: [{ type: 'input_audio', input_audio: { data: m.audio.base64, format: fmt } }, { type: 'text', text: m.text || '(sem texto)' }] };
    })];
    const data = await openrouter({ model, messages: msgs, response_format: { type: 'json_object' }, temperature: 0.8, max_tokens: 16000 });
    const text = data.choices?.[0]?.message?.content;
    return parseJSON(Array.isArray(text) ? text.map(p => p.text || '').join('') : text);
  }

  // Tenta os modelos grátis por ordem até um responder bem.
  async function openrouterChatJSON(system, messages) {
    const s = settings();
    const hasAudio = messages.some(m => m.audio);
    let candidates;
    if (s.openrouterModel && s.openrouterModel !== 'auto') candidates = [s.openrouterModel];
    else {
      const list = await freeModels();
      candidates = list.filter(m => !hasAudio || m.audio).map(m => m.id);
      if (!candidates.length) {
        throw new Error(hasAudio
          ? 'Neste momento nenhum modelo grátis do OpenRouter ouve áudio. Cola a letra (com os tempos, se souberes) no chat.'
          : 'Neste momento não há modelos grátis disponíveis no OpenRouter. Tenta daqui a pouco.');
      }
    }
    let lastErr;
    for (const model of candidates.slice(0, 6)) {
      try {
        const out = await openrouterText(model, system, messages);
        lastModel = model;
        return out;
      } catch (e) {
        if (e.fatal) throw e;
        lastErr = e;
        console.warn('[OpenRouter]', model, e.message);
      }
    }
    throw new Error('Os modelos grátis do OpenRouter estão ocupados ou falharam. Tenta outra vez daqui a um minuto. (' + (lastErr?.message || '') + ')');
  }

  // ---------- Gemini ----------
  async function gemini(model, body, { retries = 1 } = {}) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings().geminiKey },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error?.message || `Erro ${res.status}`;
      if ((res.status === 429 || res.status === 503) && retries > 0) {
        await sleep(res.status === 429 ? 20000 : 5000);
        return gemini(model, body, { retries: retries - 1 });
      }
      const err = new Error(friendlyGeminiError(res.status, msg));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function friendlyGeminiError(status, msg) {
    if (status === 400 && /API key/i.test(msg)) return 'A chave Gemini é inválida. Verifica-a nas Definições.';
    if (status === 403) return 'A chave Gemini não tem permissão para este modelo. ' + msg;
    if (status === 429) return 'Limite do plano grátis do Gemini atingido. Espera um minuto e tenta outra vez.';
    return 'Gemini: ' + msg;
  }

  const geminiText = data => (data.candidates?.[0]?.content?.parts || [])
    .filter(p => p.text && !p.thought).map(p => p.text).join('');

  async function geminiChatJSON(system, messages) {
    const contents = messages.map(m => {
      const parts = [];
      if (m.audio) parts.push({ inlineData: { mimeType: m.audio.mime, data: m.audio.base64 } });
      parts.push({ text: m.text || '(sem texto)' });
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });
    const data = await gemini(settings().textModel, {
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.8, maxOutputTokens: 32768 },
    });
    lastModel = settings().textModel;
    return parseJSON(geminiText(data));
  }

  // ---------- API pública: chat em JSON ----------
  // messages: [{role:'user'|'assistant', text, audio?:{mime, base64}}]
  async function chatJSON(system, messages) {
    const s = settings();
    if (!s.openrouterKey && !s.geminiKey) {
      const err = new Error('Falta a chave do realizador. Abre as Definições ⚙️ e cola a chave OpenRouter (grátis). Só tens de o fazer uma vez.');
      err.needsKey = true;
      throw err;
    }
    if (s.openrouterKey) {
      try { return await openrouterChatJSON(system, messages); }
      catch (e) { if (!s.geminiKey) throw e; console.warn('[OpenRouter falhou, a tentar Gemini]', e.message); }
    }
    return geminiChatJSON(system, messages);
  }

  // ---------- Imagens ----------
  const ASPECTS = {
    '16:9': { w: 1024, h: 576, gemini: '16:9' },
    '9:16': { w: 576, h: 1024, gemini: '9:16' },
    '1:1': { w: 768, h: 768, gemini: '1:1' },
    '4:5': { w: 768, h: 960, gemini: '4:5' },
    '2.39:1': { w: 1176, h: 504, gemini: '21:9' },
  };
  const aspectOf = a => ASPECTS[a] || ASPECTS['16:9'];
  const REFS_NOTE = 'Reference image(s) of the character(s). Keep face, hair, body and clothing IDENTICAL in the new frame.';

  async function geminiImage(prompt, aspect, refs = []) {
    const parts = [];
    if (refs.length) {
      parts.push({ text: REFS_NOTE });
      for (const r of refs) parts.push({ inlineData: { mimeType: 'image/jpeg', data: r.split(',')[1] } });
    }
    parts.push({ text: prompt });
    const data = await gemini(settings().imageModel, {
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: aspectOf(aspect).gemini } },
    });
    const img = (data.candidates?.[0]?.content?.parts || []).find(p => p.inlineData);
    if (!img) throw new Error('O Gemini não devolveu imagem (pode ter sido bloqueada pelos filtros). Ajusta o prompt.');
    return compressImage(`data:${img.inlineData.mimeType};base64,${img.inlineData.data}`);
  }

  async function openrouterImage(prompt, aspect, refs = []) {
    const content = [...refs.map(r => ({ type: 'image_url', image_url: { url: r } })), { type: 'text', text: (refs.length ? REFS_NOTE + '\n\n' : '') + prompt }];
    const data = await openrouter({
      model: settings().openrouterImageModel,
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
      image_config: { aspect_ratio: aspectOf(aspect).gemini },
    }).catch(e => {
      if (e.status === 402) e.message = 'As imagens no OpenRouter são pagas e a tua conta não tem créditos. Usa a Pollinations (grátis) nas Definições ⚙️.';
      throw e;
    });
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error('O OpenRouter não devolveu imagem. Ajusta o prompt e tenta outra vez.');
    return compressImage(url);
  }

  async function pollinationsImage(prompt, aspect, seed, retries = 2) {
    const { w, h } = aspectOf(aspect);
    const s = settings();
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt.slice(0, 1800))}` +
      `?model=${encodeURIComponent(s.pollinationsModel)}&width=${w}&height=${h}&seed=${seed}&nologo=true&key=${encodeURIComponent(s.pollinationsKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).error?.message || '';
      if (res.status === 401) throw new Error('A chave Pollinations é inválida. Verifica-a nas Definições ⚙️.');
      if (res.status === 402) throw new Error('Acabou o saldo grátis da Pollinations por hoje. ' + msg);
      if (retries > 0 && (res.status === 429 || res.status >= 500)) { await sleep(8000); return pollinationsImage(prompt, aspect, seed, retries - 1); }
      throw new Error(`Pollinations: erro ${res.status}. ${msg}`);
    }
    const blob = await res.blob();
    const local = URL.createObjectURL(blob);
    try { return await compressImage(local); } finally { URL.revokeObjectURL(local); }
  }

  // AI Horde — rede comunitária, grátis. Pede, espera na fila e descarrega.
  const HORDE = 'https://aihorde.net/api/v2';
  const HORDE_MODELS = {
    flux: { models: ['Flux.1-Schnell fp8 (Compact)'], params: { steps: 8, cfg_scale: 1, sampler_name: 'k_euler' } },
    sdxl: { models: ['Juggernaut XL', 'AlbedoBase XL (SDXL)', 'AlbedoBase XL 3.1'], params: { steps: 30, cfg_scale: 6, sampler_name: 'k_dpmpp_2m', karras: true } },
  };
  const hordeHeaders = () => ({ 'Content-Type': 'application/json', apikey: settings().hordeKey || '0000000000', 'Client-Agent': 'plano-a-plano:1.0:github.com/YAxbairro/test' });

  async function hordeImage(prompt, aspect, seed, onProgress) {
    const { w, h } = aspectOf(aspect);
    const cfg = HORDE_MODELS[settings().hordeModel] || HORDE_MODELS.flux;
    // Sem conta a rede limita o tamanho: até ~1024×576, múltiplos de 64.
    const scale = Math.min(1, Math.sqrt((1024 * 576) / (w * h)));
    const W = Math.max(64, Math.round(w * scale / 64) * 64), H = Math.max(64, Math.round(h * scale / 64) * 64);
    const res = await fetch(HORDE + '/generate/async', {
      method: 'POST', headers: hordeHeaders(),
      body: JSON.stringify({
        prompt: prompt.slice(0, 1500) + ' ### text, watermark, logo, deformed, extra fingers',
        params: { ...cfg.params, width: W, height: H, n: 1, seed: String(seed) },
        models: cfg.models, nsfw: false, censor_nsfw: true, r2: true, shared: false,
      }),
    });
    const sub = await res.json().catch(() => ({}));
    if (!res.ok || !sub.id) throw new Error('AI Horde: ' + (sub.message || `erro ${res.status}`) + (res.status === 429 ? ' Espera um pouco e tenta outra vez.' : ''));
    const started = Date.now();
    while (true) {
      await sleep(6000);
      const c = await (await fetch(`${HORDE}/generate/check/${sub.id}`, { headers: hordeHeaders() })).json().catch(() => ({}));
      if (c.faulted) throw new Error('AI Horde: a geração falhou. Tenta outra vez.');
      if (c.is_possible === false) throw new Error('AI Horde: neste momento não há computadores na rede para este modelo. Muda o modelo nas Definições ou tenta mais tarde.');
      if (c.done) break;
      onProgress?.(c.queue_position ? `na fila #${c.queue_position}` : (c.wait_time ? `~${c.wait_time}s` : 'a desenhar…'));
      if (Date.now() - started > 15 * 60e3) throw new Error('AI Horde: demorou demasiado (rede cheia). Tenta mais tarde ou usa a fal.ai.');
    }
    const st = await (await fetch(`${HORDE}/generate/status/${sub.id}`, { headers: hordeHeaders() })).json();
    const gen = st.generations?.[0];
    if (!gen?.img) throw new Error('AI Horde: não devolveu imagem.');
    if (gen.censored) throw new Error('AI Horde: a imagem foi bloqueada pelo filtro. Ajusta o prompt.');
    return compressImage(gen.img.startsWith('http') ? gen.img : 'data:image/webp;base64,' + gen.img);
  }

  // fal.ai — pago por imagem, muito barato (FLUX schnell ≈ 0,003 $) e rápido.
  async function falImage(prompt, aspect, seed) {
    const { w, h } = aspectOf(aspect);
    const res = await fetch('https://fal.run/' + settings().falModel, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Key ' + settings().falKey },
      body: JSON.stringify({ prompt, image_size: { width: w, height: h }, num_images: 1, seed, sync_mode: true, enable_safety_checker: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof data.detail === 'string' ? data.detail : (data.detail?.[0]?.msg || data.message || `erro ${res.status}`);
      if (res.status === 401 || res.status === 403) throw new Error('A chave fal.ai é inválida. Verifica-a nas Definições ⚙️. (' + msg + ')');
      if (res.status === 402 || /balance|credit|locked/i.test(msg)) throw new Error('A conta fal.ai não tem saldo. Adiciona créditos em fal.ai ou usa a AI Horde (grátis). (' + msg + ')');
      throw new Error('fal.ai: ' + msg);
    }
    const url = data.images?.[0]?.url;
    if (!url) throw new Error('A fal.ai não devolveu imagem.');
    return compressImage(url);
  }

  // Devolve { image, provider }.
  async function image(prompt, { aspect, seed, refs, onProgress } = {}) {
    const s = settings();
    const sd = seed ?? Math.floor(Math.random() * 1e6);
    if (!hasImages()) {
      const err = new Error('Falta a chave do fornecedor de imagens escolhido. Abre as Definições ⚙️ (ou escolhe a AI Horde, que é grátis e não precisa de chave).');
      err.noImageKey = true;
      throw err;
    }
    if (s.imageProvider === 'horde') return { image: await hordeImage(prompt, aspect, sd, onProgress), provider: 'horde' };
    if (s.imageProvider === 'fal') return { image: await falImage(prompt, aspect, sd), provider: 'fal' };
    if (s.imageProvider === 'openrouter') return { image: await openrouterImage(prompt, aspect, refs || []), provider: 'openrouter' };
    if (s.imageProvider === 'gemini') {
      if (geminiImageBlocked) throw new Error('As imagens Gemini não estão disponíveis com a tua chave (não têm plano grátis). Usa a Pollinations nas Definições ⚙️.');
      try {
        return { image: await geminiImage(prompt, aspect, refs || []), provider: 'gemini' };
      } catch (e) {
        if (e.status && e.status !== 429 && e.status !== 503) {
          geminiImageBlocked = true;
          throw new Error('As imagens Gemini precisam de faturação ativa na Google. Usa a Pollinations (grátis) nas Definições ⚙️.');
        }
        throw e;
      }
    }
    return { image: await pollinationsImage(prompt, aspect, sd), provider: 'pollinations' };
  }

  // ---------- testar chaves ----------
  async function testKey(key) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key } });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error?.message || `Erro ${res.status}`);
    }
    return true;
  }

  async function testOpenRouterKey(key) {
    const res = await fetch(OR + '/key', { headers: { Authorization: 'Bearer ' + key } });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error?.message || `erro ${res.status}`);
    return d.data || {};
  }

  async function testHordeKey(key) {
    const res = await fetch(HORDE + '/find_user', { headers: { ...hordeHeaders(), apikey: key } });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.message || `erro ${res.status}`);
    return d;
  }

  async function testPollinationsKey(key) {
    const res = await fetch(`https://gen.pollinations.ai/account/balance?key=${encodeURIComponent(key)}`);
    if (res.status === 401 || res.status === 403) throw new Error('chave recusada');
    return true;
  }

  return {
    settings, saveSettings, hasText, hasImages, imageConcurrency, textProviderName, chatJSON, image, freeModels,
    testKey, testOpenRouterKey, testHordeKey, testPollinationsKey, blobToBase64, aspects: Object.keys(ASPECTS),
  };
})();

// ---------- Linguagem de cinema e prompts ----------
const CINE = {
  sizes: {
    EWS: { pt: 'Plano Geral Extremo', short: 'PGE', en: 'extreme wide shot, tiny figure in vast environment' },
    WS: { pt: 'Plano Geral', short: 'PG', en: 'wide shot, full body visible with environment' },
    MWS: { pt: 'Plano Americano', short: 'PA', en: 'medium wide shot framed from the knees up' },
    MS: { pt: 'Plano Médio', short: 'PM', en: 'medium shot framed from the waist up' },
    MCU: { pt: 'Plano Próximo', short: 'PP', en: 'medium close-up framed from the chest up' },
    CU: { pt: 'Grande Plano', short: 'GP', en: 'close-up on the face' },
    ECU: { pt: 'Muito Grande Plano', short: 'MGP', en: 'extreme close-up detail' },
    INSERT: { pt: 'Insert / Detalhe', short: 'INS', en: 'insert detail shot of an object' },
    OTS: { pt: 'Sobre o Ombro', short: 'OTS', en: 'over-the-shoulder shot' },
    POV: { pt: 'Plano Subjetivo', short: 'POV', en: 'point-of-view shot' },
    TWO: { pt: 'Plano a Dois', short: '2S', en: 'two-shot, two people in frame' },
  },
  styles: {
    realista: { pt: 'Realista (frame de filme)', en: 'cinematic film still, photorealistic, shot on cinema camera, anamorphic lens, natural skin texture, subtle film grain' },
    esboco: { pt: 'Esboço de storyboard', en: 'hand-drawn storyboard panel, black and white pencil sketch, loose confident lines, grey marker shading, clean white background around the frame' },
    ilustracao: { pt: 'Ilustração', en: 'cinematic digital illustration, graphic novel style, bold shapes, dramatic colour' },
  },
};

const PROMPTS = {
  BRIEF_FIELDS: 'song_title, artist, genre, bpm, duration, lyrics, structure [{"name","start","end","lyrics"}], concept, mood, visual_style, references, aspect_ratio (16:9 | 9:16 | 1:1 | 4:5 | 2.39:1), locations [{"name","description"}], cast [{"name","role","look"}], wardrobe, props, equipment, crew, shoot_days, budget, constraints, notes',

  SHOT_FIELDS: 'id, section, start (m:ss), end (m:ss), lyrics, shot_size (EWS|WS|MWS|MS|MCU|CU|ECU|INSERT|OTS|POV|TWO), angle, movement, lens, action, location (nome de um local), characters (array de nomes), lighting, notes, frame_en',

  director(brief, board) {
    const edit = board ? `
JÁ EXISTE UM STORYBOARD (resumo abaixo). Se ele pedir alterações, aplica-as em "edits":
{"update":[{"id":"P05", ...só os campos alterados}], "add":[{"after":"P05", ...todos os campos do plano}], "delete":["P07"]}
Campos de um plano: ${this.SHOT_FIELDS}.
frame_en = descrição em INGLÊS, objetiva e visual, do que se VÊ no enquadramento (quem, pose, expressão, cenário, luz, ângulo). É usada para gerar a imagem, por isso sempre que mudares algo visível atualiza também o frame_en.
Se ele pedir para refazer tudo do zero, põe "regenerate": true.

STORYBOARD ATUAL:
Personagens: ${(board.characters || []).map(c => `${c.name} (${c.look_en})`).join('; ') || '—'}
Locais: ${(board.locations || []).map(l => l.name).join('; ') || '—'}
${(board.shots || []).map(s => `${s.id} [${s.start}-${s.end}] ${s.section} | ${s.shot_size} | ${s.movement} | ${s.location} | ${s.action}`).join('\n')}
` : '';
    return `És o "Realizador": um realizador de videoclipes experiente que também faz de 1.º assistente de realização. Trabalhas com um videógrafo que fala português de Portugal (informal, trata-o por "tu"). Objetivo: reunir tudo o que é preciso para criar o storyboard completo e a lista de produção de um videoclipe, que ele vai replicar plano a plano no dia de rodagem.

COMO TRABALHAS
- PRIMEIRO extrai para o brief TUDO o que ele já disse (conceito, locais, pessoas e aspeto, roupa, equipamento, formato, tempos…). Nunca perguntes o que ele já respondeu.
- Depois, no máximo 2 perguntas por mensagem, curtas e concretas, sobre o que falta e é essencial. Nunca um questionário enorme.
- Quando ele não tem ideias, propõe 2–3 conceitos visuais concretos (locais, luz, movimento, cor) para ele escolher.
- Pensa como quem filma com orçamento baixo: locais realistas, luz disponível, o equipamento que ele tem, dias de rodagem, segurança.
- Vais preenchendo o brief. Essencial: a música (letra e/ou estrutura com tempos), conceito/história, estética, locais, quem aparece (e o aspeto físico), guarda-roupa, equipamento, formato, dias de rodagem.
- Quando tiveres o essencial, põe "ready": true e diz-lhe que pode carregar em "Criar storyboard". Não esperes pela perfeição; o resto ajusta-se depois.
- Se receberes um ficheiro de áudio: ouve-o, transcreve a letra, identifica a estrutura (intro, verso, pré-refrão, refrão, ponte, outro) com tempos m:ss, BPM aproximado, género e ambiente. Guarda tudo no brief, resume-lhe o que ouviste e sugere ideias que encaixem na música.
- Se ele colar uma letra, guarda-a em brief.lyrics e estrutura-a.
${edit}
RESPONDE SEMPRE SÓ COM JSON VÁLIDO:
{"reply":"mensagem para ele, em português de Portugal (podes usar **negrito** e listas com -)","brief":{...brief COMPLETO e atualizado...},"ready":true|false,"suggestions":["até 4 respostas curtas que ELE te pode dar, escritas na voz dele (ex.: \"Só a artista\", \"Propõe-me tu\")"],"edits":null,"regenerate":false}
Campos do brief (usa só os que souberes): ${this.BRIEF_FIELDS}

BRIEF ATUAL:
${JSON.stringify(brief || {})}`;
  },

  generator(brief) {
    return `És um realizador de videoclipes. A partir do brief, cria o storyboard completo e a lista de produção, prontos para filmar.

REGRAS
- Cobre a música TODA, do início ao fim, sem buracos nos tempos (start/end em m:ss). Sem tempos no brief, estima pela estrutura e pelo BPM.
- Entre 18 e 40 planos (setups de câmara), conforme a duração. Varia tamanhos, ângulos e movimentos; mais energia nos refrões; inclui planos de performance (playback) e de narrativa/b-roll.
- Tudo tem de ser realista de filmar com o equipamento, os locais e os dias do brief.
- Textos em português de Portugal, EXCETO os campos *_en, que são em inglês.
- characters[].look_en: aspeto físico FIXO em inglês (idade, género, cabelo, pele, constituição, roupa). Vai ser usado em todas as imagens para as personagens se manterem iguais.
- locations[].look_en: descrição visual do local em inglês.
- shots[].frame_en: em inglês, só o que se VÊ no enquadramento: quem (pelo nome da personagem), pose, expressão, cenário, ângulo, luz. Não descrevas movimento de câmara. 1–3 frases.
- visual_style_en: palavras-chave em inglês da estética (paleta, luz, textura, época).
- ids dos planos: P01, P02, ...
- production.schedule: plano de rodagem agrupado por dia e local (ex.: "Dia 1 · Manhã · Rooftop — P01, P05, P12"), para filmar com o mínimo de mudanças de local.

RESPONDE SÓ COM JSON VÁLIDO:
{"title":"","logline":"","visual_style_en":"","aspect_ratio":"16:9","characters":[{"name":"","role":"","look_en":""}],"locations":[{"name":"","description":"","look_en":""}],"shots":[{"id":"P01","section":"","start":"0:00","end":"0:06","lyrics":"","shot_size":"WS","angle":"","movement":"","lens":"","action":"","location":"","characters":[],"lighting":"","notes":"","frame_en":""}],"production":{"equipment":[],"props":[],"wardrobe":[],"cast":[],"crew":[],"locations":[],"schedule":[],"notes":[]}}

BRIEF:
${JSON.stringify(brief || {})}`;
  },

  // O prompt da imagem é construído a partir dos MESMOS campos que vês no cartão do plano.
  image(shot, board, style) {
    const clean = t => String(t || '').trim().replace(/[\s.]+$/, '');
    const size = CINE.sizes[shot.shot_size]?.en || shot.shot_size || '';
    const loc = (board.locations || []).find(l => l.name === shot.location);
    const chars = (board.characters || []).filter(c => (shot.characters || []).includes(c.name));
    const look = c => clean(c.look_en).toLowerCase().startsWith(c.name.toLowerCase()) ? clean(c.look_en) : `${c.name} is ${clean(c.look_en)}`;
    return [
      CINE.styles[style]?.en || CINE.styles.realista.en,
      size,
      clean(shot.frame_en || shot.action),
      chars.length ? 'Characters: ' + chars.map(look).join('; ') : '',
      loc?.look_en ? 'Location: ' + clean(loc.look_en) : '',
      board.visual_style_en ? 'Look: ' + clean(board.visual_style_en) : '',
      'no text, no captions, no watermark',
    ].filter(Boolean).join('. ');
  },

  characterRef(c, board, style) {
    return [
      CINE.styles[style]?.en || CINE.styles.realista.en,
      `character reference portrait, medium shot, front facing, neutral background: ${c.look_en}`,
      board.visual_style_en ? 'Look: ' + board.visual_style_en : '',
      'no text, no watermark',
    ].filter(Boolean).join('. ');
  },
};
