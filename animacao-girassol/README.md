# Girassol → logótipo

Animação de ~13,5 s (1920×1080, 60 fps) em que o girassol se forma a partir de uma galáxia de poeira dourada. Depois desfolha-se, e as peças fundem-se no logótipo final:

- o **miolo** gira, aquece e explode em sementes que renascem como a **figura** (bola, braço e corpo);
- parte das **pétalas** ficam verdes e dissolvem-se nas **folhas**;
- outras pétalas fundem-se no **leque**;
- as últimas desenham o **arco** da esquerda para a direita, como um cometa.

## Ficheiros

- `girassol-logo.mp4`: o vídeo final.
- `index.html`: a mesma animação em tempo real no browser (clica para recomeçar).
- `anim.js`: o motor da animação (canvas 2D e partículas). É determinístico: cada frame é uma função do tempo.
- `assets/`: os sprites recortados da imagem de referência.
- `tools_extract.py` / `tools_bundle.py`: recortam os sprites e geram `assets.js`.
- `render.mjs`: exporta o vídeo com Playwright e ffmpeg (`node render.mjs 60 girassol-logo.mp4`).
