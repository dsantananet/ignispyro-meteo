"""Publish sanitized public measurements; credentials are never written to output."""
import json, os, sys, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from meteo_server import wu_rows

def main():
    key=os.environ.get('WU_API_KEY')
    if not key:
        from tools.local_credentials import read_key
        key=read_key()
    if not key:raise ValueError('Missing station credential')
    query=urllib.parse.urlencode(dict(stationId='IALDEI10',format='json',units='m',numericPrecision='decimal',apiKey=key))
    with urllib.request.urlopen('https://api.weather.com/v2/pws/observations/current?'+query,timeout=30) as response:rows=wu_rows(json.load(response))
    target=Path(__file__).resolve().parents[1]/'data/aldeia.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps({'fetchedAt':datetime.now(timezone.utc).isoformat(),'source':'https://www.wunderground.com/dashboard/pws/IALDEI10','observations':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Updated sanitized observations for IALDEI10')

if __name__=='__main__':
    try:main()
    except Exception:sys.exit('Station update failed; no credentials or upstream URL logged.')
