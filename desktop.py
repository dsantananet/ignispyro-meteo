"""Local desktop launcher; Python is bundled in the Windows distribution."""
import sys, threading, webbrowser, urllib.request
from pathlib import Path
import meteo_server as server

def self_test():
    http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
    thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
    try:
        base=f'http://127.0.0.1:{http.server_port}'
        for path,expected in [('/web/meteo/',b'IgnisPyro'),('/web/meteo/app.mjs',b'normalize'),('/web/meteo/vendor/leaflet/leaflet.js',b'Leaflet')]:
            with urllib.request.urlopen(base+path) as response: assert expected in response.read()
    finally: http.shutdown(); http.server_close(); thread.join()
    return 0

def main():
    from tools.local_credentials import read_key
    server.LOCAL_KEY=read_key()
    import tkinter as tk
    from tkinter import messagebox
    root=tk.Tk();root.title('IgnisPyro Meteo');root.geometry('470x220')
    try: http=server.ThreadingHTTPServer(('127.0.0.1',8765),server.Handler)
    except OSError:
        messagebox.showerror('IgnisPyro Meteo','Não foi possível abrir a porta local 8765. Verifique se a aplicação já está aberta.');root.destroy();return
    thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
    url='http://127.0.0.1:8765/web/meteo/'
    tk.Label(root,text='IgnisPyro Meteo',font=('Segoe UI',20)).pack(pady=20)
    tk.Label(root,text='O painel abre no seu navegador.\nMantenha esta janela aberta enquanto utiliza o painel.').pack()
    tk.Button(root,text='Abrir painel meteorológico',command=lambda:webbrowser.open(url)).pack(pady=12)
    def close():
        http.shutdown();http.server_close();thread.join();root.destroy()
    root.protocol('WM_DELETE_WINDOW',close)
    root.after(300,lambda:webbrowser.open(url));root.mainloop()

if __name__=='__main__':
    if '--self-test' in sys.argv: sys.exit(self_test())
    main()
