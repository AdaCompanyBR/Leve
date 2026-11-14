#!/usr/bin/env python3
"""Prepara a arte do jardim para o app (ver ARTE_JARDIM.md).

Uso:  python3 scripts/garden_assets.py <pasta com os arquivos recebidos>

- Confere os nomes (scene, tree-1…7, tree-1-dry…7-dry e as camadas opcionais).
- scene: recorta/ajusta para 1440 × 944 (sem distorcer) e salva em WebP.
- Árvores e camadas transparentes: confere se há transparência de verdade; recortes são aparados até o
  conteúdo (para a base do montinho ficar na borda de baixo) e limitados a 1200 px de altura; quadros
  inteiros 1440 × 944 ficam como estão.
- Avisa se a versão enfraquecida tem proporção muito diferente da saudável (pose diferente).
- Salva tudo em img/garden/ como WebP e mostra o tamanho final de cada arquivo.
Precisa de Pillow (pip install pillow).
"""
import sys, re
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'img' / 'garden'
FW, FH = 1440, 944
REQUIRED = ['scene'] + [f'tree-{i}' for i in range(1, 8)] + [f'tree-{i}-dry' for i in range(1, 8)]
OPTIONAL = re.compile(r'^(seedbed|memory|special-[a-z]+|deco-[a-z]+)$')


def main(src: Path):
    files = {p.stem.lower(): p for p in src.rglob('*') if p.suffix.lower() in ('.png', '.webp', '.jpg', '.jpeg')}
    missing = [n for n in REQUIRED if n not in files]
    unknown = [n for n in files if n not in REQUIRED and not OPTIONAL.match(n)]
    if unknown: print('Ignorados (nome fora do padrão):', ', '.join(sorted(unknown)))
    if missing: print('Faltando:', ', '.join(missing))
    OUT.mkdir(parents=True, exist_ok=True)
    ratios = {}
    for name, path in sorted(files.items()):
        if name in unknown: continue
        im = Image.open(path)
        if name == 'scene':
            im = im.convert('RGB')
            scale = max(FW / im.width, FH / im.height)
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
            l, t = (im.width - FW) // 2, (im.height - FH) // 2
            im = im.crop((l, t, l + FW, t + FH))
            im.save(OUT / 'scene.webp', 'WEBP', quality=82, method=6)
        else:
            im = im.convert('RGBA')
            alpha = im.getchannel('A')
            if alpha.getextrema()[0] == 255:
                print(f'ATENÇÃO {name}: sem transparência (o fundo vai cobrir o cenário). Precisa de fundo transparente.')
            full = abs(im.width / im.height - FW / FH) < 0.02 and im.width >= 1000
            if full:
                im = im.resize((FW, FH), Image.LANCZOS)
            else:
                box = alpha.point(lambda a: 255 if a > 8 else 0).getbbox()
                if box: im = im.crop(box)
                if im.height > 1200: im = im.resize((round(im.width * 1200 / im.height), 1200), Image.LANCZOS)
            ratios[name] = im.width / im.height
            im.save(OUT / f'{name}.webp', 'WEBP', quality=85, method=6)
        print(f'ok  {name}.webp  {(OUT / (name + ".webp")).stat().st_size // 1024} KB')
    for i in range(1, 8):
        a, b = ratios.get(f'tree-{i}'), ratios.get(f'tree-{i}-dry')
        if a and b and abs(a - b) / a > 0.12:
            print(f'ATENÇÃO tree-{i}-dry: proporção diferente da saudável ({b:.2f} × {a:.2f}). Confira se é a mesma pose.')


if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(Path(sys.argv[1]))
