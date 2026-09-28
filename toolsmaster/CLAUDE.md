# TOOLS MASTER

Suite de 10 ferramentas web (Eagle Marketing — Yax, Praia). Cada ferramenta é um `.html` standalone (vanilla JS, sem build). O hub `toolsmaster.html` abre-as em iframe. Abrir `toolsmaster.html` num servidor estático (ex.: `npx serve .`) para testar.

## Regras
1. Sem framework, sem build. Todos os ficheiros nesta pasta.
2. Nunca reduzir funcionalidade. Cada versão ≥ anterior.
3. Proibido `catch(e){}` vazio e mensagens falsas de sucesso ("em breve", resultados aleatórios). Erros reais sempre visíveis.
4. Interface em PT-PT / Cabo Verde.
5. **API keys só no localStorage do browser** (hub → ⚙ Chaves de API). Nunca no código nem em commits.
6. Testar de verdade (Playwright + ficheiros reais) antes de dizer "pronto".

## Módulos partilhados
| Ficheiro | Função |
|---|---|
| `tm-core.js` | Chaves (`tm_groq_key`, `tm_anthropic_key`, `tm_removebg_key`, `tm_deepl_key`, `tm_elevenlabs_key`) + `TM.aiText()` (Groq grátis → Anthropic) |
| `tm-image.js` | HEIC→JPEG (heic2any, carregado a pedido), JPEG com fundo branco |
| `tm-ffmpeg.js` | ffmpeg.wasm no browser (core 32 MB do jsDelivr, 1ª vez) |
| `tm-rmbg.js` | Remover fundo: remove.bg se houver chave, senão IA local @imgly (**AGPL-3.0** — decidir antes de uso comercial) |
| `tm-qr.js` | Motor QR (qrcode-generator MIT, UTF-8), formas, olhos, gradiente, SVG vetorial; shim `QRCode` |
| `vendor/` | jszip, pdf-lib, @cantoo/pdf-lib (encriptação real), pdf.js, qrcode-generator, heic2any, ffmpeg wrapper, mammoth (DOCX), SheetJS (XLSX) |

## Estado (28/09/2026) — testado
- **PDF Master**: 21 funções OK. Proteger/Permissões agora encriptam de verdade (@cantoo/pdf-lib; confirmado com pdf.js). Compressão real (páginas → JPEG; −96% num PDF de fotos). Escalar e Formulários corrigidos.
- **Converter**: imagens OK, SVG corrigido, HEIC OK. Áudio/vídeo (6 funções) via ffmpeg.wasm — formatos verificados. Docs → PDF: Cloudmersive (chave, plano grátis) ou local para DOCX/XLSX/CSV (janela «Guardar como PDF»).
- **Resize**: 8 redes + custom + batch OK, HEIC OK.
- **Image**: remover fundo com IA real, "Melhorar" corrigido, **OCR** (Tesseract.js local, PT/EN/FR/ES), restantes OK.
- **Sign**: assinatura carregada → PNG transparente real; assinar PDF/imagem OK.
- **QR**: acentos corrigidos (lib antiga falhava), WiFi/vCard/VCALENDAR válidos, 24 combinações de formas legíveis (jsQR), gradiente nos módulos, SVG vetorial. **QR artístico com IA: sem API grátis viável (mensagem honesta + modo imagem de fundo).**
- **Text / CV**: ligados a Groq (grátis). ATS agora é análise real (antes era aleatório).
- **SRT Sync**: key partilhada do hub; builder sem legendas vazias/sobrepostas.
- **Voice**: voz real no browser com Piper (pt_PT "tugão", pt_BR, EN, FR, ES; sem chave), MP3/WAV/OGG via ffmpeg, velocidade, SSML com pausas. Clonagem via ElevenLabs (chave + plano pago). Não há voz nativa em crioulo.
- **Currency Master** (novo): currency-api, 150+ moedas, CVE com paridade fixa 110,265, offline com últimas taxas.

## APIs escolhidas (de github.com/public-apis/public-apis)
| Uso | API / motor | Chave? |
|---|---|---|
| Texto IA | Groq (Llama 3.3) → Anthropic | Groq grátis |
| Legendas | Groq Whisper | Groq grátis |
| Voz | Piper via @diffusionstudio/vits-web (MIT, local) · ElevenLabs para clonagem | Não · ElevenLabs pago |
| Docs → PDF | Cloudmersive · local mammoth/SheetJS | Plano grátis · Não |
| Moedas | currency-api (fawazahmed0) | Não |
| OCR | Tesseract.js (local) | Não |
| Remover fundo | remove.bg · @imgly local (AGPL) | 50/mês grátis · Não |

## Modelo de negócio (ideia do Yax, 28/09/2026)
- SaaS: **0,50 USD por uso de uma ferramenta** ou **2,99 USD para todas** (confirmar se é por mês).
- Atenção: Stripe não aceita empresas de Cabo Verde; Lemon Squeezy/Paddle cobram ~5% + 0,50 USD por transação → pagamentos de 0,50 USD não são viáveis; usar pacotes de créditos ou subscrição.
- Falta para lançar pago: contas de utilizador, pagamentos, bloqueio no servidor (hoje tudo corre no browser e pode ser copiado), chaves de API no servidor (proxy) em vez de cada utilizador trazer a sua, termos/privacidade, decisão AGPL.

## Pendentes
1. Deploy na Vercel.
2. Decidir licença da remoção de fundo (AGPL) se for produto pago.
3. Opcional: DeepL no Text Master (tradução), QR dinâmico com analytics (Vercel + Supabase).
