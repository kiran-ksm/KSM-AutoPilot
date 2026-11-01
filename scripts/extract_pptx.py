import zipfile
import re

pptx_path = r'C:\Projects\KSM-AutoPilot\ppt\RayCatena.pptx'

with zipfile.ZipFile(pptx_path, 'r') as z:
    slides = sorted([f for f in z.namelist() if f.startswith('ppt/slides/slide') and f.endswith('.xml')])
    print(f'Slides found: {len(slides)}')

    for slide_path in slides[:6]:
        content = z.read(slide_path).decode('utf-8')
        texts = re.findall(r'<a:t>([^<]+)</a:t>', content)
        colors = re.findall(r'srgbClr val="([0-9A-Fa-f]{6})"', content)
        print(f'\n=== {slide_path} ===')
        print(f'Texts: {texts[:20]}')
        print(f'Colors: {sorted(set(colors))}')
