"""Read-only, bounded HTTP SEO checks. Never submits forms or authenticates."""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html_metadata import Page

AGENTS = ('servora-seo-check/1.0', 'facebookexternalhit/1.1')
MAX_BODY = 4 * 1024 * 1024


def origin(value, local=False):
    url = urllib.parse.urlsplit(value)
    if url.username or url.password or url.query or url.fragment or url.path not in ('', '/'):
        raise ValueError('Expected an origin without credentials, path, query or fragment')
    loopback = url.hostname in ('localhost', '127.0.0.1', '::1')
    if local:
        if not loopback or url.scheme not in ('http', 'https'):
            raise ValueError('--local permits loopback origins only')
    elif url.scheme != 'https' or not url.hostname or loopback or url.hostname.endswith(('.example', '.test', '.invalid')) or url.hostname in ('example.com', 'example.org', 'example.net') or '.example.' in url.hostname:
        raise ValueError('Expected a real public HTTPS origin')
    return value.rstrip('/')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(url, agent=AGENTS[0]):
    req = urllib.request.Request(url, headers={'User-Agent': agent})
    try:
        response = urllib.request.build_opener(NoRedirect()).open(req, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        body = response.read(MAX_BODY + 1)
        if len(body) > MAX_BODY:
            raise ValueError('Response exceeds 4 MiB limit')
        return response.status, response.headers, body


def normalized(url):
    parts = urllib.parse.urlsplit(url)
    return url.rstrip('/') if parts.path in ('', '/') else url


def audit(site, apps=None, signin=None, canonical_origin=None):
    public = canonical_origin or site
    errors = []
    observations = []
    def check(ok, message):
        if not ok:
            errors.append(message)
    def get(path, agent=AGENTS[0]):
        status, headers, body = request(site + path, agent)
        observations.append({'path': path, 'agent': agent, 'status': status})
        return status, headers, body

    status, _, body = get('/sitemap.xml')
    check(status == 200, 'Sitemap must return 200 without redirects')
    document = ET.fromstring(body)
    urls = [element.text or '' for element in document.iter() if element.tag.split('}')[-1] == 'loc']
    if len(urls) > 200:
        raise ValueError('This Servora smoke check is limited to 200 sitemap URLs')
    check(len(urls) == len(set(urls)), 'Duplicate sitemap URLs')
    paths = set()
    for url in urls:
        parsed = urllib.parse.urlsplit(url)
        # Never fetch off-origin sitemap URLs, even when the deployment is misconfigured.
        if (parsed.scheme, parsed.netloc) != (urllib.parse.urlsplit(public).scheme, urllib.parse.urlsplit(public).netloc) or parsed.query or parsed.fragment:
            errors.append('Sitemap contains an off-origin or noncanonical URL')
            continue
        paths.add(parsed.path or '/')
    check({'/', '/product', '/pricing', '/book-a-demo', '/contact', '/product/qr-ordering'}.issubset(paths), 'Sitemap omits required public landing pages')
    check(not any(path.startswith('/legal/') or path == '/login' for path in paths), 'Sitemap includes a noindex utility page')
    images = set()
    for agent in AGENTS:
        titles = set()
        descriptions = set()
        for path in sorted(paths):
            status, headers, body = get(path, agent)
            check(status == 200, f'{path}: expected 200 for {agent}')
            check('text/html' in headers.get('Content-Type', ''), f'{path}: expected HTML')
            page = Page(body.decode('utf-8'))
            robots = ','.join(page.meta.get('robots', []) + [headers.get('X-Robots-Tag', '')]).lower()
            check('noindex' not in robots and 'none' not in robots.split(','), f'{path}: public page is noindex')
            check(len(page.canonicals) == 1 and normalized(page.canonicals[0]) == normalized(public + path), f'{path}: incorrect canonical')
            check(page.h1 == 1 and page.main == 1, f'{path}: expected one H1 and main')
            check(bool(page.title_text) and page.title_text not in titles, f'{path}: missing/duplicate title')
            titles.add(page.title_text)
            description = page.meta.get('description', [])
            check(len(description) == 1 and bool(description[0]) and description[0] not in descriptions, f'{path}: missing/duplicate description')
            descriptions.update(description)
            check(page.meta.get('og:url') == page.canonicals, f'{path}: OG URL differs from canonical')
            for name in ('og:image', 'twitter:image'):
                values = page.meta.get(name, [])
                check(bool(values), f'{path}: missing {name}')
                for image in values:
                    parsed = urllib.parse.urlsplit(image)
                    check(parsed.scheme == urllib.parse.urlsplit(public).scheme and parsed.netloc == urllib.parse.urlsplit(public).netloc, f'{path}: expected same-origin absolute social image')
                    # Deliberately do not crawl arbitrary external asset hosts.
                    if parsed.netloc == urllib.parse.urlsplit(public).netloc:
                        images.add(image)
    for image in images:
        image_parts = urllib.parse.urlsplit(image)
        status, headers, body = request(site + image_parts.path + ("?" + image_parts.query if image_parts.query else ""))
        check(status == 200 and headers.get('Content-Type', '').startswith('image/') and len(body) > 0, 'Social image does not return a nonempty image response')
    status, _, body = get('/robots.txt')
    check(status == 200, 'robots.txt must return 200')
    robots = body.decode('utf-8')
    check(f'Sitemap: {public}/sitemap.xml' in robots, 'robots.txt sitemap points to another origin')
    # Evaluate the actual wildcard policy instead of relying only on string matches.
    from urllib.robotparser import RobotFileParser
    policy = RobotFileParser()
    policy.parse(robots.splitlines())
    for path in paths | {'/login'}:
        check(policy.can_fetch('Googlebot', public + path), f'{path}: robots.txt blocks metadata crawling')
    for path in ('/legal/privacy', '/legal/terms', '/legal/cookies'):
        status, headers, body = get(path)
        page = Page(body.decode('utf-8'))
        check(status == 200 and 'noindex' in ','.join(page.meta.get('robots', []) + [headers.get('X-Robots-Tag', '')]).lower(), f'{path}: expected noindex legal page')
    status, headers, body = get('/login')
    check(status in (301, 302, 303, 307, 308), '/login: expected redirect')
    if signin:
        check(headers.get('Location') == signin, '/login: sign-in destination mismatch')
    status, headers, body = get('/__servora_seo_missing_page__')
    check(status == 404, 'Unknown route must return a real 404')
    for name, target in (apps or {}).items():
        status, headers, body = request(target + '/')
        page = Page(body.decode('utf-8'))
        check(status == 200, f'{name}: app shell must return 200')
        check('noindex' in headers.get('X-Robots-Tag', '').lower(), f'{name}: hosting X-Robots-Tag missing')
        check(any('noindex' in item.lower() for item in page.meta.get('robots', [])), f'{name}: HTML noindex missing')
        status, _, body = request(target + '/robots.txt')
        policy = RobotFileParser()
        policy.parse(body.decode('utf-8').splitlines())
        check(status == 200 and policy.can_fetch('Googlebot', target + '/'), f'{name}: shell crawling blocked')
    return {'ok': not errors, 'indexablePages': len(paths), 'websiteResponses': len(observations), 'privateApps': len(apps or {}), 'errors': errors, 'observations': observations}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--website-only', action='store_true', help='Explicitly skip private hosting and login-destination configuration checks')
    parser.add_argument('--local', action='store_true', help='Only allow loopback origins for local build verification')
    parser.add_argument('--canonical-origin', help='Expected public build identity; only permitted with --local')
    args = parser.parse_args()
    try:
        site = origin(os.environ.get('SMOKE_WEBSITE_URL', ''), args.local)
        apps = {}
        signin = os.environ.get('NEXT_PUBLIC_APP_SIGNIN_URL')
        if not args.website_only:
            for name in ('WEB', 'KITCHEN', 'WAITER', 'CUSTOMER'):
                apps[name.lower()] = origin(os.environ.get(f'SMOKE_{name}_URL', ''), args.local)
            if not signin:
                raise ValueError('NEXT_PUBLIC_APP_SIGNIN_URL is required for the complete check')
        if args.canonical_origin and not args.local:
            raise ValueError('--canonical-origin is only permitted for local build checks')
        public = args.canonical_origin
        if public:
            parts = urllib.parse.urlsplit(public)
            if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password or parts.path not in ('', '/') or parts.query or parts.fragment:
                raise ValueError('Expected a clean HTTPS canonical build origin')
            public = public.rstrip('/')
        result = audit(site, apps, signin, public)
    except Exception as error:
        result = {'ok': False, 'errors': [str(error)]}
    print(json.dumps(result, indent=2))
    return 0 if result['ok'] else 1


if __name__ == '__main__':
    sys.exit(main())
