#!/usr/bin/env python
import sys, os, base64

[path, b64] = sys.argv[1:2]
data = base64.b64decode(b64).decode('utf-8')
os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
with open(path, 'w', encoding='utf-8') as f:
    f.write(data)
print(f'Warranted write: {path}')
