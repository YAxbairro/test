#!/usr/bin/env python3
"""Procura o e-mail de contacto oficial de cada clube no seu próprio site.

Para cada linha de clubes.csv sem e-mail:
  1. experimenta o(s) site(s) indicados na coluna "site" (pode ter vários separados por "|")
  2. lê a página inicial e as páginas de contacto/clube/scouting
  3. extrai e-mails (mailto: e texto), dá preferência aos do próprio domínio
     e a palavras como scouting / recrutamento / futebol / geral / info
  4. grava o melhor e-mail na coluna "email" (os restantes vão para emails_encontrados.csv)

Uso:  python3 encontrar_emails.py            (só preenche os que faltam)
      python3 encontrar_emails.py --todos    (volta a procurar todos)
"""
import csv
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

CSV_PATH = "clubes.csv"
EXTRA_PATH = "emails_encontrados.csv"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                         "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
LINK_HINTS = ("contact", "contato", "kontakt", "contacto", "clube", "club", "scouting",
              "recrut", "about", "sobre", "impressum", "info", "secretar", "verein")
GOOD_WORDS = ("scout", "recrut", "recruit", "futebol", "football", "sport", "desport",
              "secretar", "geral", "info", "contact", "contato", "club", "clube", "sad")
BAD_WORDS = ("noreply", "no-reply", "privacy", "privacidade", "rgpd", "gdpr", "dpo", "loja",
             "shop", "store", "ticket", "bilhet", "socios", "member", "press", "imprensa",
             "media", "marketing", "comercial", "sponsor", "patroc", "webmaster", "example",
             "sentry", "wix", "jobs", "rh@", "hr@", "museu", "museum", "academia", "escola",
             "feminin", "formacao", "formação", "youth", "jeunes", "cantera", "modalidades")


def fetch(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=12, allow_redirects=True)
        if r.status_code == 200 and "text/html" in r.headers.get("content-type", ""):
            return r
    except requests.RequestException:
        pass
    return None


def emails_in(html):
    soup = BeautifulSoup(html, "html.parser")
    found = set()
    for a in soup.select('a[href^="mailto:"]'):
        found.add(a["href"][7:].split("?")[0].strip())
    found.update(EMAIL_RE.findall(soup.get_text(" ")))
    # e-mails protegidos tipo "geral [at] clube.pt"
    for m in re.finditer(r"([A-Za-z0-9._-]+)\s*[\[\(]\s*(?:at|arroba)\s*[\]\)]\s*([A-Za-z0-9.-]+\.[a-z]{2,})",
                         soup.get_text(" "), re.I):
        found.add(f"{m.group(1)}@{m.group(2)}")
    clean = set()
    for e in found:
        e = e.strip(".,;:").lower()
        if not EMAIL_RE.fullmatch(e) or re.search(r"\.(png|jpe?g|gif|svg|webp)$", e):
            continue
        if any(d in e.split("@")[1] for d in ("test.com", "example", "sentry", "wixpress", "domain.com")):
            continue
        clean.add(e)
    return clean, soup


def score(email, domain):
    s = 0
    base = domain.replace("www.", "").split(".")[0]
    if base and base in email.split("@")[1]:
        s += 10
    s += sum(3 for w in GOOD_WORDS if w in email)
    s -= sum(6 for w in BAD_WORDS if w in email)
    if "scout" in email or "recrut" in email:
        s += 8
    return s


def search_site(site):
    home = fetch(site)
    if not home:
        return None, []
    final = home.url
    domain = urlparse(final).netloc
    emails, soup = emails_in(home.text)
    links = []
    for a in soup.find_all("a", href=True):
        href = urljoin(final, a["href"])
        text = (a.get_text() + " " + href).lower()
        if urlparse(href).netloc.endswith(domain.replace("www.", "")) and any(h in text for h in LINK_HINTS):
            links.append(href.split("#")[0])
    for href in list(dict.fromkeys(links))[:6]:
        r = fetch(href)
        if r:
            emails |= emails_in(r.text)[0]
        time.sleep(0.5)
    ranked = sorted(emails, key=lambda e: score(e, domain), reverse=True)
    return final, ranked


def main():
    redo = "--todos" in sys.argv
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
        fields = list(rows[0].keys())
    extra = []

    def process(row):
        if row["email"] and not redo:
            return
        candidates = [s.strip() for s in row["site"].split("|") if s.strip()]
        if not candidates:
            print(f"-- {row['clube']}: sem site (preencher à mão)", flush=True)
            return
        for site in candidates:
            if not site.startswith("http"):
                site = "https://www." + site
            final, ranked = search_site(site)
            if final:
                row["site"] = final.rstrip("/")
                if ranked and score(ranked[0], urlparse(final).netloc) > -5:
                    row["email"] = ranked[0]
                extra.append({"clube": row["clube"], "site": row["site"], "emails": " ".join(ranked)})
                print(f"OK {row['clube']}: {row['email'] or '(sem e-mail no site)'}  [{len(ranked)} encontrados]",
                      flush=True)
                return
        print(f"XX {row['clube']}: site não respondeu ({row['site']})", flush=True)

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(process, rows))
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    with open(EXTRA_PATH, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["clube", "site", "emails"])
        w.writeheader()
        w.writerows(extra)
    total = sum(1 for r in rows if r["email"])
    print(f"\n{total}/{len(rows)} clubes com e-mail.")


if __name__ == "__main__":
    main()
