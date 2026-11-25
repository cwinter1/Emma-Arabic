#!/usr/bin/env python3
"""Generate audio/*.mp3 (Google TTS, Arabic) for every word and headline in data.js,
and write audio/map.js (normalized Arabic text -> file name).
Usage: pip install gtts && python3 tools/make_audio.py"""
import hashlib, json, os, re, subprocess, sys, time
from gtts import gTTS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'[«»"“”.,،]', '', re.sub(r'[ً-ٰٟـ]', '', s))).strip()

js = "const fs=require('fs'),vm=require('vm');const c={};vm.runInNewContext(fs.readFileSync(%r,'utf8')+';this.o={WORDS,HEADS}',c);console.log(JSON.stringify(c.o))" % os.path.join(ROOT, 'data.js')
d = json.loads(subprocess.check_output(['node', '-e', js]))
texts = set()
for w in d['WORDS']: texts.add(norm(w['say']))
for h in d['HEADS']:
    texts.add(norm(h['ar']))
    for ar, _ in h['t']: texts.add(norm(ar))
texts.discard('')

os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
amap = {}
for t in sorted(texts):
    name = hashlib.sha1(t.encode()).hexdigest()[:10]
    path = os.path.join(ROOT, 'audio', name + '.mp3')
    amap[t] = name
    if os.path.exists(path) and os.path.getsize(path) > 500: continue
    for attempt in range(5):
        try:
            gTTS(t, lang='ar').save(path); break
        except Exception as e:
            print('retry', t, e, file=sys.stderr); time.sleep(2 * (attempt + 1))
    else:
        sys.exit('failed: ' + t)
    print('ok', name, t)
with open(os.path.join(ROOT, 'audio', 'map.js'), 'w', encoding='utf8') as f:
    f.write('const AUDIO=' + json.dumps(amap, ensure_ascii=False, indent=0) + ';\n')
print(len(amap), 'clips')
