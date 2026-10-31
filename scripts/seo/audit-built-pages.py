"""Inspect actual build HTML with the standard HTML parser; no browser required."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json, re, sys, xml.etree.ElementTree as ET

from html_metadata import Page

errors=[]
def check(ok,msg):
    if not ok: errors.append(msg)
base=Path('apps/website/.next/server/app')
check(base.exists(),'Website build is required')
indexable={};titles=set();descriptions=set()
def normalized(url):
    parts=urlsplit(url)
    return url.rstrip('/') if parts.path in ('','/') else url
for file in base.rglob('*.html'):
    route='/' if file.name=='index.html' else '/'+file.relative_to(base).with_suffix('').as_posix()
    try:p=Page(file.read_text())
    except Exception as e:errors.append(f'{route}: invalid HTML/JSON-LD: {e}');continue
    if any('noindex' in x for x in p.meta.get('robots',[])):continue
    check(len(p.canonicals)==1,f'{route}: expected one canonical')
    check(p.h1==1 and p.main==1,f'{route}: expected one H1 and main landmark')
    check(bool(p.title_text) and p.title_text not in titles,f'{route}: missing/duplicate title');titles.add(p.title_text)
    desc=p.meta.get('description',[])
    check(len(desc)==1 and bool(desc[0]) and desc[0] not in descriptions,f'{route}: missing/duplicate description');descriptions.update(desc)
    canonical=p.canonicals[0] if p.canonicals else ''
    check(urlsplit(canonical).path in (route,'' if route=='/' else route),f'{route}: canonical pathname mismatch')
    indexable[normalized(canonical)]=route
    for name in ['og:image','twitter:image','og:title','og:description','og:url','twitter:card']:
        check(bool(p.meta.get(name)),f'{route}: missing {name}')
    for name in ['og:image','twitter:image']:
        for image in p.meta.get(name,[]):check(urlsplit(image).scheme=='https',f'{route}: non-HTTPS social image')
    check(p.meta.get('og:url')==[canonical],f'{route}: OG URL differs from canonical')
check(len(indexable)>=16,'Expected marketing and ten feature pages, not a partial build')
sitemap=base/'sitemap.xml.body'
check(sitemap.exists(),'Missing built sitemap')
if sitemap.exists():
    urls=[normalized(e.text) for e in ET.fromstring(sitemap.read_text()).iter() if e.tag.endswith('}loc')]
    check(len(urls)==len(set(urls)),'Duplicate sitemap URLs')
    check(set(urls)==set(indexable),f'Sitemap and indexable HTML disagree: {set(urls)^set(indexable)}')
if '--website-only' not in sys.argv:
    for app in ['web','waiter-app','kitchen-display','customer-app']:
        file=Path(f'apps/{app}/dist/index.html')
        check(file.exists(),f'{app}: required build missing')
        if not file.exists():continue
        html=file.read_text();p=Page(html)
        check(any('noindex' in x for x in p.meta.get('robots',[])),f'{app}: missing noindex')
        check('%VITE_PUBLIC_APP_URL%' not in html,f'{app}: unresolved origin')
        check(bool(p.meta.get('og:image')),f'{app}: missing social image')
if errors:
    print('\n'.join(errors),file=sys.stderr);sys.exit(1)
print(f'Built SEO audit passed: {len(indexable)} indexable website pages, sitemap parity, social metadata, landmarks and JSON-LD.')
