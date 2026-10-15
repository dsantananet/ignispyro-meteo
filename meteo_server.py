"""Serve the dashboard and a fixed Weather Underground station without exposing keys."""
import argparse
import json
import os
import ssl
import time
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT = Path(__file__).resolve().parent
CACHE = None
LOCAL_KEY = None


def wu_rows(data, station='IALDEI10'):
    result = []
    for item in data.get('observations', []):
        if item.get('stationID') != station:
            continue
        metric = item.get('metric', {})
        def value(v):
            return v if isinstance(v, (int, float)) and v != -99 else None
        lat, lon = value(item.get('lat')), value(item.get('lon'))
        if lat is None or lon is None:
            continue
        result.append(dict(id=station, name='DsantananetMETEO · Aldeia do Bispo' if station=='IALDEI10' else station,
                           source='Weather Underground', time=item['obsTimeUtc'],
                           lon=lon, lat=lat, temperature=value(metric.get('temp')),
                           humidity=value(item.get('humidity')), wind=value(metric.get('windSpeed')),
                           rain=None, gust=value(metric.get('windGust')), pressure=value(metric.get('pressure')), dewpoint=value(metric.get('dewpt'))))  # precipTotal is daily, not IPMA hourly precipitation.
    if not result:
        raise ValueError('No valid observations')
    return result


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        pass  # Request paths could contain credentials supplied accidentally.

    def do_POST(self):
        # Accept credentials only from the same-origin local application.
        host=self.headers.get('Host','')
        if self.path!='/api/station' or host!=f'127.0.0.1:{self.server.server_port}' or self.headers.get('Origin')!=f'http://{host}':
            return self.respond(403, {'error':'Origin rejected'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=4096 or self.headers.get('Content-Type')!='application/json':raise ValueError()
            payload=json.loads(self.rfile.read(length));station=payload['station'];key=payload['key']
            import re
            if not isinstance(station,str) or not re.fullmatch(r'[A-Za-z0-9_-]{3,32}',station) or not isinstance(key,str) or not 8<=len(key)<=256:raise ValueError()
            query=urllib.parse.urlencode(dict(stationId=station,format='json',units='m',numericPrecision='decimal',apiKey=key))
            with urllib.request.urlopen('https://api.weather.com/v2/pws/observations/current?'+query,timeout=20) as response:
                rows=wu_rows(json.load(response),station)
            return self.respond(200,rows)
        except Exception:return self.respond(502,{'error':'Station unavailable or access rejected'})

    def do_GET(self):
        global CACHE
        path = urllib.parse.unquote(self.path.split('?')[0])
        if any(part.startswith('.') for part in path.split('/') if part):
            return self.respond(403, {'error': 'Private path'})
        if path != '/api/wu':
            if not path.startswith('/web/meteo/') or any(part in ('.', '..') for part in path.split('/')):
                return self.respond(404, {'error': 'Not found'})
            candidate = (ROOT / path.lstrip('/')).resolve()
            if not candidate.is_relative_to((ROOT / 'web/meteo').resolve()) or candidate.is_symlink():
                return self.respond(404, {'error': 'Not found'})
            return super().do_GET()
        key = LOCAL_KEY or os.environ.get('WU_API_KEY')
        if not key:
            return self.respond(503, {'error': 'Configure WU_API_KEY in secure environment settings'})
        try:
            if CACHE is None or time.monotonic() - CACHE[0] > 300:
                query = urllib.parse.urlencode(dict(stationId='IALDEI10', format='json', units='m', apiKey=key))
                with urllib.request.urlopen('https://api.weather.com/v2/pws/observations/current?' + query,
                                            timeout=20, context=ssl.create_default_context()) as response:
                    rows = wu_rows(json.load(response))
                CACHE = (time.monotonic(), rows)
            return self.respond(200, CACHE[1])
        except Exception:
            # Do not include upstream exceptions: their URLs can contain the API key.
            return self.respond(502, {'error': 'Weather Underground unavailable or credential rejected'})

    def do_HEAD(self):
        path = urllib.parse.unquote(self.path.split('?')[0])
        if not path.startswith('/web/meteo/') or any(part.startswith('.') for part in path.split('/') if part):
            self.send_error(404)
            return
        return super().do_HEAD()

    def respond(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--encrypted-key', type=Path, help='Ficheiro cifrado; pede palavra-passe no terminal')
    args = parser.parse_args()
    if args.encrypted_key:
        from tools.wu_credentials import unlock
        LOCAL_KEY = unlock(args.encrypted_key)
    print(f'IgnisPyro Meteo: porta {args.port}; caminho /web/meteo/')
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
