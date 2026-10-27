# Notas para o Claude (preferências do Yanick)

## ⚠️ REGRA Nº 1 — dizer SEMPRE o EMAIL da conta (o Yanick já pediu várias vezes)
O Yanick tem vários emails. Em TODAS as respostas onde aparece um serviço externo
(GitHub, Supabase, Vercel, Claude, Drive, etc.), escrever ao lado o **EMAIL** da conta,
não só o nome de utilizador. Formato: `Serviço (email@...)`. Também nos passo-a-passo
("entra no GitHub com yanick...@..."). Se o email não for conhecido, dizer que não se
sabe e pedir. Nunca omitir. Rever a resposta antes de enviar para confirmar isto.

| Serviço | Conta ligada nesta sessão |
|---|---|
| Claude (claude.ai, artifacts) | yanickdrs@gmail.com |
| Google Drive | yanickdrs@gmail.com |
| GitHub | utilizador **YAxbairro** — EMAIL AINDA DESCONHECIDO (a API não mostra; perguntar ao Yanick e escrever aqui) |
| Supabase | organização "yaxtechcv@gmail.com's Org" → **yaxtechcv@gmail.com** (plano grátis) |
| Vercel | equipa "afroberd-gmailcom's projects" → **afroberd@gmail.com** (sem permissão para criar projetos) |
| Canva, ElevenLabs, Higgsfield, Gemini | email não visível; ElevenLabs/Higgsfield/Gemini sem créditos |

## Projeto Menu Real
- Código: `menu-real/` neste repositório, branch `claude/cabo-verde-delivery-app-1gfxg1`.
- Base de dados: Supabase projeto **lutuima-veiga** (yaxtechcv@gmail.com), tabelas `mr_*` e bucket `menureal`.
- Tabelas: `mr_orders`, `mr_requests` (conta/garçom/água/gelo/talheres/guardanapos), `mr_items`, `mr_settings` (programa do dia, entregas),
  `mr_payments`, `mr_feedback`, `mr_delivery` (estas 3 só se leem com PIN via `mr_staff_data`). Fechar conta: `mr_pay` (fecha a mesa).
- `mr_tables`: mesa aberta/fechada (`mr_set_table`). O servidor só aceita pedidos de mesas abertas e sem pausa. PIN muda-se com `mr_change_pin`.
- **Vários restaurantes**: cada um tem `rid` (Quintal = `quintal`, sem `?r=`; Churrasqueira BCL = `?r=bcl`). Todas as tabelas `mr_*` têm `rid`;
  definições em `mr_settings` (id = rid), PIN em `mr_secrets` (id = rid; nunca escrever PINs neste ficheiro, o repositório é público). Todas as funções levam `p_rid`.
  Restaurantes novos: menu em `mr_menu` (rid, cat, pos, data.img/créditos) + categorias em `mr_settings.data.cats`; opções `oneStation`, `pickupOn`, `minPP`.
- Links: mesa `#mesa-NN`, entrega `#entrega`, levantar no balcão `#balcao`, equipa `#equipa`, garçom `#garcom`. Para outro restaurante: `?r=<rid>#...`.
- As funções antigas (sem p_rid) ficaram sem permissão (revoke); apagá-las quando o Yanick aprovar o pedido de confirmação do Supabase.
- Pedidos só entram por `mr_checkout` (o servidor calcula preços a partir de `mr_menu` + `mr_items`, recusa esgotados, mesa fechada e pausa).
  Pedidos ao garçom por `mr_request`. Estados por `mr_advance` (com estado esperado). Pagar por pessoa: `mr_pay_guest`. Confirmar telemóvel: `mr_ack`.
  Fotos: Edge Function `mr-upload` (precisa do PIN). Inserção anónima direta nas tabelas e no bucket está fechada.
- IA: Edge Function `mr-ai` (Gemini, segredo `GEMINI_API_KEY` no Supabase): `nutri` (valor nutricional, precisa PIN) e `ask` (assistente).
  Sem IA o site usa a tabela local (`nutriLocal`) e o `localAsk`. Fotos melhoradas no próprio telemóvel (`photoFlow`, sem custos).
- Testes: scratchpad `web/*.js` (e2e, v2, v3, wt, real, aud, bcl) + `clean.sh` para limpar dados de teste (os dois restaurantes).
- Não tocar em tabelas que não sejam `mr_*`. DELETE e SQL com vários comandos bloqueiam o MCP: usar 1 comando por chamada.
- Fala em português de Cabo Verde/Portugal, respostas curtas e sinceras.
