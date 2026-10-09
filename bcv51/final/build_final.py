"""BCV 51 anos: gera XMLs 4K para o Premiere (final + melhores momentos) e uma preview.
Uso: python3 build_final.py <pasta_proxies> <pasta_metricas> <musica.wav> <pasta_logo> <saida>"""
import glob, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from shotlist import INTRO, MAIN

SRC, MET, MUSIC, LOGO, OUT = sys.argv[1:6]
FPS = 24000 / 1001
BEAT = 60 / 110
PHASE = 0.011
SEQ_W, SEQ_H = 3840, 2160
RATE = "<rate><timebase>24</timebase><ntsc>TRUE</ntsc></rate>"
END_FRAMES = round(90.0 * FPS)

def beat_frame(k):
    return round((PHASE + k * BEAT) * FPS) if k else 0

def proxy(clip):
    return glob.glob(os.path.join(SRC, clip + "_*"))[0]

def info(clip):
    w, h, n = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
        "-show_entries", "stream=width,height,nb_read_packets", "-of", "csv=p=0", proxy(clip)],
        capture_output=True, text=True).stdout.strip().split(",")[:3]
    # proxies 480x270 = originais Full HD; 960x540 = originais 4K
    return (1920, 1080) if int(w) == 480 else (3840, 2160), int(n)

def metrics(clip):
    return json.load(open(os.path.join(MET, clip + ".json")))

def score(m, s, d):
    a, b = int(s), max(int(s) + 1, int(s + d + 0.999))
    jit = m["jit"][a:b] or [99]; blur = m["blur"][a:b] or [9]
    return sum(jit) / len(jit) + max(0, sum(blur) / len(blur) - 5.2) * 2

def best_window(clip, frames, hint=None, margin=8):
    m = metrics(clip); nfr = m["frames"]; d = frames / FPS
    lo, hi = margin, nfr - frames - margin - round(0.6 * FPS)  # evita o fim (camara a baixar)
    if hi < lo:
        hi = max(lo, nfr - frames - margin)
    if hint is not None:
        return min(max(round(hint * FPS), lo), max(lo, hi))
    starts = range(lo, max(lo, hi) + 1, 3)
    return min(starts, key=lambda st: score(m, st / FPS, d))

# ---------- montagem do video final ----------
def build_timeline():
    shots, k = [], 0
    for sec, items in (("intro", INTRO), ("main", MAIN)):
        for clip, beats, hint, fx in items:
            a, b = beat_frame(k), beat_frame(k + beats)
            dur = b - a
            inp = best_window(clip, dur + 12, hint) + 6  # +-6 frames de folga para dissolves
            (w, h), nfr = info(clip)
            shots.append(dict(clip=clip, start=a, end=b, inp=inp, out=inp + dur, fx=fx, sec=sec,
                              base=round(SEQ_W / w * 100, 2), nfr=nfr, w=w, h=h))
            k += beats
    return shots, beat_frame(k)

def file_el(fid, name, nfr, w, h, seen, audio=False):
    if fid in seen:
        return f'<file id="{fid}"/>'
    seen.add(fid)
    media = (f"<audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics><channelcount>2</channelcount></audio>"
             if audio else f"<video><samplecharacteristics>{RATE}<width>{w}</width><height>{h}</height></samplecharacteristics></video>")
    return f'<file id="{fid}"><name>{name}</name><pathurl>file://localhost/{name}</pathurl>{RATE}<duration>{nfr}</duration><media>{media}</media></file>'

def motion(base, push, inp, out, extra=0):
    p = f'<parameter><parameterid>scale</parameterid><name>Scale</name><valuemin>0</valuemin><valuemax>1000</valuemax><value>{base}</value>'
    if push:
        p += f'<keyframe><when>{inp}</when><value>{base}</value></keyframe><keyframe><when>{out}</when><value>{round(base * push, 2)}</value></keyframe>'
    return ('<filter><effect><name>Basic Motion</name><effectid>basic</effectid><effectcategory>motion</effectcategory>'
            f'<effecttype>motion</effecttype><mediatype>video</mediatype>{p}</parameter></effect></filter>')

def opacity(kfs):
    k = "".join(f"<keyframe><when>{w}</when><value>{v}</value></keyframe>" for w, v in kfs)
    return ('<filter><effect><name>Opacity</name><effectid>opacity</effectid><effectcategory>motion</effectcategory>'
            f'<effecttype>motion</effecttype><mediatype>video</mediatype><parameter><parameterid>opacity</parameterid>'
            f'<name>opacity</name><valuemin>0</valuemin><valuemax>100</valuemax><value>100</value>{k}</parameter></effect></filter>')

def transition(name, cut, length):
    return (f'<transitionitem>{RATE}<start>{cut - length // 2}</start><end>{cut + length // 2}</end><alignment>center</alignment>'
            f'<effect><name>{name}</name><effectid>{name}</effectid><effectcategory>Dissolve</effectcategory>'
            '<effecttype>transition</effecttype><mediatype>video</mediatype></effect></transitionitem>')

def build_final_xml(shots, end_main):
    seen, v1 = set(), []
    # transicoes: dissolve entre planos da intro, dip to white no drop e no cartao final
    trans_after = {}
    for i in range(len(shots) - 1):
        if shots[i]["sec"] == "intro":
            trans_after[i] = ("Cross Dissolve", 12) if shots[i + 1]["sec"] == "intro" else ("Dip to White", 8)
    trans_after[len(shots) - 1] = ("Dip to White", 12)
    for i, s in enumerate(shots):
        st = -1 if (i - 1) in trans_after else s["start"]
        en = -1 if i in trans_after else s["end"]
        filt = motion(s["base"], 1.08 if s["fx"] == "push" else None, s["inp"], s["out"])
        if i == 0:
            filt += opacity([(s["inp"], 0), (s["inp"] + 24, 100)])
        v1.append(f'<clipitem id="v1-{i}"><name>{s["clip"]}</name><enabled>TRUE</enabled><duration>{s["nfr"]}</duration>{RATE}'
                  f'<start>{st}</start><end>{en}</end><in>{s["inp"]}</in><out>{s["out"]}</out>'
                  f'{file_el("f-" + s["clip"], s["clip"] + ".MP4", s["nfr"], s["w"], s["h"], seen)}{filt}</clipitem>')
        if i in trans_after:
            v1.append(transition(trans_after[i][0], s["end"], trans_after[i][1]))
    # cartao final 51 (fundo azul) ate ao fim
    card_len = END_FRAMES - end_main
    v1.append(f'<clipitem id="v1-card"><name>BCV51_endcard_4K.png</name><enabled>TRUE</enabled><duration>{card_len + 100}</duration>{RATE}'
              f'<start>-1</start><end>{END_FRAMES}</end><in>0</in><out>{card_len}</out>'
              f'{file_el("f-card", "BCV51_endcard_4K.png", card_len + 100, SEQ_W, SEQ_H, seen)}'
              f'{motion(100, 1.05, 0, card_len)}{opacity([(card_len - 30, 100), (card_len, 0)])}</clipitem>')
    # V2: logo 51 transparente sobre o exterior a noite (batidas 1 a 7)
    la, lb = beat_frame(1), beat_frame(7)
    v2 = (f'<clipitem id="v2-logo"><name>BCV51_logo51_alpha_4K.png</name><enabled>TRUE</enabled><duration>{lb - la + 100}</duration>{RATE}'
          f'<start>{la}</start><end>{lb}</end><in>0</in><out>{lb - la}</out>'
          f'{file_el("f-logo", "BCV51_logo51_alpha_4K.png", lb - la + 100, SEQ_W, SEQ_H, seen)}'
          f'{motion(55, 1.06, 0, lb - la)}{opacity([(0, 0), (18, 100), (lb - la - 18, 100), (lb - la, 0)])}</clipitem>')
    a1 = (f'<clipitem id="a1-music"><name>BCV51_musica_MovingUp_90s.wav</name><enabled>TRUE</enabled><duration>{END_FRAMES}</duration>{RATE}'
          f'<start>0</start><end>{END_FRAMES}</end><in>0</in><out>{END_FRAMES}</out>'
          f'{file_el("f-music", "BCV51_musica_MovingUp_90s.wav", END_FRAMES, 0, 0, seen, audio=True)}'
          '<sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack></clipitem>')
    return seq_xml("BCV51_final_4K", END_FRAMES, ["".join(v1), v2], a1)

def seq_xml(name, dur, vtracks, audio=""):
    vt = "".join(f"<track>{t}</track>" for t in vtracks)
    at = (f'<audio><numOutputChannels>2</numOutputChannels><format><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics></format>'
          f'<track>{audio}</track></audio>') if audio else ""
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4"><sequence id="seq-{name}"><name>{name}</name><duration>{dur}</duration>{RATE}
<media><video><format><samplecharacteristics>{RATE}<width>{SEQ_W}</width><height>{SEQ_H}</height><pixelaspectratio>square</pixelaspectratio></samplecharacteristics></format>
{vt}</video>{at}</media></sequence></xmeml>
'''

# ---------- melhores momentos (todos os clips aproveitaveis, ordem cronologica) ----------
REJECT = {"C0931", "C0933", "C0937", "C1171", "C1032", "C1030", "C1074", "C1077", "C1078", "C1100", "C1108", "C1001", "C1017", "C0984", "C1138"}

def build_selects(shots):
    seen, items, t, rows = set(), [], 0, []
    used = {s["clip"] for s in shots}
    for path in sorted(glob.glob(os.path.join(MET, "C*.json"))):
        clip = os.path.basename(path)[:-5]
        m = json.load(open(path))
        if clip in REJECT or m["frames"] < 40:
            continue
        L = min(72, m["frames"] - 30)  # ate 3 s por clip
        inp = best_window(clip, L, margin=6)
        sc = score(m, inp / FPS, L / FPS)
        if sc > 2.5:  # demasiado tremido em todo o clip
            rows.append((clip, "rejeitado (treme)", "", "")); continue
        (w, h), nfr = info(clip)
        items.append(f'<clipitem id="s-{clip}"><name>{clip}</name><enabled>TRUE</enabled><duration>{nfr}</duration>{RATE}'
                     f'<start>{t}</start><end>{t + L}</end><in>{inp}</in><out>{inp + L}</out>'
                     f'{file_el("f-" + clip, clip + ".MP4", nfr, w, h, seen)}{motion(round(SEQ_W / w * 100, 2), None, 0, 0)}</clipitem>')
        rows.append((clip, "no video final" if clip in used else "bom", f"{inp / FPS:.1f}s", f"{t / FPS:.1f}s"))
        t += L
    return seq_xml("BCV51_melhores_momentos_4K", t, ["".join(items)]), rows, t

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    shots, end_main = build_timeline()
    assert end_main == beat_frame(154), end_main
    open(os.path.join(OUT, "BCV51_final_4K.xml"), "w").write(build_final_xml(shots, end_main))
    sel, rows, tsel = build_selects(shots)
    open(os.path.join(OUT, "BCV51_melhores_momentos_4K.xml"), "w").write(sel)
    json.dump(shots, open(os.path.join(OUT, "shots.json"), "w"), indent=0)
    json.dump(rows, open(os.path.join(OUT, "selects.json"), "w"))
    print(f"final: {len(shots)} planos, {END_FRAMES / FPS:.1f}s | melhores momentos: {sum(1 for r in rows if r[2])} clips, {tsel / FPS:.0f}s")
    for s in shots:
        m = metrics(s["clip"])
        print(s["clip"], s["start"], s["end"] - s["start"], f"in={s['inp'] / FPS:.2f}s", f"score={score(m, s['inp'] / FPS, (s['out'] - s['inp']) / FPS):.2f}", s["base"])
