import unittest
from unittest.mock import patch
from email.message import Message
from audit_live import audit, origin

BASE = 'https://servora.app'
PATHS = ['/', '/product', '/pricing', '/book-a-demo', '/contact', '/product/qr-ordering']


def headers(**values):
    result = Message()
    for key, value in values.items():
        result[key.replace('_', '-')] = value
    return result


def fixture(url, agent=None):
    if url.startswith('https://private.servora.app'):
        if url.endswith('robots.txt'):
            return 200, headers(Content_Type='text/plain'), b'User-agent: *\nAllow: /\n'
        return 200, headers(Content_Type='text/html', X_Robots_Tag='noindex, nofollow'), b'<meta name="robots" content="noindex">'
    path = url.removeprefix(BASE)
    if path == '/sitemap.xml':
        return 200, headers(Content_Type='application/xml'), ('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{BASE}{p}</loc></url>' for p in PATHS) + '</urlset>').encode()
    if path == '/robots.txt':
        return 200, headers(Content_Type='text/plain'), f'User-agent: *\nAllow: /\nSitemap: {BASE}/sitemap.xml'.encode()
    if path.endswith('.png'):
        return 200, headers(Content_Type='image/png'), b'image fixture'
    if path == '/login':
        return 307, headers(Location='https://private.servora.app/login'), b''
    if path.startswith('/legal/'):
        return 200, headers(Content_Type='text/html'), b'<meta name="robots" content="noindex">'
    if path not in PATHS:
        return 404, headers(Content_Type='text/html'), b'<meta name="robots" content="noindex">'
    return 200, headers(Content_Type='text/html'), f'''<html><head><title>Servora {path}</title><meta content="Description {path}" name="description"><link href="{url}" rel="canonical"><meta property="og:url" content="{url}"><meta content="{BASE}/image.png" property="og:image"><meta property="twitter:image" content="{BASE}/image.png"><script type="application/ld+json">{{"@type":"WebPage"}}</script></head><body><main><h1>{path}</h1></main></body></html>'''.encode()


class LiveAuditTests(unittest.TestCase):
    def check_response(self, modify=None):
        def fetch(url, agent=None):
            response = fixture(url, agent)
            return modify(url, response) if modify else response
        with patch('audit_live.request', fetch):
            return audit(BASE, {'web': 'https://private.servora.app'}, 'https://private.servora.app/login')

    def test_valid_site_and_private_shell(self):
        self.assertTrue(self.check_response()['ok'])

    def test_missing_social_metadata_fails(self):
        def modify(url, response):
            status, head, body = response
            return status, head, body.replace(b'property="og:image"', b'property="missing:image"')
        self.assertIn('/: missing og:image', self.check_response(modify)['errors'])

    def test_hosting_header_is_required_for_private_apps(self):
        def modify(url, response):
            status, head, body = response
            if url == 'https://private.servora.app/':
                del head['X-Robots-Tag']
            return status, head, body
        self.assertIn('web: hosting X-Robots-Tag missing', self.check_response(modify)['errors'])

    def test_wrong_login_destination_fails(self):
        def modify(url, response):
            status, head, body = response
            if url.endswith('/login'):
                head.replace_header('Location', 'https://other.servora.app/login')
            return status, head, body
        self.assertIn('/login: sign-in destination mismatch', self.check_response(modify)['errors'])

    def test_robots_blocks_are_detected(self):
        def modify(url, response):
            status, head, body = response
            if url == BASE + '/robots.txt':
                body = body.replace(b'Allow: /', b'Disallow: /')
            return status, head, body
        self.assertTrue(any('blocks metadata crawling' in e for e in self.check_response(modify)['errors']))

    def test_sitemap_cannot_trigger_external_crawling(self):
        seen = []
        def fetch(url, agent=None):
            seen.append(url)
            status, head, body = fixture(url, agent)
            if url == BASE + '/sitemap.xml':
                body = body.replace((BASE + '/pricing').encode(), b'https://external.invalid/pricing')
            return status, head, body
        with patch('audit_live.request', fetch):
            result = audit(BASE)
        self.assertFalse(result['ok'])
        self.assertFalse(any(url.startswith('https://external.invalid') for url in seen))

    def test_local_transport_can_verify_public_build_identity(self):
        def fetch(url, agent=None):
            return fixture(url.replace('http://127.0.0.1:3011', BASE), agent)
        with patch('audit_live.request', fetch):
            self.assertTrue(audit('http://127.0.0.1:3011', canonical_origin=BASE)['ok'])

    def test_origin_validation(self):
        for value in ('', 'http://servora.app', 'https://servora.example', 'https://user:pass@servora.app', 'https://servora.app/path'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                origin(value)
        self.assertEqual(origin('http://127.0.0.1:3011', True), 'http://127.0.0.1:3011')
        with self.assertRaises(ValueError):
            origin('http://servora.app', True)


if __name__ == '__main__':
    unittest.main()
