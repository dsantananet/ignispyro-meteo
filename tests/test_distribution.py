from http.client import HTTPConnection
import threading
import unittest
import meteo_server as server

class DistributionTests(unittest.TestCase):
    def test_source_and_traversal_are_not_served(self):
        http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        try:
            for method in ('GET','HEAD'):
                for path in ('/meteo_server.py','/.git/config','/web/meteo/../../meteo_server.py','/web/meteo/%2e%2e/%2e%2e/meteo_server.py'):
                    with self.subTest(method=method,path=path):
                        conn=HTTPConnection('127.0.0.1',http.server_port)
                        conn.request(method,path); response=conn.getresponse()
                        self.assertIn(response.status,(403,404));response.read();conn.close()
        finally: http.shutdown();http.server_close();thread.join()
