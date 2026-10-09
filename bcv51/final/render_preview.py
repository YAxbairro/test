"""Renderiza uma preview 1280x720 da timeline (a partir dos proxies), igual ao XML:
cor rapida, push-ins, dissolves, dip to white, logo, cartao final e musica."""
import json, os, subprocess, sys, glob
import numpy as np
from PIL import Image

SRC, SHOTS, MUSIC, LOGO, OUTMP4 = sys.argv[1:6]
FPS = 24000 / 1001; W, H = 1280, 720
END = round(90.0 * FPS)
shots = json.load(open(SHOTS))
GRADE = "eq=contrast=1.28:saturation=1.55:gamma=0.9:gamma_b=1.03,colorbalance=rm=0.03:gm=0.0:bm=-0.03"

def load(s, pad=6):
    p = glob.glob(os.path.join(SRC, s["clip"] + "_*"))[0]
    n = s["out"] - s["inp"] + 2 * pad
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{(s['inp'] - pad) / FPS:.4f}", "-i", p, "-frames:v", str(n),
        "-vf", f"scale={W}:{H}:flags=lanczos,{GRADE}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    if len(fr) < n:  # completa com o ultimo frame se faltar
        fr = np.concatenate([fr, np.repeat(fr[-1:], n - len(fr), 0)])
    return fr

def zoom(img, z):
    if z <= 1.0001: return img
    cw, ch = int(W / z), int(H / z); x, y = (W - cw) // 2, (H - ch) // 2
    return np.asarray(Image.fromarray(img[y:y + ch, x:x + cw]).resize((W, H), Image.BILINEAR))

def frame_of(i, t, cache):
    s = shots[i]
    if i not in cache:
        for k in list(cache):
            if k < i - 1: del cache[k]
        cache[i] = load(s)
    idx = 6 + (t - s["start"])
    idx = min(max(idx, 0), len(cache[i]) - 1)
    img = cache[i][idx]
    if s["fx"] == "push":
        img = zoom(img, 1 + 0.08 * (t - s["start"]) / max(1, s["end"] - s["start"]))
    return img.astype(np.float32)

# transicoes (iguais ao XML)
trans = {}
for i in range(len(shots) - 1):
    if shots[i]["sec"] == "intro":
        trans[i] = ("dissolve", 12) if shots[i + 1]["sec"] == "intro" else ("white", 8)
trans[len(shots) - 1] = ("white", 12)

card = np.asarray(Image.open(os.path.join(LOGO, "BCV51_endcard_4K.png")).convert("RGB").resize((W, H), Image.LANCZOS)).astype(np.float32)
logo = Image.open(os.path.join(LOGO, "BCV51_logo51_alpha_4K.png")).convert("RGBA").resize((W, H), Image.LANCZOS)
end_main = shots[-1]["end"]
la = round((0.011 + 1 * 60 / 110) * FPS); lb = round((0.011 + 7 * 60 / 110) * FPS)

enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "24000/1001", "-i", "-",
    "-i", MUSIC, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", OUTMP4], stdin=subprocess.PIPE)
cache, i = {}, 0
yy, xx = np.mgrid[0:H, 0:W]
vign = (1 - 0.28 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)).clip(0.6, 1)[..., None].astype(np.float32)
white = np.full((H, W, 3), 255, np.float32)

def card_frame(t):
    k = t - end_main; L = END - end_main
    img = zoom(card.astype(np.uint8), 1 + 0.05 * k / L).astype(np.float32)
    if k > L - 30: img *= (L - k) / 30
    return img

for t in range(END):
    while i < len(shots) - 1 and t >= shots[i]["end"]: i += 1
    if t >= end_main:
        img = card_frame(t)
        # metade final do dip to white para o cartao
        c = end_main; h = 6
        if t < c + h: img = white + (img - white) * ((t - c) / h)
    else:
        img = frame_of(i, t, cache) * vign
        # transicao a entrar (vinda do plano anterior)
        for a, b in ((i - 1, i), (i, i + 1)):
            if a in trans and 0 <= a:
                kind, L = trans[a]; c = shots[a]["end"]; h = L // 2
                if c - h <= t < c + h:
                    if kind == "dissolve":
                        A = frame_of(a, t, cache) * vign; B = frame_of(b, t, cache) * vign if b < len(shots) else img
                        img = A + (B - A) * ((t - (c - h)) / L)
                    else:
                        if t < c:
                            A = frame_of(a, t, cache) * vign; img = A + (white - A) * ((t - (c - h)) / h)
                        elif b < len(shots):
                            B = frame_of(b, t, cache) * vign; img = white + (B - white) * ((t - c) / h)
        if t < 24: img *= t / 24
        if la <= t < lb:
            k = t - la; op = min(1, k / 18, (lb - la - k) / 18)
            z = 0.55 * (1 + 0.06 * k / (lb - la))
            lw, lh = int(W * z), int(H * z)
            lg = np.asarray(logo.resize((lw, lh), Image.BILINEAR)).astype(np.float32)
            x, y = (W - lw) // 2, (H - lh) // 2
            al = lg[..., 3:4] / 255 * op
            img[y:y + lh, x:x + lw] = img[y:y + lh, x:x + lw] * (1 - al) + lg[..., :3] * al
    enc.stdin.write(np.clip(img, 0, 255).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait()
print("ok", OUTMP4)
