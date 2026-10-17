"""Install to a fresh directory; test without developer runtimes on PATH; uninstall."""
import os,subprocess,tempfile,time,winreg
from pathlib import Path
root=Path(__file__).resolve().parents[1]
installer=root/'release'/'IgnisPyroMeteo-1.2.0-rc.3-windows-x64-setup.exe'
key=r'Software\Microsoft\Windows\CurrentVersion\Uninstall\dsantananet.IgnisPyroMeteo_is1'
try:
    existing=winreg.OpenKey(winreg.HKEY_CURRENT_USER,key);existing.Close()
except FileNotFoundError:pass
else:raise RuntimeError('Existing installation found; refusing to overwrite it')
folder=Path(tempfile.mkdtemp(prefix='IgnisPyroMeteo-installation-test-'))/'app'
environment=dict(os.environ)
environment['PATH']=os.environ['SystemRoot']+r'\System32;'+os.environ['SystemRoot']
for variable in ['PYTHONPATH','PYTHONHOME','VIRTUAL_ENV']:environment.pop(variable,None)
subprocess.run([str(installer),'/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/DIR='+str(folder)],check=True,timeout=120)
exe=folder/'IgnisPyroMeteo.exe'
assert exe.is_file(), 'Executable missing after installation'
with winreg.OpenKey(winreg.HKEY_CURRENT_USER,key) as installed:
    assert winreg.QueryValueEx(installed,'DisplayName')[0].startswith('IgnisPyroMeteo')
shortcut=Path(os.environ['APPDATA'])/'Microsoft/Windows/Start Menu/Programs/IgnisPyroMeteo/IgnisPyroMeteo.lnk'
assert shortcut.is_file(), 'Start menu shortcut missing'
for attempt in range(2):
    subprocess.run([str(exe),'--self-test'],cwd=folder.parent,env=environment,check=True,timeout=45)
subprocess.run([str(folder/'unins000.exe'),'/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART'],check=True,timeout=120)
for attempt in range(30):
    if not exe.exists() and not shortcut.exists():break
    time.sleep(0.5)
assert not exe.exists(),'Uninstaller left executable behind'
assert not shortcut.exists(),'Uninstaller left shortcut behind'
try:
    leftover=winreg.OpenKey(winreg.HKEY_CURRENT_USER,key);leftover.Close()
except FileNotFoundError:pass
else:raise AssertionError('Uninstaller left registration behind')
print('PASS: fresh-directory install, Start menu, registered uninstall, two independent starts, uninstall. Host: '+os.name)
