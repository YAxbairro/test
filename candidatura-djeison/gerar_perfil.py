#!/usr/bin/env python3
"""Gera o perfil do jogador (perfil_djeison_ferreira.html + .pdf) a partir de config.json.

Se existir uma foto "foto.jpg" (ou foto.png) nesta pasta, ela entra no perfil.
O PDF é criado com o Chrome/Chromium/Edge instalado no computador; se não for encontrado,
abre o .html no browser e faz Ctrl+P > "Guardar como PDF".
"""
import base64
import html
import json
import os
import shutil
import subprocess

AQUI = os.path.dirname(os.path.abspath(__file__))

# Jogos 2026/27 (fonte: Sofascore, consultado a 22/10/2026). Atualizar com novos jogos.
JOGOS = [
    ("16/08/2026", "Campeonato de Portugal", "AD Nogueirense 1-1 Sertanense", "81'", "6.3"),
    ("23/08/2026", "Campeonato de Portugal", "AD Fazendense 3-3 AD Nogueirense", "90'", "6.3"),
    ("30/08/2026", "Taça de Portugal", "AD Nogueirense 1-3 Naval 1893 (a.p.) – GOLO", "120'", "–"),
    ("13/09/2026", "Campeonato de Portugal", "Benfica Castelo Branco 2-3 AD Nogueirense", "90'", "7.2"),
    ("11/10/2026", "Campeonato de Portugal", "AD Nogueirense 0-0 Naval 1893", "90'", "7.5"),
]

PERCURSO = [
    ("até 2024", "AD Bairro (Praia, Cabo Verde)", "Campeonato Regional de Santiago Sul",
     "Melhor Jogador Jovem do campeonato"),
    ("2024/25", "GD Renascente S. Teotónio", "AF Beja – 1.ª Divisão (Portugal)", "Primeira época em Portugal"),
    ("2025/26", "AD Nogueirense", "AF Coimbra – Divisão de Elite",
     "CAMPEÃO – subida ao Campeonato de Portugal"),
    ("2026/27", "AD Nogueirense", "Campeonato de Portugal (4.º escalão)", "Titular, n.º 19"),
]

CSS = """
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1d24; background: #fff; }
.page { width: 210mm; min-height: 297mm; padding: 14mm 14mm 10mm; }
header { display: flex; gap: 8mm; align-items: center; background: #0f2a4a; color: #fff;
         margin: -14mm -14mm 7mm; padding: 11mm 14mm; }
.foto { width: 38mm; height: 38mm; border-radius: 50%; object-fit: cover; border: 3px solid #e2b43c;
        background: #23456e; flex: none; display: flex; align-items: center; justify-content: center;
        font-size: 11px; color: #9fb4cf; text-align: center; }
h1 { margin: 0; font-size: 30px; letter-spacing: .5px; }
.sub { margin-top: 2mm; font-size: 15px; color: #e2b43c; font-weight: 600; }
.sub2 { margin-top: 1.5mm; font-size: 12.5px; color: #c9d6e6; }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1.2px; color: #0f2a4a;
     border-bottom: 2px solid #e2b43c; padding-bottom: 1.5mm; margin: 6mm 0 3mm; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5mm; }
.cell { background: #f2f5f9; border-radius: 6px; padding: 2.5mm 3mm; }
.cell b { display: block; font-size: 9.5px; text-transform: uppercase; color: #5b6b80; letter-spacing: .6px; }
.cell span { font-size: 12.5px; font-weight: 600; }
.badges { display: flex; gap: 3mm; }
.badge { flex: 1; border: 1.5px solid #e2b43c; border-radius: 8px; padding: 3mm; text-align: center; }
.badge .big { font-size: 15px; font-weight: 800; color: #0f2a4a; }
.badge .small { font-size: 10.5px; color: #5b6b80; margin-top: 1mm; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
th { text-align: left; background: #0f2a4a; color: #fff; padding: 1.8mm 2mm; font-weight: 600; }
td { padding: 1.8mm 2mm; border-bottom: 1px solid #e3e8ef; }
tr.hl td { background: #fff6dc; font-weight: 600; }
.links a { color: #0f4c8a; text-decoration: none; font-weight: 600; }
.links div { font-size: 11.5px; margin: 1.2mm 0; }
.cols { display: grid; grid-template-columns: 1.15fr 1fr; gap: 7mm; }
ul { margin: 0; padding-left: 4.5mm; font-size: 11.5px; line-height: 1.55; }
footer { margin-top: 6mm; padding-top: 3mm; border-top: 1px solid #d5dce6; font-size: 11px; color: #3c4a5c;
         display: flex; justify-content: space-between; }
"""


def foto_html():
    for nome in ("foto.jpg", "foto.jpeg", "foto.png"):
        p = os.path.join(AQUI, nome)
        if os.path.exists(p):
            mime = "png" if nome.endswith("png") else "jpeg"
            data = base64.b64encode(open(p, "rb").read()).decode()
            return f'<img class="foto" src="data:image/{mime};base64,{data}" alt="Djeison Ferreira">'
    return '<div class="foto">foto.jpg</div>'


def gerar():
    cfg = json.load(open(os.path.join(AQUI, "config.json"), encoding="utf-8"))
    j = {k: html.escape(v) for k, v in cfg["jogador"].items()}
    c = {k: html.escape(str(v)) for k, v in cfg["contacto"].items()}
    jogos = "".join(
        f'<tr class="{"hl" if "GOLO" in r[2] else ""}"><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td>'
        f"<td>{r[3]}</td><td>{r[4]}</td></tr>" for r in JOGOS)
    percurso = "".join(
        f'<tr class="{"hl" if "CAMPEÃO" in r[3] or "Melhor" in r[3] else ""}"><td>{r[0]}</td><td>{r[1]}</td>'
        f"<td>{r[2]}</td><td>{r[3]}</td></tr>" for r in PERCURSO)
    video2 = (f'<div>🎬 Vídeo 2: <a href="{j["video_highlights_2"]}">{j["video_highlights_2"]}</a></div>'
              if j["video_highlights_2"] else "")
    doc = f"""<!doctype html><html lang="pt"><head><meta charset="utf-8">
<title>Djeison Ferreira – Perfil de Jogador</title><style>{CSS}</style></head><body><div class="page">
<header>{foto_html()}<div>
  <h1>DJEISON FERREIRA</h1>
  <div class="sub">{j["posicao_pt"]} · {j["posicao_en"]}</div>
  <div class="sub2">{j["nome_completo"]} · {j["clube_atual"]} · N.º {j["numero"]}</div>
</div></header>

<div class="grid">
  <div class="cell"><b>Nascimento / Born</b><span>{j["data_nascimento"]}</span></div>
  <div class="cell"><b>Nacionalidade</b><span>{j["nacionalidade"]}</span></div>
  <div class="cell"><b>Altura / Height</b><span>{j["altura"]}</span></div>
  <div class="cell"><b>Pé / Foot</b><span>{j["pe"]}</span></div>
  <div class="cell" style="grid-column: span 2"><b>Situação contratual / Contract</b><span>{j["situacao_contratual"]}</span></div>
  <div class="cell" style="grid-column: span 2"><b>Documentos / Status</b><span>{j["documentos"]}</span></div>
</div>

<h2>Destaques · Highlights</h2>
<div class="badges">
  <div class="badge"><div class="big">🏆 Campeão 2025/26</div><div class="small">Divisão de Elite AF Coimbra<br>Subida ao Campeonato de Portugal</div></div>
  <div class="badge"><div class="big">⭐ Melhor Jovem</div><div class="small">Campeonato Regional<br>Santiago Sul (Cabo Verde)</div></div>
  <div class="badge"><div class="big">⚽ Golo na Taça</div><div class="small">Taça de Portugal 2026/27<br>vs Associação Naval 1893</div></div>
</div>

<h2>Percurso · Career</h2>
<table><tr><th>Época</th><th>Clube</th><th>Competição</th><th>Nota</th></tr>{percurso}</table>

<h2>Época 2026/27 · Season</h2>
<table><tr><th>Data</th><th>Competição</th><th>Jogo</th><th>Min.</th><th>Nota Sofascore</th></tr>{jogos}</table>

<div class="cols">
<div><h2>Características · Profile</h2><ul>
  <li>Defesa central com capacidade para jogar a médio defensivo</li>
  <li>Titular indiscutível na subida da AD Nogueirense</li>
  <li>Jogos completos de 90 minutos no Campeonato de Portugal</li>
  <li>Disponível para treinos de observação / trial</li>
</ul></div>
<div class="links"><h2>Vídeo e estatísticas</h2>
  <div>🎬 Highlights: <a href="{j["video_highlights"]}">{j["video_highlights"]}</a></div>{video2}
  <div>📊 zerozero: <a href="{j["zerozero"]}">zerozero.pt/jogador/djeison/2507934</a></div>
  <div>📈 Sofascore: <a href="{j["sofascore"]}">sofascore.com · Djeison Ferreira</a></div>
  <div>📷 Instagram: <a href="{j["instagram"]}">@djeison_b.b</a></div>
</div></div>

<footer><div><b>Contacto / Contact:</b> {c["nome"]} ({c["relacao_pt"]})</div>
<div>📞 {c["telefone"]} · ✉️ {c["email"]}</div></footer>
</div></body></html>"""
    out_html = os.path.join(AQUI, "perfil_djeison_ferreira.html")
    open(out_html, "w", encoding="utf-8").write(doc)
    print("HTML criado:", out_html)
    return out_html


def pdf(out_html):
    out_pdf = os.path.join(AQUI, cfg_pdf_name())
    candidatos = [os.environ.get("CHROME"), "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
                  shutil.which("google-chrome"), shutil.which("chromium"), shutil.which("chromium-browser"),
                  shutil.which("msedge"),
                  r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                  r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
    for exe in filter(None, candidatos):
        if os.path.exists(exe):
            subprocess.run([exe, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                            f"--print-to-pdf={out_pdf}", "file://" + out_html.replace("\\", "/")],
                           check=False, capture_output=True)
            if os.path.exists(out_pdf):
                print("PDF criado:", out_pdf)
                return
    print("Não encontrei o Chrome/Edge: abre o HTML no browser e faz Ctrl+P > Guardar como PDF,"
          f" com o nome {os.path.basename(out_pdf)}")


def cfg_pdf_name():
    return json.load(open(os.path.join(AQUI, "config.json"), encoding="utf-8"))["envio"]["anexo_pdf"]


if __name__ == "__main__":
    pdf(gerar())
