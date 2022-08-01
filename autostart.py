#!/usr/bin/env python

import subprocess
import os
import threading

application_bundle_root = 'd:/stream/_build/'
application_root_url = "http://localhost"
application_port = "3000"

# -------------------------------------------------------------------

server = None

# -------------------------------------------------------------------

def script_description():
  return "StreamBalls autostart script."

# -------------------------------------------------------------------
# https://eli.thegreenplace.net/2017/interacting-with-a-long-running-child-process-in-python

def output_reader(proc):
    # output in logfile with source 'Unknown Script'
    for line in iter(proc.stdout.readline, b''):
        print('{0}'.format(line.decode('utf-8')), end='')

# -------------------------------------------------------------------

def script_load(settings):

    global application_bundle_root
    global application_root_url
    global application_port

    global server

    modified_env = os.environ.copy()

    modified_env["MONGO_URL"] = "mongodb://localhost:27017/streamballs"
    modified_env["ROOT_URL"] = application_root_url
    modified_env["PORT"] = application_port
    modified_env["NODE_ENV"] = "production"

    # subprocess.CREATE_NO_WINDOW ~ 0x08000000 - no console visible after started
    server = subprocess.Popen(['node.exe', 'main.js'],
        bufsize=16,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=False,
        cwd=application_bundle_root,
        creationflags=0x08000000,
        env=modified_env)

    reader = threading.Thread(target=output_reader, args=(server,))
    reader.daemon = True  # thread dies with the program
    reader.start()

    print('StreamBalls started')

def script_unload():
    # https://stackoverflow.com/a/47756757
    print('StreamBalls process tree shall be terminated')

    subprocess.run(['taskkill.exe', '-F', '-T', '-PID', str(server.pid)], creationflags=0x08000000)
