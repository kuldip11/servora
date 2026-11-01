"""Shared standard-library parser for generated and served SEO metadata."""
from html.parser import HTMLParser
import json

class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.meta={};self.canonicals=[];self.h1=0;self.main=0;self.schemas=[];self.ld=False;self.buffer='';self.title=False;self.title_text=''
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='meta': self.meta.setdefault(a.get('name',a.get('property','')),[]).append(a.get('content',''))
        if tag=='link' and a.get('rel')=='canonical': self.canonicals.append(a.get('href',''))
        if tag=='h1': self.h1+=1
        if tag=='main': self.main+=1
        if tag=='title': self.title=True
        if tag=='script' and a.get('type')=='application/ld+json': self.ld=True;self.buffer=''
    def handle_data(self,data):
        if self.ld:self.buffer+=data
        if self.title:self.title_text+=data
    def handle_endtag(self,tag):
        if tag=='title':self.title=False
        if tag=='script' and self.ld:
            self.schemas.append(json.loads(self.buffer));self.ld=False

