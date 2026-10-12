"""Gera assets.js com os sprites embutidos (data URIs) para a página funcionar offline e sem CORS."""
import base64, json, glob, os
out = {}
for p in sorted(glob.glob('assets/*.png')):
    out[os.path.basename(p)[:-4]] = 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
meta = json.load(open('assets/sprites.json'))
open('assets.js', 'w').write('window.SPRITES=' + json.dumps(out) + ';\nwindow.SPRITE_META=' + json.dumps(meta) + ';\n')
print(len(out), os.path.getsize('assets.js'))
