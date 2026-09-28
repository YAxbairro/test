/* Tools Master — núcleo partilhado: chaves de API e chamadas de IA.
   As chaves vivem só no localStorage deste browser (tm_*_key). Nunca no código. */
(function () {
  const KEYS = {
    groq: 'tm_groq_key',
    anthropic: 'tm_anthropic_key',
    removebg: 'tm_removebg_key',
    deepl: 'tm_deepl_key',
    elevenlabs: 'tm_elevenlabs_key',
    cloudmersive: 'tm_cloudmersive_key',
  };

  function getKey(name) {
    try { return (localStorage.getItem(KEYS[name]) || '').trim(); }
    catch (e) { console.error('Tools Master: localStorage indisponível', e); return ''; }
  }
  function setKey(name, value) {
    try {
      if (value) localStorage.setItem(KEYS[name], value.trim());
      else localStorage.removeItem(KEYS[name]);
      return true;
    } catch (e) { console.error('Tools Master: não foi possível guardar a chave', e); return false; }
  }

  async function readError(resp) {
    let detail = '';
    try { const j = await resp.json(); detail = j.error?.message || j.message || JSON.stringify(j).slice(0, 200); }
    catch (e) { detail = await resp.text().catch(() => ''); }
    return 'HTTP ' + resp.status + (detail ? ' — ' + detail : '');
  }

  async function groqText(prompt, opts) {
    const key = getKey('groq');
    if (!key) throw new Error('Falta a chave Groq. Adiciona-a no hub (⚙ Chaves de API).');
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: opts.groqModel || 'llama-3.3-70b-versatile',
        max_tokens: opts.maxTokens || 1500,
        temperature: opts.temperature ?? 0.7,
        messages: [
          ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!resp.ok) throw new Error('Groq: ' + await readError(resp));
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async function anthropicText(prompt, opts) {
    const key = getKey('anthropic');
    if (!key) throw new Error('Falta a chave Anthropic.');
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: opts.anthropicModel || 'claude-sonnet-5',
        max_tokens: opts.maxTokens || 1500,
        ...(opts.system ? { system: opts.system } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) throw new Error('Anthropic: ' + await readError(resp));
    const data = await resp.json();
    return data.content?.[0]?.text || '';
  }

  /* Gera texto com IA. Usa Groq (grátis) primeiro; se falhar e houver chave Anthropic, tenta Anthropic.
     Lança erro com a razão real se nada funcionar. */
  async function aiText(prompt, opts = {}) {
    const errors = [];
    const order = opts.prefer === 'anthropic' ? [anthropicText, groqText] : [groqText, anthropicText];
    for (const fn of order) {
      const provider = fn === groqText ? 'groq' : 'anthropic';
      if (!getKey(provider)) { errors.push('sem chave ' + provider); continue; }
      try {
        const text = await fn(prompt, opts);
        if (text.trim()) return text.trim();
        errors.push(provider + ': resposta vazia');
      } catch (e) { errors.push(e.message); }
    }
    throw new Error(errors.length && errors.every(x => x.startsWith('sem chave'))
      ? 'Nenhuma chave de IA configurada. Abre o hub → ⚙ Chaves de API e adiciona a chave Groq (grátis em console.groq.com/keys).'
      : 'A IA falhou: ' + errors.join(' | '));
  }

  window.TM = { KEYS, getKey, setKey, aiText, readError };
})();
