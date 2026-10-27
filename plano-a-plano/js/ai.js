// Camada de IA: texto (Gemini ou Pollinations) e imagens (Gemini ou Pollinations).
// A chave Gemini é guardada UMA vez no dispositivo e nunca mais é pedida.
const AI = (() => {
  const SETTINGS_KEY = 'pap-settings';
  const DEFAULTS = {
    geminiKey: '',
    textModel: 'gemini-2.5-flash',
    pollinationsKey: '',
    pollinationsModel: 'zimage',
    imageProvider: 'auto',          // auto | gemini | pollinations
    imageModel: 'gemini-2.5-flash-image',
  };
  let geminiImageBlocked = false;   // as imagens Gemini não têm plano grátis: se falharem, deixamos de tentar nesta sessão

  function settings() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
    catch { return { ...DEFAULTS }; }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings(), ...s })); } catch {}
    geminiImageBlocked = false;
  }
  const hasGemini = () => !!settings().geminiKey;
  const hasImages = () => !!(settings().pollinationsKey || settings().geminiKey);
  const textProviderName = () => hasGemini() ? 'Gemini' : 'sem chave';

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

  // ---------- API pública: chat em JSON ----------
  // messages: [{role:'user'|'assistant', text, audio?:{mime, base64}}]
  async function chatJSON(system, messages) {
    if (!hasGemini()) {
      const err = new Error('Falta a chave Gemini (grátis). Abre as Definições ⚙️ e cola-a. Só tens de o fazer uma vez.');
      err.needsKey = true;
      throw err;
    }
    {
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
      return parseJSON(geminiText(data));
    }
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

  async function geminiImage(prompt, aspect, refs = []) {
    const parts = [];
    if (refs.length) {
      parts.push({ text: 'Reference image(s) of the character(s). Keep face, hair, body and clothing IDENTICAL in the new frame:' });
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

  async function pollinationsImage(prompt, aspect, seed, retries = 2) {
    const { w, h } = aspectOf(aspect);
    const s = settings();
    const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt.slice(0, 1800))}` +
      `?model=${encodeURIComponent(s.pollinationsModel)}&width=${w}&height=${h}&seed=${seed}&nologo=true&key=${encodeURIComponent(s.pollinationsKey)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).error?.message || '';
      if (res.status === 401) throw new Error('A chave Pollinations é inválida. Verifica-a nas Definições.');
      if (res.status === 402) throw new Error('Acabou o saldo grátis da Pollinations por hoje. ' + msg);
      if (retries > 0 && (res.status === 429 || res.status >= 500)) { await sleep(8000); return pollinationsImage(prompt, aspect, seed, retries - 1); }
      throw new Error(`Pollinations: erro ${res.status}. ${msg}`);
    }
    const blob = await res.blob();
    const local = URL.createObjectURL(blob);
    try { return await compressImage(local); } finally { URL.revokeObjectURL(local); }
  }

  // Devolve { image, provider }.
  // auto: Pollinations se houver chave (grátis); senão Gemini (só funciona com faturação ativa).
  async function image(prompt, { aspect, seed, refs } = {}) {
    const s = settings();
    const sd = seed ?? Math.floor(Math.random() * 1e6);
    const usePollinations = s.pollinationsKey && (s.imageProvider === 'pollinations' || s.imageProvider === 'auto');
    if (usePollinations) return { image: await pollinationsImage(prompt, aspect, sd), provider: 'pollinations' };
    if (!s.geminiKey) {
      const err = new Error('Para gerar imagens falta a chave Pollinations (grátis). Abre as Definições ⚙️.');
      err.needsKey = true;
      throw err;
    }
    if (geminiImageBlocked) throw new Error('As imagens Gemini não estão disponíveis com a tua chave (não têm plano grátis). Põe a chave Pollinations nas Definições ⚙️.');
    try {
      return { image: await geminiImage(prompt, aspect, refs || []), provider: 'gemini' };
    } catch (e) {
      if (e.status && e.status !== 429 && e.status !== 503) {
        geminiImageBlocked = true;
        throw new Error('As imagens Gemini precisam de faturação ativa na Google. Põe a chave Pollinations (grátis) nas Definições ⚙️ para gerar as imagens.');
      }
      throw e;
    }
  }

  async function testKey(key) {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key } });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error?.message || `Erro ${res.status}`);
    }
    return true;
  }

  async function testPollinationsKey(key) {
    const res = await fetch(`https://gen.pollinations.ai/account/balance?key=${encodeURIComponent(key)}`);
    if (res.status === 401 || res.status === 403) throw new Error('chave recusada');
    return true;
  }

  return { settings, saveSettings, hasGemini, hasImages, textProviderName, chatJSON, image, testKey, testPollinationsKey, blobToBase64, aspects: Object.keys(ASPECTS) };
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
