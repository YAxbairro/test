# 🎬 Plano a Plano

Pré-produção de videoclipes: falas com um **realizador com IA**, ele cria o **storyboard** com uma imagem por plano, e no set tens tudo **plano a plano** no telemóvel.

## Como funciona

1. **Realizador (chat):** carregas a música 🎵 ou colas a letra, e contas a ideia. Ele ouve a música (letra, estrutura, tempos, BPM) e faz-te perguntas, no máximo 2 de cada vez, até ter o essencial.
2. **Storyboard:** divide a música em planos. Cada plano tem tempos, tamanho, ângulo, movimento, lente, ação, local, luz e a imagem gerada.
   - A imagem é gerada a partir dos **mesmos campos** que vês no cartão (o prompt está visível e é editável). Assim a imagem corresponde ao plano.
   - Pedes alterações no chat (ex.: *"o P05 em contrapicado"*, *"não tenho drone"*) e ele atualiza os planos e as imagens.
   - Botão ▶ para ouvir o trecho da música de cada plano.
   - Exportação para PDF (imprimir).
3. **Produção:** equipamento, adereços, guarda-roupa, elenco, equipa e locais (como checklists), personagens com aspeto fixo e plano de rodagem agrupado por local.
4. **Rodagem:** no telemóvel, os planos agrupados por local, com playback da música (2 s antes), contador de takes, notas, ✅ feito, barra de progresso e opção de manter o ecrã ligado. Funciona offline.

## Chaves (grátis, configuradas uma vez)

| Para quê | Onde |
|---|---|
| Realizador (texto e áudio): Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Imagens: Pollinations, modelo Z-Image Turbo | [enter.pollinations.ai/keys](https://enter.pollinations.ai/keys) (chave `pk_…`) |

As chaves ficam guardadas só no dispositivo (`localStorage`). Os projetos ficam no IndexedDB do browser.
Para passar um projeto do portátil para o telemóvel: ⚙️ → **Exportar projeto**, e no outro dispositivo **Importar projeto**.

> As imagens do Gemini não têm plano grátis. A opção existe nas opções avançadas para quem tiver faturação ativa: é a única que usa a imagem de referência da personagem para manter a mesma cara em todos os planos.

## Testar já (um só ficheiro)

`plano-a-plano.html` é a app inteira num só ficheiro: descarrega-o e abre-o no Chrome ou no Safari. O botão **👀 Ver exemplo** abre um videoclipe de exemplo completo.
Para gerar de novo este ficheiro depois de mudares o código: `python3 build.py`.

## Correr localmente

É uma app estática, sem build:

```bash
cd plano-a-plano
python3 -m http.server 8080
# abre http://localhost:8080
```

Para usar no telemóvel, publica a pasta num alojamento estático com HTTPS (Vercel, Netlify, GitHub Pages) e escolhe "Adicionar ao ecrã principal".

## Estrutura

```
index.html            ecrãs e layout
css/style.css         estilos (telemóvel primeiro, realizador ao lado no computador)
js/db.js              armazenamento local (IndexedDB)
js/ai.js              Gemini, Pollinations, linguagem de cinema e prompts
js/app.js             chat, storyboard, produção, rodagem, definições
sw.js                 cache offline
manifest.webmanifest  instalação no telemóvel
```
