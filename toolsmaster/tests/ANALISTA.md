# Manual do Robô Analista (nº 11)

Corres de 12 em 12 horas numa sessão nova. Lê também `toolsmaster/CLAUDE.md` e o `CLAUDE.md` da raiz (regras do Yax: respostas curtas, nunca inventar, testar a sério, **só soluções grátis**).

## Protocolo de cada ronda
1. **Verificar se deves correr.** Se hoje for depois de **2026-10-12**, ou se `tests/reports/ESTADO.md` disser `CONCLUÍDO`, não faças nada além de apagar a tua rotina (ver "Parar") e enviar a notificação final.
2. **Correr os 10 robôs:** `cd toolsmaster && node tests/run.mjs` → lê `tests/reports/latest.md`.
3. **Se houver falhas:** para cada uma, encontra a causa real (não mudes o robô para passar, a menos que o erro seja do próprio robô — e explica porquê no relatório). Corrige no código da ferramenta. Volta a correr o robô dessa ferramenta até passar.
4. **Se tudo passar:** pega no **primeiro item aberto do Backlog** abaixo. Pesquisa na internet (e em https://github.com/public-apis/public-apis) uma solução **grátis**, que funcione no browser (CORS) ou localmente (WASM/JS). Implementa, **acrescenta verificações ao robô dessa ferramenta**, corre tudo outra vez.
   - Se só existir solução paga ou que precise de conta/chave nova do Yax: não implementes a parte paga; marca o item como `BLOQUEADO: <porquê e o que o Yax tem de fazer>` e passa ao seguinte.
5. **Nunca** escrevas chaves de API no código nem em commits. Nunca apagues funcionalidades. Nunca uses `catch(e){}` vazio nem mensagens falsas de sucesso.
6. **Entregar:** cria um branch `robos/ronda-AAAA-MM-DD-HH`, faz commit (código + `tests/reports/latest.md` + este ficheiro atualizado) e **abre um Pull Request** para `claude/bom-dia-x4e1v0` com o relatório no corpo. Não faças merge — o Yax aprova.
7. **Notificar o Yax** (notificação push) em 2–3 linhas em português: quantas verificações passaram, o que foi corrigido/acrescentado, o link do PR, e o que precisa dele (se algo ficou BLOQUEADO).
8. **Critério de fim:** todos os robôs passam **e** todos os itens do Backlog estão `FEITO` ou `BLOQUEADO`. Nesse caso escreve `CONCLUÍDO` em `tests/reports/ESTADO.md`, notifica o Yax e apaga a rotina.

## Economia de créditos (pedido do Yax)
Não consegues ver o saldo de créditos do Yax — por isso poupa por defeito:
- **Ronda da noite (02:40 em Cabo Verde) = modo completo:** corre os robôs, corrige falhas e avança no Backlog.
- **Ronda do dia (14:40 em Cabo Verde) = modo leve:** só corre os robôs e envia o relatório. **Só corrige se algo que funcionava deixou de funcionar** (regressão). Não avança no Backlog.
- **Escolhe o modelo conforme a tarefa** (tu corres num modelo intermédio):
  - Tarefas mecânicas (correr robôs, resumir relatórios, pesquisar APIs, editar textos): subagente com modelo **`haiku`**.
  - Correções e funcionalidades normais: faz tu próprio.
  - Só problemas difíceis (falhou 2 vezes, arquitetura, bug que não percebes): subagente com modelo **`opus`**.
- **Limite por ronda:** no máximo 2 itens do Backlog por noite. Pára assim que tiveres algo testado para entregar.
- **Se receberes erro de limite de uso/créditos:** pára imediatamente, guarda o que tiveres (branch + notificação "parei por falta de créditos — continuo na próxima ronda") e não tentes de novo nesta ronda.

## Parar
Apaga a rotina com a ferramenta `delete_trigger` (id em `tests/reports/ESTADO.md`).

## Backlog (por ordem de prioridade)
- [ ] Assinatura escrita (Sign Master → "Escrever") e desenhada: PNG com fundo **transparente** (hoje sai branco).
- [ ] PowerPoint (.pptx) → PDF sem chave: procurar solução local/grátis.
- [ ] Remover fundo: alternativa com licença permissiva (MIT/Apache) ao @imgly (AGPL), para uso comercial.
- [ ] QR artístico com IA: procurar API/modelo grátis que funcione no browser e gere QR legível (o robô deve ler com jsQR).
- [ ] Voz em crioulo cabo-verdiano: procurar modelo TTS grátis; se não existir, BLOQUEADO.
- [ ] Clonagem de voz grátis (sem ElevenLabs pago): procurar modelo local/WASM; se não houver, BLOQUEADO.
- [ ] Tradução no Text Master: acrescentar DeepL Free como opção (chave do Yax) mantendo a IA Groq por omissão.
- [ ] Robô novo: testar o Text/CV com a Groq real quando existir chave nos segredos do ambiente (`GROQ_API_KEY`); sem chave, BLOQUEADO.
- [ ] Acessibilidade e telemóvel: cada ferramenta usável a 375 px de largura sem scroll horizontal (acrescentar verificação aos robôs).
