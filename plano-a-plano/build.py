# Junta a app num só ficheiro HTML (plano-a-plano.html) para abrir e testar sem servidor.
import base64, pathlib, re
root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + (root / 'css/style.css').read_text() + '\n</style>')
for js in re.findall(r'<script src="(js/[^"]+)"></script>', html):
    html = html.replace(f'<script src="{js}"></script>', '<script>\n' + (root / js).read_text().replace('</script', '<\\/script') + '\n</script>')
icon = 'data:image/svg+xml;base64,' + base64.b64encode((root / 'icon.svg').read_bytes()).decode()
html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '').replace('href="icon.svg"', f'href="{icon}"')
(root / 'plano-a-plano.html').write_text(html)
print('plano-a-plano.html', len(html) // 1024, 'KB')
