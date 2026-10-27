// Projeto de exemplo para ver a app a funcionar antes de configurar as chaves.
const DEMO_PROJECT = {
 "name": "Exemplo · Luzes da Cidade — MAYA",
 "brief": {
  "song_title": "Luzes da Cidade",
  "artist": "MAYA",
  "genre": "R&B/pop",
  "bpm": 90,
  "duration": "2:40",
  "structure": [
   {
    "name": "Intro",
    "start": "0:00",
    "end": "0:12"
   },
   {
    "name": "Verso 1",
    "start": "0:12",
    "end": "0:40",
    "lyrics": "Ando sozinha pelas ruas de Lisboa"
   },
   {
    "name": "Refrão",
    "start": "0:40",
    "end": "1:05",
    "lyrics": "Luzes da cidade, levam-me contigo"
   }
  ],
  "concept": "MAYA passeia sozinha por Lisboa à noite e acaba a dançar no Cais do Sodré ao nascer do sol.",
  "mood": "melancólico que vira libertação",
  "visual_style": "néon quente, luz de rua, grão de película",
  "aspect_ratio": "16:9",
  "locations": [
   {
    "name": "Alfama",
    "description": "ruas estreitas"
   },
   {
    "name": "Miradouro",
    "description": "Sra. do Monte"
   },
   {
    "name": "Cais do Sodré",
    "description": "rio ao nascer do sol"
   }
  ],
  "cast": [
   {
    "name": "MAYA",
    "role": "artista",
    "look": "24 anos, cabelo encaracolado escuro, casaco de cabedal bordeaux"
   }
  ],
  "equipment": "Sony FX3, gimbal, 35mm, 85mm, 2 painéis LED",
  "shoot_days": "1 (noite + madrugada)"
 },
 "ready": true,
 "board": {
  "title": "Luzes da Cidade",
  "logline": "Uma noite sozinha em Lisboa que termina em libertação ao nascer do sol.",
  "visual_style_en": "warm sodium streetlights, teal shadows, 35mm film grain, shallow depth of field",
  "characters": [
   {
    "name": "MAYA",
    "role": "Artista",
    "look_en": "MAYA, a 24-year-old woman with dark curly shoulder-length hair, warm brown skin, burgundy leather jacket, black top, gold hoops",
    "ref": null
   }
  ],
  "locations": [
   {
    "name": "Alfama",
    "description": "Ruas estreitas e escadinhas",
    "look_en": "narrow cobblestone streets, azulejo walls, yellow street lamps"
   },
   {
    "name": "Miradouro",
    "description": "Miradouro da Senhora do Monte",
    "look_en": "stone viewpoint overlooking Lisbon"
   },
   {
    "name": "Elétrico 28",
    "description": "Interior do elétrico",
    "look_en": "vintage wooden tram interior"
   },
   {
    "name": "Cais do Sodré",
    "description": "Cais junto ao rio",
    "look_en": "riverside quay, Tagus river, 25 de Abril bridge"
   }
  ],
  "shots": [
   {
    "id": "P01",
    "section": "Intro",
    "start": "0:00",
    "end": "0:06",
    "lyrics": "",
    "shot_size": "EWS",
    "angle": "Picado",
    "movement": "Estático (tripé)",
    "lens": "35mm",
    "action": "Lisboa à noite vista do miradouro, MAYA pequena de costas no muro.",
    "location": "Miradouro",
    "characters": [
     "MAYA"
    ],
    "lighting": "Luz de rua + LED lateral",
    "notes": "",
    "frame_en": "High angle extreme wide shot of Lisbon at night from a viewpoint, city lights and the river, MAYA small from behind leaning on the stone wall.",
    "image": null,
    "stale": false,
    "done": false,
    "takes": 0,
    "setNote": "",
    "prompt_override": null
   },
   {
    "id": "P02",
    "section": "Intro",
    "start": "0:06",
    "end": "0:12",
    "lyrics": "",
    "shot_size": "CU",
    "angle": "Normal",
    "movement": "Push-in lento (gimbal)",
    "lens": "85mm",
    "action": "MAYA vira-se para a câmara, olhar perdido.",
    "location": "Miradouro",
    "characters": [
     "MAYA"
    ],
    "lighting": "Luz de rua + LED lateral",
    "notes": "",
    "frame_en": "Close-up of MAYA turning towards camera, distant gaze, city bokeh behind her, warm streetlight on her face.",
    "image": null,
    "stale": false,
    "done": false,
    "takes": 0,
    "setNote": "",
    "prompt_override": null
   },
   {
    "id": "P03",
    "section": "Verso 1",
    "start": "0:12",
    "end": "0:20",
    "lyrics": "Ando sozinha pelas ruas de Lisboa",
    "shot_size": "WS",
    "angle": "Normal",
    "movement": "Travelling para trás (gimbal)",
    "lens": "35mm",
    "action": "MAYA desce uma rua de Alfama a cantar.",
    "location": "Alfama",
    "characters": [
     "MAYA"
    ],
    "lighting": "Luz de rua + LED lateral",
    "notes": "",
    "frame_en": "Wide shot of MAYA walking down a narrow cobblestone street in Alfama at night, singing, yellow streetlamps, laundry lines above.",
    "image": null,
    "stale": false,
    "done": false,
    "takes": 0,
    "setNote": "",
    "prompt_override": null
   },
   {
    "id": "P04",
    "section": "Verso 1",
    "start": "0:20",
    "end": "0:28",
    "lyrics": "as luzes acendem",
    "shot_size": "INSERT",
    "angle": "Normal",
    "movement": "Estático",
    "lens": "85mm",
    "action": "Candeeiro de rua a acender.",
    "location": "Alfama",
    "characters": [],
    "lighting": "Luz de rua + LED lateral",
    "notes": "",
    "frame_en": "Insert detail of an old Lisbon street lamp flickering on against dark blue sky.",
    "image": null,
    "stale": false,
    "done": false,
    "takes": 0,
    "setNote": "",
    "prompt_override": null
   },
   {
    "id": "P05",
    "section": "Verso 1",
    "start": "0:28",
    "end": "0:40",
    "lyrics": "mas ninguém me vê",
    "shot_size": "MS",
    "angle": "Contrapicado",
    "movement": "Orbital lento (gimbal)",
    "lens": "35mm",
    "action": "MAYA canta encostada a uma parede de azulejos.",
    "location": "Alfama",
    "characters": [
     "MAYA"
    ],
    "lighting": "Luz de rua + LED lateral",
    "notes": "",
    "frame_en": "Low angle medium shot of MAYA singing against a blue azulejo tiled wall, LED side light.",
    "image": null,
    "stale": false,
    "done": false,
    "takes": 0,
    "setNote": "",
    "prompt_override": null
   },
   {
    "id": "P06",
    "section": "Refrão",
    "start": "0:40",
    "end": "0:52",
    "lyrics": "Luzes da cidade, levam-me contigo",
    "shot_size": "MCU",
    "angle": "Normal",
    "movement": "Handheld com energia",
    "lens": "35mm",
    "action": "Playback do refrão no elétrico 28, luzes a passar.",
    "location": "Elétrico 28",
    "characters": [
     "MAYA"
    ],
    "lighting": "Luz de rua + LED lateral",
    "notes": "",
    "frame_en": "Medium close-up of MAYA singing inside a vintage yellow Lisbon tram at night, city lights streaking past the window.",
    "image": null,
    "stale": false,
    "done": false,
    "takes": 0,
    "setNote": "",
    "prompt_override": null
   },
   {
    "id": "P07",
    "section": "Refrão",
    "start": "0:52",
    "end": "1:05",
    "lyrics": "esta noite eu não quero voltar",
    "shot_size": "TWO",
    "angle": "Normal",
    "movement": "Estático",
    "lens": "35mm",
    "action": "Reflexo da MAYA na janela do elétrico.",
    "location": "Elétrico 28",
    "characters": [
     "MAYA"
    ],
    "lighting": "Luz de rua + LED lateral",
    "notes": "",
    "frame_en": "MAYA and her reflection in the tram window, two figures in frame, neon reflections.",
    "image": null,
    "stale": false,
    "done": false,
    "takes": 0,
    "setNote": "",
    "prompt_override": null
   },
   {
    "id": "P08",
    "section": "Ponte",
    "start": "2:00",
    "end": "2:20",
    "lyrics": "E se o sol nascer",
    "shot_size": "WS",
    "angle": "Normal",
    "movement": "Grua manual / gimbal alto",
    "lens": "35mm",
    "action": "MAYA dança sozinha no cais ao nascer do sol.",
    "location": "Cais do Sodré",
    "characters": [
     "MAYA"
    ],
    "lighting": "Luz de rua + LED lateral",
    "notes": "",
    "frame_en": "Wide shot of MAYA dancing alone on the riverside quay at sunrise, golden light, the Tagus river and bridge behind.",
    "image": null,
    "stale": false,
    "done": false,
    "takes": 0,
    "setNote": "",
    "prompt_override": null
   }
  ],
  "production": {
   "equipment": [
    {
     "text": "Sony FX3 + 2 baterias extra",
     "done": false
    },
    {
     "text": "Gimbal",
     "done": false
    },
    {
     "text": "35mm",
     "done": false
    },
    {
     "text": "85mm",
     "done": false
    },
    {
     "text": "2 painéis LED + baterias",
     "done": false
    },
    {
     "text": "Coluna bluetooth para playback",
     "done": false
    }
   ],
   "props": [
    {
     "text": "Auscultadores antigos",
     "done": false
    }
   ],
   "wardrobe": [
    {
     "text": "Casaco de cabedal bordeaux",
     "done": false
    },
    {
     "text": "Top preto",
     "done": false
    },
    {
     "text": "Argolas douradas",
     "done": false
    }
   ],
   "cast": [
    {
     "text": "MAYA",
     "done": false
    }
   ],
   "crew": [
    {
     "text": "Tu (câmara)",
     "done": false
    },
    {
     "text": "MAYA",
     "done": false
    }
   ],
   "locations": [
    {
     "text": "Alfama",
     "done": false
    },
    {
     "text": "Miradouro da Sra. do Monte",
     "done": false
    },
    {
     "text": "Elétrico 28 (pedir autorização Carris)",
     "done": false
    },
    {
     "text": "Cais do Sodré",
     "done": false
    }
   ],
   "notes": [
    {
     "text": "Ver hora do nascer do sol",
     "done": false
    }
   ],
   "schedule": [
    "Dia 1 · 21h · Miradouro — P01, P02",
    "Dia 1 · 22h · Alfama — P03, P04, P05",
    "Dia 1 · 23h · Elétrico 28 — P06, P07",
    "Dia 2 · 6h30 · Cais do Sodré — P08"
   ]
  },
  "seed": 4242
 },
 "hasAudio": false,
 "audioName": "",
 "settings": {
  "style": "realista",
  "aspect": "16:9"
 },
 "chat": [
  {
   "role": "assistant",
   "local": true,
   "text": "Isto é um **projeto de exemplo** para veres como funciona. As imagens ainda não estão geradas: vês o desenho do enquadramento de cada plano. Põe as chaves nas Definições ⚙️ e carrega em **Gerar imagens** no Storyboard."
  },
  {
   "role": "user",
   "text": "Música \"Luzes da Cidade\" da MAYA, R&B, 90 BPM. Ela passeia à noite por Lisboa e acaba a dançar no Cais do Sodré ao nascer do sol. Tenho FX3, gimbal, 35 e 85mm."
  },
  {
   "role": "assistant",
   "text": "Ouvi a música: **90 BPM**, R&B com um refrão que abre muito. Já tenho o essencial:\n- conceito: noite sozinha em Lisboa → dança ao nascer do sol\n- 3 locais: Alfama, Miradouro, Cais do Sodré\n- FX3 + gimbal, 35 e 85mm\n\nSó uma pergunta: a MAYA canta em playback em todos os locais, ou só nos refrões?",
   "suggestions": []
  },
  {
   "role": "assistant",
   "text": "✅ Storyboard criado: **8 planos**, 4 locais. Se quiseres mudar alguma coisa, diz-me aqui.",
   "suggestions": []
  }
 ]
};
