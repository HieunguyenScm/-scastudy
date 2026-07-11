import json, re
from pathlib import Path
from pypdf import PdfReader

ROOT = Path('/Users/nguyentrunghieu/Downloads/drive-download-20260611T030749Z-3-001')
HERE = Path(__file__).resolve().parents[1]
sources = json.loads((HERE / 'content/sources.json').read_text())
curriculum = json.loads((HERE / 'content/curriculum.json').read_text())

def page_start(value):
    match = re.search(r'(?:PDF\s*)?(?:tr\.?\s*)?(\d+)', value or '', re.I)
    return max(1, int(match.group(1))) if match else 1

out = []
readers = {}
for week in curriculum:
    for ref in week.get('sourceRefs', []):
        source = next((item for item in sources if item['id'] == ref['sourceId']), None)
        if not source:
            continue
        pdf = ROOT / source['libraryPath']
        excerpt = ''
        pdf_start = page_start(ref.get('pages', ''))
        try:
            reader = readers.get(source['id'])
            if reader is None:
                reader = PdfReader(str(pdf), strict=False)
                readers[source['id']] = reader
            index = min(max(pdf_start - 1, 0), len(reader.pages) - 1)
            pages = reader.pages[index:index + 2]
            excerpt = re.sub(r'\s+', ' ', ' '.join((page.extract_text() or '') for page in pages)).strip()
            excerpt = excerpt[:3600]
        except Exception as error:
            excerpt = f'Không trích xuất được tự động: {type(error).__name__}.'
        out.append({
            'week': week['week'], 'sourceId': source['id'], 'title': source['title'],
            'author': source['author'], 'chapter': ref['chapter'], 'pages': ref['pages'],
            'note': ref['note'], 'pdfPageStart': pdf_start, 'excerpt': excerpt,
        })
(HERE / 'content/source-excerpts.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print(f'generated {len(out)} source reading excerpts')
