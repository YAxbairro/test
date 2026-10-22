# Candidatura espontânea – Djeison Ferreira

Kit completo para apresentar o Djeison a mais de 100 clubes por e-mail.

## O que a pesquisa encontrou

| | |
|---|---|
| Nome | **Djeison Alberto dos Reis Ferreira** (nome desportivo: Djeison / Djeison Ferreira) |
| Nascimento | 27/10/2005 (faz 21 anos a 27/10/2026), Cabo Verde |
| Posição | Defesa central, também joga a médio defensivo |
| Clube atual | **AD Nogueirense** (Oliveira do Hospital, Coimbra), n.º 19, desde 31/07/2025 |
| 2025/26 | **Campeão da Divisão de Elite da AF Coimbra**, com subida ao **Campeonato de Portugal** (4.º escalão), confirmada a 03/05/2026 depois de 1-0 ao Tourizense |
| 2026/27 | Titular no Campeonato de Portugal (Série 3); golo na Taça de Portugal contra a Naval 1893 (30/08/2026) |
| Antes | GD Renascente (São Teotónio, AF Beja) em 2024/25; AD Bairro (Praia, Santiago Sul, Cabo Verde) |
| Prémio | Melhor Jogador Jovem do Campeonato Regional de Santiago Sul (informação da família, **não está publicada online**; confirmar a época) |

Fontes: [zerozero](https://www.zerozero.pt/jogador/djeison/2507934),
[Sofascore](https://www.sofascore.com/pt/football/player/djeison-ferreira/2052937),
[subida do Nogueirense (SAPO)](https://sapo.pt/artigo/ad-nogueirense-e-campea-da-divisao-de-elite-da-af-coimbra-e-sobe-ao-campeonato-de-portugal-69f7996216a0a30aceb347f6),
[zerozero: Nogueirense campeão](https://www.zerozero.pt/noticias/nogueirense-sagra-se-campeao-apos-vitoria-frente-ao-tourizense/1116631),
publicação da página Kriolfut no Instagram sobre o golo na Taça.

> Nota: o clube é o **Nogueirense** (AD Nogueirense), não "Riguense".

## Ficheiros

| Ficheiro | Para que serve |
|---|---|
| `config.json` | **Preencher primeiro**: o teu nome, telefone, e-mail, link do vídeo, altura, pé, contrato e documentos |
| `perfil_djeison_ferreira.pdf` | Perfil de 1 página (PT/EN) que vai em anexo em cada e-mail |
| `gerar_perfil.py` | Volta a gerar o PDF depois de mudares o `config.json` ou de juntares `foto.jpg` |
| `modelos/email_pt.txt` `email_en.txt` `email_fr.txt` `email_es.txt` | Texto dos e-mails em 4 línguas. Cada clube recebe a língua do seu país, com o nome do clube no texto |
| `clubes.csv` | 114 clubes (Portugal, Luxemburgo, Suíça, Países Baixos, Bélgica, Espanha, França) com o site e o e-mail oficial |
| `enviar_emails.py` | A automação: envia um e-mail personalizado a cada clube, por lotes, e regista tudo em `enviados.csv` |
| `encontrar_emails.py` | Procura e-mails nos sites dos clubes (útil quando acrescentares clubes à lista) |

## Passo a passo

1. **Instalar o Python 3** (python.org) e, na pasta, correr `pip install requests beautifulsoup4`.
2. **Preencher o `config.json`**: tudo o que diz `[PREENCHER]`, `[O TEU ...]` e o link do vídeo.
   Para o vídeo, usa o YouTube como "Não listado" ou o Google Drive com "Qualquer pessoa com o link".
3. (Opcional) Pôr uma foto do Djeison com o nome `foto.jpg` nesta pasta.
4. `python3 gerar_perfil.py` para criar o PDF. Abre o PDF e confirma que está tudo certo.
5. **Gmail**: ativa a verificação em 2 passos e cria uma palavra-passe de app em
   https://myaccount.google.com/apppasswords. Depois, na mesma janela do terminal:
   - Windows: `$env:GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"`
   - Mac/Linux: `export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"`
6. `python3 enviar_emails.py --previsualizar` para leres os e-mails tal como vão sair.
7. `python3 enviar_emails.py --teste` para receberes um exemplo no teu próprio e-mail.
8. `python3 enviar_emails.py` envia o próximo lote de 20 clubes, com 1,5 a 4 minutos entre cada e-mail.
   Corre uma vez por dia. Começa pela prioridade A: `python3 enviar_emails.py --prioridade A`.

## Ordem recomendada (realismo)

- **Prioridade A** (o alvo principal): Liga Portugal 2, Liga 3, a 1.ª divisão do Luxemburgo (muitos jogadores
  cabo-verdianos e portugueses), a Challenge League suíça, a Eerste Divisie holandesa e a Challenger Pro League belga.
  Para um defesa de 20 anos que acabou de subir ao 4.º escalão, o passo seguinte natural é o 2.º ou o 3.º escalão.
- **Prioridade B**: clubes da 1.ª Liga portuguesa, para as **equipas B e sub-23** (o texto já pede isso).
- **Prioridade C**: Espanha e França. Atenção: em Espanha há limite de jogadores extracomunitários. Se o Djeison
  tiver nacionalidade portuguesa ou autorização de residência, diz isso no `config.json`, porque ajuda muito.

Clubes grandes (Porto, Sporting, Braga, Benfica) não publicam e-mail de scouting. Para esses, a melhor via é um
empresário com licença FIFA, ou o treinador ou o diretor desportivo do Nogueirense recomendarem o jogador.

## Dicas importantes

- **O vídeo é o mais importante**: 3 a 5 minutos, com as melhores ações primeiro. Assinala-o (seta ou círculo)
  no início de cada jogada, porque o scout não sabe qual é o n.º 19. Junta também 1 ou 2 jogos completos.
- **Mantém o zerozero atualizado**: os scouts vão lá ver. Pede ao clube para confirmar jogos e minutos.
- **Respostas**: escreve-as na coluna `resposta` do `enviados.csv`. Se um clube responder, envia logo jogos completos.
- **Não envies tudo no mesmo dia.** 20 por dia evita que o Gmail marque os e-mails como spam.
- **Contrato**: se o Djeison tem contrato com o Nogueirense, qualquer clube interessado tem de falar com o
  Nogueirense. O melhor momento para propostas é antes das janelas de transferências (janeiro e julho).
- **Representação**: a FIFA deixa um familiar ajudar um jogador sem licença de agente
  (FIFA Football Agent Regulations, exceção para familiares). Confirma antes de assinar qualquer contrato.
- Para acrescentar clubes, adiciona linhas ao `clubes.csv` e corre `python3 encontrar_emails.py`.
