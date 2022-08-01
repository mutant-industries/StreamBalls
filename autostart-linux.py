#!/usr/bin/env python

import subprocess
import os
import threading

application_bundle_root = '/home/pmayr/Workspace/stream/_build/'
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
        print(line.decode())

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

    server = subprocess.Popen(['node', 'main.js'],
        bufsize=16,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=False,
        cwd=application_bundle_root,
        env=modified_env)

    reader = threading.Thread(target=output_reader, args=(server,))
    reader.daemon = True  # thread dies with the program
    reader.start()

    print('StreamBalls started')

def script_unload():
    # https://stackoverflow.com/a/47756757
    print('StreamBalls process tree shall be terminated')

    result = subprocess.run(["ps", "-o", "pid", "--no-headers", "--ppid", str(server.pid)], capture_output=True)

    child_pids = result.stdout.decode("utf-8").strip().split()

    kill_command = ['kill', '-9']

    kill_command += child_pids
    kill_command.append(str(server.pid))

    subprocess.run(kill_command)
