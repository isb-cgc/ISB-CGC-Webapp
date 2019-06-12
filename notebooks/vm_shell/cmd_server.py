import time
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
import os

HOST_NAME = '0.0.0.0'
PORT_NUMBER = 9000


class MyHandler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()

    def do_GET(self):
        print('do_GET called')
        paths = {
            '/foo': {'status': 200},
            '/bar': {'status': 302},
            '/baz': {'status': 404},
            '/qux': {'status': 500}
        }

        if self.path in paths:
            self.respond(paths[self.path])
        else:
            self.respond({'status': 500})

    def do_POST(self):
        print('do_POST called')


    def handle_http(self, status_code, path):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        return self.wfile.write(bytes(json.dumps({'hello': 'world', 'received': 'ok'}, ensure_ascii=False), 'utf-8'))

    def respond(self, opts):
        os.system('gsutil cp gs://elee-notebook-vm/RegulomeExplorer_2.1.ipynb /home/elee/virtualEnv1/.')
        return self.handle_http(opts['status'], self.path)


if __name__ == '__main__':
    server_class = HTTPServer
    httpd = server_class((HOST_NAME, PORT_NUMBER), MyHandler)
    print(time.asctime(), 'Server Starts - %s:%s' % (HOST_NAME, PORT_NUMBER))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print(time.asctime(), 'Server Stops - %s:%s' % (HOST_NAME, PORT_NUMBER))