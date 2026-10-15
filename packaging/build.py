import subprocess,sys,tempfile,os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
args=[sys.executable,'-m','PyInstaller','--noconfirm','--windowed','--workpath',tempfile.mkdtemp(prefix='meteo-build-'),'--distpath',os.environ.get('BUILD_OUTPUT','dist-current'),'--name','IgnisPyroMeteo','--icon','packaging/app.ico']
args+=['--add-data','web/meteo:web/meteo']

args+=['desktop.py']
subprocess.run(args,cwd=root,check=True)
