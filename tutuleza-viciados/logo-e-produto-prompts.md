# TUTULEZA VICIADOS — Logo, Produto e Assets dos Atletas

Para usar no ChatGPT (geração de imagem) e no Gemini (Nano Banana). **Anexa sempre a imagem indicada** antes de colar o comando.

Ordem: **1. Logo → 2. Produto → 3. Atletas com o produto → (depois) vídeo no Flow.**

> Paleta atualizada: o logo é **preto e branco**, por isso a marca passa a ser **preto + branco**. O dourado fica opcional, só como detalhe.

---

## 1. LOGO — Gorila + atleta no supino (v2, minimalista)

**Base pronta:** `logo/logo-conceito.svg` / `logo/logo-conceito.png`, desenhado em vetor e já resolvido.
É **um só desenho**: cada peça do gorila É uma peça do supino, nada está "posto por cima".

| Gorila | Supino (visto de frente, dos pés do banco) |
|---|---|
| Orelhas | Discos de peso (a barra entra no furo do centro) |
| Sobrancelha / testa | A barra |
| Laterais da zona dos olhos | Os braços esticados a segurar a barra |
| Bochechas / focinho branco | Ombros e tronco do atleta |
| Nariz | O banco visto de frente (o peito do atleta por cima) |
| Narinas | O espaço entre as pernas do banco |

**Recomendação:** usa este SVG como logo final (ou pede a um designer para afinar curvas em 30 min). Os geradores de imagem não fazem bem logos de "duplo sentido" e acabam a meter elementos soltos uns por cima dos outros, como aconteceu na imagem que te deram.

### Comando para o ChatGPT / Gemini (anexa o `logo-conceito.png`)
```json
{
  "task": "Refine the attached logo. It is already the correct concept — DO NOT add, move or remove any element. Only polish curves and proportions.",
  "concept": "One single mark that is both a gorilla face and a front view of a bench press. Every gorilla feature IS a gym element: ears = weight plates, brow = barbell, sides of the eye area = the lifter's raised arms, white muzzle = the lifter's shoulders and torso, nose = the bench seen head-on, nostrils = the gap between the bench legs.",
  "keep_exactly": ["front-facing symmetric view", "the plates as ears with the bar going into their centre holes", "the bar as the brow line", "the two arms rising from the muzzle to the bar", "the bench-shaped nose with two legs", "the two angry eye slits", "the simple frown mouth", "the slightly peaked gorilla head"],
  "style": "ultra minimal flat vector logo, solid black on pure white, only 2 colors, no gradients, no shading, no outlines-inside-outlines, no fur, no texture, no extra lines",
  "polish": "smoother curves, perfectly symmetric, consistent spacing between shapes, slightly heavier gorilla brow and jaw so it reads as a gorilla, not a monkey",
  "must_read_at": "32px app icon and embroidered on a t-shirt",
  "output": "logo centered on pure white, 1:1, 2048x2048",
  "do_not": ["add a second gorilla face, ears or barbell on top", "draw a person in side view", "add a realistic body", "add text", "add more detail than the reference"]
}
```

**Se ainda complicar:** escreve só *"Same drawing as the attached image, just cleaner vector curves. Change nothing else."*

### Variações
- **Negativo:** *"Same logo, inverted: white on pure black."*
- **Com nome:** *"Logo above the wordmark 'TUTULEZA VICIADOS' in heavy condensed sans-serif, all caps, 'FITNESS GROUP' small and wide-spaced underneath. Exact spelling. Black on white."*

---

## 2. PRODUTO — Garrafa-haltere com a marca

**Anexar:** a foto da garrafa + o logo final aprovado no passo 1.

```json
{
  "task": "Product rebrand — keep the product structure 100% identical, only change branding.",
  "reference_images": {
    "product": "attached dumbbell-shaped water bottle (smoky translucent black plastic, two hexagonal heads, knurled grip in the middle, black flip-top cap)",
    "logo": "attached Tutuleza Viciados gorilla logo"
  },
  "keep_exactly": ["shape and proportions", "hexagonal heads", "knurled grip texture", "flip-top cap", "smoky translucent black material", "camera angle, concrete wall background, rubber gym floor, lighting"],
  "remove": "the embossed text 'H2PUMP' on the top hexagonal head",
  "add_branding": {
    "main_logo": "Small gorilla logo embossed/debossed into the front face of the top hexagonal head, tone-on-tone (same smoky black, visible only through light and relief), centered, about 25% of the face width",
    "wordmark": "Tiny 'TUTULEZA VICIADOS' text debossed on the front face of the bottom hexagonal head, all caps, condensed, exact spelling",
    "cap_detail": "Optional: tiny white gorilla logo printed on top of the flip cap"
  },
  "style": "premium product photography, photoreal, 85mm, soft key light from upper left, subtle rim light, slight water condensation droplets on the plastic",
  "output": "vertical 9:16, 1080x1920, product centered with breathing room above and below",
  "do_not": ["change the bottle shape", "add colors", "add large stickers or labels", "misspell the brand", "add other logos"]
}
```

**Variação packshot e-commerce:** *"Same branded bottle, front view, pure white seamless background, soft shadow underneath, 1:1."*

---

## 3. ATLETAS COM O PRODUTO (3 comandos)

**Anexar em cada um:** a imagem do atleta / atleta feminina já criados (ref. 1B / 1C do ficheiro do Flow) + a garrafa com a marca do passo 2 + o logo.
Se estiveres **no mesmo chat** onde os criaste, podes escrever *"use the same athletes you created before"*. O comando já traz a descrição física para garantir.

**Roupa atualizada para a nova paleta:** t-shirt/top preto mate com o **gorila branco pequeno no peito**, calções/leggings pretos.

### 3A — "Pausa entre séries" (atleta masculino, ginásio)
```json
{
  "task": "Photoreal campaign image, keep characters and product identical to references",
  "characters": "the male athlete from reference: Cape Verdean man, 28, athletic muscular build, dark skin with sweat sheen, short twisted hair, short beard",
  "wardrobe": "matte black fitted t-shirt with small white gorilla logo on the chest, black training shorts",
  "product": "the branded Tutuleza Viciados dumbbell water bottle from reference, exact shape, logo visible",
  "scene": "Dark industrial gym, raw concrete wall, single hard overhead light beam, chalk dust in the air",
  "action": "Sitting on a flat bench between sets, elbows on knees, head tilted back, drinking from the dumbbell bottle held by its grip; water drop running down his jaw; a loaded barbell blurred in the foreground",
  "camera": "low angle, 50mm, shallow depth of field, bottle and face in sharp focus",
  "lighting": "top-down hard light, rim light on sweat and on the bottle's edges, deep shadows",
  "grade": "cinematic, deep blacks, neutral cool tones, subtle film grain",
  "output": "vertical 9:16, 1080x1920",
  "do_not": ["change the bottle design", "add text", "distort hands", "extra people"]
}
```

### 3B — "Ela não para" (atleta feminina, praia vulcânica)
```json
{
  "task": "Photoreal campaign image, keep characters and product identical to references",
  "characters": "the female athlete from reference: Cape Verdean woman, 26, toned athletic build, deep brown skin, long braids tied high, determined expression",
  "wardrobe": "black sports top with small white gorilla logo, black high-waist leggings",
  "product": "the branded Tutuleza Viciados dumbbell water bottle from reference, exact shape, logo visible",
  "scene": "Black volcanic sand beach in Cape Verde at sunrise, Atlantic waves, sea mist",
  "action": "Mid-workout: she does an overhead walking lunge holding the dumbbell bottle up with one hand like a real dumbbell, the sunrise shining through the translucent bottle and the water inside",
  "camera": "low angle from the sand, 35mm, sun behind her",
  "lighting": "golden backlight, sun glowing through the bottle, glowing water droplets, rim light on her silhouette",
  "grade": "warm sunrise highlights, teal shadows, cinematic",
  "output": "vertical 9:16, 1080x1920",
  "do_not": ["change the bottle design", "add text", "distort hands or face", "extra people"]
}
```

### 3C — "Viciados Team" (os dois, pós-treino)
```json
{
  "task": "Photoreal campaign image, keep characters and product identical to references",
  "characters": "the male and female athletes from references, same faces and builds",
  "wardrobe": "both in matte black training clothes with small white gorilla logo on the chest",
  "product": "two branded Tutuleza Viciados dumbbell water bottles, exact shape, logos visible",
  "scene": "Rooftop in Praia, Cape Verde, at golden hour, city and ocean in the background, gym mats and kettlebells on the floor",
  "action": "After the workout, both standing side by side, sweaty and smiling, clinking their dumbbell bottles together like a toast; water splashes out in a frozen moment",
  "camera": "medium shot at chest height, 50mm, bottles in the center of the frame",
  "lighting": "golden hour backlight, warm lens flare, rim light on the splashing water",
  "grade": "warm, energetic, deep blacks, cinematic",
  "composition": "keep the top 25% of the frame clean for text",
  "output": "vertical 9:16, 1080x1920",
  "do_not": ["change the bottle design", "add text", "merged hands", "duplicate faces"]
}
```

---

## 4. Ligar ao vídeo no Flow

Estas 3 imagens servem diretamente como **primeiro frame** ("Frames to Video") ou **ingredients** no Veo:
- **3A** → substitui/complementa o **Plano 3 (Ferro)**: *"He drinks, lowers the bottle, looks into the lens, slow motion water drop."*
- **3B** → novo plano entre o 2 e o 4: *"She lowers the bottle from overhead in slow motion, sun flare through the water."*
- **3C** → substitui o **Plano 6 (Viciados Team)**: *"The bottles clink, water splashes in 120fps slow motion, they laugh."*

No `google-flow-video-promo.md`, troca o dourado das roupas pelo **logo branco do gorila** para ficar tudo coerente.
