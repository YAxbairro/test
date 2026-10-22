#!/usr/bin/env python3
"""Envia a candidatura do Djeison a cada clube de clubes.csv, um e-mail personalizado de cada vez.

Antes de usar:
  1. Preenche config.json (o teu nome, telefone, e-mail, link do vídeo, altura, pé...).
  2. Gera o PDF:  python3 gerar_perfil.py
  3. Cria uma "palavra-passe de app" no Gmail (myaccount.google.com/apppasswords)
     e guarda-a numa variável de ambiente:
         Windows (PowerShell):  $env:GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
         Mac/Linux:             export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"

Uso:
  python3 enviar_emails.py --previsualizar          mostra os e-mails no ecrã, não envia nada
  python3 enviar_emails.py --teste                  envia UM exemplo para o teu próprio e-mail
  python3 enviar_emails.py                          envia o próximo lote (limite_por_execucao)
  python3 enviar_emails.py --prioridade A           só clubes de prioridade A
  python3 enviar_emails.py --pais Portugal --limite 10

Os envios ficam registados em enviados.csv; um clube nunca recebe o e-mail duas vezes.
"""
import argparse
import csv
import json
import os
import random
import smtplib
import sys
import time
from datetime import date, datetime
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

AQUI = os.path.dirname(os.path.abspath(__file__))
REGISTO = os.path.join(AQUI, "enviados.csv")


def carregar():
    with open(os.path.join(AQUI, "config.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    with open(os.path.join(AQUI, "clubes.csv"), newline="", encoding="utf-8") as f:
        clubes = list(csv.DictReader(f))
    enviados = set()
    if os.path.exists(REGISTO):
        with open(REGISTO, newline="", encoding="utf-8") as f:
            enviados = {r["email"].lower() for r in csv.DictReader(f) if r["estado"] == "enviado"}
    return cfg, clubes, enviados


def verificar_config(cfg):
    falta = [f"{grupo}.{k}" for grupo in ("jogador", "contacto")
             for k, v in cfg[grupo].items() if isinstance(v, str) and v.startswith("[")]
    if falta:
        print("ATENÇÃO – ainda falta preencher no config.json:\n  " + "\n  ".join(falta))
    return not any(k in ("contacto.nome", "contacto.email", "contacto.telefone", "jogador.video_highlights")
                   for k in falta)


def idade(data_nascimento):
    nasc = datetime.strptime(data_nascimento, "%d/%m/%Y").date()
    hoje = date.today()
    return hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))


def montar(cfg, clube):
    with open(os.path.join(AQUI, "modelos", f"email_{clube['idioma']}.txt"), encoding="utf-8") as f:
        assunto, corpo = f.read().split("\n", 1)
    dados = {**clube, **cfg["jogador"], **cfg["contacto"], "idade": idade(cfg["jogador"]["data_nascimento"])}
    if cfg["jogador"].get("video_highlights_2"):
        dados["video_highlights"] += "\n  " + cfg["jogador"]["video_highlights_2"]
    assunto = assunto.split(":", 1)[1].strip().format_map(dados)
    return assunto, corpo.strip().format_map(dados)


def criar_mensagem(cfg, destino, assunto, corpo):
    msg = EmailMessage()
    msg["From"] = formataddr((cfg["contacto"]["nome"], cfg["contacto"]["email"]))
    msg["To"] = destino
    msg["Subject"] = assunto
    msg["Reply-To"] = cfg["contacto"]["email"]
    msg["Message-ID"] = make_msgid()
    msg.set_content(corpo)
    pdf = os.path.join(AQUI, cfg["envio"]["anexo_pdf"])
    if os.path.exists(pdf):
        with open(pdf, "rb") as f:
            msg.add_attachment(f.read(), maintype="application", subtype="pdf",
                               filename=os.path.basename(pdf))
    else:
        print(f"(aviso: {pdf} não existe – corre primeiro gerar_perfil.py)")
    return msg


def registar(clube, estado, detalhe=""):
    novo = not os.path.exists(REGISTO)
    with open(REGISTO, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if novo:
            w.writerow(["data", "clube", "pais", "email", "estado", "detalhe", "resposta"])
        w.writerow([datetime.now().strftime("%Y-%m-%d %H:%M"), clube["clube"], clube["pais"],
                    clube["email"], estado, detalhe, ""])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--previsualizar", action="store_true")
    ap.add_argument("--teste", action="store_true")
    ap.add_argument("--prioridade")
    ap.add_argument("--pais")
    ap.add_argument("--limite", type=int)
    a = ap.parse_args()

    cfg, clubes, enviados = carregar()
    pronto = verificar_config(cfg)
    fila = [c for c in clubes if c["email"] and c["email"].lower() not in enviados
            and (not a.prioridade or c["prioridade"] == a.prioridade)
            and (not a.pais or c["pais"].lower().startswith(a.pais.lower()))]
    fila.sort(key=lambda c: c["prioridade"])
    limite = a.limite or cfg["envio"]["limite_por_execucao"]
    print(f"{len(fila)} clubes por contactar; este lote: {min(limite, len(fila))}\n")

    if a.previsualizar:
        for c in fila[:limite]:
            assunto, corpo = montar(cfg, c)
            print(f"===== PARA: {c['email']} ({c['clube']})\nASSUNTO: {assunto}\n\n{corpo}\n")
        return

    if not pronto:
        sys.exit("Preenche primeiro o teu nome, e-mail, telefone e o link do vídeo no config.json.")
    senha = os.environ.get("GMAIL_APP_PASSWORD")
    if not senha:
        sys.exit("Falta a variável GMAIL_APP_PASSWORD (ver instruções no topo deste ficheiro).")

    smtp = smtplib.SMTP(cfg["envio"]["smtp_servidor"], cfg["envio"]["smtp_porta"])
    smtp.starttls()
    smtp.login(cfg["contacto"]["email"], senha)

    if a.teste:
        c = fila[0] if fila else clubes[0]
        assunto, corpo = montar(cfg, c)
        smtp.send_message(criar_mensagem(cfg, cfg["contacto"]["email"], "[TESTE] " + assunto, corpo))
        smtp.quit()
        print(f"E-mail de teste (modelo de {c['clube']}) enviado para {cfg['contacto']['email']}.")
        return

    for i, c in enumerate(fila[:limite], 1):
        assunto, corpo = montar(cfg, c)
        try:
            smtp.send_message(criar_mensagem(cfg, c["email"], assunto, corpo))
            registar(c, "enviado")
            print(f"[{i}/{limite}] enviado: {c['clube']} <{c['email']}>")
        except smtplib.SMTPException as e:
            registar(c, "erro", str(e)[:200])
            print(f"[{i}/{limite}] ERRO: {c['clube']}: {e}")
        if i < min(limite, len(fila)):
            time.sleep(random.randint(cfg["envio"]["intervalo_min_segundos"],
                                      cfg["envio"]["intervalo_max_segundos"]))
    smtp.quit()
    print("\nLote terminado. Corre outra vez amanhã para o próximo lote.")


if __name__ == "__main__":
    main()
