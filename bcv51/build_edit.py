"""Gera o XML (FCP7 xmeml) para o Premiere e um MP4 de pre-visualizacao.
Uso: python3 build_edit.py <pasta_proxies> <pasta_saida>"""
import os, subprocess, sys
from xml.sax.saxutils import escape

FPS = 24  # timebase (23.976 NTSC)
# (clip, in_seg, dur_frames, efeito, transicao_para_o_seguinte)
EDIT = [
    ("C0911", 1.0, 72, "fadein+push", None),
    ("C0916", 2.0, 72, None, None),
    ("C0915", 4.0, 48, None, None),
    ("C0920", 2.0, 72, None, None),
    ("C0912", 1.0, 48, "push", None),
    ("C0919", 1.0, 48, None, None),
    ("C0917", 2.0, 48, "push", None),
    ("C0914", 1.0, 48, None, "dissolve"),
    ("C0925", 2.0, 48, "push", None),
    ("C0922", 2.0, 48, None, None),
    ("C0923", 2.0, 48, None, None),
    ("C0924", 2.5, 48, None, "dissolve"),
    ("C0927", 1.0, 48, None, None),
    ("C0936", 3.0, 48, None, None),
    ("C0930", 1.0, 48, None, None),
    ("C0934", 2.0, 48, "push", None),
    ("C0932", 1.0, 48, None, None),
    ("C0929", 0.5, 72, None, None),
    ("C0926", 3.0, 72, None, None),
    ("C0915", 9.0, 72, "fadeout", None),
]
DISSOLVE = 12  # frames

def probe(path):
    q = lambda *a: subprocess.run(["ffprobe", "-v", "error", *a, path], capture_output=True, text=True).stdout.strip()
    frames = round(float(q("-show_entries", "format=duration", "-of", "csv=p=0")) * 24000 / 1001)
    tc = q("-show_entries", "format_tags=timecode", "-of", "csv=p=0") or "00:00:00:00"
    return frames, tc

def tc_frames(tc):
    h, m, s, f = map(int, tc.replace(";", ":").split(":"))
    return ((h * 60 + m) * 60 + s) * FPS + f

RATE = "<rate><timebase>24</timebase><ntsc>TRUE</ntsc></rate>"

def motion(kind, inp, dur):
    """Push-in lento (escala 100 -> 108) e fades por opacidade."""
    out = []
    if "push" in kind:
        out.append(f"""<filter><effect><name>Basic Motion</name><effectid>basic</effectid><effectcategory>motion</effectcategory><effecttype>motion</effecttype><mediatype>video</mediatype>
<parameter><parameterid>scale</parameterid><name>Scale</name><valuemin>0</valuemin><valuemax>1000</valuemax><value>100</value>
<keyframe><when>{inp}</when><value>100</value></keyframe><keyframe><when>{inp + dur}</when><value>108</value></keyframe></parameter></effect></filter>""")
    if "fadein" in kind or "fadeout" in kind:
        kf = [(inp, 0), (inp + 18, 100)] if "fadein" in kind else [(inp + dur - 24, 100), (inp + dur, 0)]
        kfx = "".join(f"<keyframe><when>{w}</when><value>{v}</value></keyframe>" for w, v in kf)
        out.append(f"""<filter><effect><name>Opacity</name><effectid>opacity</effectid><effectcategory>motion</effectcategory><effecttype>motion</effecttype><mediatype>video</mediatype>
<parameter><parameterid>opacity</parameterid><name>opacity</name><valuemin>0</valuemin><valuemax>100</valuemax><value>100</value>{kfx}</parameter></effect></filter>""")
    return "".join(out)

def build_xml(meta, with_fx):
    items, t, seen = [], 0, set()
    for i, (clip, ins, dur, fx, trans) in enumerate(EDIT):
        frames, tc = meta[clip]
        inp = round(ins * 24000 / 1001)
        prev_trans = with_fx and i > 0 and EDIT[i - 1][4] == "dissolve"
        this_trans = with_fx and trans == "dissolve"
        start = -1 if prev_trans else t
        end = -1 if this_trans else t + dur
        if clip in seen:
            fileel = f'<file id="file-{clip}"/>'
        else:
            seen.add(clip)
            fileel = f"""<file id="file-{clip}"><name>{clip}.MP4</name><pathurl>file://localhost/{clip}.MP4</pathurl>{RATE}<duration>{frames}</duration>
<timecode>{RATE}<string>{tc}</string><frame>{tc_frames(tc)}</frame><displayformat>NDF</displayformat></timecode>
<media><video><samplecharacteristics>{RATE}<width>1920</width><height>1080</height></samplecharacteristics></video></media></file>"""
        items.append(f"""<clipitem id="clip-{i}"><name>{clip}</name><enabled>TRUE</enabled><duration>{frames}</duration>{RATE}
<start>{start}</start><end>{end}</end><in>{inp}</in><out>{inp + dur}</out>{fileel}{motion(fx or "", inp, dur) if with_fx else ""}</clipitem>""")
        if this_trans:
            cut = t + dur
            items.append(f"""<transitionitem>{RATE}<start>{cut - DISSOLVE // 2}</start><end>{cut + DISSOLVE // 2}</end><alignment>center</alignment>
<effect><name>Cross Dissolve</name><effectid>Cross Dissolve</effectid><effectcategory>Dissolve</effectcategory><effecttype>transition</effecttype><mediatype>video</mediatype></effect></transitionitem>""")
        t += dur
    name = "BCV51_teste_v1" + ("" if with_fx else "_so_cortes")
    return t, f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4"><sequence id="seq-1"><name>{name}</name><duration>{t}</duration>{RATE}
<media><video><format><samplecharacteristics>{RATE}<width>1920</width><height>1080</height><pixelaspectratio>square</pixelaspectratio></samplecharacteristics></format>
<track>{"".join(items)}</track></video></media></sequence></xmeml>
"""

def build_preview(src, outpath):
    """MP4 de pre-visualizacao a partir dos proxies, com correcao rapida do perfil log."""
    inputs, chains, n = [], [], len(EDIT)
    for i, (clip, ins, dur, fx, _) in enumerate(EDIT):
        inputs += ["-ss", f"{ins:.3f}", "-t", f"{dur * 1001 / 24000:.4f}", "-i", os.path.join(src, f"{clip}_Proxy.mov")]
        d = dur * 1001 / 24000
        f = f"[{i}:v]scale=960:540,setsar=1,fps=24000/1001"
        if fx and "push" in fx:
            f += f",scale=w='960*(1+0.08*t/{d:.3f})':h=-2:eval=frame,crop=960:540"
        f += ",eq=contrast=1.25:saturation=1.45:gamma=0.92,format=yuv420p,setpts=PTS-STARTPTS"
        if fx and "fadein" in fx: f += ",fade=in:st=0:d=0.75"
        if fx and "fadeout" in fx: f += f",fade=out:st={d - 1:.3f}:d=1"
        chains.append(f + f"[v{i}]")
    # junta com corte seco ou dissolve
    cur, curdur = "[v0]", EDIT[0][2] * 1001 / 24000
    for i in range(1, n):
        lbl = f"[x{i}]"
        if EDIT[i - 1][4] == "dissolve":
            dd = DISSOLVE * 1001 / 24000
            chains.append(f"{cur}[v{i}]xfade=transition=fade:duration={dd:.4f}:offset={curdur - dd:.4f}{lbl}")
            curdur += EDIT[i][2] * 1001 / 24000 - dd
        else:
            chains.append(f"{cur}[v{i}]concat=n=2:v=1:a=0,settb=1001/24000{lbl}")
            curdur += EDIT[i][2] * 1001 / 24000
        cur = lbl
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(chains), "-map", cur,
                    "-c:v", "libx264", "-crf", "22", "-preset", "medium", "-movflags", "+faststart", outpath], check=True)

if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    meta = {c: probe(os.path.join(src, f"{c}_Proxy.mov")) for c in {e[0] for e in EDIT}}
    for fx in (True, False):
        total, xml = build_xml(meta, fx)
        open(os.path.join(dst, "BCV51_teste_v1" + ("" if fx else "_so_cortes") + ".xml"), "w").write(xml)
    print(f"duracao: {total} frames = {total * 1001 / 24000:.1f}s")
    build_preview(src, os.path.join(dst, "BCV51_teste_v1_preview.mp4"))
