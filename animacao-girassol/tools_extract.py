"""Recorta os elementos da folha de referência em sprites PNG com transparência."""
from PIL import Image
import numpy as np
from scipy import ndimage as nd

SRC = 'ref-elementos.jpg'
im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
v = im.max(2)
m = nd.binary_closing(v > 40, iterations=2)
lab, n = nd.label(m)

def sprite(ids, name, extra_mask=None, pad=6):
    sel = np.isin(lab, ids)
    grow = nd.binary_dilation(sel, iterations=5) & ~(np.isin(lab, [i for i in range(1, n + 1) if i not in ids]) & (lab > 0))
    if extra_mask is not None:
        grow &= extra_mask
    ys, xs = np.where(grow)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, im.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, im.shape[1])
    a = np.clip((v - 10) / 45, 0, 1) * grow
    a = nd.gaussian_filter(a, 0.6) * grow
    rgb = np.clip(im / np.maximum(a, 1e-3)[..., None], 0, 255)
    rgb = np.where(a[..., None] > 0.02, rgb, 0)
    out = np.dstack([rgb, a * 255])[y0:y1, x0:x1].astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(f'assets/{name}.png')
    return x0, y0, x1 - x0, y1 - y0

info = {}
# girassol: separar o miolo (disco) da coroa de pétalas
s = (slice(5, 359), slice(46, 420))
reg = im[s]
disk = (reg[..., 0] < 175) & (reg[..., 1] < 110) & (reg.max(2) > 25)
disk = nd.binary_opening(disk, iterations=2)
lab2, _ = nd.label(disk)
big = np.argmax(np.bincount(lab2.ravel())[1:]) + 1
cy, cx = nd.center_of_mass(lab2 == big)
R = np.sqrt((lab2 == big).sum() / np.pi)
cy += 5; cx += 46
Y, X = np.mgrid[:im.shape[0], :im.shape[1]]
d = np.hypot(X - cx, Y - cy)
print('disco', cx, cy, R)
info['flower'] = sprite([1], 'flower')
info['disk'] = sprite([1], 'disk', extra_mask=d < R + 3)
info['ring'] = sprite([1], 'ring', extra_mask=d > R - 4)
info['disk_center'] = (cx, cy, R)
for k, i in enumerate(range(2, 16)):
    info[f'petal{k}'] = sprite([i], f'petal{k}')
info['fan'] = sprite([16, 21], 'fan')
info['arm'] = sprite([17], 'arm')
info['leaves'] = sprite([18], 'leaves')
info['ball'] = sprite([19], 'ball')
info['body'] = sprite([20], 'body')
info['arc'] = sprite([23], 'arc')
import json
json.dump({k: [float(x) for x in v] for k, v in info.items()}, open('assets/sprites.json', 'w'), indent=1)
print(json.dumps({k: [round(float(x)) for x in v] for k, v in info.items()}))
