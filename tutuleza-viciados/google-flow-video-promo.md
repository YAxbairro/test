# TUTULEZA VICIADOS — Vídeo Promocional (Google Flow)

**Formato:** Reels 9:16 · 1080×1920 (ou upscale para 4K vertical)
**Duração:** ~56 s (7 planos × 8 s) — cabe num Reel e conta uma história completa
**Modelos:** Nano Banana 2.1 (imagens de referência / keyframes) → Veo 3.1 (vídeo, áudio nativo)
**Conceito:** *"VICIADOS"* — o vício que te constrói. Do escuro da madrugada em Cabo Verde à luz dourada da comunidade.

---

## 0. Como usar no Flow (ordem de trabalho)

1. **Cria as "Ingredients" com o Nano Banana 2.1** (Secção 1). São as imagens de referência que mantêm a mesma cara, a mesma roupa e o mesmo logo em todos os planos.
2. **No Flow, escolhe Veo 3.1 → modo "Ingredients to Video"** (ou "Frames to Video" se usares o keyframe como primeiro frame). Proporção **9:16**.
3. **Gera cada plano da Secção 2 em separado** (8 s cada). Cola o JSON inteiro no campo do prompt. Gera 2–4 variações por plano e escolhe a melhor.
4. **Junta tudo no Scene Builder** pela ordem 1→7. Se um plano precisar de mais tempo, usa **Extend** (+7 s por extensão).
5. **Música:** o Veo gera som por clip, por isso a música muda de clip para clip. Usa o áudio do Veo **só para SFX/ambiente** (respiração, impacto, ondas) e mete **uma faixa única por cima** no CapCut / Premiere (ver Secção 3).
6. **Logo e texto final:** os modelos de vídeo ainda falham letras. Coloca o logo e o slogan **em pós-produção** por cima do plano 7 (o prompt já deixa o espaço limpo para isso).

> Nota: pediste "1980×1920" — para Reels o correto é **1080×1920** (9:16). É isso que está configurado aqui.

---

## 1. Ingredients — Nano Banana 2.1

> Troca as cores se a marca já tiver paleta oficial. Assumi **preto mate + dourado quente + branco**, que combina com "premium fitness".

### 1A — Logo da marca
```json
{
  "task": "brand logo, isolated",
  "subject": "Minimal bold wordmark 'TUTULEZA VICIADOS' with a small 'FITNESS GROUP' subtitle underneath",
  "style": "athletic premium streetwear brand, heavy condensed sans-serif, slight forward italic for motion, clean vector look",
  "colors": { "primary": "#0B0B0B matte black", "accent": "#C9A24D warm gold", "secondary": "#FFFFFF" },
  "background": "pure solid black, no texture",
  "rules": ["exact spelling: TUTULEZA VICIADOS", "no extra text", "centered", "high contrast", "no mockup, no 3D bevel"],
  "aspect_ratio": "1:1"
}
```

### 1B — Atleta masculino (personagem fixa)
```json
{
  "task": "character reference sheet, photoreal",
  "subject": "Cape Verdean man, 28, athletic muscular build, dark skin with natural sweat sheen, short twisted hair, short beard, intense calm eyes",
  "wardrobe": "matte black fitted compression t-shirt with small gold 'TUTULEZA VICIADOS' chest logo, black training shorts with gold side stripe, black training shoes",
  "views": ["front full body", "3/4 view", "close-up face"],
  "lighting": "neutral soft studio light, grey background",
  "style": "photorealistic, 85mm lens, sharp fabric texture, editorial sports campaign",
  "aspect_ratio": "16:9"
}
```

### 1C — Atleta feminina (personagem fixa)
```json
{
  "task": "character reference sheet, photoreal",
  "subject": "Cape Verdean woman, 26, toned athletic build, deep brown skin, long braids tied high, determined confident expression",
  "wardrobe": "black high-waist leggings with thin gold seam line, black sports top with small gold 'TUTULEZA VICIADOS' logo, black training shoes",
  "views": ["front full body", "3/4 view", "close-up face"],
  "lighting": "neutral soft studio light, grey background",
  "style": "photorealistic, 85mm lens, sharp fabric texture, editorial sports campaign",
  "aspect_ratio": "16:9"
}
```

### 1D — Hoodie / produto hero
```json
{
  "task": "product hero shot",
  "subject": "Oversized matte black heavyweight hoodie, embroidered gold 'TUTULEZA VICIADOS' wordmark across chest",
  "setting": "floating in darkness, single hard rim light from behind, fine dust particles in the light",
  "style": "luxury sportswear campaign, photoreal, macro fabric detail visible",
  "aspect_ratio": "9:16"
}
```

---

## 2. Planos — Veo 3.1 (cada um = 8 s, 9:16)

### Bloco global (já está dentro de cada plano, não precisas de colar à parte)
- **Look:** cinematic, shot on ARRI Alexa 35, anamorphic lenses, 24 fps feel, subtle film grain, teal-shadow / gold-highlight grade, deep blacks
- **VFX:** subtis — partículas de suor e pó em contraluz, faíscas douradas mínimas, shockwave de pó ao impacto. **Nada de cartoon, nada de raios, nada exagerado.**
- **Slow motion:** só nos momentos de pico (120 fps feel), com rampa de velocidade

---

### PLANO 1 — "Madrugada" (0–8 s) · Hook
```json
{
  "shot_id": 1,
  "title": "Dawn — the addiction starts",
  "duration_seconds": 8,
  "aspect_ratio": "9:16",
  "ingredients": ["1B male athlete"],
  "scene": "Pre-dawn on a black volcanic sand beach in Cape Verde, deep blue hour sky, Atlantic waves rolling in, mist over the water, faint orange line on the horizon",
  "action": "The male athlete stands still facing the ocean, back to camera, breathing heavily; his breath is visible as light vapor. On second 5 he slowly turns his head over his shoulder toward the camera, eyes sharp.",
  "camera": {
    "movement": "slow push-in from wide to medium, low angle, from behind",
    "lens": "anamorphic 40mm, shallow depth of field",
    "speed": "real time, last 2 seconds in gentle slow motion"
  },
  "lighting": "cold blue ambient light, thin warm rim light from the horizon outlining his shoulders",
  "vfx": "subtle sea mist drifting through frame, tiny water droplets catching the light, light anamorphic flare from horizon",
  "color_grade": "deep teal shadows, crushed blacks, a single warm gold accent from the horizon",
  "audio": "ocean waves, low wind, slow deep breathing, a single low cinematic sub-bass hit at the head turn. No music, no dialogue.",
  "mood": "silence before the storm, discipline, solitude",
  "negative": "no text, no logos floating, no cartoon effects, no extra people, no warped hands, no distorted face"
}
```

### PLANO 2 — "Corrida" (8–16 s)
```json
{
  "shot_id": 2,
  "title": "The run",
  "duration_seconds": 8,
  "aspect_ratio": "9:16",
  "ingredients": ["1B male athlete", "1C female athlete"],
  "scene": "Coastal cliff road in Cape Verde at sunrise, ocean below, volcanic rocks, golden sun breaking over the sea",
  "action": "Both athletes sprint side by side toward camera along the coastal road. At second 4 their feet strike the ground in sync; time slows down, dust and small stones lift into the air, sweat droplets fly off their faces.",
  "camera": {
    "movement": "tracking shot moving backwards in front of them at ground level, then tilts up to their faces during slow motion",
    "lens": "anamorphic 32mm",
    "speed": "real time → speed ramp into 120fps slow motion at second 4 → back to real time at second 7"
  },
  "lighting": "low golden sunrise backlight, strong rim light, long shadows toward camera",
  "vfx": "fine dust burst at footstrike frozen in slow motion, backlit sweat droplets glowing gold, subtle heat haze",
  "color_grade": "warm gold highlights, teal shadows, rich contrast",
  "audio": "rhythmic footsteps and breathing synced, whoosh as time slows, muffled heartbeat during slow motion, ocean far below",
  "wardrobe_focus": "gold logo on chest and the gold seam on the leggings clearly visible in the light",
  "negative": "no text, no extra runners, no cars, no deformed limbs, no blurry faces"
}
```

### PLANO 3 — "Ferro" (16–24 s)
```json
{
  "shot_id": 3,
  "title": "Iron — the gym",
  "duration_seconds": 8,
  "aspect_ratio": "9:16",
  "ingredients": ["1B male athlete"],
  "scene": "Dark industrial gym, raw concrete walls, single hard overhead light beam, chalk dust in the air, black rubber floor",
  "action": "Extreme close-up of chalked hands gripping a barbell. Clap of chalk. He deadlifts the heavy barbell; at lockout the plates slam slightly and chalk explodes off his hands in slow motion. Veins and muscle tension visible.",
  "camera": {
    "movement": "starts macro on hands, then fast vertical crane up to his face at the top of the lift",
    "lens": "macro 100mm into 35mm",
    "speed": "real time grip → 120fps slow motion at the lockout"
  },
  "lighting": "single top-down hard spotlight, everything else in shadow, chalk glowing in the beam",
  "vfx": "chalk cloud expanding in slow motion inside the light beam, tiny micro-shockwave of dust on the floor at plate impact",
  "color_grade": "monochrome feel with only gold tones in the light, deep blacks",
  "audio": "chalk clap, metal plates clanking, heavy exhale, deep impact boom at lockout, reverb tail in the concrete room",
  "negative": "no text, no mirrors with reflections errors, no extra people, no bent barbell"
}
```

### PLANO 4 — "Ela" (24–32 s)
```json
{
  "shot_id": 4,
  "title": "Her — power and flow",
  "duration_seconds": 8,
  "aspect_ratio": "9:16",
  "ingredients": ["1C female athlete"],
  "scene": "Same dark industrial gym, battle ropes on the floor, warm side light coming through a large dusty window",
  "action": "The female athlete slams battle ropes; waves travel through the ropes. At second 3 she does a final explosive double slam — time freezes almost completely, her braids suspended mid-air, sweat drops hanging in the light — then she looks straight into the lens with a slight confident smile.",
  "camera": {
    "movement": "slow 90-degree orbit around her from side to front during the freeze",
    "lens": "anamorphic 50mm, shallow depth of field",
    "speed": "real time → near-freeze (bullet-time feel) → real time"
  },
  "lighting": "warm golden side light through window, strong contrast, volumetric light rays",
  "vfx": "dust particles hanging in volumetric rays, frozen sweat drops, subtle ripple of air from the rope impact",
  "color_grade": "warm gold and amber, deep shadows",
  "audio": "rope slaps, powerful exhale, time-stop whoosh with all sound dropping to a low hum, sound snaps back on her look",
  "wardrobe_focus": "black top and leggings with gold logo and gold seam clearly visible",
  "negative": "no text, no tangled hands, no extra limbs, no distorted face"
}
```

### PLANO 5 — "A Marca" (32–40 s) · Produto
```json
{
  "shot_id": 5,
  "title": "The gear",
  "duration_seconds": 8,
  "aspect_ratio": "9:16",
  "ingredients": ["1D hoodie", "1A logo"],
  "scene": "Premium minimalist showroom at night: black walls, black concrete floor, warm gold LED strips, apparel hanging on brushed gold rails — t-shirts, shorts, leggings, tops, hoodies",
  "action": "Slow dolly along the rail; garments sway slightly as if someone just walked by. The camera stops on the black hoodie with the gold embroidered logo; a single warm light slowly turns on above it.",
  "camera": {
    "movement": "smooth lateral dolly, then slow push-in macro to the embroidered logo stitching",
    "lens": "50mm to macro 100mm",
    "speed": "slightly slowed, elegant"
  },
  "lighting": "low-key, gold accent LEDs, light reveal on the hoodie",
  "vfx": "very fine golden dust motes in the air, subtle light bloom on the embroidery",
  "color_grade": "black and gold luxury, clean, high contrast",
  "audio": "quiet room tone, soft fabric movement, electric hum + click as the light turns on, rising synth swell",
  "negative": "no misspelled text, no extra random logos, no people, no cluttered background"
}
```

### PLANO 6 — "Viciados Team" (40–48 s) · Comunidade
```json
{
  "shot_id": 6,
  "title": "Viciados Team — community",
  "duration_seconds": 8,
  "aspect_ratio": "9:16",
  "ingredients": ["1B male athlete", "1C female athlete"],
  "scene": "Rooftop or open plaza in Praia, Cape Verde, at golden hour; a group of 10–12 diverse athletes all wearing black and gold Tutuleza Viciados apparel; city and ocean in the background",
  "action": "The group finishes a workout together. The male and female leads in front. They all slap hands and bump fists; at second 5 the group throws their arms up together in slow motion, sweat and dust flying in the backlight, everyone smiling and shouting.",
  "camera": {
    "movement": "drone-style descending crane from high wide shot down into the group at chest height",
    "lens": "24mm wide into 35mm",
    "speed": "real time → slow motion on the arms-up moment"
  },
  "lighting": "golden hour backlight, warm flares, sun behind the group",
  "vfx": "backlit sweat and dust particles, natural lens flare, subtle gold glow on the edges",
  "color_grade": "warm, energetic, gold highlights, teal city shadows",
  "audio": "crowd cheering and shouting, hand slaps, city ambience, music swell peaking",
  "mood": "family, belonging, victory, pride of Cape Verde",
  "negative": "no text, no merged bodies, no duplicated faces, no deformed hands"
}
```

### PLANO 7 — "Final / Logo" (48–56 s) · CTA
```json
{
  "shot_id": 7,
  "title": "Final hero + logo space",
  "duration_seconds": 8,
  "aspect_ratio": "9:16",
  "ingredients": ["1B male athlete", "1C female athlete"],
  "scene": "Back on the black volcanic sand beach from shot 1, now at full sunset, sky orange and gold, waves glowing",
  "action": "Both athletes walk toward camera side by side in slow motion, confident, then stop and stand still facing the lens. The camera keeps pulling back. Waves wash around their feet. The last 3 seconds hold on a calm wide shot with large empty dark sky in the top half of the frame.",
  "camera": {
    "movement": "slow continuous pull-back, ending in a still locked-off wide shot",
    "lens": "anamorphic 40mm",
    "speed": "slow motion walk, then real-time hold"
  },
  "lighting": "sunset backlight, silhouettes with gold rim light",
  "vfx": "sea spray glowing in the sunset, subtle anamorphic flare, light golden particles drifting upward",
  "color_grade": "deep orange-gold sky, black silhouettes, cinematic contrast",
  "composition": "keep the upper 40% of the frame clean and empty for logo and slogan added in post-production",
  "audio": "waves, wind, final deep cinematic boom on the final frame, then silence",
  "negative": "no text, no logos generated, no extra people, no distorted bodies"
}
```

---

## 3. Pós-produção (CapCut / Premiere)

**Música (uma faixa só, 56 s):** cinematic hybrid trap / epic sports — começa lenta e escura (piano + sub-bass) nos planos 1–2, drop no plano 3, pausa/silêncio no freeze do plano 4, build no 5, clímax no 6, boom final + silêncio no 7. ~90 → 140 BPM.
Termos para procurar (Epidemic Sound, Artlist, YouTube Audio Library): *"epic sports trap cinematic"*, *"dark motivational build"*.

**Textos (overlay, fonte condensada bold, branco + dourado):**
| Tempo | Texto |
|---|---|
| 2 s | *Uns treinam.* |
| 6 s | *Nós somos viciados.* |
| 20 s | *Disciplina.* |
| 28 s | *Força.* |
| 36 s | *Nova coleção 2026.* |
| 44 s | *Viciados Team.* |
| 51 s | **LOGO TUTULEZA VICIADOS** (fade-in com leve glow dourado) |
| 54 s | *O vício que te constrói.* · @tutulezaviciados |

**Cortes:** corta sempre no pico do movimento (impacto, footstrike) e coloca o "boom" da música exatamente nesses cortes. Transições = cortes secos + 1–2 *whip pans*, sem efeitos de template.

**Exportar:** 1080×1920, 30 fps, H.264, ~20 Mbps. Deixa as legendas fora dos 250 px de baixo e de cima (zona da interface do Instagram).

---

## 4. Dicas para o Flow acertar

- Se a cara mudar de plano para plano: usa sempre as **mesmas ingredients 1B/1C** e repete a descrição física.
- Se o slow motion não sair: escreve no início do `action` *"filmed at 120fps, played back in slow motion"*.
- Se o logo aparecer com letras erradas: tira o logo da cena e mete-o em pós.
- Gera **primeiro os planos 1 e 7** (abertura e fecho) — definem o tom do vídeo inteiro.
- Para mais duração (até ~2 min): usa **Extend** nos planos 2, 4 e 6 em vez de criar planos novos.
